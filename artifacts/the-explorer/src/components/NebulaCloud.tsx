import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function makeNebulaTexture(w: number, h: number, layers: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  for (let i = 0; i < layers; i++) {
    const cx = w * (0.2 + Math.random() * 0.6);
    const cy = h * (0.2 + Math.random() * 0.6);
    const rx = w * (0.2 + Math.random() * 0.4);
    const ry = h * (0.15 + Math.random() * 0.35);
    const angle = Math.random() * Math.PI;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.scale(rx / 80, ry / 80);

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 80);
    const a1 = 0.12 + Math.random() * 0.20;
    const a2 = 0.04 + Math.random() * 0.08;
    grad.addColorStop(0,   `rgba(255,255,255,${a1.toFixed(3)})`);
    grad.addColorStop(0.4, `rgba(255,255,255,${a2.toFixed(3)})`);
    grad.addColorStop(1,   'rgba(255,255,255,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return new THREE.CanvasTexture(canvas);
}

const NEBULA_REGIONS = [
  { color: new THREE.Color('#1a0a5e'), scatter: new THREE.Color('#4422cc'), x: -60, y: 30, z: -180, scale: 120, opacity: 0.13 },
  { color: new THREE.Color('#0a2255'), scatter: new THREE.Color('#1155bb'), x: 80, y: -20, z: -200, scale: 100, opacity: 0.11 },
  { color: new THREE.Color('#2d0a55'), scatter: new THREE.Color('#8833cc'), x: -40, y: -60, z: -160, scale: 90, opacity: 0.10 },
  { color: new THREE.Color('#003344'), scatter: new THREE.Color('#0088aa'), x: 50, y: 50, z: -220, scale: 130, opacity: 0.09 },
  { color: new THREE.Color('#1a0033'), scatter: new THREE.Color('#6600cc'), x: -90, y: 10, z: -140, scale: 85, opacity: 0.12 },
  { color: new THREE.Color('#001133'), scatter: new THREE.Color('#2244aa'), x: 110, y: -40, z: -190, scale: 110, opacity: 0.08 },
  { color: new THREE.Color('#110022'), scatter: new THREE.Color('#442266'), x: 0, y: -80, z: -170, scale: 95, opacity: 0.10 },
  { color: new THREE.Color('#004444'), scatter: new THREE.Color('#006688'), x: -70, y: 70, z: -210, scale: 115, opacity: 0.09 },
];

const nebulaVert = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const nebulaFrag = `
uniform sampler2D map;
uniform vec3 color;
uniform vec3 scatterColor;
uniform float opacity;
uniform float time;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
float fbm2(vec2 p){
  return noise(p)*0.5 + noise(p*2.1+1.3)*0.25 + noise(p*4.3+2.7)*0.125;
}

void main(){
  vec2 uv = vUv;
  
  // Animated turbulent distortion
  float flow1 = fbm2(uv * 2.0 + vec2(time * 0.012, time * 0.008));
  float flow2 = fbm2(uv * 3.5 - vec2(time * 0.009, time * 0.015));
  vec2 distort = vec2(flow1 - 0.5, flow2 - 0.5) * 0.12;
  
  vec4 tex = texture2D(map, uv + distort);
  
  // Color gradient across the nebula
  float gradient = fbm2(uv * 1.5 + time * 0.005);
  vec3 nebulaColor = mix(color, scatterColor, gradient * 0.7);
  
  // Emission lines — bright filaments
  float filament = smoothstep(0.35, 0.5, flow1) * smoothstep(0.65, 0.5, flow1);
  nebulaColor += scatterColor * filament * 0.5;
  
  gl_FragColor = vec4(nebulaColor, tex.r * opacity);
}
`;

export default function NebulaCloud() {
  const groupRef = useRef<THREE.Group>(null);

  const textures = useMemo(() => [
    makeNebulaTexture(512, 512, 6),
    makeNebulaTexture(512, 512, 5),
    makeNebulaTexture(512, 512, 7),
  ], []);

  const materials = useMemo(() =>
    NEBULA_REGIONS.map((r, i) => new THREE.ShaderMaterial({
      uniforms: {
        map:         { value: textures[i % textures.length] },
        color:       { value: r.color.clone() },
        scatterColor:{ value: r.scatter.clone() },
        opacity:     { value: r.opacity },
        time:        { value: 0 },
      },
      vertexShader: nebulaVert,
      fragmentShader: nebulaFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })),
  [textures]);

  const basePositions = useMemo(() =>
    NEBULA_REGIONS.map(r => new THREE.Vector3(r.x, r.y, r.z)),
  []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    materials.forEach(m => { m.uniforms.time.value = t; });

    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const base = basePositions[i];
        const r = NEBULA_REGIONS[i];
        const phase = i * 1.3;
        child.position.x = base.x + Math.sin(t * 0.0008 + phase) * 3;
        child.position.y = base.y + Math.cos(t * 0.0006 + phase) * 2;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {NEBULA_REGIONS.map((r, i) => (
        <mesh
          key={i}
          position={[r.x, r.y, r.z]}
          rotation={[
            (i % 3) * 0.4,
            (i % 5) * 0.5,
            (i % 7) * 0.35,
          ]}
        >
          <planeGeometry args={[r.scale, r.scale * (0.6 + (i % 4) * 0.15)]} />
          <primitive object={materials[i]} attach="material" />
        </mesh>
      ))}
    </group>
  );
}
