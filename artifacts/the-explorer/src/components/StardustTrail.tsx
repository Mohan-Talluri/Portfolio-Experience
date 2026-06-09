import React, { useEffect, useRef } from 'react';

export default function StardustTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: {x: number, y: number, vx: number, vy: number, size: number, color: string, life: number, maxLife: number}[] = [];
    const MAX_PARTICLES = 400;
    const COLORS = ['#4F46E5', '#7C3AED', '#06B6D4', '#A78BFA', '#FFFFFF'];

    let lastMouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let isMoving = false;
    let moveTimeout: any;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e: MouseEvent | TouchEvent) => {
      const x = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const y = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      
      const dx = x - lastMouse.x;
      const dy = y - lastMouse.y;
      const velocity = Math.sqrt(dx*dx + dy*dy);
      
      const count = Math.min(15, Math.max(2, Math.floor(velocity * 0.2)));
      const baseAngle = Math.atan2(dy, dx);
      
      for(let i=0; i<count; i++) {
        if(particles.length >= MAX_PARTICLES) particles.shift(); // remove oldest
        
        const angle = baseAngle + (Math.random() - 0.5) * 1.5;
        const speed = Math.random() * 2 + velocity * 0.05;
        
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * (velocity > 10 ? 4 : 2) + 1,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          life: 1,
          maxLife: 0.8 + Math.random() * 0.7
        });
      }
      
      lastMouse = { x, y };
      isMoving = true;
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => isMoving = false, 100);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for(let i=particles.length-1; i>=0; i--) {
        const p = particles[i];
        
        p.life -= 0.016 / p.maxLife; // approx 60fps
        if(p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        
        p.vy += 0.05; // gravity
        p.x += p.vx;
        p.y += p.vy;
        
        ctx.globalAlpha = p.life;
        ctx.fillStyle = Math.random() > 0.9 ? '#FFFFFF' : p.color; // Sparkle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
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
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 50 }}
    />
  );
}
