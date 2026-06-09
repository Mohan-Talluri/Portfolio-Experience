import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  brightness: number;
}

export default function StardustTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];
    const MAX_PARTICLES = 120;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let prevX = mouseX;
    let prevY = mouseY;
    let velX = 0;
    let velY = 0;
    let isMoving = false;
    let moveTimer: ReturnType<typeof setTimeout>;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e: MouseEvent | TouchEvent) => {
      const x = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      velX = x - prevX;
      velY = y - prevY;
      prevX = x;
      prevY = y;
      mouseX = x;
      mouseY = y;

      const speed = Math.sqrt(velX * velX + velY * velY);

      // Emit very subtle dust — only when moving fast enough
      if (speed > 3 && particles.length < MAX_PARTICLES) {
        const count = Math.min(4, Math.floor(speed * 0.12));
        for (let i = 0; i < count; i++) {
          // Dust drifts slightly opposite to motion, then slowly dissipates
          const spread = (Math.random() - 0.5);
          const backAngle = Math.atan2(velY, velX) + Math.PI + spread * 0.8;
          const spd = Math.random() * 0.5 + 0.1;

          particles.push({
            x: x + (Math.random() - 0.5) * 6,
            y: y + (Math.random() - 0.5) * 6,
            vx: Math.cos(backAngle) * spd * (0.3 + Math.random() * 0.4),
            vy: Math.sin(backAngle) * spd * (0.3 + Math.random() * 0.4),
            size: 0.5 + Math.random() * 1.2,
            life: 1.0,
            maxLife: 1.2 + Math.random() * 1.8,
            brightness: 0.4 + Math.random() * 0.6,
          });
        }
      }

      isMoving = true;
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => { isMoving = false; }, 80);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Very slow fade
        p.life -= 0.016 / p.maxLife;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        // Slow drift — no gravity
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;

        // Eased opacity — quick fade in, slow fade out
        const lifeFraction = p.life;
        const alpha = lifeFraction < 0.15
          ? lifeFraction / 0.15
          : Math.pow(lifeFraction, 1.4);

        // Monochromatic — slight blue-white tint for cosmic feel
        const lum = Math.floor(200 + p.brightness * 55);
        const b = Math.floor(220 + p.brightness * 35);

        ctx.globalAlpha = alpha * p.brightness * 0.6;
        ctx.fillStyle = `rgb(${lum},${lum},${b})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * lifeFraction, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      clearTimeout(moveTimer);
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
        pointerEvents: 'none',
        zIndex: 60,
      }}
    />
  );
}
