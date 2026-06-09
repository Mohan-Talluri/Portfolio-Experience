import React, { useEffect, useRef } from "react";
import StardustTrail from "./StardustTrail";

interface Planet2D {
  x: number; y: number; r: number;
  base: string; shadow: string; rim: string;
  bandColor: string; bandCount: number;
}

const PLANETS: Planet2D[] = [
  { x:0.50, y:0.45, r:82,  base:"#3730A3", shadow:"#1E1465", rim:"#6080FF", bandColor:"#4F46E5", bandCount:5 },
  { x:0.17, y:0.60, r:47,  base:"#92400E", shadow:"#451A03", rim:"#FB923C", bandColor:"#F59E0B", bandCount:4 },
  { x:0.77, y:0.34, r:38,  base:"#0E7490", shadow:"#083344", rim:"#22D3EE", bandColor:"#06B6D4", bandCount:5 },
  { x:0.30, y:0.76, r:58,  base:"#831843", shadow:"#3B0764", rim:"#F472B6", bandColor:"#9D174D", bandCount:6 },
  { x:0.68, y:0.70, r:32,  base:"#374151", shadow:"#111827", rim:"#93C5FD", bandColor:"#E2E8F0", bandCount:3 },
  { x:0.55, y:0.20, r:44,  base:"#4C1D95", shadow:"#2E1065", rim:"#C084FC", bandColor:"#8B5CF6", bandCount:4 },
  { x:0.85, y:0.55, r:24,  base:"#1E3A5F", shadow:"#0F172A", rim:"#BAE6FD", bandColor:"#EFF6FF", bandCount:2 },
];

function hexToRgb(hex: string): [number,number,number] {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}
function rgba(hex: string, a: number): string {
  const [r,g,b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export default function SpaceFallback() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;

    interface Star { x:number; y:number; size:number; opacity:number; phase:number; color:string }
    const STAR_COLORS = ["#ffffff","#AAD4FF","#FFD0AA","#CCDDFF","#FFEEDD"];
    const stars: Star[] = [];
    const STAR_COUNT = 1800;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      stars.length  = 0;
      for (let i = 0; i < STAR_COUNT; i++) {
        const tier = Math.random();
        stars.push({
          x:       Math.random() * canvas.width,
          y:       Math.random() * canvas.height,
          size:    tier < 0.7 ? 0.4 + Math.random()*0.6 : tier < 0.92 ? 0.9+Math.random()*0.9 : 1.8+Math.random()*1.2,
          opacity: 0.2 + Math.random() * 0.6,
          phase:   Math.random() * Math.PI * 2,
          color:   STAR_COLORS[Math.floor(Math.random()*STAR_COLORS.length)],
        });
      }
    };
    resize();
    window.addEventListener("resize", resize);

    // Nebula positions (stable fractions)
    const NEBULAE = [
      { xf:0.12, yf:0.15, rf:0.28, color:"rgba(79,70,229,",  osc:0.003 },
      { xf:0.75, yf:0.10, rf:0.22, color:"rgba(124,58,237,", osc:0.0025 },
      { xf:0.90, yf:0.55, rf:0.24, color:"rgba(6,182,212,",  osc:0.0028 },
      { xf:0.05, yf:0.70, rf:0.20, color:"rgba(190,24,93,",  osc:0.0022 },
      { xf:0.55, yf:0.85, rf:0.30, color:"rgba(30,58,95,",   osc:0.0035 },
      { xf:0.35, yf:0.05, rf:0.18, color:"rgba(79,70,229,",  osc:0.003 },
    ];

    // Constellation data (very subtle background element)
    const CONSTELLATIONS = [
      [[0.22,0.28],[0.25,0.22],[0.29,0.18],[0.24,0.14],[0.32,0.24]],
      [[0.60,0.15],[0.65,0.12],[0.70,0.14],[0.68,0.20],[0.63,0.22]],
      [[0.78,0.72],[0.83,0.68],[0.88,0.72],[0.85,0.78]],
    ];

    let shootingStar = { active:false, timer:150+Math.random()*200, x:0, y:0, dx:0, dy:0, life:0 };

    function drawBackground() {
      ctx!.fillStyle = "#020408";
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
    }

    function drawNebulae() {
      const w = canvas!.width, h = canvas!.height;
      NEBULAE.forEach((n, i) => {
        const x = w * (n.xf + Math.sin(time * n.osc + i) * 0.03);
        const y = h * (n.yf + Math.cos(time * n.osc * 0.7 + i) * 0.025);
        const r = Math.min(w,h) * n.rf;
        const g = ctx!.createRadialGradient(x,y,0,x,y,r);
        g.addColorStop(0, n.color+"0.07)");
        g.addColorStop(0.5, n.color+"0.04)");
        g.addColorStop(1, n.color+"0)");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.ellipse(x,y,r*1.3,r*0.7,i*0.4,0,Math.PI*2);
        ctx!.fill();
      });
    }

    function drawConstellations() {
      const w = canvas!.width, h = canvas!.height;
      const t = time * 0.0004;
      CONSTELLATIONS.forEach((pts, ci) => {
        const pulse = 0.06 + 0.04 * Math.sin(t * 0.8 + ci * 2);
        ctx!.strokeStyle = `rgba(136,204,255,${pulse})`;
        ctx!.lineWidth   = 0.8;
        ctx!.beginPath();
        pts.forEach(([xf,yf],i) => {
          const x = xf * w, y = yf * h;
          i === 0 ? ctx!.moveTo(x,y) : ctx!.lineTo(x,y);
        });
        ctx!.stroke();
        // Star dots
        pts.forEach(([xf,yf]) => {
          const x = xf*w, y = yf*h;
          ctx!.fillStyle = `rgba(200,225,255,${pulse*2.5})`;
          ctx!.beginPath();
          ctx!.arc(x,y,1.2,0,Math.PI*2);
          ctx!.fill();
        });
      });
    }

    function drawStars() {
      const t = time * 0.001;
      stars.forEach(s => {
        const twinkle = s.opacity * (0.6 + 0.4 * Math.sin(t * 2.3 + s.phase));
        ctx!.globalAlpha = twinkle;
        ctx!.fillStyle   = s.color;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.size, 0, Math.PI*2);
        ctx!.fill();
      });
      ctx!.globalAlpha = 1;
    }

    function drawPlanets() {
      const w = canvas!.width, h = canvas!.height;
      const t = time * 0.001;

      PLANETS.forEach((p, i) => {
        const px = w * p.x + Math.sin(t * 0.5 + i * 1.3) * 6;
        const py = h * p.y + Math.cos(t * 0.4 + i * 0.9) * 5;

        // --- 1. Outer corona glow ---
        const coronaG = ctx!.createRadialGradient(px,py, p.r*0.8, px,py, p.r*2.6);
        coronaG.addColorStop(0, rgba(p.rim, 0.18));
        coronaG.addColorStop(0.5, rgba(p.rim, 0.07));
        coronaG.addColorStop(1, rgba(p.rim, 0));
        ctx!.fillStyle = coronaG;
        ctx!.beginPath();
        ctx!.arc(px,py, p.r*2.6, 0, Math.PI*2);
        ctx!.fill();

        // --- 2. Planet sphere (clipped) ---
        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(px, py, p.r, 0, Math.PI*2);
        ctx!.clip();

        // Base fill
        ctx!.fillStyle = p.base;
        ctx!.beginPath();
        ctx!.arc(px, py, p.r, 0, Math.PI*2);
        ctx!.fill();

        // Atmospheric bands (horizontal ellipses)
        for (let b = 0; b < p.bandCount; b++) {
          const yOff = (b / (p.bandCount-1) - 0.5) * p.r * 1.7;
          const wave = Math.sin(t * 0.8 + b * 1.1 + i) * 3;
          const bandOpacity = 0.22 + 0.10 * Math.sin(b * 1.4 + i);
          ctx!.fillStyle = rgba(p.bandColor, bandOpacity);
          ctx!.beginPath();
          ctx!.ellipse(px, py+yOff+wave, p.r*1.05, p.r*0.13, 0, 0, Math.PI*2);
          ctx!.fill();
        }

        // --- Directional lighting: sun from top-right ---
        // Highlight (top-right)
        const hlG = ctx!.createRadialGradient(
          px + p.r*0.32, py - p.r*0.38, 0,
          px + p.r*0.10, py - p.r*0.10, p.r*1.05
        );
        hlG.addColorStop(0,   "rgba(255,255,255,0.22)");
        hlG.addColorStop(0.35,"rgba(255,255,255,0.08)");
        hlG.addColorStop(1,   "rgba(255,255,255,0)");
        ctx!.fillStyle = hlG;
        ctx!.beginPath();
        ctx!.arc(px, py, p.r, 0, Math.PI*2);
        ctx!.fill();

        // Shadow hemisphere (bottom-left) — deep and convincing
        const shG = ctx!.createRadialGradient(
          px - p.r*0.55, py + p.r*0.55, 0,
          px, py, p.r*1.1
        );
        shG.addColorStop(0,   "rgba(2,4,8,0.88)");
        shG.addColorStop(0.45,"rgba(2,4,8,0.55)");
        shG.addColorStop(0.75,"rgba(2,4,8,0.18)");
        shG.addColorStop(1,   "rgba(2,4,8,0)");
        ctx!.fillStyle = shG;
        ctx!.beginPath();
        ctx!.arc(px, py, p.r, 0, Math.PI*2);
        ctx!.fill();

        ctx!.restore();

        // --- 3. Atmosphere rim (rendered OUTSIDE clip) ---
        // Ring from inner edge (p.r * 0.88) to outer edge (p.r * 1.18)
        const rimG = ctx!.createRadialGradient(px,py, p.r*0.88, px,py, p.r*1.18);
        rimG.addColorStop(0,   rgba(p.rim, 0));
        rimG.addColorStop(0.4, rgba(p.rim, 0.55));
        rimG.addColorStop(0.75,rgba(p.rim, 0.25));
        rimG.addColorStop(1,   rgba(p.rim, 0));
        ctx!.fillStyle = rimG;
        ctx!.beginPath();
        ctx!.arc(px,py, p.r*1.18, 0, Math.PI*2);
        ctx!.fill();
        // Mask the interior so rim only shows at the edge
        const maskG = ctx!.createRadialGradient(px,py, 0, px,py, p.r*0.92);
        maskG.addColorStop(0,   "rgba(2,4,8,1)");
        maskG.addColorStop(0.85,"rgba(2,4,8,1)");
        maskG.addColorStop(1,   "rgba(2,4,8,0)");
        // Note: we already have the planet body rendered, so just skip mask and rely on
        // the fact that the rim gradient starts at 0.88 × r (mostly outside the solid planet)
      });
    }

    function drawShootingStar() {
      if (shootingStar.active) {
        shootingStar.x += shootingStar.dx;
        shootingStar.y += shootingStar.dy;
        shootingStar.life -= 0.025;
        const a = Math.max(0, shootingStar.life);
        ctx!.globalAlpha = a;
        // Trail gradient along movement
        const tx = shootingStar.x - shootingStar.dx * 18;
        const ty = shootingStar.y - shootingStar.dy * 18;
        const trailG = ctx!.createLinearGradient(tx,ty, shootingStar.x, shootingStar.y);
        trailG.addColorStop(0, "rgba(255,255,255,0)");
        trailG.addColorStop(1, "rgba(255,255,255,1)");
        ctx!.strokeStyle = trailG;
        ctx!.lineWidth   = 1.5;
        ctx!.beginPath();
        ctx!.moveTo(tx, ty);
        ctx!.lineTo(shootingStar.x, shootingStar.y);
        ctx!.stroke();
        // Head glow
        const hG = ctx!.createRadialGradient(shootingStar.x,shootingStar.y,0,shootingStar.x,shootingStar.y,4);
        hG.addColorStop(0,"rgba(255,255,255,1)");
        hG.addColorStop(1,"rgba(255,255,255,0)");
        ctx!.fillStyle = hG;
        ctx!.beginPath();
        ctx!.arc(shootingStar.x, shootingStar.y, 4, 0, Math.PI*2);
        ctx!.fill();
        ctx!.globalAlpha = 1;
        if (shootingStar.life <= 0) {
          shootingStar.active = false;
          shootingStar.timer  = 220 + Math.random() * 280;
        }
      } else {
        shootingStar.timer--;
        if (shootingStar.timer <= 0) {
          shootingStar.active = true;
          const angle = (Math.random()*0.5+0.2) * (Math.random()<0.5?1:-1);
          const speed = 9 + Math.random()*6;
          shootingStar.x    = Math.random() * canvas!.width;
          shootingStar.y    = 30 + Math.random() * canvas!.height * 0.3;
          shootingStar.dx   = Math.cos(angle) * speed;
          shootingStar.dy   = Math.sin(angle+0.6) * speed;
          shootingStar.life = 1;
        }
      }
    }

    function loop(t: number) {
      time = t;
      drawBackground();
      drawNebulae();
      drawConstellations();
      drawStars();
      drawPlanets();
      drawShootingStar();
      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}
      />
      <StardustTrail />
    </>
  );
}
