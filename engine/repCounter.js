// engine/repCounter.js
// Phase state machine for rep exercises + hold timer for isHold exercises.

const PHASE_CONFIRM_FRAMES    = 4;
const POSITION_CONFIRM_FRAMES = 12;
const EMA_ALPHA               = 0.28;
const ANOMALY_BAD             = 0.15;
const ANOMALY_WARN            = 0.10;

export class RepCounter extends EventTarget {
  constructor(exerciseConfig) {
    super();
    this.config  = exerciseConfig;
    this.isHold  = !!exerciseConfig.isHold;
    this._reset();
  }

  _reset() {
    // Shared
    this.goodReps      = 0;
    this.badReps       = 0;
    this._smoothed     = null;
    this._inPosFr      = 0;
    this.isReady       = false;

    // Rep-mode state
    this.phase         = 'UP';
    this._pending      = 'UP';
    this._pendingCount = 0;
    this._issues       = [];
    this._isGood       = true;
    this._minAngle     = 999;
    this._worstAnomaly = 0;
    this._repStarted   = false;

    // Hold-mode state
    this._holdStart     = null;   // timestamp when good form started
    this._holdComplete  = false;
    this._formWasGood   = false;  // tracks whether we were holding last frame
  }

  get targetReps()    { return this.config.targetReps; }
  get smoothedAngle() { return this._smoothed; }

  get isComplete() {
    if (this.isHold) return this._holdComplete;
    return this.goodReps >= this.targetReps;
  }

  // Returns elapsed hold seconds (0 if not started), for UI progress ring
  get holdElapsedSeconds() {
    if (!this._holdStart) return 0;
    return (Date.now() - this._holdStart) / 1000;
  }

  get holdTotalSeconds() {
    return this.config.holdDurationSeconds ?? 20;
  }

  // Main update — called every frame from workoutSession
  update({ measurements, isGoodForm, issues, inPosition, anomalyScore }) {
    // ── Position gating — same for both rep and hold modes ──────────
    if (!inPosition) {
      this._inPosFr = Math.max(0, this._inPosFr - 2);
      if (this._inPosFr === 0) {
        this.isReady = false;
        // If we were holding and person leaves position, reset hold
        if (this.isHold && this._holdStart) {
          this._holdStart    = null;
          this._formWasGood  = false;
        }
      }
      return null;
    }

    this._inPosFr = Math.min(this._inPosFr + 1, POSITION_CONFIRM_FRAMES);
    if (this._inPosFr >= POSITION_CONFIRM_FRAMES) this.isReady = true;
    if (!this.isReady) return null;

    // ── Route to correct mode ────────────────────────────────────────
    if (this.isHold) {
      return this._updateHold(isGoodForm, issues);
    }
    return this._updateRep(measurements, isGoodForm, issues, anomalyScore);
  }

  // ── HOLD MODE ──────────────────────────────────────────────────────
  _updateHold(isGoodForm, issues) {
    if (this._holdComplete) return null;

    const duration = this.holdTotalSeconds * 1000;

    // Form just broke (was good, now bad)
    if (!isGoodForm && this._formWasGood) {
      this._holdStart   = null;   // reset the timer
      this._formWasGood = false;

      // Tell the UI which specific issue broke the hold
      const topIssue = [...issues]
        .sort((a, b) => ({ high: 3, medium: 2, low: 1 }[b.severity] - { high: 3, medium: 2, low: 1 }[a.severity]))[0];

      return {
        type:    'HOLD_BROKEN',
        quality: 'bad',
        issues,
        message: topIssue
          ? `Hold broken — ${topIssue.message}`
          : 'Hold broken — check your form and try again',
      };
    }

    // Form is bad (and was already bad) — keep waiting, no event needed
    if (!isGoodForm) {
      this._formWasGood = false;
      return {
        type:    'HOLD_WAITING',
        quality: 'bad',
        issues,
        message: 'Fix your form to start the timer',
      };
    }

    // Form is good — start or continue the timer
    if (!this._holdStart) {
      this._holdStart   = Date.now();
      this._formWasGood = true;
    }

    this._formWasGood = true;
    const elapsed   = Date.now() - this._holdStart;
    const remaining = Math.max(0, duration - elapsed);

    // Hold complete!
    if (elapsed >= duration) {
      this._holdComplete = true;
      this.goodReps      = 1;
      return this._emit('GOOD_REP', 'good', []);
    }

    // Still holding — emit a HOLDING event every frame so UI can update ring
    return {
      type:      'HOLDING',
      quality:   'good',
      elapsed,
      remaining,
      progress:  elapsed / duration,       // 0.0 → 1.0, use for progress ring
      elapsedSeconds:   Math.floor(elapsed / 1000),
      remainingSeconds: Math.ceil(remaining / 1000),
    };
  }

  // ── REP MODE ───────────────────────────────────────────────────────
  _updateRep(measurements, isGoodForm, issues, anomalyScore) {
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

    const prev = this.phase;
    this.phase = raw;

    if (prev === 'UP' && this.phase === 'DOWN') {
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
        severity: 'high',
      }]);
    }

    const highIss = this._issues.filter(i => i.severity === 'high');
    const medIss  = this._issues.filter(i => i.severity === 'medium');
    const anomaly = this._worstAnomaly;

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

  _emit(type, quality, issues) {
    const evt = { type, quality, issues, goodReps: this.goodReps, badReps: this.badReps };
    this.dispatchEvent(Object.assign(new Event('rep'), evt));
    return evt;
  }
}