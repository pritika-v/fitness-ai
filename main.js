// main.js — wires all modules together, no logic here
import { PoseEngine      } from './engine/poseEngine.js';
import { WorkoutSession  } from './workout/workoutSession.js';
import { Dashboard       } from './ui/dashboard.js';
import { FeedbackPanel   } from './ui/feedbackPanel.js';
import { SkeletonOverlay } from './ui/skeletonOverlay.js';
import { RestScreen      } from './ui/restScreen.js';
import { HoldTimerUI     } from './ui/holdTimerUI.js';   // ← new

const WORKOUT_SEQUENCE = ['pushup', 'squat', 'plank', 'lunge', 'jumpingJack'];
const REST_SECONDS     = 15;

const video      = document.getElementById('video');
const startBtn   = document.getElementById('start-btn');
const resetBtn   = document.getElementById('reset-btn');

const poseEngine = new PoseEngine();
const session    = new WorkoutSession(WORKOUT_SEQUENCE, { restSeconds: REST_SECONDS });
const dashboard  = new Dashboard();
const feedback   = new FeedbackPanel('form-feedback');
const skeleton   = new SkeletonOverlay('overlay');
const restScreen = new RestScreen('rest-overlay');
const holdTimer  = new HoldTimerUI('hold-timer-container');  // ← new

session.attachPoseEngine(poseEngine);

// ── Session events ────────────────────────────────────────────────────
session.addEventListener('exerciseStart', e => {
  restScreen.hide();

  // Show or hide hold timer depending on exercise type
  if (e.config.isHold) {
    holdTimer.show();
  } else {
    holdTimer.hide();
  }

  dashboard.setExercise(e.config, e.index, e.total);
  feedback.setMessage(`<em>${e.config.cameraHint}</em>`);
});

session.addEventListener('frame', e => {
  dashboard.onFrame(e);
  skeleton.draw(e.landmarks, e.inPos);
});

session.addEventListener('rep', e => {
  // Route hold events to holdTimerUI, rep events to feedbackPanel
  if (e.type === 'HOLDING') {
    holdTimer.onHolding(e.progress, e.remainingSeconds);
    // Also clear status bar so it doesn't say "Get into position"
    dashboard.setStatus('🟢 Hold your plank!', 'ready');
  } else if (e.type === 'HOLD_BROKEN') {
    holdTimer.onHoldBroken(e.message);
    dashboard.setStatus('⚠️ Hold broken — fix form to restart', 'warn');
    feedback.onRep(e);
  } else if (e.type === 'HOLD_WAITING') {
    holdTimer.onWaiting(e.issues);
    feedback.onRep(e);
  } else if (e.type === 'GOOD_REP' && e.issues?.length === 0 && session.currentConfig?.isHold) {
    holdTimer.onComplete();
    dashboard.setStatus('🎉 Plank complete!', 'ready');
    feedback.onRep(e);
  } else {
    feedback.onRep(e);
  }
});

session.addEventListener('restStart', e => {
  holdTimer.hide();
  restScreen.show(e.seconds, e.nextExercise);
});

session.addEventListener('restTick', e => {
  restScreen.tick(e.remaining);
});

session.addEventListener('workoutComplete', () => {
  holdTimer.hide();
  dashboard.setStatus('🎉 Workout complete! Great job.', 'ready');
});

// ── Pose engine → session ─────────────────────────────────────────────
poseEngine.addEventListener('pose', e => {
  session.processFrame(e.landmarks);
});

// ── Buttons ───────────────────────────────────────────────────────────
startBtn.addEventListener('click', async () => {
  startBtn.disabled    = true;
  startBtn.textContent = 'Starting…';
  try {
    await poseEngine.start(video);
    await session.start();
    startBtn.textContent = 'Running';
  } catch (err) {
    dashboard.setStatus(`❌ ${err.message}`, 'error');
    startBtn.disabled    = false;
    startBtn.textContent = 'Start';
  }
});

resetBtn.addEventListener('click', () => {
  location.reload();
});