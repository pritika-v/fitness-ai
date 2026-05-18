# Fitness AI Trainer

A real-time AI fitness trainer that uses MediaPipe pose detection and 
angle heuristics to count reps and give form feedback across multiple 
exercises — all running in the browser with no backend required.

---

## What it does

- Detects your body landmarks using MediaPipe Pose (runs in the browser)
- Tracks joint angles frame-by-frame
- Counts good and bad reps using a phase state machine (UP → DOWN → UP)
- Gives specific form feedback after each rep (hips sagging, elbows flaring, etc.)
- Runs a full workout sequence with rest timers between exercises
- Optionally runs a GRU anomaly detection model if model files are present

---

## Exercises supported

| Exercise     | Reps | Tracking joint | Form checks                              |
|-------------|------|---------------|-------------------------------------------|
| Push-up      | 10   | Elbow         | Back straight, elbow flare, hip sag, neck |
| Squat        | 10   | Knee          | Back straight, knee valgus, depth        |
| Plank        | Hold | —             | Back straight, hip sag, neck             |
| Lunge        | 10   | Knee          | Back straight, knee valgus, depth, neck  |
| Jumping Jack | 10   | Shoulder      | Back straight                            |

---

---

## Prerequisites

| Tool    | Minimum version | Check with       |
|---------|----------------|-----------------|
| Node.js | 18.x           | `node --version` |
| npm     | 9.x            | `npm --version`  |

Download Node.js from https://nodejs.org (LTS version includes npm).

---

## Setup and running

```bash
# 1. Clone or download the project
cd fitness-ai

# 2. Install dependencies (only Vite — everything else is CDN)
npm install

# 3. Start the development server
npm run dev

# 4. Open your browser to http://localhost:3000
```

The browser will ask for camera permission when you click Start. Allow it.

---

## Camera placement

**Push-up, Plank, Lunge:** Place your phone or webcam to your **side** at roughly 
floor level, far enough back that your entire body (head to feet) is in frame.

**Squat:** Camera to your side, at roughly hip height, far enough to see head to feet.

**Jumping Jack:** Camera **in front** of you, far enough to see your full body.

The app will tell you if your camera placement is wrong before counting starts.

---

## Adding a new exercise

1. Create `public/exercises/myExercise.json` using the schema below
2. Add `'myExercise'` to the `WORKOUT_SEQUENCE` array in `main.js`
3. That's it — no other files change

### Exercise JSON schema

```json
{
  "id": "myExercise",
  "name": "My Exercise",
  "targetReps": 10,
  "sets": 1,
  "repPhase": {
    "jointGroup": "elbow",    // "elbow" | "knee" | "shoulder"
    "side": "auto",
    "upAngle": 155,           // angle at top of rep
    "downAngle": 92,          // angle at bottom of rep
    "minDepthAngle": 115      // must reach this or rep is shallow
  },
  "formChecks": ["backStraight", "elbowFlare"],   // names from formChecks/
  "thresholds": {
    "backAngleMin": 135
  },
  "cameraHint": "Place camera to your side.",
  "startPositionHint": "Get into position."
}
```

For a **hold exercise** (like plank), use `"isHold": true` and `"holdDurationSeconds": 30` 
instead of `repPhase`.

---

## Adding a new form check

1. Create `formChecks/myCheck.js`:
```javascript
export function myCheck(measurements, thresholds) {
  // return null if form is OK
  // return an issue object if something is wrong
  if (measurements.someAngle > thresholds.myLimit) return null;
  return {
    code: 'MY_CODE',
    message: 'Human-readable feedback shown to user',
    severity: 'high'   // 'high' | 'medium' | 'low'
  };
}
```
2. Add it to the `CHECK_REGISTRY` in `engine/formAnalyzer.js`
3. Reference it by name in any exercise JSON

---

## Adding GRU/LSTM anomaly detection (future)

Once you have trained and converted your model:

1. Copy the converted model files to `public/models/gru_model/`
2. Restore `anomalyDetector.js` in the `engine/` folder
3. Re-import and use it in `workout/workoutSession.js`

The system runs fine without the model — heuristics alone handle all form feedback.

---

## How rep counting works

Person is at UP position (elbow ~160°+)
↓
Goes DOWN (elbow reaches < 92°)        ← rep has started
↓
Comes back UP (elbow > 155°)           ← rep is complete
↓
_finalizeRep() checks:
• Did elbow reach minDepthAngle?     → SHALLOW if not
• Were there 2+ high-severity issues? → BAD REP
• Were there medium issues only?      → GOOD REP with tips
• No issues?                          → PERFECT REP

Phase changes require 4 consecutive consistent frames to avoid jitter.
Person must hold the start position for 12 frames before counting begins.

---

## Troubleshooting

**Camera not starting**
- Check browser camera permissions (address bar → camera icon → Allow)
- Make sure no other app is using the camera
- Try a different browser (Chrome works best with MediaPipe)

**"No person detected" even when in frame**
- Ensure you have good lighting — MediaPipe struggles in dark environments
- Make sure your full side profile is visible, not just part of your body

**Reps not counting**
- The app waits for you to hold the starting (UP) position for ~0.5 seconds before it starts
- Make sure your full arm/leg is visible to the camera
- Check the "Phase" display — it should show UP/DOWN as you move

**Exercise JSON not loading (404 error)**
- Make sure your JSON files are in `public/exercises/` not just `exercises/`
- Filenames must match exactly: `pushup.json`, `squat.json`, etc.

**Module import errors in console**
- Make sure every file listed in the structure exists
- Check that `formChecks/depth.js` exists and exports `depthCheck`
- Check that `anomalyDetector.js` is NOT imported anywhere (since you removed it)

---

## Tech stack

| Technology     | Purpose                          | How loaded        |
|---------------|----------------------------------|------------------|
| MediaPipe Pose | Body landmark detection          | CDN script tag    |
| TensorFlow.js  | GRU/LSTM model inference         | CDN script tag    |
| Vite           | Dev server and module bundling   | npm (dev only)    |
| Vanilla JS     | All app logic                    | ES modules        |

No React, no framework — plain ES modules keep the code easy to read and debug.