// Draws the MediaPipe skeleton on a canvas element.

const PAIRS = [
  [11,13],[13,15],[12,14],[14,16],[11,12],
  [11,23],[12,24],[23,24],
  [23,25],[25,27],[24,26],[26,28],
];

export class SkeletonOverlay {
  constructor(canvasId = 'overlay') {
    this._canvas = document.getElementById(canvasId);
    this._ctx    = this._canvas?.getContext('2d');
  }

  draw(landmarks, inPosition) {
    const canvas = this._canvas;
    const ctx    = this._ctx;
    if (!canvas || !ctx) return;

    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!landmarks) return;

    const w = canvas.width, h = canvas.height;
    const color = inPosition ? '#4cde7a' : '#f5a623';

    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5;
    ctx.globalAlpha = 0.75;
    for (const [a, b] of PAIRS) {
      const la = landmarks[a], lb = landmarks[b];
      if (!la || !lb) continue;
      if ((la.visibility??1) < 0.25 || (lb.visibility??1) < 0.25) continue;
      ctx.beginPath();
      ctx.moveTo(la.x * w, la.y * h);
      ctx.lineTo(lb.x * w, lb.y * h);
      ctx.stroke();
    }

    ctx.fillStyle   = '#fff';
    ctx.globalAlpha = 0.9;
    for (const i of [11,12,13,14,15,16,23,24,25,26,27,28]) {
      const lm = landmarks[i];
      if (!lm || (lm.visibility??1) < 0.25) continue;
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}