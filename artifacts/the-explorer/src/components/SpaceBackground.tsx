import React, { useEffect, useRef } from 'react';

const NAME = 'VARSHINI MUPPALA';

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.clearRect(0, 0, w, h);

  // ── Deep space base ──────────────────────────────────────────────
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.9);
  bg.addColorStop(0,   '#03061a');
  bg.addColorStop(0.4, '#010410');
  bg.addColorStop(1,   '#000208');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // ── Milky Way band ───────────────────────────────────────────────
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const mwGrad = ctx.createLinearGradient(w * 0.02, h * 0.08, w * 0.98, h * 0.92);
  mwGrad.addColorStop(0,    'rgba(10,15,50,0)');
  mwGrad.addColorStop(0.18, 'rgba(30,40,100,0.18)');
  mwGrad.addColorStop(0.32, 'rgba(55,60,160,0.28)');
  mwGrad.addColorStop(0.5,  'rgba(70,80,200,0.35)');
  mwGrad.addColorStop(0.68, 'rgba(55,60,160,0.28)');
  mwGrad.addColorStop(0.82, 'rgba(30,40,100,0.18)');
  mwGrad.addColorStop(1,    'rgba(10,15,50,0)');
  ctx.fillStyle = mwGrad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // ── Main nebulae ─────────────────────────────────────────────────
  ctx.globalCompositeOperation = 'screen';

  const breath = 1 + 0.04 * Math.sin(t * 0.12);
  const breath2 = 1 + 0.03 * Math.sin(t * 0.09 + 1.5);

  // Nebula A — large violet/indigo (upper left + center)
  drawNebula(ctx, w * 0.22, h * 0.28, w * 0.55 * breath, h * 0.50 * breath, '#2A1260', 0.85);
  drawNebula(ctx, w * 0.12, h * 0.35, w * 0.38, h * 0.38, '#3D1888', 0.65);
  drawNebula(ctx, w * 0.32, h * 0.20, w * 0.28, h * 0.28, '#5522AA', 0.45);

  // Nebula B — cyan/teal (right + lower right)
  drawNebula(ctx, w * 0.78, h * 0.62, w * 0.48 * breath2, h * 0.42 * breath2, '#002244', 0.90);
  drawNebula(ctx, w * 0.85, h * 0.50, w * 0.35, h * 0.32, '#003366', 0.70);
  drawNebula(ctx, w * 0.65, h * 0.72, w * 0.30, h * 0.28, '#004455', 0.55);

  // Nebula C — magenta accent (center)
  drawNebula(ctx, w * 0.50, h * 0.50, w * 0.30, h * 0.28, '#3A0022', 0.60);
  drawNebula(ctx, w * 0.58, h * 0.42, w * 0.22, h * 0.22, '#4A0030', 0.45);

  // Nebula D — deep blue streaks (top right)
  drawNebula(ctx, w * 0.72, h * 0.18, w * 0.32, h * 0.25, '#0A1A5A', 0.70);
  drawNebula(ctx, w * 0.82, h * 0.12, w * 0.24, h * 0.20, '#102260', 0.50);

  // Nebula E — indigo (lower left)
  drawNebula(ctx, w * 0.18, h * 0.72, w * 0.35, h * 0.28, '#180A44', 0.55);

  ctx.globalCompositeOperation = 'source-over';

  // ── Stars ────────────────────────────────────────────────────────
  drawStars(ctx, w, h, t);

  // ── "VARSHINI MUPPALA" embedded in nebulae ───────────────────────
  drawName(ctx, w, h, t);

  // ── Bright foreground stars ──────────────────────────────────────
  drawBrightStars(ctx, w, h, t);
}

function drawNebula(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  rw: number, rh: number,
  color: string,
  alpha: number
) {
  const r = Math.max(rw, rh) * 0.5;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0,    hexToRgba(color, alpha * 0.9));
  grad.addColorStop(0.3,  hexToRgba(color, alpha * 0.55));
  grad.addColorStop(0.6,  hexToRgba(color, alpha * 0.22));
  grad.addColorStop(0.85, hexToRgba(color, alpha * 0.07));
  grad.addColorStop(1,    'rgba(0,0,0,0)');

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(rw / r, rh / r);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Pre-generated star positions
let starCache: { x: number; y: number; size: number; brightness: number; phase: number }[] | null = null;

function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  if (!starCache) {
    starCache = Array.from({ length: 2800 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.3 + Math.random() * Math.random() * 2.2,
      brightness: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  for (const s of starCache) {
    const twinkle = s.brightness * (0.6 + 0.4 * Math.sin(t * (0.8 + s.phase * 0.5) + s.phase));
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

let brightStarCache: { x: number; y: number; size: number; color: string; phase: number }[] | null = null;

function drawBrightStars(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const colors = ['#ffffff', '#aaccff', '#ffeedd', '#ffcc99', '#cceeff'];
  if (!brightStarCache) {
    brightStarCache = Array.from({ length: 35 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 1.5 + Math.random() * 2.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      phase: Math.random() * Math.PI * 2,
    }));
  }

  for (const s of brightStarCache) {
    const twinkle = 0.7 + 0.3 * Math.sin(t * 1.2 + s.phase);
    const sx = s.x * w;
    const sy = s.y * h;

    // Diffraction cross
    const crossLen = s.size * 4;
    ctx.globalAlpha = twinkle * 0.4;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx - crossLen, sy);
    ctx.lineTo(sx + crossLen, sy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx, sy - crossLen);
    ctx.lineTo(sx, sy + crossLen);
    ctx.stroke();

    // Core
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.size * 3);
    grad.addColorStop(0, s.color);
    grad.addColorStop(0.3, hexToRgba('#88aaff', 0.5));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, s.size * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawName(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  // The name is drawn multiple ways — large ghost text AND stars forming letters

  ctx.globalCompositeOperation = 'screen';

  // Large background ghost text — woven into nebula A (violet)
  const namePulse = 0.055 + 0.015 * Math.sin(t * 0.2);
  const fontSize1 = Math.max(28, Math.floor(w * 0.065));
  ctx.font = `100 ${fontSize1}px "Helvetica Neue", Arial, sans-serif`;
  ctx.letterSpacing = `${Math.floor(w * 0.008)}px`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7744CC';
  ctx.globalAlpha = namePulse;
  ctx.fillText('VARSHINI', w * 0.28, h * 0.38);

  // Name in cyan area (nebula B)
  ctx.fillStyle = '#2288BB';
  ctx.globalAlpha = namePulse * 0.9;
  ctx.fillText('MUPPALA', w * 0.72, h * 0.62);

  // Smaller repeat — scattered across scene for depth
  const fontSize2 = Math.max(14, Math.floor(w * 0.028));
  ctx.font = `100 ${fontSize2}px "Helvetica Neue", Arial, sans-serif`;

  ctx.fillStyle = '#5533AA';
  ctx.globalAlpha = namePulse * 0.45;
  ctx.fillText('VARSHINI MUPPALA', w * 0.55, h * 0.22);

  ctx.fillStyle = '#113366';
  ctx.globalAlpha = namePulse * 0.40;
  ctx.fillText('VARSHINI MUPPALA', w * 0.38, h * 0.78);

  // Very large barely-visible ghost
  const fontSize3 = Math.max(48, Math.floor(w * 0.10));
  ctx.font = `100 ${fontSize3}px "Helvetica Neue", Arial, sans-serif`;
  ctx.globalAlpha = 0.022 + 0.008 * Math.sin(t * 0.08);
  ctx.fillStyle = '#9966FF';
  ctx.fillText('VARSHINI', w * 0.35, h * 0.55);

  ctx.globalAlpha = 0.018 + 0.006 * Math.sin(t * 0.06 + 1.0);
  ctx.fillStyle = '#3388CC';
  ctx.fillText('MUPPALA', w * 0.65, h * 0.5);

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Clear caches on resize so positions recalculate
      starCache = null;
      brightStarCache = null;
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      const t = (Date.now() - startRef.current) / 1000;
      drawBackground(ctx, canvas.width, canvas.height, t);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
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
      }}
    />
  );
}
