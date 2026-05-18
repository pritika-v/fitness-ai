// Updates all the live stat elements in the DOM.
// Receives data — does zero computation.

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
  }

  setExercise(config, index, total) {
    this._set('exerciseName', config.name);
    this._set('progress', `Exercise ${index + 1} of ${total}`);
    this._set('goodReps', '0');
    this._set('badReps',  '0');
    this._set('phase',    '--');
    this.setStatus(config.startPositionHint ?? 'Get into position.', 'warn');
  }

  onFrame({ goodReps, badReps, phase, isReady, inPos, setup, measurements }) {
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

    if (setup && !setup.ok) {
      this._set('bodyVis', '✗ Adjust');
      this._setClass('bodyVis', 'val red');
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