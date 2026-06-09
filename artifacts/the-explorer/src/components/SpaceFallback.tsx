import React, { useEffect, useRef } from "react";
import StardustTrail from "./StardustTrail";

export default function SpaceFallback() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const stars: { x: number; y: number; z: number; px: number; py: number; color: string; phase: number }[] = [];
    const STAR_COUNT = 1200;
    const STAR_COLORS = ["#ffffff", "#AAD4FF", "#FFD0AA"];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: (Math.random() - 0.5) * canvas.width * 2,
        y: (Math.random() - 0.5) * canvas.height * 2,
        z: Math.random() * canvas.width,
        px: 0,
        py: 0,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        phase: Math.random() * Math.PI * 2
      });
    }

    const NEBULA_COLORS = [
      "rgba(79,70,229,",
      "rgba(124,58,237,",
      "rgba(6,182,212,",
      "rgba(190,24,93,",
      "rgba(30,58,95,"
    ];

    function drawNebula() {
      const w = canvas!.width;
      const h = canvas!.height;
      for (let i = 0; i < 8; i++) {
        const x = (w * (i * 0.15 + 0.1 + Math.sin(time * 0.0003 + i) * 0.05));
        const y = (h * (0.15 + (i % 4) * 0.2 + Math.cos(time * 0.0004 + i) * 0.04));
        const r = w * (0.2 + (i % 3) * 0.1);
        const color = NEBULA_COLORS[i % NEBULA_COLORS.length];
        const grad = ctx!.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, color + "0.1)");
        grad.addColorStop(1, color + "0)");
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(x, y, r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function drawPlanets() {
      const w = canvas!.width;
      const h = canvas!.height;
      const planets = [
        { x: 0.5, y: 0.45, r: 80, color: "#4F46E5", glow: "#3730A3" },
        { x: 0.18, y: 0.6, r: 45, color: "#F59E0B", glow: "#B45309" },
        { x: 0.78, y: 0.35, r: 35, color: "#06B6D4", glow: "#0E7490" },
        { x: 0.3, y: 0.78, r: 55, color: "#9D174D", glow: "#831843" },
        { x: 0.7, y: 0.72, r: 30, color: "#8B5CF6", glow: "#6D28D9" },
      ];
      planets.forEach((p, i) => {
        const px = w * p.x + Math.sin(time * 0.0005 + i * 1.3) * 8;
        const py = h * p.y + Math.cos(time * 0.0004 + i * 0.9) * 6;

        // Corona
        const glowGrad = ctx!.createRadialGradient(px, py, p.r * 0.5, px, py, p.r * 2.8);
        glowGrad.addColorStop(0, p.color + "40");
        glowGrad.addColorStop(1, "transparent");
        ctx!.fillStyle = glowGrad;
        ctx!.beginPath();
        ctx!.arc(px, py, p.r * 2.8, 0, Math.PI * 2);
        ctx!.fill();

        // Planet body
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(px, py, p.r, 0, Math.PI * 2);
        ctx!.fill();

        // Surface bands
        ctx!.save();
        ctx!.clip(); // Clip to circle
        ctx!.fillStyle = p.glow + "80";
        for (let j = 0; j < 4; j++) {
          ctx!.beginPath();
          ctx!.ellipse(
            px, 
            py + (j - 1.5) * p.r * 0.4 + Math.sin(time * 0.001 + j) * 5, 
            p.r * 1.2, 
            p.r * 0.15, 
            0, 0, Math.PI * 2
          );
          ctx!.fill();
        }
        ctx!.restore();
        
        // Shading
        const shadeGrad = ctx!.createRadialGradient(px - p.r * 0.3, py - p.r * 0.3, 0, px, py, p.r);
        shadeGrad.addColorStop(0, "rgba(255,255,255,0.2)");
        shadeGrad.addColorStop(1, "rgba(0,0,0,0.6)");
        ctx!.fillStyle = shadeGrad;
        ctx!.beginPath();
        ctx!.arc(px, py, p.r, 0, Math.PI * 2);
        ctx!.fill();
      });
    }

    function drawStars() {
      const w = canvas!.width;
      const h = canvas!.height;
      const cx = w / 2;
      const cy = h / 2;
      const speed = 0.5;

      stars.forEach((star) => {
        star.px = star.x / (star.z / w) + cx;
        star.py = star.y / (star.z / w) + cy;

        star.z -= speed;
        if (star.z <= 0) {
          star.z = w;
          star.x = (Math.random() - 0.5) * w * 2;
          star.y = (Math.random() - 0.5) * h * 2;
        }

        const sx = star.x / (star.z / w) + cx;
        const sy = star.y / (star.z / w) + cy;

        const size = Math.max(0.2, (1 - star.z / w) * 1.5);
        let opacity = (1 - star.z / w) * 0.8;
        opacity *= 0.5 + 0.5 * Math.sin(time * 0.005 + star.phase); // twinkle

        ctx!.globalAlpha = opacity;
        ctx!.fillStyle = star.color;
        ctx!.beginPath();
        ctx!.arc(sx, sy, size, 0, Math.PI * 2);
        ctx!.fill();
      });
      ctx!.globalAlpha = 1;
    }
    
    let shootingStar = { active: false, timer: 100, x: 0, y: 0, dx: 0, dy: 0, life: 0 };
    
    function drawShootingStar() {
      if(shootingStar.active) {
        shootingStar.x += shootingStar.dx;
        shootingStar.y += shootingStar.dy;
        shootingStar.life -= 0.02;
        
        ctx!.globalAlpha = Math.max(0, shootingStar.life);
        ctx!.strokeStyle = "#fff";
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.moveTo(shootingStar.x, shootingStar.y);
        ctx!.lineTo(shootingStar.x - shootingStar.dx * 10, shootingStar.y - shootingStar.dy * 10);
        ctx!.stroke();
        ctx!.globalAlpha = 1;
        
        if(shootingStar.life <= 0) {
          shootingStar.active = false;
          shootingStar.timer = 200 + Math.random() * 300;
        }
      } else {
        shootingStar.timer--;
        if(shootingStar.timer <= 0) {
          shootingStar.active = true;
          shootingStar.x = Math.random() * canvas!.width;
          shootingStar.y = -50;
          shootingStar.dx = -5 - Math.random() * 5;
          shootingStar.dy = 5 + Math.random() * 5;
          shootingStar.life = 1;
        }
      }
    }

    function loop(t: number) {
      time = t;
      const w = canvas!.width;
      const h = canvas!.height;

      ctx!.fillStyle = "#020408";
      ctx!.fillRect(0, 0, w, h);

      drawNebula();
      drawPlanets();
      drawStars();
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
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      <StardustTrail />
    </>
  );
}
