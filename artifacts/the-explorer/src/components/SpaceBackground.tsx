import React, { useEffect, useRef } from 'react';

// ─── Static star cache (generated once per viewport size) ─────────────────────
let starCache: { x: number; y: number; r: number; base: number; phase: number }[] | null = null;
let brightCache: { x: number; y: number; r: number; col: string; phase: number }[] | null = null;
let lastW = 0, lastH = 0;

function buildCaches(w: number, h: number) {
  if (w === lastW && h === lastH) return;
  lastW = w; lastH = h;

  // Only 350 stars — subtle field, not overwhelming
  starCache = Array.from({ length: 350 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: 0.4 + Math.random() * Math.random() * 1.6,
    base: 0.4 + Math.random() * 0.55,
    phase: Math.random() * Math.PI * 2,
  }));

  // Only 6 bright foreground stars with diffraction spikes
  const cols = ['#ffffff', '#cce4ff', '#fff4e0', '#ffd6aa'];
  brightCache = Array.from({ length: 6 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: 2.2 + Math.random() * 1.8,
    col: cols[Math.floor(Math.random() * cols.length)],
    phase: Math.random() * Math.PI * 2,
  }));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function rgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function nebula(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  rw: number, rh: number,
  hex: string,
  alpha: number,
) {
  const r = Math.max(rw, rh) * 0.5;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0,    rgba(hex, alpha));
  g.addColorStop(0.35, rgba(hex, alpha * 0.55));
  g.addColorStop(0.65, rgba(hex, alpha * 0.20));
  g.addColorStop(1,    'rgba(0,0,0,0)');
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(rw / r, rh / r);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

// ─── Full frame draw ──────────────────────────────────────────────────────────
function draw(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  // 1. Base
  ctx.fillStyle = '#010210';
  ctx.fillRect(0, 0, w, h);

  // 2. Milky-way band (diagonal, one draw)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const mw = ctx.createLinearGradient(w * 0.05, h * 0.1, w * 0.95, h * 0.9);
  mw.addColorStop(0,    'rgba(0,0,0,0)');
  mw.addColorStop(0.22, 'rgba(28,36,100,0.20)');
  mw.addColorStop(0.38, 'rgba(48,55,150,0.32)');
  mw.addColorStop(0.50, 'rgba(60,70,190,0.38)');
  mw.addColorStop(0.62, 'rgba(48,55,150,0.32)');
  mw.addColorStop(0.78, 'rgba(28,36,100,0.20)');
  mw.addColorStop(1,    'rgba(0,0,0,0)');
  ctx.fillStyle = mw;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // 3. Nebulae — slow breath
  const b1 = 1 + 0.03 * Math.sin(t * 0.08);
  const b2 = 1 + 0.025 * Math.sin(t * 0.065 + 1.2);

  ctx.globalCompositeOperation = 'screen';

  // Violet/indigo — upper left (where VARSHINI lives)
  nebula(ctx, w * 0.20, h * 0.28, w * 0.52 * b1, h * 0.48 * b1, '#281060', 0.90);
  nebula(ctx, w * 0.10, h * 0.34, w * 0.32,       h * 0.34,       '#3a1580', 0.68);
  nebula(ctx, w * 0.30, h * 0.18, w * 0.26,       h * 0.24,       '#5022aa', 0.48);

  // Cyan/teal — right (where MUPPALA lives)
  nebula(ctx, w * 0.80, h * 0.60, w * 0.44 * b2, h * 0.40 * b2, '#002244', 0.92);
  nebula(ctx, w * 0.88, h * 0.48, w * 0.32,       h * 0.28,       '#003366', 0.72);
  nebula(ctx, w * 0.66, h * 0.70, w * 0.28,       h * 0.26,       '#004455', 0.55);

  // Magenta accent — centre
  nebula(ctx, w * 0.50, h * 0.50, w * 0.28,       h * 0.26,       '#3a0020', 0.62);

  // Deep blue — top right
  nebula(ctx, w * 0.74, h * 0.16, w * 0.30,       h * 0.22,       '#0a1a5a', 0.70);

  // Indigo — lower left
  nebula(ctx, w * 0.16, h * 0.74, w * 0.32,       h * 0.26,       '#180a44', 0.55);

  ctx.globalCompositeOperation = 'source-over';

  // 4. Stars — very subtle twinkle (amplitude 0.08, not 0.4)
  if (starCache) {
    for (const s of starCache) {
      const tw = s.base + 0.08 * Math.sin(t * 0.9 + s.phase);
      ctx.globalAlpha = tw;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 5. "VARSHINI MUPPALA" — the Easter egg ─────────────────────────────────
  drawName(ctx, w, h, t);

  // 6. Bright foreground stars (only 6) — very gentle twinkle
  if (brightCache) {
    ctx.globalCompositeOperation = 'screen';
    for (const s of brightCache) {
      const tw = 0.80 + 0.12 * Math.sin(t * 0.7 + s.phase);
      // cross
      ctx.globalAlpha = tw * 0.28;
      ctx.strokeStyle = s.col;
      ctx.lineWidth = 0.7;
      const cl = s.r * 4.5;
      ctx.beginPath(); ctx.moveTo(s.x - cl, s.y); ctx.lineTo(s.x + cl, s.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s.x, s.y - cl); ctx.lineTo(s.x, s.y + cl); ctx.stroke();
      // core glow
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3.5);
      g.addColorStop(0, s.col);
      g.addColorStop(0.4, rgba('#6688ff', 0.45));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = tw;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

function drawName(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.textAlign = 'center';

  // Slow pulse — 30-second cycle
  const pulse = 0.20 + 0.05 * Math.sin(t * 0.21);

  // ── Primary: large "VARSHINI" in violet nebula (upper-centre-left) ─────────
  const sz1 = Math.max(22, Math.floor(w * 0.052));
  ctx.font = `200 ${sz1}px "Helvetica Neue", Arial, sans-serif`;
  ctx.letterSpacing = `${Math.max(4, Math.floor(w * 0.008))}px`;
  ctx.fillStyle = '#9966ee';
  ctx.globalAlpha = pulse;
  ctx.fillText('VARSHINI', w * 0.26, h * 0.36);

  // ── Primary: "MUPPALA" in cyan nebula (right) ─────────────────────────────
  const sz2 = Math.max(20, Math.floor(w * 0.048));
  ctx.font = `200 ${sz2}px "Helvetica Neue", Arial, sans-serif`;
  ctx.letterSpacing = `${Math.max(4, Math.floor(w * 0.007))}px`;
  ctx.fillStyle = '#3399cc';
  ctx.globalAlpha = pulse * 0.90;
  ctx.fillText('MUPPALA', w * 0.78, h * 0.60);

  // ── Secondary: full name, small, scattered ────────────────────────────────
  const sz3 = Math.max(11, Math.floor(w * 0.020));
  ctx.font = `300 ${sz3}px "Helvetica Neue", Arial, sans-serif`;
  ctx.letterSpacing = `${Math.max(2, Math.floor(w * 0.003))}px`;

  ctx.fillStyle = '#6644aa';
  ctx.globalAlpha = pulse * 0.55;
  ctx.fillText('VARSHINI MUPPALA', w * 0.56, h * 0.20);

  ctx.fillStyle = '#224466';
  ctx.globalAlpha = pulse * 0.48;
  ctx.fillText('VARSHINI MUPPALA', w * 0.40, h * 0.78);

  // ── Tertiary: giant near-invisible ghost behind everything ─────────────────
  const sz4 = Math.max(36, Math.floor(w * 0.075));
  ctx.font = `100 ${sz4}px "Helvetica Neue", Arial, sans-serif`;
  ctx.letterSpacing = `${Math.max(6, Math.floor(w * 0.010))}px`;

  ctx.fillStyle = '#aa77ff';
  ctx.globalAlpha = 0.032 + 0.008 * Math.sin(t * 0.07);
  ctx.fillText('VARSHINI', w * 0.38, h * 0.52);

  ctx.fillStyle = '#4488bb';
  ctx.globalAlpha = 0.028 + 0.006 * Math.sin(t * 0.055 + 0.9);
  ctx.fillText('MUPPALA', w * 0.62, h * 0.48);

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SpaceBackground() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const startRef   = useRef(Date.now());
  const lastDrawRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      starCache   = null;   // rebuild on next frame
      brightCache = null;
      buildCaches(canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    let raf: number;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = (Date.now() - startRef.current) / 1000;
      buildCaches(canvas.width, canvas.height);
      draw(ctx, canvas.width, canvas.height, t);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  );
}
