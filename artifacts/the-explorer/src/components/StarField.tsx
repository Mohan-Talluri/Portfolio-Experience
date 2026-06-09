import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  attribute vec3 color;
  attribute float phase;
  uniform float time;
  varying vec3 vColor;
  varying float vPhase;

  void main() {
    vColor = color;
    vPhase = phase;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // Size attenuation
    gl_PointSize = (100.0 / -mvPosition.z); 
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform float time;
  varying vec3 vColor;
  varying float vPhase;

  void main() {
    // Gaussian falloff
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    
    float alpha = smoothstep(0.5, 0.1, dist);
    
    // Twinkle
    float twinkle = 0.3 + 0.7 * sin(time * 2.0 + vPhase);
    
    gl_FragColor = vec4(vColor, alpha * twinkle);
  }
`;

function StarLayer({ count, spread, sizeRange, colorMix, driftSpeedX, driftSpeedY, zOffset = 0, isBright = false }: any) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const { positions, colors, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread + zOffset;
      
      const c = new THREE.Color(colorMix[Math.floor(Math.random() * colorMix.length)]);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      
      phase[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, colors: col, phases: phase };
  }, [count, spread, colorMix, zOffset]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useEffect(() => {
    return () => material.dispose();
  }, [material]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += driftSpeedY;
      pointsRef.current.rotation.x += driftSpeedX;
    }
    material.uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-phase" args={[phases, 1]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
}

export default function StarField() {
  const isMobile = window.innerWidth < 768;

  return (
    <group>
      <StarLayer 
        count={isMobile ? 3000 : 6000} 
        spread={400} 
        sizeRange={[0.04, 0.06]} 
        colorMix={['#FFFFFF', '#AAD4FF', '#FFD0AA']} 
        driftSpeedY={0.00003} 
        driftSpeedX={0.00001} 
      />
      <StarLayer 
        count={isMobile ? 1500 : 3000} 
        spread={200} 
        sizeRange={[0.08, 0.15]} 
        colorMix={['#FFFFFF', '#E0F0FF']} 
        driftSpeedY={0.00008} 
        driftSpeedX={0.00002} 
      />
      <StarLayer 
        count={isMobile ? 400 : 800} 
        spread={80} 
        sizeRange={[0.15, 0.4]} 
        colorMix={['#FFFFFF', '#06B6D4', '#8B5CF6']} 
        driftSpeedY={0.0002} 
        driftSpeedX={0.00005} 
      />
    </group>
  );
}
