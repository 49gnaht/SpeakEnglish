/* Giả lập giọng nói cho test (chạy trước mọi script của trang qua addInitScript).
   - speechSynthesis: không phát ra tiếng, ~250 ms là xong; ghi lại vào window.__spoken.
   - SpeechRecognition: "nghe" được window.__say (một lần) hoặc lần lượt từng phần tử của window.__sayQueue.
     continuous = false: trả 1 câu rồi kết thúc. continuous = true: trả hết hàng đợi, chờ stop() mới kết thúc.
   - getUserMedia bị từ chối kiểu "không có micro" để trang bỏ qua phần thu âm. */
(() => {
  window.__spoken = [];
  let current = null;
  const synth = {
    speaking: false, pending: false, paused: false, onvoiceschanged: null,
    getVoices: () => [],   // không có giọng thật: trang dùng giọng mặc định
    speak(u) {
      window.__spoken.push({ text: u.text, rate: u.rate });
      const me = current = { u, cancelled: false };
      this.speaking = true;
      setTimeout(() => { if (!me.cancelled && u.onstart) u.onstart({}); }, 10);
      setTimeout(() => { if (!me.cancelled && u.onboundary) u.onboundary({ name: 'word', charIndex: 0 }); }, 40);
      setTimeout(() => {
        if (me.cancelled) return;
        this.speaking = false; current = null;
        if (u.onend) u.onend({});
      }, 250);
    },
    cancel() {
      if (current) { current.cancelled = true; current = null; }
      this.speaking = false;
    },
    pause() {}, resume() {},
    addEventListener() {}, removeEventListener() {}
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });

  class MockSR {
    constructor() { this.lang = 'en-US'; this.continuous = false; this.interimResults = false; this.maxAlternatives = 1; this._ended = false; this._results = []; }
    _emit(text) {
      const alt = { transcript: text, confidence: 0.9 };
      const res = [alt]; res.isFinal = true; res.length = 1;
      this._results.push(res);
      if (this.onresult) this.onresult({ resultIndex: this._results.length - 1, results: this._results });
    }
    _end() { if (this._ended) return; this._ended = true; setTimeout(() => this.onend && this.onend({}), 10); }
    start() {
      setTimeout(() => this.onstart && this.onstart({}), 5);
      setTimeout(() => {
        if (this._ended) return;
        if (this.continuous) {
          const q = window.__sayQueue || [];
          while (q.length) { const t = q.shift(); if (t) this._emit(t); }
          return;   // chờ stop()
        }
        let t;
        if (Array.isArray(window.__sayQueue) && window.__sayQueue.length) t = window.__sayQueue.shift();
        else t = window.__say || '';
        if (t) this._emit(t); else if (this.onerror) this.onerror({ error: 'no-speech' });
        this._end();
      }, 120);
    }
    stop() { this._end(); }
    abort() { if (this.onerror) this.onerror({ error: 'aborted' }); this._end(); }
  }
  window.SpeechRecognition = MockSR;
  window.webkitSpeechRecognition = MockSR;

  if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('no mic in tests'), { name: 'NotFoundError' }));
  }
})();
