import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Single merged draw call — all stars in one Points object
// Total: ~3000 stars (was 13,280), same layers but unified for GPU efficiency

const STAR_COLORS = [
  '#9bb0ff', '#cad7ff', // O/B — hot blue
  '#f8f7ff', '#fff4ea', // A/F — white/yellow-white
  '#ffec87', '#ffb851', // G/K — yellow/orange
  '#ffffff', '#ffffff', '#f8f7ff', // extra white weight
];

const vertSrc = `
attribute float aSize;
attribute float aPhase;
attribute float aRate;
uniform float time;
varying vec3 vColor;
attribute vec3 aColor;
varying float vAlpha;

void main(){
  vColor = aColor;
  float tw = 0.60 + 0.22 * sin(time * aRate + aPhase)
           + 0.08 * sin(time * aRate * 1.7 + aPhase * 2.1);
  vAlpha = tw;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(aSize * 280.0 / -mv.z, 0.5, 5.5);
  gl_Position = projectionMatrix * mv;
}
`;

const fragSrc = `
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if(d > 0.5) discard;
  float core = exp(-d * d * 14.0);
  float halo = exp(-d * d * 4.5) * 0.35;
  gl_FragColor = vec4(vColor, (core + halo) * vAlpha);
}
`;

export default function StarField() {
  const ref = useRef<THREE.Points>(null);

  // Layer definitions: [count, spread, sizeMin, sizeMax, rateMin, rateMax, brightMin, brightMax, zBias, driftY]
  const layers = [
    [1800, 600, 0.003, 0.007, 0.3, 0.9, 0.45, 0.80, -100, 0.000010],
    [900,  320, 0.006, 0.015, 0.7, 2.0, 0.60, 0.95,  -40, 0.000025],
    [350,  140, 0.012, 0.028, 1.2, 3.5, 0.75, 1.00,    0, 0.000070],
    [28,    55, 0.022, 0.050, 1.8, 4.5, 0.88, 1.00,   10, 0.000130],
  ];

  const { positions, colors, sizes, phases, rates, driftY } = useMemo(() => {
    const total = layers.reduce((s, l) => s + (l[0] as number), 0);
    const pos  = new Float32Array(total * 3);
    const col  = new Float32Array(total * 3);
    const sz   = new Float32Array(total);
    const ph   = new Float32Array(total);
    const rt   = new Float32Array(total);
    let off    = 0;
    let dy     = 0;

    for (const [cnt, spread, sMin, sMax, rMin, rMax, bMin, bMax, zBias, dY] of layers) {
      const c = cnt as number;
      dy += (dY as number) * c;
      for (let i = 0; i < c; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = (0.5 + Math.random() * 0.5) * (spread as number);
        pos[(off + i) * 3]     = r * Math.sin(phi) * Math.cos(theta);
        pos[(off + i) * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[(off + i) * 3 + 2] = r * Math.cos(phi) + (zBias as number);

        const hex  = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
        const base = new THREE.Color(hex);
        const br   = (bMin as number) + Math.random() * ((bMax as number) - (bMin as number));
        col[(off + i) * 3]     = base.r * br;
        col[(off + i) * 3 + 1] = base.g * br;
        col[(off + i) * 3 + 2] = base.b * br;

        sz[off + i] = (sMin as number) + Math.random() * ((sMax as number) - (sMin as number));
        ph[off + i] = Math.random() * Math.PI * 2;
        rt[off + i] = (rMin as number) + Math.random() * ((rMax as number) - (rMin as number));
      }
      off += c;
    }

    return { positions: pos, colors: col, sizes: sz, phases: ph, rates: rt, driftY: dy / total };
  }, []);

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: vertSrc,
    fragmentShader: fragSrc,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), []);

  useEffect(() => () => mat.dispose(), [mat]);

  useFrame(({ clock }) => {
    mat.uniforms.time.value = clock.elapsedTime;
    if (ref.current) ref.current.rotation.y += driftY;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aColor"   args={[colors, 3]} />
        <bufferAttribute attach="attributes-aSize"    args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aPhase"   args={[phases, 1]} />
        <bufferAttribute attach="attributes-aRate"    args={[rates, 1]} />
      </bufferGeometry>
      <primitive object={mat} attach="material" />
    </points>
  );
}
