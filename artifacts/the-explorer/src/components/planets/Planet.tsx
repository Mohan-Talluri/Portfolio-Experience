import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import PlanetAtmosphere from './PlanetAtmosphere';

interface PlanetProps {
  position: THREE.Vector3;
  config: any;
  active: boolean;
}

export default function Planet({ position, config, active }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.7,
      metalness: 0.3,
      emissive: config.emissive ? config.color : '#000000',
      emissiveIntensity: config.emissive || 0.1,
    });
  }, [config]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x += 0.002;

      // Scale animation based on active state
      const targetScale = active ? 1.1 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 2);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.002;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[config.size, 16]} />
        <primitive object={material} attach="material" />
      </mesh>
      
      <PlanetAtmosphere size={config.size} color={config.color} active={active} />
      
      {active && (
        <mesh ref={ringRef} rotation={[Math.PI / 2.2, 0, 0]}>
          <ringGeometry args={[config.size * 1.5, config.size * 1.55, 64]} />
          <meshBasicMaterial color={config.color} transparent opacity={0.5} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
      )}
    </group>
  );
}
