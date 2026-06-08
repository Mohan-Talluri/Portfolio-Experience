import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function NebulaCloud() {
  const cloudsRef = useRef<THREE.Group>(null);
  
  const cloudTextures = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  const clouds = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      return {
        position: [
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 150
        ],
        scale: Math.random() * 20 + 20,
        color: new THREE.Color(
          ['#4F46E5', '#7C3AED', '#06B6D4'][Math.floor(Math.random() * 3)]
        )
      };
    });
  }, []);

  useFrame((state) => {
    if (cloudsRef.current) {
      cloudsRef.current.children.forEach((cloud, i) => {
        cloud.rotation.z += 0.001 * (i % 2 === 0 ? 1 : -1);
      });
    }
  });

  return (
    <group ref={cloudsRef}>
      {clouds.map((cloud, i) => (
        <sprite 
          key={i} 
          position={cloud.position as [number, number, number]} 
          scale={[cloud.scale, cloud.scale, 1]}
        >
          <spriteMaterial 
            map={cloudTextures} 
            color={cloud.color} 
            transparent 
            opacity={0.15} 
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  );
}
