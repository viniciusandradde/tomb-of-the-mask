/* Escudos cosméticos. A carga e a proteção continuam compartilhadas entre os temas. */
(function (root) {
  'use strict';
  const G = root.Game.prototype, F = root.PixelFont;
  const themes = [
    { id: 'agua', name: 'Água', color: '#69dcff', light: '#dcfaff', icon: ['00100','00100','01110','11111','01110'] },
    { id: 'fogo', name: 'Fogo', color: '#ff7740', light: '#ffdf79', icon: ['00100','00101','10111','11111','01110'] },
    { id: 'choque', name: 'Choque', color: '#f098ff', light: '#ffe6ff', icon: ['10101','01010','10101','01010','10101'] },
    { id: 'raio', name: 'Raio', color: '#ffe056', light: '#fff7c3', icon: ['00111','01110','11111','00110','01100'] },
    { id: 'trovao', name: 'Trovão', color: '#ad9bff', light: '#e4dcff', icon: ['01100','11110','11111','00000','10101'] },
    { id: 'gelo', name: 'Gelo', color: '#9ef4ee', light: '#ffffff', icon: ['10101','01110','11111','01110','10101'] },
    { id: 'folha', name: 'Folha', color: '#8ce57c', light: '#e4ffa7', icon: ['00111','01101','11011','10110','11000'] },
    { id: 'cristal', name: 'Cristal', color: '#ff92bc', light: '#ffdeef', icon: ['00100','01110','11111','01110','00100'] },
  ];

  G.shieldTheme = function () {
    return themes.find(theme => theme.id === this.save.shieldTheme) || themes[0];
  };

  function drawIcon(ctx, theme, x, y, pixel) {
    for (let row = 0; row < theme.icon.length; row++) {
      for (let col = 0; col < theme.icon[row].length; col++) {
        if (theme.icon[row][col] === '0') continue;
        ctx.fillStyle = col + row < 4 ? theme.light : theme.color;
        ctx.fillRect(Math.round(x + (col - 2.5) * pixel), Math.round(y + (row - 2.5) * pixel), pixel, pixel);
      }
    }
  }

  const waves = { agua: 3, fogo: 9, choque: 14, raio: 5, trovao: 4, gelo: 6, folha: 2, cristal: 4 };
  G.drawShieldAura = function (cx, cy, radius, theme) {
    const ctx = this.ctx, time = this.t;
    const facets = theme.id === 'gelo' || theme.id === 'cristal';
    const points = facets ? waves[theme.id] : 72;
    ctx.save();
    ctx.lineWidth = Math.max(1.5, radius * 0.09);
    ctx.strokeStyle = theme.color;
    ctx.shadowColor = theme.color;
    ctx.shadowBlur = radius * 0.32;
    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const angle = i * Math.PI * 2 / points - Math.PI / 2;
      const wave = Math.sin(angle * waves[theme.id] - time * 4);
      const r = radius * (1 + 0.08 * wave);
      const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    if (theme.id === 'trovao') {
      ctx.globalAlpha = 0.5 - (time % 1) * 0.45;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * (1.05 + (time % 1) * 0.3), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < 3; i++) {
      const angle = time * 1.5 + i * Math.PI * 2 / 3;
      drawIcon(ctx, theme, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, Math.max(1, Math.round(radius / 11)));
    }
    ctx.restore();
  };

  G.activateShield = function () {
    const theme = this.shieldTheme(), p = this.player;
    p.shield = 1;
    this.audio.powerup();
    this.burst(p.x, p.y, 14, theme.color, 2.5);
    this.toastMsg('ESCUDO DE ' + theme.name + '!');
  };

  G.renderShieldThemes = function (top, bottom) {
    const ctx = this.ctx, cx = this.W / 2, current = this.shieldTheme();
    const columns = this.W > this.H ? 4 : 2;
    const rows = themes.length / columns;
    const width = Math.min(this.W - 20, 600);
    const height = Math.min(82, (bottom - top) / rows);
    const cell = width / columns;
    themes.forEach((theme, i) => {
      const x = cx - width / 2 + (i % columns) * cell, y = top + Math.floor(i / columns) * height;
      const selected = current === theme;
      ctx.fillStyle = selected ? '#352846' : '#151123';
      ctx.fillRect(x + 2, y + 2, cell - 4, height - 4);
      ctx.strokeStyle = selected ? theme.color : '#564765';
      ctx.lineWidth = selected ? 3 : 1;
      ctx.strokeRect(x + 3, y + 3, cell - 6, height - 6);
      const radius = Math.min(height * 0.27, cell * 0.12);
      this.drawShieldAura(x + cell * 0.22, y + height / 2, radius, theme);
      drawIcon(ctx, theme, x + cell * 0.22, y + height / 2, Math.max(1, Math.floor(radius / 6)));
      F.text(ctx, theme.name, x + cell * 0.4, y + height / 2 - 7, Math.min(2, this.ui), theme.light, 'left');
      if (selected) F.text(ctx, 'EQUIPADO', x + cell * 0.4, y + height / 2 + 10, 1, theme.color, 'left');
      const id = 'shield-' + theme.id;
      if (!this.buttons.some(b => b.id === id)) this.buttons.push({ id, x, y, w: cell, h: height, fn: () => {
        this.save.shieldTheme = theme.id;
        this.saveNow();
      } });
    });
  };
})(window);
