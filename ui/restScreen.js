// Shows/hides the rest period overlay and countdown.

export class RestScreen {
  constructor(elementId = 'rest-overlay') {
    this._el          = document.getElementById(elementId);
    this._countdown   = document.getElementById('rest-countdown');
    this._nextName    = document.getElementById('next-exercise-name');
  }

  show(restSeconds, nextExerciseName) {
    if (this._nextName)  this._nextName.textContent  = `Next: ${nextExerciseName}`;
    if (this._countdown) this._countdown.textContent = restSeconds;
    if (this._el)        this._el.style.display = 'flex';
  }

  tick(remaining) {
    if (this._countdown) this._countdown.textContent = remaining;
  }

  hide() {
    if (this._el) this._el.style.display = 'none';
  }
}