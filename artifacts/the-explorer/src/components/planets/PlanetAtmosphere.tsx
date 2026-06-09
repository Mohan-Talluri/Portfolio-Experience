import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PlanetAtmosphereProps {
  size: number;
  color: string;
  active: boolean;
}

export default function PlanetAtmosphere({ size, color, active }: PlanetAtmosphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const targetScale = active ? 1.3 : 1.2;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 2);
    }
    if (coronaRef.current) {
      const targetScale = active ? 2.8 : 2.5;
      coronaRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 1.5);
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.3 : 0.15}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
      
      <mesh ref={coronaRef}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.08 : 0.04}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
