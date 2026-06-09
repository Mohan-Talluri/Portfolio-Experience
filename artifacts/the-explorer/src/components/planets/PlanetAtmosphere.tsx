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
  vWorldNormal=normalize((modelMatrix*vec4(normal,0.0)).xyz);
  vWorldPosition=(modelMatrix*vec4(position,1.0)).xyz;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}
`;

const atmFrag = `
uniform vec3 color;
uniform float intensity;
uniform float time;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
void main(){
  vec3 viewDir=normalize(cameraPosition-vWorldPosition);
  float vdotn=abs(dot(vWorldNormal,viewDir));
  // Rim: bright at edges, transparent at center
  float rim=1.0-vdotn;
  rim=pow(rim,2.2);
  // Scatter: slight blue shift toward limb
  vec3 scatter=mix(color,color*1.3+vec3(0.05,0.08,0.15),pow(1.0-vdotn,3.0));
  // Subtle pulse
  float pulse=0.92+0.08*sin(time*0.7);
  gl_FragColor=vec4(scatter,rim*intensity*pulse);
}
`;

const coronaFrag = `
uniform vec3 color;
uniform float intensity;
uniform float time;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
void main(){
  vec3 viewDir=normalize(cameraPosition-vWorldPosition);
  float vdotn=abs(dot(vWorldNormal,viewDir));
  float rim=pow(1.0-vdotn,3.5);
  float pulse=0.88+0.12*sin(time*0.4+1.5);
  gl_FragColor=vec4(color,rim*intensity*pulse);
}
`;

const ATM_TINT: Record<string, string> = {
  hero:     '#6080FF',
  about:    '#FF8844',
  skills:   '#44DDFF',
  projects: '#FF2255',
  timeline: '#AACCFF',
  dreams:   '#CC88FF',
  contact:  '#DDEEFF',
};

export default function PlanetAtmosphere({ size, color, active, type }: PlanetAtmosphereProps) {
  const atmRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);

  const tint = ATM_TINT[type] ?? color;

  const [atmMat, coronaMat] = useMemo(() => {
    const baseIntensity = active ? 0.9 : 0.7;
    const atm = new THREE.ShaderMaterial({
      uniforms: {
        color:     { value: new THREE.Color(tint) },
        intensity: { value: baseIntensity },
        time:      { value: 0 },
      },
      vertexShader:   atmVert,
      fragmentShader: atmFrag,
      transparent: true,
      depthWrite:  false,
      side:        THREE.BackSide,
      blending:    THREE.AdditiveBlending,
    });
    const corona = new THREE.ShaderMaterial({
      uniforms: {
        color:     { value: new THREE.Color(tint) },
        intensity: { value: active ? 0.35 : 0.22 },
        time:      { value: 0 },
      },
      vertexShader:   atmVert,
      fragmentShader: coronaFrag,
      transparent: true,
      depthWrite:  false,
      side:        THREE.BackSide,
      blending:    THREE.AdditiveBlending,
    });
    return [atm, corona];
  }, [tint]);

  React.useEffect(() => () => { atmMat.dispose(); coronaMat.dispose(); }, [atmMat, coronaMat]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    atmMat.uniforms.time.value   = t;
    coronaMat.uniforms.time.value = t;

    const targetAtmI   = active ? 0.9  : 0.7;
    const targetCorI   = active ? 0.38 : 0.22;
    atmMat.uniforms.intensity.value   += (targetAtmI - atmMat.uniforms.intensity.value)   * delta * 2;
    coronaMat.uniforms.intensity.value += (targetCorI - coronaMat.uniforms.intensity.value) * delta * 2;
  });

  return (
    <group>
      {/* Tight atmosphere shell — rim glow */}
      <mesh ref={atmRef} scale={[1.06, 1.06, 1.06]}>
        <sphereGeometry args={[size, 32, 32]} />
        <primitive object={atmMat} attach="material" />
      </mesh>
      {/* Wide corona */}
      <mesh ref={coronaRef} scale={[1.35, 1.35, 1.35]}>
        <sphereGeometry args={[size, 32, 32]} />
        <primitive object={coronaMat} attach="material" />
      </mesh>
    </group>
  );
}
