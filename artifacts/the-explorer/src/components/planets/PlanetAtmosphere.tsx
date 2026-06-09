import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PlanetAtmosphereProps {
  size: number;
  color: string;
  active: boolean;
  type: string;
}

const atmVert = `
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
void main(){
  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Atmosphere: visible only at the limb (rim), not over the planet face
const atmFrag = `
uniform vec3 color;
uniform vec3 scatterColor;
uniform float intensity;
uniform float time;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
void main(){
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 sunDir  = normalize(vec3(2.0, 1.5, 1.0));
  float NdotV = abs(dot(vWorldNormal, viewDir));
  float NdotL = max(dot(vWorldNormal, sunDir), 0.0);
  // Steep falloff — only bright right at limb, invisible on planet face
  float rim = pow(1.0 - NdotV, 3.5);
  float scatter = pow(1.0 - NdotV, 5.0);
  vec3 scatterLight = mix(color, scatterColor, scatter);
  float dayMask = smoothstep(-0.1, 0.3, NdotL);
  float pulse = 0.94 + 0.06 * sin(time * 0.6);
  float alpha = rim * intensity * pulse * (0.5 + dayMask * 0.5);
  gl_FragColor = vec4(scatterLight, alpha);
}
`;

// Outer glow: very subtle, only on extreme rim
const glowFrag = `
uniform vec3 color;
uniform float intensity;
uniform float time;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
void main(){
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float NdotV = abs(dot(vWorldNormal, viewDir));
  // pow(6.0) = even steeper falloff, only at very edge
  float glow = pow(1.0 - NdotV, 6.0);
  float pulse = 0.90 + 0.10 * sin(time * 0.35 + 1.2);
  gl_FragColor = vec4(color, glow * intensity * pulse);
}
`;

const ATM_CONFIG: Record<string, { atm: string; scatter: string; atmIntensity: number; glowIntensity: number }> = {
  hero:     { atm: '#4466ff', scatter: '#8899ff', atmIntensity: 0.55, glowIntensity: 0.18 },
  about:    { atm: '#ff5511', scatter: '#ffaa33', atmIntensity: 0.50, glowIntensity: 0.22 },
  skills:   { atm: '#22ccff', scatter: '#aaeeff', atmIntensity: 0.58, glowIntensity: 0.20 },
  projects: { atm: '#cc1144', scatter: '#ff44aa', atmIntensity: 0.52, glowIntensity: 0.20 },
  timeline: { atm: '#88aadd', scatter: '#ccddff', atmIntensity: 0.50, glowIntensity: 0.15 },
  dreams:   { atm: '#8833cc', scatter: '#cc88ff', atmIntensity: 0.55, glowIntensity: 0.24 },
  contact:  { atm: '#ffcc44', scatter: '#fff0aa', atmIntensity: 0.65, glowIntensity: 0.35 },
};

export default function PlanetAtmosphere({ size, color, active, type }: PlanetAtmosphereProps) {
  const atmRef  = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const cfg = ATM_CONFIG[type] ?? { atm: color, scatter: '#aaccff', atmIntensity: 0.52, glowIntensity: 0.18 };

  const [atmMat, glowMat] = useMemo(() => {
    const atm = new THREE.ShaderMaterial({
      uniforms: {
        color:        { value: new THREE.Color(cfg.atm) },
        scatterColor: { value: new THREE.Color(cfg.scatter) },
        intensity:    { value: cfg.atmIntensity },
        time:         { value: 0 },
      },
      vertexShader:   atmVert,
      fragmentShader: atmFrag,
      transparent:    true,
      depthWrite:     false,
      depthTest:      true,  // respect depth so it never covers the planet face
      side:           THREE.BackSide,
      blending:       THREE.AdditiveBlending,
    });
    const glow = new THREE.ShaderMaterial({
      uniforms: {
        color:     { value: new THREE.Color(cfg.atm) },
        intensity: { value: cfg.glowIntensity },
        time:      { value: 0 },
      },
      vertexShader:   atmVert,
      fragmentShader: glowFrag,
      transparent:    true,
      depthWrite:     false,
      depthTest:      true,  // respect depth so it never covers the planet face
      side:           THREE.BackSide,
      blending:       THREE.AdditiveBlending,
    });
    return [atm, glow];
  }, [cfg]);

  React.useEffect(() => () => { atmMat.dispose(); glowMat.dispose(); }, [atmMat, glowMat]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    atmMat.uniforms.time.value  = t;
    glowMat.uniforms.time.value = t;

    const targetAtm  = active ? cfg.atmIntensity * 1.10  : cfg.atmIntensity;
    const targetGlow = active ? cfg.glowIntensity * 1.25 : cfg.glowIntensity;
    atmMat.uniforms.intensity.value  += (targetAtm  - atmMat.uniforms.intensity.value)  * delta * 2.2;
    glowMat.uniforms.intensity.value += (targetGlow - glowMat.uniforms.intensity.value) * delta * 2.2;
  });

  return (
    <group>
      {/* Atmosphere shell — slightly larger than planet, BackSide + depthTest:true = rim only */}
      <mesh ref={atmRef} scale={[1.06, 1.06, 1.06]}>
        <sphereGeometry args={[size, 32, 32]} />
        <primitive object={atmMat} attach="material" />
      </mesh>
      {/* Outer glow — even larger, very subtle rim halo */}
      <mesh ref={glowRef} scale={[1.30, 1.30, 1.30]}>
        <sphereGeometry args={[size, 24, 24]} />
        <primitive object={glowMat} attach="material" />
      </mesh>
    </group>
  );
}
