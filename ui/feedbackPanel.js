// Renders form feedback after each rep.

const RANK = { high: 3, medium: 2, low: 1 };

export class FeedbackPanel {
  constructor(elementId = 'form-feedback') {
    this._el = document.getElementById(elementId);
  }

  onRep(evt) {
    if (!this._el) return;
    const sorted = [...(evt.issues ?? [])]
      .sort((a, b) => RANK[b.severity] - RANK[a.severity])
      .slice(0, 3);

    if (evt.type === 'HOLD_BROKEN') {
      const msgs = sorted.map(i => `<span class="tip">• ${i.message}</span>`).join('<br>');
      this._el.innerHTML = `<span class="warn">⚠ Hold broken:</span><br>${msgs}`;
      return;
    }

    if (evt.type === 'HOLDING') {
      const sec = Math.ceil(evt.remaining / 1000);
      this._el.innerHTML = `<span class="good">⏱ Holding… ${sec}s remaining</span>`;
      return;
    }

    if (evt.type === 'GOOD_REP') {
      if (evt.quality === 'good') {
        this._el.innerHTML = '<span class="good">✓ Perfect rep!</span>';
      } else {
        const tips = sorted.map(i => `<span class="tip">• ${i.message}</span>`).join('<br>');
        this._el.innerHTML = `<span class="warn">✓ Good rep</span> — tips:<br>${tips}`;
      }
    } else {
      const msgs = sorted.map(i => `<span class="tip">• ${i.message}</span>`).join('<br>');
      this._el.innerHTML = `<span class="bad">✗ Needs work:</span><br>${msgs}`;
    }
  }

  setMessage(html) {
    if (this._el) this._el.innerHTML = html;
  }
}