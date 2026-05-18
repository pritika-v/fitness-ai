// Handles MediaPipe setup, camera access, and per-frame landmark emission.
// Emits a 'pose' event each frame — all other modules listen to this.

const CFG = {
  SIDE_VIEW_THRESHOLD:  0.15,
  LANDMARK_VIS_MIN:     0.35,
  BODY_COMPLETE_VIS:    0.30,
};

export class PoseEngine extends EventTarget {
  constructor() {
    super();
    this.pose       = null;
    this.running    = false;
    this.video      = null;
  }

  // Call once to start camera + MediaPipe
  async start(videoElement) {
    this.video = videoElement;

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    videoElement.srcObject = stream;
    await videoElement.play();

    this.pose = new window.Pose({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`
    });
    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence:  0.5,
    });
    this.pose.onResults(results => this._onResults(results));

    this.running = true;
    this._loop();
  }

  stop() { this.running = false; }

  _loop() {
    if (!this.running) return;
    this.pose.send({ image: this.video }).then(() => {
      requestAnimationFrame(() => this._loop());
    });
  }

  _onResults(results) {
    const lm = results.poseLandmarks ?? null;
    // Dispatch a custom 'pose' event carrying raw landmarks
    this.dispatchEvent(Object.assign(new Event('pose'), { landmarks: lm }));
  }

  // Utility: check if enough of the body is visible for analysis
  checkCameraSetup(lm) {
    if (!lm) return { ok: false, message: '🔍 No person detected', detail: 'Move into frame.' };

    const vis = (i, thr = CFG.BODY_COMPLETE_VIS) => (lm[i]?.visibility ?? 0) >= thr;
    const T = CFG.BODY_COMPLETE_VIS;

    const lScore = [11,13,15,23,25,27].reduce((s,i) => s + (lm[i]?.visibility??0), 0);
    const rScore = [12,14,16,24,26,28].reduce((s,i) => s + (lm[i]?.visibility??0), 0);
    const d = lScore >= rScore ? 'left' : 'right';

    const indices = d === 'left'
      ? { sh:11, el:13, wr:15, hp:23, kn:25, an:27 }
      : { sh:12, el:14, wr:16, hp:24, kn:26, an:28 };

    const missing = Object.entries(indices)
      .filter(([,i]) => !vis(i))
      .map(([k]) => ({ sh:'shoulder', el:'elbow', wr:'wrist', hp:'hip', kn:'knee', an:'ankle' }[k]));

    if (missing.length === 0) return { ok: true, message: '', detail: '' };

    let detail = 'Adjust camera so your full side profile is in frame.';
    if (missing.includes('ankle') || missing.includes('knee'))
      detail = 'Move camera further back — lower body is cut off.';
    else if (missing.includes('shoulder') || missing.includes('elbow'))
      detail = 'Move camera further back — upper body is cut off.';

    return { ok: false, message: '📷 Adjust camera', detail };
  }
}