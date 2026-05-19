// ui/feedbackPanel.js
const RANK = { high: 3, medium: 2, low: 1 };

export class FeedbackPanel {
  constructor(elementId = 'form-feedback') {
    this._el = document.getElementById(elementId);
  }

  onRep(evt) {
    if (!this._el) return;

    // Hold-mode events
    if (evt.type === 'HOLDING') {
      // HoldTimerUI handles visual — feedbackPanel stays silent during active hold
      return;
    }

    if (evt.type === 'HOLD_WAITING') {
      const sorted = this._sort(evt.issues).slice(0, 2);
      const msgs   = sorted.map(i => `<span class="tip">• ${i.message}</span>`).join('<br>');
      this._el.innerHTML = msgs
        ? `<span class="warn">⚠ Fix before timer starts:</span><br>${msgs}`
        : `<span class="warn">⚠ Get into plank position to start timer</span>`;
      return;
    }

    if (evt.type === 'HOLD_BROKEN') {
      const sorted = this._sort(evt.issues).slice(0, 2);
      const msgs   = sorted.map(i => `<span class="tip">• ${i.message}</span>`).join('<br>');
      this._el.innerHTML = `<span class="bad">✗ Hold broken — timer reset:</span><br>${msgs}`;
      return;
    }

    // Rep-mode events
    const sorted = this._sort(evt.issues ?? []).slice(0, 3);

    if (evt.type === 'GOOD_REP') {
      if (evt.quality === 'good') {
        this._el.innerHTML = evt.issues?.length === 0
          ? '<span class="good">✓ Perfect hold! Great job.</span>'
          : '<span class="good">✓ Perfect rep!</span>';
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

  _sort(issues) {
    return [...issues].sort((a, b) => (RANK[b.severity] ?? 0) - (RANK[a.severity] ?? 0));
  }
}