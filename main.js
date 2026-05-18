// main.js — zero logic, pure composition.
// Wires all modules together and handles DOM events.

import { PoseEngine      } from './engine/poseEngine.js';
import { WorkoutSession  } from './workout/workoutSession.js';
import { Dashboard       } from './ui/dashboard.js';
import { FeedbackPanel   } from './ui/feedbackPanel.js';
import { SkeletonOverlay } from './ui/skeletonOverlay.js';
import { RestScreen      } from './ui/restScreen.js';

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

session.attachPoseEngine(poseEngine);

// ── Session events ────────────────────────────────────────────────────
session.addEventListener('exerciseStart', e => {
  restScreen.hide();
  dashboard.setExercise(e.config, e.index, e.total);
  feedback.setMessage(`<em>${e.config.cameraHint}</em>`);
});

session.addEventListener('frame', e => {
  dashboard.onFrame(e);
  skeleton.draw(e.landmarks, e.inPos);
});

session.addEventListener('rep', e => {
  feedback.onRep(e);
});

session.addEventListener('restStart', e => {
  restScreen.show(e.seconds, e.nextExercise);
});

session.addEventListener('restTick', e => {
  restScreen.tick(e.remaining);
});

session.addEventListener('workoutComplete', () => {
  dashboard.setStatus('🎉 Workout complete! Great job.', 'ready');
});

// ── Pose engine → session ────────────────────────────────────────────
poseEngine.addEventListener('pose', e => {
  session.processFrame(e.landmarks);
});

// ── Button handlers ──────────────────────────────────────────────────
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
  location.reload(); // cleanest reset — avoids stale MediaPipe state
});