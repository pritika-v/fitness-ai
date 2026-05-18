import { loadExercise    } from '../engine/exerciseLoader.js';
import { FormAnalyzer    } from '../engine/formAnalyzer.js';
import { RepCounter      } from '../engine/repCounter.js';
import { analyze, isInExercisePosition } from '../engine/movementAnalyzer.js';
import { RestTimer } from './restTimer.js';

export class WorkoutSession extends EventTarget {
  constructor(exerciseIds, options = {}) {
    super();
    this.exerciseIds  = exerciseIds;
    this.restSeconds  = options.restSeconds ?? 15;
    this.currentIndex = -1;
    this.state        = 'idle';

    this._config       = null;
    this._formAnalyzer = null;
    this._repCounter   = null;
    this._restTimer    = new RestTimer();
    this._frameCount   = 0;
    this._poseEngine   = null;

    this._restTimer.addEventListener('tick',     e => this._onRestTick(e));
    this._restTimer.addEventListener('complete', () => this._startNextExercise());
  }

  get currentConfig()   { return this._config; }
  get currentExercise() { return this.exerciseIds[this.currentIndex]; }
  get isLastExercise()  { return this.currentIndex >= this.exerciseIds.length - 1; }

  attachPoseEngine(pe) { this._poseEngine = pe; }

  async start() {
    await this._startNextExercise();
  }

  async processFrame(landmarks) {
    if (this.state !== 'exercising' || !landmarks) return;

    this._frameCount++;

    const setup  = this._poseEngine?.checkCameraSetup(landmarks) ?? { ok: true };
    const inPos  = isInExercisePosition(landmarks, this._config);
    const m      = analyze(landmarks);
    const { issues, isGoodForm } = this._formAnalyzer.analyze(m);

    const repEvent = this._repCounter.update({
      measurements: m,
      isGoodForm,
      issues,
      inPosition: inPos,
      anomalyScore: null,   // no model yet — always null
    });

    this.dispatchEvent(Object.assign(new Event('frame'), {
      measurements: m,
      issues,
      isGoodForm,
      inPos,
      setup,
      phase:    this._repCounter.phase,
      isReady:  this._repCounter.isReady,
      goodReps: this._repCounter.goodReps,
      badReps:  this._repCounter.badReps,
      landmarks,
    }));

    if (repEvent) {
      this.dispatchEvent(Object.assign(new Event('rep'), repEvent));
    }

    if (this._repCounter.isComplete) {
      await this._completeExercise();
    }
  }

  async _startNextExercise() {
    this.currentIndex++;

    if (this.currentIndex >= this.exerciseIds.length) {
      this.state = 'done';
      this.dispatchEvent(new Event('workoutComplete'));
      return;
    }

    const id = this.exerciseIds[this.currentIndex];
    this._config       = await loadExercise(id);
    this._formAnalyzer = new FormAnalyzer(this._config);
    this._repCounter   = new RepCounter(this._config);
    this._frameCount   = 0;
    this.state         = 'exercising';

    this.dispatchEvent(Object.assign(new Event('exerciseStart'), {
      config: this._config,
      index:  this.currentIndex,
      total:  this.exerciseIds.length,
    }));
  }

  async _completeExercise() {
    this.state = 'resting';

    this.dispatchEvent(Object.assign(new Event('exerciseComplete'), {
      config:   this._config,
      goodReps: this._repCounter.goodReps,
      badReps:  this._repCounter.badReps,
    }));

    if (!this.isLastExercise) {
      this._restTimer.start(this.restSeconds);
      this.dispatchEvent(Object.assign(new Event('restStart'), {
        seconds:      this.restSeconds,
        nextExercise: this.exerciseIds[this.currentIndex + 1],
      }));
    } else {
      await this._startNextExercise();
    }
  }

  _onRestTick(e) {
    this.dispatchEvent(Object.assign(new Event('restTick'), { remaining: e.remaining }));
  }
}