// Phase state machine. Works for any exercise — driven by the exercise config.
// Also handles hold exercises (plank) separately via a timer.

const PHASE_CONFIRM_FRAMES    = 4;
const POSITION_CONFIRM_FRAMES = 12;
const EMA_ALPHA               = 0.28;

export class RepCounter extends EventTarget {
  constructor(exerciseConfig) {
    super();
    this.config  = exerciseConfig;
    this.isHold  = !!exerciseConfig.isHold;
    this._reset();
  }

  _reset() {
    this.goodReps = 0;
    this.badReps  = 0;
    this.phase    = 'UP';
    this._pending       = 'UP';
    this._pendingCount  = 0;
    this._smoothed      = null;
    this._inPosFr       = 0;
    this.isReady        = false;
    this._issues        = [];
    this._isGood        = true;
    this._minAngle      = 999;
    this._worstAnomaly  = 0;
    this._repStarted    = false;

    // Hold-mode timer
    this._holdStart     = null;
    this._holdComplete  = false;
  }

  get targetReps()     { return this.config.targetReps; }
  get isComplete()     {
    if (this.isHold) return this._holdComplete;
    return this.goodReps >= this.targetReps;
  }
  get smoothedAngle()  { return this._smoothed; }

  // Called each frame
  update({ measurements, isGoodForm, issues, inPosition, anomalyScore }) {
    // ── position gating ──────────────────────────────────────────────
    if (!inPosition) {
      this._inPosFr = Math.max(0, this._inPosFr - 2);
      if (this._inPosFr === 0) this.isReady = false;
      return null;
    }
    this._inPosFr = Math.min(this._inPosFr + 1, POSITION_CONFIRM_FRAMES);
    if (this._inPosFr >= POSITION_CONFIRM_FRAMES) this.isReady = true;
    if (!this.isReady) return null;

    // ── hold exercise (plank) ────────────────────────────────────────
    if (this.isHold) return this._updateHold(isGoodForm, issues);

    // ── rep exercise ─────────────────────────────────────────────────
    const rawAngle = this._getTrackingAngle(measurements);
    if (rawAngle === null) return null;

    this._smoothed = this._smoothed === null
      ? rawAngle
      : EMA_ALPHA * rawAngle + (1 - EMA_ALPHA) * this._smoothed;

    const angle = this._smoothed;
    if (angle < this._minAngle) this._minAngle = angle;

    if (!isGoodForm) this._isGood = false;
    for (const iss of issues) {
      if (iss.severity !== 'low' && !this._issues.find(x => x.code === iss.code))
        this._issues.push(iss);
    }
    if (anomalyScore != null)
      this._worstAnomaly = Math.max(this._worstAnomaly, anomalyScore);

    return this._updatePhase(angle);
  }

  _getTrackingAngle(m) {
    const jg = this.config.repPhase?.jointGroup;
    if (jg === 'elbow')    return m.elbowAngle;
    if (jg === 'knee')     return m.kneeAngle;
    if (jg === 'shoulder') return m.shoulderAngle;
    return null;
  }

  _updatePhase(angle) {
    const { upAngle, downAngle } = this.config.repPhase;
    const raw = angle > upAngle ? 'UP' : angle < downAngle ? 'DOWN' : this.phase;

    if (raw !== this._pending) { this._pending = raw; this._pendingCount = 1; }
    else this._pendingCount++;

    if (this._pendingCount < PHASE_CONFIRM_FRAMES || raw === this.phase) return null;

    const prev    = this.phase;
    this.phase    = raw;

    if (prev === 'UP' && this.phase === 'DOWN') {
      // Rep started
      this._issues = []; this._isGood = true;
      this._minAngle = 999; this._worstAnomaly = 0;
      this._repStarted = true;
    }

    if (prev === 'DOWN' && this.phase === 'UP' && this._repStarted) {
      this._repStarted = false;
      return this._finalizeRep();
    }

    return null;
  }

  _finalizeRep() {
    const { minDepthAngle } = this.config.repPhase;
    const depthFail = minDepthAngle !== null && this._minAngle > minDepthAngle;

    if (depthFail) {
      this.badReps++;
      return this._emit('BAD_REP', 'bad', [{
        code: 'SHALLOW_REP',
        message: `Not deep enough — reached ${Math.round(this._minAngle)}°, aim for ${minDepthAngle}°`,
        severity: 'high'
      }]);
    }

    const highIss    = this._issues.filter(i => i.severity === 'high');
    const medIss     = this._issues.filter(i => i.severity === 'medium');
    const anomaly    = this._worstAnomaly;
    const ANOMALY_BAD  = 0.15;
    const ANOMALY_WARN = 0.10;

    const isBad  = highIss.length >= 2
                || (highIss.length === 1 && anomaly > ANOMALY_BAD)
                || anomaly > ANOMALY_BAD * 1.5;
    const isWarn = !isBad && (medIss.length > 0 || highIss.length === 1 || anomaly > ANOMALY_WARN);

    const allIssues = [...this._issues];
    this._issues = []; this._isGood = true; this._minAngle = 999; this._worstAnomaly = 0;

    if (isBad) {
      this.badReps++;
      return this._emit('BAD_REP', 'bad', allIssues);
    } else {
      this.goodReps++;
      return this._emit('GOOD_REP', isWarn ? 'warn' : 'good', allIssues);
    }
  }

  _updateHold(isGoodForm, issues) {
    const duration = this.config.holdDurationSeconds * 1000;
    if (!isGoodForm) {
      this._holdStart = null; // break holds if form is broken
      return { type: 'HOLD_BROKEN', issues };
    }
    if (!this._holdStart) this._holdStart = Date.now();
    const elapsed = Date.now() - this._holdStart;
    const remaining = Math.max(0, duration - elapsed);
    if (elapsed >= duration && !this._holdComplete) {
      this._holdComplete = true;
      this.goodReps = 1;
      return this._emit('GOOD_REP', 'good', []);
    }
    return { type: 'HOLDING', remaining, elapsed };
  }

  _emit(type, quality, issues) {
    const evt = { type, quality, issues,
      goodReps: this.goodReps, badReps: this.badReps };
    this.dispatchEvent(Object.assign(new Event('rep'), evt));
    return evt;
  }
}