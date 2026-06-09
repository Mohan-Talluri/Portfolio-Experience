import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function GalaxyLayer() {
  const galaxiesRef = useRef<THREE.Group>(null);
  
  const galaxyTextures = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(128, 64, 0, 128, 64, 64);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(0.2, 'rgba(150, 200, 255, 0.4)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      context.fillStyle = gradient;
      context.beginPath();
      context.ellipse(128, 64, 128, 40, 0, 0, Math.PI * 2);
      context.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  const galaxies = useMemo(() => {
    return Array.from({ length: 6 }).map(() => ({
      position: [
        (Math.random() - 0.5) * 600,
        (Math.random() - 0.5) * 400,
        -300 - Math.random() * 200
      ] as [number, number, number],
      scale: [Math.random() * 60 + 40, Math.random() * 30 + 20, 1] as [number, number, number],
      rotation: [0, 0, (Math.random() - 0.5) * Math.PI * 0.5] as [number, number, number],
      opacity: 0.06 + Math.random() * 0.04
    }));
  }, []);

  return (
    <group ref={galaxiesRef}>
      {galaxies.map((g, i) => (
        <sprite
          key={i}
          position={g.position}
          scale={g.scale}
        >
          <spriteMaterial
            map={galaxyTextures}
            color={new THREE.Color(0xddeeff)}
            transparent
            opacity={g.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            rotation={g.rotation[2]}
          />
        </sprite>
      ))}
    </group>
  );
}
