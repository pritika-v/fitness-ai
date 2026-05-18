// Simple countdown timer that fires 'tick' every second and 'complete' at zero.

export class RestTimer extends EventTarget {
  constructor() {
    super();
    this._interval  = null;
    this.remaining  = 0;
  }

  start(seconds) {
    this.stop();
    this.remaining = seconds;
    this._fire();
    this._interval = setInterval(() => {
      this.remaining--;
      this._fire();
      if (this.remaining <= 0) {
        this.stop();
        this.dispatchEvent(new Event('complete'));
      }
    }, 1000);
  }

  stop() {
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
  }

  _fire() {
    this.dispatchEvent(Object.assign(new Event('tick'), { remaining: this.remaining }));
  }
}