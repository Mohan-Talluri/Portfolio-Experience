import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function makeSpiralGalaxy(size: number, arms: number, twist: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  // Central bulge
  const bulge = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.18);
  bulge.addColorStop(0,    'rgba(255, 245, 200, 0.90)');
  bulge.addColorStop(0.3,  'rgba(200, 180, 150, 0.50)');
  bulge.addColorStop(0.7,  'rgba(150, 140, 180, 0.20)');
  bulge.addColorStop(1,    'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bulge;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.18, 0, Math.PI * 2);
  ctx.fill();

  // Spiral arms — dense star trails
  for (let arm = 0; arm < arms; arm++) {
    const baseAngle = (arm / arms) * Math.PI * 2;

    for (let j = 0; j < 1200; j++) {
      const t = j / 1200;
      const r = t * size * 0.46;
      const angle = baseAngle + t * twist + Math.random() * 0.35;

      const x = cx + Math.cos(angle) * r + (Math.random() - 0.5) * r * 0.18;
      const y = cy + Math.sin(angle) * r * 0.55 + (Math.random() - 0.5) * r * 0.18;

      const brightness = (1 - t) * 0.7;
      const starSize = 0.8 + Math.random() * 2.5;

      const g = ctx.createRadialGradient(x, y, 0, x, y, starSize * 2);
      g.addColorStop(0, `rgba(220, 230, 255, ${(brightness * 0.85).toFixed(3)})`);
      g.addColorStop(0.5, `rgba(180, 200, 255, ${(brightness * 0.3).toFixed(3)})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, starSize * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Dust lanes (darker regions between arms)
  for (let arm = 0; arm < arms; arm++) {
    const baseAngle = (arm / arms) * Math.PI * 2 + Math.PI / arms;
    for (let j = 0; j < 300; j++) {
      const t = 0.15 + (j / 300) * 0.7;
      const r = t * size * 0.42;
      const angle = baseAngle + t * twist * 0.8;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r * 0.55;
      const ds = r * 0.06;
      const g = ctx.createRadialGradient(x, y, 0, x, y, ds);
      g.addColorStop(0, 'rgba(10,5,20,0.08)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, ds, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Outer halo
  const halo = ctx.createRadialGradient(cx, cy, size * 0.3, cx, cy, size * 0.5);
  halo.addColorStop(0, 'rgba(150, 170, 220, 0.06)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

function makeEllipticalGalaxy(size: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  ctx.clearRect(0, 0, size, size);

  for (let i = 0; i < 4; i++) {
    const r = size * (0.5 - i * 0.08);
    const alpha = [0.08, 0.12, 0.20, 0.35][i];
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255, 240, 200, ${alpha})`);
    g.addColorStop(0.4, `rgba(220, 210, 180, ${alpha * 0.4})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.55, Math.PI * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

const GALAXY_DEFS = [
  { type: 'spiral', arms: 3, twist: 5.5, x: -240, y:  60, z: -350, w: 85, h: 40, rot: 0.3, opacity: 0.065 },
  { type: 'spiral', arms: 2, twist: 4.0, x:  280, y: -50, z: -400, w: 70, h: 38, rot: -0.7, opacity: 0.055 },
  { type: 'ellip',  arms: 0, twist: 0,   x: -160, y: -80, z: -300, w: 55, h: 28, rot: 0.5,  opacity: 0.06  },
  { type: 'spiral', arms: 4, twist: 6.0, x:  120, y:  90, z: -450, w: 90, h: 50, rot: 1.1,  opacity: 0.045 },
  { type: 'ellip',  arms: 0, twist: 0,   x:  200, y: -120,z: -320, w: 45, h: 22, rot: -0.3, opacity: 0.055 },
  { type: 'spiral', arms: 2, twist: 7.0, x: -320, y:  30, z: -480, w: 75, h: 40, rot: 0.8,  opacity: 0.040 },
];

export default function GalaxyLayer() {
  const groupRef = useRef<THREE.Group>(null);

  const textures = useMemo(() => ({
    spiral3: makeSpiralGalaxy(512, 3, 5.5),
    spiral2: makeSpiralGalaxy(512, 2, 4.0),
    spiral4: makeSpiralGalaxy(512, 4, 6.0),
    spiral2b: makeSpiralGalaxy(512, 2, 7.0),
    ellip: makeEllipticalGalaxy(256),
  }), []);

  const matForDef = (def: typeof GALAXY_DEFS[0]) => {
    const tex = def.type === 'ellip'
      ? textures.ellip
      : def.arms === 2 && def.twist < 5 ? textures.spiral2
      : def.arms === 2 ? textures.spiral2b
      : def.arms === 4 ? textures.spiral4
      : textures.spiral3;

    return new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: def.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  };

  const materials = useMemo(() => GALAXY_DEFS.map(matForDef), [textures]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        child.rotation.z += 0.000015 * (i % 2 === 0 ? 1 : -1);
      });
    }
  });

  return (
    <group ref={groupRef}>
      {GALAXY_DEFS.map((def, i) => (
        <mesh
          key={i}
          position={[def.x, def.y, def.z]}
          rotation={[0.3 + i * 0.2, i * 0.15, def.rot]}
        >
          <planeGeometry args={[def.w, def.h]} />
          <primitive object={materials[i]} attach="material" />
        </mesh>
      ))}
    </group>
  );
}
