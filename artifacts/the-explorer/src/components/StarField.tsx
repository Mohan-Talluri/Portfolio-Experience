import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Star temperature color mapping (B-V index approximation)
const STAR_COLORS = {
  O: ['#9bb0ff', '#aabfff'],       // hot blue
  B: ['#cad7ff', '#c0d3ff'],       // blue-white
  A: ['#f8f7ff', '#e8eeff'],       // white
  F: ['#fff4ea', '#ffeedd'],       // yellow-white
  G: ['#ffec87', '#ffe088'],       // yellow (sun-like)
  K: ['#ffb851', '#ffc27a'],       // orange
  M: ['#ff8533', '#ff6a33'],       // red-orange
};

const ALL_STAR_COLORS = [
  ...STAR_COLORS.O, ...STAR_COLORS.B, ...STAR_COLORS.A,
  ...STAR_COLORS.A, ...STAR_COLORS.F, ...STAR_COLORS.F,
  ...STAR_COLORS.G, ...STAR_COLORS.G, ...STAR_COLORS.K, ...STAR_COLORS.M,
];

const starVertexShader = `
attribute float size;
attribute float phase;
attribute float twinkleRate;
attribute vec3 starColor;
uniform float time;
varying vec3 vColor;
varying float vPhase;
varying float vTwinkleRate;

void main() {
  vColor = starColor;
  vPhase = phase;
  vTwinkleRate = twinkleRate;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float attenuation = size * 300.0 / -mvPosition.z;
  gl_PointSize = clamp(attenuation, 0.5, 6.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const starFragmentShader = `
uniform float time;
varying vec3 vColor;
varying float vPhase;
varying float vTwinkleRate;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;
  
  // Soft Gaussian falloff
  float core = exp(-dist * dist * 12.0);
  float halo = exp(-dist * dist * 4.0) * 0.4;
  float alpha = core + halo;
  
  // Multi-frequency twinkle
  float t1 = sin(time * vTwinkleRate + vPhase) * 0.5 + 0.5;
  float t2 = sin(time * vTwinkleRate * 2.3 + vPhase * 1.7) * 0.5 + 0.5;
  float twinkle = mix(0.55, 1.0, t1 * 0.6 + t2 * 0.4);
  
  // Diffraction spike cross (very subtle)
  float spike = max(
    exp(-abs(coord.x) * 50.0) * exp(-abs(coord.y) * 8.0),
    exp(-abs(coord.y) * 50.0) * exp(-abs(coord.x) * 8.0)
  ) * 0.15;
  
  gl_FragColor = vec4(vColor, (alpha + spike) * twinkle);
}
`;

interface LayerConfig {
  count: number;
  spread: number;
  sizeRange: [number, number];
  twinkleRange: [number, number];
  colorSet: string[];
  driftY: number;
  driftX: number;
  zBias: number;
  brightnessRange: [number, number];
}

function StarLayer({ count, spread, sizeRange, twinkleRange, colorSet, driftY, driftX, zBias, brightnessRange }: LayerConfig) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors, sizes, phases, twinkleRates } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz  = new Float32Array(count);
    const ph  = new Float32Array(count);
    const tw  = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Spherical distribution for more natural feel
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = (0.5 + Math.random() * 0.5) * spread;
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi) + zBias;

      const rawColor = new THREE.Color(colorSet[Math.floor(Math.random() * colorSet.length)]);
      const brightness = brightnessRange[0] + Math.random() * (brightnessRange[1] - brightnessRange[0]);
      col[i * 3]     = rawColor.r * brightness;
      col[i * 3 + 1] = rawColor.g * brightness;
      col[i * 3 + 2] = rawColor.b * brightness;

      sz[i] = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
      ph[i] = Math.random() * Math.PI * 2;
      tw[i] = twinkleRange[0] + Math.random() * (twinkleRange[1] - twinkleRange[0]);
    }
    return { positions: pos, colors: col, sizes: sz, phases: ph, twinkleRates: tw };
  }, [count, spread, sizeRange, twinkleRange, colorSet, zBias, brightnessRange]);

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += driftY;
      pointsRef.current.rotation.x += driftX;
    }
    material.uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-starColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-phase" args={[phases, 1]} />
        <bufferAttribute attach="attributes-twinkleRate" args={[twinkleRates, 1]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
}

export default function StarField() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const scale = isMobile ? 0.55 : 1.0;

  return (
    <group>
      {/* Layer 1: Ultra-distant — tiny, mostly white/blue, very faint */}
      <StarLayer
        count={Math.floor(8000 * scale)}
        spread={600}
        sizeRange={[0.003, 0.008]}
        twinkleRange={[0.4, 1.2]}
        colorSet={[...STAR_COLORS.O, ...STAR_COLORS.B, ...STAR_COLORS.A, '#ffffff']}
        driftY={0.000012}
        driftX={0.000004}
        zBias={-100}
        brightnessRange={[0.5, 0.85]}
      />
      {/* Layer 2: Mid-distance — varied stellar types, faint */}
      <StarLayer
        count={Math.floor(4000 * scale)}
        spread={350}
        sizeRange={[0.006, 0.016]}
        twinkleRange={[0.8, 2.5]}
        colorSet={ALL_STAR_COLORS}
        driftY={0.000028}
        driftX={0.000009}
        zBias={-40}
        brightnessRange={[0.65, 1.0]}
      />
      {/* Layer 3: Nearby stars — brighter, more colorful, visible twinkling */}
      <StarLayer
        count={Math.floor(1200 * scale)}
        spread={150}
        sizeRange={[0.012, 0.030]}
        twinkleRange={[1.5, 4.0]}
        colorSet={[...STAR_COLORS.A, ...STAR_COLORS.F, ...STAR_COLORS.G, ...STAR_COLORS.K]}
        driftY={0.000080}
        driftX={0.000022}
        zBias={0}
        brightnessRange={[0.8, 1.0]}
      />
      {/* Layer 4: Foreground — rare bright stars */}
      <StarLayer
        count={Math.floor(80 * scale)}
        spread={60}
        sizeRange={[0.025, 0.055]}
        twinkleRange={[2.0, 5.5]}
        colorSet={[...STAR_COLORS.O, ...STAR_COLORS.B, '#ffffff']}
        driftY={0.000150}
        driftX={0.000040}
        zBias={10}
        brightnessRange={[0.9, 1.0]}
      />
    </group>
  );
}
