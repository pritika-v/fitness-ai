// ui/holdTimerUI.js
// Manages the circular hold-timer overlay shown during plank (and any future hold exercise).
// Shows a ring that fills as the person holds, a countdown number in the centre,
// and flashes red when the hold breaks.

export class HoldTimerUI {
  constructor(containerId = 'hold-timer-container') {
    this._container = document.getElementById(containerId);
    this._visible   = false;
  }

  // Call when a hold exercise starts
  show() {
    if (this._container) {
      this._container.style.display = 'flex';
      this._visible = true;
      this._setRing(0, '--');
      this._setLabel('Get into position…', '#aaa');
      this._clearFlash();
    }
  }

  // Call when the hold exercise ends (or workout moves on)
  hide() {
    if (this._container) {
      this._container.style.display = 'none';
      this._visible = false;
    }
  }

  // Called every frame while holding — progress 0.0→1.0, remainingSeconds = integer
  onHolding(progress, remainingSeconds) {
    if (!this._visible) return;
    this._clearFlash();
    this._setRing(progress, remainingSeconds);
    this._setLabel('Keep holding!', '#4cde7a');
  }

  // Called when form breaks mid-hold
  onHoldBroken(message) {
    if (!this._visible) return;
    this._setRing(0, '—');
    this._setLabel(message ?? 'Fix form to restart timer', '#ff5c5c');
    this._flash();
  }

  // Called when form is bad before hold even starts
  onWaiting(issues) {
    if (!this._visible) return;
    this._clearFlash();
    const top = issues?.[0];
    this._setRing(0, '—');
    this._setLabel(top ? top.message : 'Get into plank position', '#f5c842');
  }

  // Called when hold completes
  onComplete() {
    if (!this._visible) return;
    this._clearFlash();
    this._setRing(1, '✓');
    this._setLabel('Hold complete! Great job.', '#4cde7a');
  }

  // ── private helpers ───────────────────────────────────────────────

  _setRing(progress, label) {
    const circle = this._container?.querySelector('.hold-ring-progress');
    const num    = this._container?.querySelector('.hold-ring-number');
    if (!circle || !num) return;

    // SVG circle: circumference = 2π × r = 2π × 52 ≈ 326.7
    const C   = 326.7;
    const off = C * (1 - Math.min(1, Math.max(0, progress)));
    circle.style.strokeDashoffset = off;
    circle.style.stroke = progress >= 1 ? '#4cde7a' : progress === 0 ? '#333' : '#f5a623';
    num.textContent = label;
  }

  _setLabel(text, color) {
    const lbl = this._container?.querySelector('.hold-label');
    if (!lbl) return;
    lbl.textContent = text;
    lbl.style.color = color;
  }

  _flash() {
    this._container?.classList.add('hold-flash');
  }

  _clearFlash() {
    this._container?.classList.remove('hold-flash');
  }
}