import React, { useRef, useState, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

// Accretion disk shader — hot plasma orbiting the singularity
const diskVert = `
varying vec2 vUv;
varying vec3 vWorldPos;
void main(){
  vUv = uv;
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const diskFrag = `
uniform float time;
uniform float opacity;
varying vec2 vUv;
varying vec3 vWorldPos;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

void main(){
  vec2 uv = vUv - 0.5;
  float r = length(uv) * 2.0;
  float angle = atan(uv.y, uv.x);
  
  if(r < 0.22 || r > 1.0) discard;
  
  // Inner edge falloff (event horizon boundary)
  float innerFade = smoothstep(0.22, 0.35, r);
  float outerFade = smoothstep(1.0, 0.70, r);
  
  // Rotating plasma bands
  float speed = time * 2.5;
  float band1 = noise(vec2(r * 6.0 + speed * 0.3, angle * 2.0 / 3.14159));
  float band2 = noise(vec2(r * 12.0 - speed * 0.5, angle * 4.0 / 3.14159 + 1.7));
  float plasma = (band1 * 0.6 + band2 * 0.4);
  
  // Doppler shift — approaching side brighter (blue-white), receding dimmer (red-orange)
  float doppler = dot(normalize(uv), vec2(1.0, 0.0));
  float dopplerFactor = 0.7 + 0.3 * doppler;
  
  // Color gradient: innermost = white-yellow, mid = orange, outer = deep red
  vec3 innerHot = vec3(1.0, 0.95, 0.70);
  vec3 midHot   = vec3(1.0, 0.50, 0.10);
  vec3 outerCool= vec3(0.70, 0.10, 0.02);
  vec3 deepOuter= vec3(0.30, 0.03, 0.05);
  
  float t = (r - 0.22) / 0.78;
  vec3 diskColor = mix(innerHot, midHot, smoothstep(0.0, 0.35, t));
  diskColor = mix(diskColor, outerCool, smoothstep(0.3, 0.7, t));
  diskColor = mix(diskColor, deepOuter, smoothstep(0.6, 1.0, t));
  
  diskColor *= dopplerFactor * (0.7 + plasma * 0.5);
  
  float alpha = innerFade * outerFade * (0.6 + plasma * 0.4) * opacity;
  
  gl_FragColor = vec4(diskColor, alpha);
}
`;

// Black hole surface — pure black with lensing rim
const bhVert = `
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
void main(){
  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const bhFrag = `
uniform float time;
uniform float expandFactor;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main(){
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float NdotV = max(dot(vWorldNormal, viewDir), 0.0);
  
  // Photon sphere — ultra-bright lensing ring at the very edge
  float rim = 1.0 - NdotV;
  float photonRing = pow(rim, 8.0) * 3.0;        // tight bright ring
  float scatterGlow = pow(rim, 3.0) * 0.5;       // wider blue-white scatter
  float outerGlow = pow(rim, 1.5) * 0.2;         // faint outer glow
  
  vec3 lensColor = vec3(0.7, 0.9, 1.0) * photonRing;
  lensColor += vec3(0.4, 0.6, 1.0) * scatterGlow;
  lensColor += vec3(0.1, 0.2, 0.6) * outerGlow;
  
  // Pulse when expanding
  float pulse = 1.0 + 0.4 * expandFactor;
  lensColor *= pulse;
  
  // Core is pure black — the event horizon
  gl_FragColor = vec4(lensColor, 1.0);
}
`;

// Expanding ring pulse
const ringFrag = `
uniform float progress;
uniform vec3 ringColor;
void main(){
  gl_FragColor = vec4(ringColor, (1.0 - progress) * 0.6);
}
`;

// Jet shader (polar jets / Hawking radiation visualization)
const jetVert = `
attribute float progress;
attribute float phase;
uniform float time;
varying float vProgress;
varying float vPhase;
void main(){
  vProgress = progress;
  vPhase = phase;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = (1.0 - progress) * 4.0 * (300.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const jetFrag = `
uniform float time;
varying float vProgress;
varying float vPhase;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if(d > 0.5) discard;
  float alpha = (1.0 - vProgress) * smoothstep(0.5, 0.0, d);
  vec3 col = mix(vec3(0.5, 0.8, 1.0), vec3(0.1, 0.3, 1.0), vProgress);
  gl_FragColor = vec4(col, alpha * 0.7);
}
`;

interface ExpandRing {
  id: number;
  progress: number;
}

export default function BlackHole({ position = [-20, 9, -38] as [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const diskRef  = useRef<THREE.Mesh>(null);
  const scaleRef = useRef(1);
  const expandRef = useRef(0);

  const [rings, setRings] = useState<ExpandRing[]>([]);
  const ringIdRef = useRef(0);

  const diskMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, opacity: { value: 1 } },
    vertexShader: diskVert,
    fragmentShader: diskFrag,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);

  const bhMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, expandFactor: { value: 0 } },
    vertexShader: bhVert,
    fragmentShader: bhFrag,
  }), []);

  // Jet particles
  const { jetPositions, jetProgresses, jetPhases } = useMemo(() => {
    const N = 80;
    const pos = new Float32Array(N * 3);
    const prog = new Float32Array(N);
    const ph = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const side = i < N / 2 ? 1 : -1;
      const t = (i % (N / 2)) / (N / 2);
      const spread = (Math.random() - 0.5) * 0.4;
      pos[i * 3]     = spread;
      pos[i * 3 + 1] = side * t * 6;
      pos[i * 3 + 2] = spread;
      prog[i] = t;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return { jetPositions: pos, jetProgresses: prog, jetPhases: ph };
  }, []);

  const jetMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: jetVert,
    fragmentShader: jetFrag,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), []);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // Trigger expansion
    expandRef.current = 1;
    const id = ++ringIdRef.current;
    setRings(prev => [...prev, { id, progress: 0 }]);
    // Auto-add second ring
    setTimeout(() => {
      const id2 = ++ringIdRef.current;
      setRings(prev => [...prev, { id: id2, progress: 0 }]);
    }, 300);
  };

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    diskMat.uniforms.time.value = t;
    bhMat.uniforms.time.value = t;
    jetMat.uniforms.time.value = t;

    // Disk rotation
    if (diskRef.current) {
      diskRef.current.rotation.z += 0.003;
    }

    // Expand/contract
    if (expandRef.current > 0) {
      expandRef.current = Math.max(0, expandRef.current - delta * 1.2);
    }
    bhMat.uniforms.expandFactor.value = expandRef.current;

    const targetScale = 1 + expandRef.current * 0.35;
    scaleRef.current += (targetScale - scaleRef.current) * delta * 4;
    if (groupRef.current) {
      groupRef.current.scale.setScalar(scaleRef.current);
    }

    // Update expanding rings
    setRings(prev =>
      prev
        .map(r => ({ ...r, progress: r.progress + delta * 0.55 }))
        .filter(r => r.progress < 1)
    );

    // Subtle drift
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 0.18) * 0.3;
    }
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        {/* Outer glow halo */}
        <mesh>
          <sphereGeometry args={[4.8, 32, 32]} />
          <meshBasicMaterial
            color="#0a1840"
            transparent
            opacity={0.25}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Accretion disk — multiple layers for depth */}
        <mesh ref={diskRef} rotation={[Math.PI * 0.18, 0, 0]}>
          <planeGeometry args={[18, 18, 2, 2]} />
          <primitive object={diskMat} attach="material" />
        </mesh>
        <mesh rotation={[Math.PI * 0.22, 0.3, 0]}>
          <planeGeometry args={[14, 14, 2, 2]} />
          <primitive object={diskMat} attach="material" />
        </mesh>

        {/* Black sphere — event horizon */}
        <mesh onClick={handleClick}>
          <sphereGeometry args={[3, 64, 64]} />
          <primitive object={bhMat} attach="material" />
        </mesh>

        {/* Relativistic jets */}
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[jetPositions, 3]} />
            <bufferAttribute attach="attributes-progress" args={[jetProgresses, 1]} />
            <bufferAttribute attach="attributes-phase" args={[jetPhases, 1]} />
          </bufferGeometry>
          <primitive object={jetMat} attach="material" />
        </points>

        {/* Click-triggered expanding rings */}
        {rings.map(r => (
          <mesh key={r.id} rotation={[Math.PI / 2, 0, 0]} scale={[1 + r.progress * 8, 1 + r.progress * 8, 1]}>
            <ringGeometry args={[3, 3.4, 64]} />
            <meshBasicMaterial
              color="#5588ff"
              transparent
              opacity={(1 - r.progress) * 0.7}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>

      {/* Gravitational lensing glow — stays fixed, not scaled */}
      <mesh>
        <sphereGeometry args={[4.5, 32, 32]} />
        <meshBasicMaterial
          color="#1a2880"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
