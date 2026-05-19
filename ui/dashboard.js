// ui/dashboard.js
export class Dashboard {
  constructor() {
    this._els = {
      exerciseName: document.getElementById('exercise-name'),
      progress:     document.getElementById('progress'),
      goodReps:     document.getElementById('good-reps'),
      badReps:      document.getElementById('bad-reps'),
      phase:        document.getElementById('phase'),
      status:       document.getElementById('status'),
      bodyVis:      document.getElementById('body-visible'),
      elbowAngle:   document.getElementById('elbow-angle'),
    };
    this._isHoldMode = false;
  }

  setExercise(config, index, total) {
    this._isHoldMode = !!config.isHold;
    this._set('exerciseName', config.name);
    this._set('progress', `Exercise ${index + 1} of ${total}`);
    this._set('goodReps', '0');
    this._set('badReps',  '0');
    this._set('phase',    '--');

    // Hide rep-specific rows during hold exercises
    const repRow    = document.querySelector('.rep-row');
    const elbowRow  = document.getElementById('elbow-angle')?.closest('.detail-row');
    const phaseRow  = document.getElementById('phase')?.closest('.detail-row');

    if (this._isHoldMode) {
      if (repRow)   repRow.style.display   = 'none';
      if (elbowRow) elbowRow.style.display = 'none';
      if (phaseRow) phaseRow.style.display = 'none';
    } else {
      if (repRow)   repRow.style.display   = '';
      if (elbowRow) elbowRow.style.display = '';
      if (phaseRow) phaseRow.style.display = '';
    }

    this.setStatus(config.startPositionHint ?? 'Get into position.', 'warn');
  }

  onFrame({ goodReps, badReps, phase, isReady, inPos, setup, measurements }) {
    if (!this._isHoldMode) {
      this._set('goodReps', goodReps);
      this._set('badReps',  badReps);

      if (measurements?.elbowAngle != null)
        this._set('elbowAngle', Math.round(measurements.elbowAngle) + '°');

      if (!inPos) {
        this._set('phase', '—');
        this.setStatus('📍 Get into position', 'warn');
      } else if (!isReady) {
        this._set('phase', 'HOLD…');
        this.setStatus('⏳ Hold your starting position…', 'warn');
      } else {
        this._set('phase', phase ?? '--');
        this.setStatus('🟢 Go! Counting your reps.', 'ready');
      }
    } else {
      // Hold mode — status is driven by holdTimerUI, not here
      if (!inPos) {
        this.setStatus('📍 Get into plank position', 'warn');
      } else if (!isReady) {
        this.setStatus('⏳ Hold still for a moment…', 'warn');
      }
      // Once ready, HoldTimerUI takes over the feedback
    }

    if (setup && !setup.ok) {
      this._set('bodyVis', '✗ Adjust');
      this._setClass('bodyVis', 'val red');
      if (!this._isHoldMode)
        this.setStatus(`${setup.message} — ${setup.detail}`, 'warn');
    } else {
      this._set('bodyVis', '✓ Good');
      this._setClass('bodyVis', 'val green');
    }
  }

  setStatus(html, cls = '') {
    const e = this._els.status;
    if (!e) return;
    e.innerHTML = html;
    e.className = cls;
  }

  _set(key, val) {
    const e = this._els[key];
    if (e) e.textContent = String(val);
  }

  _setClass(key, cls) {
    const e = this._els[key];
    if (e) e.className = cls;
  }
}