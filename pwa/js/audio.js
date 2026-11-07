/*
 * audio.js — efeitos sonoros e música chiptune 100% sintetizados com WebAudio.
 * Nenhum arquivo de áudio é carregado: tudo é gerado em tempo real.
 */
(function (root) {
  'use strict';

  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI -> Hz

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.sfxGain = null;
      this.musicGain = null;
      this.sfxOn = true;
      this.musicOn = true;
      this.volume = 0.8;
      this.music = null; // estado do sequenciador
      this.comboPitch = 0;
      this.lastDot = 0;
    }

    // Deve ser chamado a partir de um gesto do usuário (política dos navegadores)
    unlock() {
      if (!this.ctx) {
        const AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        // compressor leve para evitar estalos quando muitos sons tocam juntos
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -12; comp.ratio.value = 4;
        this.master.connect(comp).connect(this.ctx.destination);
        this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
        this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.55; this.musicGain.connect(this.master);
        this.noiseBuf = this.makeNoise();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.applyToggles();
    }

    applyToggles() {
      if (!this.ctx) return;
      this.sfxGain.gain.value = this.sfxOn ? 1 : 0;
      this.musicGain.gain.value = this.musicOn ? 0.55 : 0;
    }
    setSfx(on) { this.sfxOn = on; this.applyToggles(); }
    setMusic(on) { this.musicOn = on; this.applyToggles(); }

    makeNoise() {
      const len = this.ctx.sampleRate * 1.5;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    }

    // --- primitivas -----------------------------------------------------
    tone({ type = 'square', freq = 440, to = null, dur = 0.1, vol = 0.3, at = 0, dest = null, slide = 'exp', detune = 0 }) {
      if (!this.ctx) return;
      const t0 = this.ctx.currentTime + at;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0); o.detune.value = detune;
      if (to) {
        if (slide === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
        else o.frequency.linearRampToValueAtTime(to, t0 + dur);
      }
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(dest || this.sfxGain);
      o.start(t0); o.stop(t0 + dur + 0.02);
    }
    noise({ dur = 0.2, vol = 0.3, at = 0, hp = 800, lp = 8000, dest = null }) {
      if (!this.ctx) return;
      const t0 = this.ctx.currentTime + at;
      const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
      const f1 = this.ctx.createBiquadFilter(); f1.type = 'highpass'; f1.frequency.value = hp;
      const f2 = this.ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f1).connect(f2).connect(g).connect(dest || this.sfxGain);
      s.start(t0); s.stop(t0 + dur + 0.02);
    }

    // --- efeitos ---------------------------------------------------------
    move() { this.noise({ dur: 0.08, vol: 0.12, hp: 1500, lp: 6000 }); this.tone({ type: 'triangle', freq: 220, to: 110, dur: 0.07, vol: 0.12 }); }
    bump() { this.tone({ type: 'square', freq: 140, to: 70, dur: 0.08, vol: 0.18 }); this.noise({ dur: 0.06, vol: 0.1, hp: 300, lp: 2000 }); }
    dot() {
      const now = performance.now();
      this.comboPitch = now - this.lastDot < 350 ? Math.min(this.comboPitch + 1, 14) : 0;
      this.lastDot = now;
      const f = NOTE(76 + this.comboPitch);
      this.tone({ type: 'square', freq: f, dur: 0.07, vol: 0.14 });
      this.tone({ type: 'square', freq: f * 2, dur: 0.05, vol: 0.05, at: 0.01 });
    }
    coin() {
      this.tone({ type: 'square', freq: NOTE(88), dur: 0.09, vol: 0.2 });
      this.tone({ type: 'square', freq: NOTE(95), dur: 0.25, vol: 0.2, at: 0.08 });
      this.tone({ type: 'triangle', freq: NOTE(100), dur: 0.3, vol: 0.12, at: 0.1 });
    }
    powerup() {
      for (let i = 0; i < 6; i++) this.tone({ type: 'square', freq: NOTE(72 + i * 3), dur: 0.08, vol: 0.14, at: i * 0.05 });
    }
    shieldHit() { this.tone({ type: 'sawtooth', freq: 600, to: 150, dur: 0.25, vol: 0.25 }); this.noise({ dur: 0.2, vol: 0.2, hp: 200 }); }
    shoot() { this.tone({ type: 'square', freq: 900, to: 300, dur: 0.12, vol: 0.12 }); }
    death() {
      this.noise({ dur: 0.5, vol: 0.5, hp: 100, lp: 4000 });
      this.tone({ type: 'sawtooth', freq: 400, to: 40, dur: 0.6, vol: 0.35 });
      this.tone({ type: 'square', freq: 200, to: 30, dur: 0.5, vol: 0.25, at: 0.05 });
    }
    win() {
      const seq = [72, 76, 79, 84, 79, 84, 88];
      seq.forEach((n, i) => this.tone({ type: 'square', freq: NOTE(n), dur: i === seq.length - 1 ? 0.6 : 0.12, vol: 0.2, at: i * 0.09 }));
      seq.forEach((n, i) => this.tone({ type: 'triangle', freq: NOTE(n - 12), dur: 0.14, vol: 0.15, at: i * 0.09 }));
    }
    click() { this.tone({ type: 'square', freq: 660, dur: 0.05, vol: 0.12 }); }
    star(i) { this.tone({ type: 'square', freq: NOTE(84 + i * 4), dur: 0.2, vol: 0.2 }); this.noise({ dur: 0.08, vol: 0.08, hp: 3000 }); }
    lavaWarn() { this.tone({ type: 'square', freq: 110, to: 90, dur: 0.3, vol: 0.12 }); }
    unlock() { for (let i = 0; i < 4; i++) this.tone({ type: 'triangle', freq: NOTE(60 + i * 5), dur: 0.3, vol: 0.2, at: i * 0.12 }); }

    // --- música -----------------------------------------------------------
    // Cada "track" é gerada deterministicamente a partir de um seed, então
    // cada mundo tem seu tema próprio e sempre igual.
    startMusic(track) {
      if (!this.ctx) return;
      if (this.music && this.music.track === track) return;
      this.stopMusic();
      const R = root.Maze ? root.Maze.rng(1000 + track * 97) : Math.random;
      const rnd = typeof R === 'function' && R.int ? R : { int: (n) => Math.floor(Math.random() * n), chance: (p) => Math.random() < p, pick: (a) => a[Math.floor(Math.random() * a.length)] };
      const roots = [57, 55, 52, 50, 53, 59, 54, 48]; // A3, G3, E3, D3, F3, B3, F#3, C3
      const rootN = roots[track % roots.length];
      const minorPent = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22];
      const progression = rnd.pick([[0, -4, -7, -5], [0, -2, -4, -5], [0, 5, -4, -2], [0, -7, -4, -2]]);
      const bpm = 128 + (track % 4) * 8 + rnd.int(8);
      const step = 60 / bpm / 4; // semicolcheia
      // melodia: 4 compassos x 16 passos
      const melody = [];
      let idx = 4;
      for (let i = 0; i < 64; i++) {
        if (rnd.chance(0.3)) { melody.push(null); continue; }
        idx += rnd.pick([-2, -1, -1, 0, 1, 1, 2, 3]);
        idx = Math.max(0, Math.min(minorPent.length - 1, idx));
        melody.push(minorPent[idx]);
      }
      const bassPat = rnd.pick([[1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0], [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1], [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0]]);
      const arp = rnd.chance(0.6);
      this.music = { track, step, melody, bassPat, progression, rootN, arp, pos: 0, nextTime: this.ctx.currentTime + 0.1, timer: null };
      this.music.timer = setInterval(() => this.schedule(), 40);
    }
    stopMusic() {
      if (this.music) { clearInterval(this.music.timer); this.music = null; }
    }
    schedule() {
      const m = this.music; if (!m) return;
      const ahead = this.ctx.currentTime + 0.15;
      while (m.nextTime < ahead) {
        const t = m.nextTime - this.ctx.currentTime;
        const bar = Math.floor(m.pos / 16) % 4, s = m.pos % 16;
        const chordRoot = m.rootN + m.progression[bar];
        // bateria
        if (s % 8 === 0) this.tone({ type: 'sine', freq: 150, to: 40, dur: 0.12, vol: 0.5, at: t, dest: this.musicGain });
        if (s % 8 === 4) this.noise({ dur: 0.12, vol: 0.18, hp: 1500, lp: 9000, at: t, dest: this.musicGain });
        if (s % 2 === 1) this.noise({ dur: 0.03, vol: 0.07, hp: 6000, lp: 14000, at: t, dest: this.musicGain });
        // baixo
        if (m.bassPat[s]) this.tone({ type: 'square', freq: NOTE(chordRoot - 12), dur: m.step * 1.8, vol: 0.16, at: t, dest: this.musicGain });
        // arpejo de acompanhamento
        if (m.arp && s % 2 === 0) {
          const arpN = [0, 3, 7, 12][(s / 2) % 4];
          this.tone({ type: 'triangle', freq: NOTE(chordRoot + arpN), dur: m.step * 1.5, vol: 0.09, at: t, dest: this.musicGain });
        }
        // melodia
        const n = m.melody[m.pos % 64];
        if (n !== null && n !== undefined) {
          const f = NOTE(m.rootN + 12 + n);
          this.tone({ type: 'square', freq: f, dur: m.step * 1.6, vol: 0.11, at: t, dest: this.musicGain, detune: 4 });
          this.tone({ type: 'square', freq: f, dur: m.step * 1.6, vol: 0.06, at: t, dest: this.musicGain, detune: -6 });
        }
        m.nextTime += m.step;
        m.pos++;
      }
    }
  }

  root.AudioEngine = AudioEngine;
})(typeof self !== 'undefined' ? self : this);
