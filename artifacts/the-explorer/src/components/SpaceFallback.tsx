import React, { useEffect, useRef } from "react";

export default function SpaceFallback() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const stars: { x: number; y: number; z: number; px: number; py: number }[] = [];
    const STAR_COUNT = 800;

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
      });
    }

    const NEBULA_COLORS = [
      "rgba(79,70,229,",
      "rgba(124,58,237,",
      "rgba(6,182,212,",
      "rgba(59,130,246,",
    ];

    function drawNebula() {
      const w = canvas!.width;
      const h = canvas!.height;
      for (let i = 0; i < 5; i++) {
        const x = (w * (i * 0.22 + 0.1 + Math.sin(time * 0.0003 + i) * 0.05));
        const y = (h * (0.15 + (i % 3) * 0.28 + Math.cos(time * 0.0004 + i) * 0.04));
        const r = w * (0.18 + (i % 2) * 0.08);
        const color = NEBULA_COLORS[i % NEBULA_COLORS.length];
        const grad = ctx!.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, color + "0.08)");
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

        const glowGrad = ctx!.createRadialGradient(px, py, p.r * 0.5, px, py, p.r * 2.5);
        glowGrad.addColorStop(0, p.color + "30");
        glowGrad.addColorStop(1, "transparent");
        ctx!.fillStyle = glowGrad;
        ctx!.beginPath();
        ctx!.arc(px, py, p.r * 2.5, 0, Math.PI * 2);
        ctx!.fill();

        const grad = ctx!.createRadialGradient(px - p.r * 0.3, py - p.r * 0.3, 0, px, py, p.r);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, p.glow);
        ctx!.fillStyle = grad;
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
      const speed = 0.3;

      ctx!.fillStyle = "#fff";
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
        const opacity = (1 - star.z / w) * 0.8;

        ctx!.globalAlpha = opacity;
        ctx!.beginPath();
        ctx!.arc(sx, sy, size, 0, Math.PI * 2);
        ctx!.fill();
      });
      ctx!.globalAlpha = 1;
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

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
