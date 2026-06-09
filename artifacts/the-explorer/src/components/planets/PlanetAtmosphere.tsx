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
  
  // Fresnel rim — thick at limb
  float rim = 1.0 - NdotV;
  rim = pow(rim, 2.0);
  
  // Rayleigh-like scattering — bluer toward limb, warmer in lit area
  float scatter = pow(1.0 - NdotV, 4.0);
  vec3 scatterLight = mix(color, scatterColor, scatter);
  
  // Day/night terminator
  float dayMask = smoothstep(-0.1, 0.3, NdotL);
  
  // Subtle pulse
  float pulse = 0.94 + 0.06 * sin(time * 0.6);
  
  float alpha = rim * intensity * pulse;
  alpha *= (0.6 + dayMask * 0.4);
  
  gl_FragColor = vec4(scatterLight, alpha);
}
`;

const glowFrag = `
uniform vec3 color;
uniform float intensity;
uniform float time;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main(){
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float NdotV = abs(dot(vWorldNormal, viewDir));
  
  float glow = pow(1.0 - NdotV, 4.5);
  float pulse = 0.90 + 0.10 * sin(time * 0.35 + 1.2);
  
  gl_FragColor = vec4(color, glow * intensity * pulse);
}
`;

const ATM_CONFIG: Record<string, { atm: string; scatter: string; atmIntensity: number; glowIntensity: number }> = {
  hero:     { atm: '#4466ff', scatter: '#8899ff', atmIntensity: 0.80, glowIntensity: 0.28 },
  about:    { atm: '#ff5511', scatter: '#ffaa33', atmIntensity: 0.75, glowIntensity: 0.35 },
  skills:   { atm: '#22ccff', scatter: '#aaeeff', atmIntensity: 0.85, glowIntensity: 0.30 },
  projects: { atm: '#cc1144', scatter: '#ff44aa', atmIntensity: 0.80, glowIntensity: 0.32 },
  timeline: { atm: '#88aadd', scatter: '#ccddff', atmIntensity: 0.75, glowIntensity: 0.25 },
  dreams:   { atm: '#8833cc', scatter: '#cc88ff', atmIntensity: 0.85, glowIntensity: 0.38 },
  contact:  { atm: '#ffcc44', scatter: '#fff0aa', atmIntensity: 1.00, glowIntensity: 0.55 },
};

export default function PlanetAtmosphere({ size, color, active, type }: PlanetAtmosphereProps) {
  const atmRef   = useRef<THREE.Mesh>(null);
  const glowRef  = useRef<THREE.Mesh>(null);

  const cfg = ATM_CONFIG[type] ?? { atm: color, scatter: '#aaccff', atmIntensity: 0.75, glowIntensity: 0.28 };

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

    const targetAtm  = active ? cfg.atmIntensity * 1.15  : cfg.atmIntensity;
    const targetGlow = active ? cfg.glowIntensity * 1.35 : cfg.glowIntensity;
    atmMat.uniforms.intensity.value  += (targetAtm  - atmMat.uniforms.intensity.value)  * delta * 2.2;
    glowMat.uniforms.intensity.value += (targetGlow - glowMat.uniforms.intensity.value) * delta * 2.2;
  });

  return (
    <group>
      <mesh ref={atmRef} scale={[1.08, 1.08, 1.08]}>
        <sphereGeometry args={[size, 48, 48]} />
        <primitive object={atmMat} attach="material" />
      </mesh>
      <mesh ref={glowRef} scale={[1.45, 1.45, 1.45]}>
        <sphereGeometry args={[size, 32, 32]} />
        <primitive object={glowMat} attach="material" />
      </mesh>
    </group>
  );
}
