// Emberdeck — audio.js
// Tiny WebAudio-synthesized SFX, no external audio files (keeps the game
// fully offline). AudioContext is created lazily on first user gesture to
// respect browser autoplay policies; calls before that are silently no-ops.
(function () {
  var ED = (window.ED = window.ED || {});

  var ctx = null;

  function ensureCtx() {
    if (ctx) return ctx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function beep(freq, durationMs, type, gainValue) {
    var c = ensureCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(function () {});
    try {
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = type || 'square';
      osc.frequency.value = freq;
      gain.gain.value = gainValue || 0.05;
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + durationMs / 1000);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + durationMs / 1000);
    } catch (e) {
      // ignore — audio is a nice-to-have, never fatal
    }
  }

  var Audio2 = {
    unlock: function () {
      ensureCtx();
    },
    jump: function () {
      beep(520, 90, 'square', 0.04);
    },
    attack: function () {
      beep(300, 70, 'sawtooth', 0.05);
    },
    hit: function () {
      beep(120, 120, 'square', 0.06);
    },
    pickup: function () {
      beep(700, 100, 'triangle', 0.05);
    },
    save: function () {
      beep(880, 200, 'sine', 0.05);
    },
    chest: function () {
      beep(600, 260, 'triangle', 0.06);
    },
    menuMove: function () {
      beep(400, 40, 'square', 0.03);
    },
    menuConfirm: function () {
      beep(650, 80, 'square', 0.04);
    },
  };

  ED.Audio = Audio2;
})();
