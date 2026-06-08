import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function StarField() {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = window.innerWidth < 768 ? 1500 : 3000;

  const particlesPosition = new Float32Array(particleCount * 3);
  const particlesSize = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    particlesPosition[i * 3] = (Math.random() - 0.5) * 200;
    particlesPosition[i * 3 + 1] = (Math.random() - 0.5) * 200;
    particlesPosition[i * 3 + 2] = (Math.random() - 0.5) * 200;
    particlesSize[i] = Math.random() * 2;
  }

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0001;
      pointsRef.current.rotation.x += 0.00005;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particlesPosition}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={particlesSize}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color="#ffffff"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}
