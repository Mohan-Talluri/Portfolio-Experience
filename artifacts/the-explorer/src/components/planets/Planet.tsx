import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import PlanetAtmosphere from './PlanetAtmosphere';

interface PlanetConfig {
  color: string;
  type: string;
  size: number;
  emissive?: number;
}

interface PlanetProps {
  position: THREE.Vector3;
  config: PlanetConfig;
  active: boolean;
}

// Noise helpers shared across all shaders
const NOISE_GLSL = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
vec3 fade(vec3 t){return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec3 P){
  vec3 Pi0=floor(P);vec3 Pi1=Pi0+vec3(1.0);
  Pi0=mod(Pi0,289.0);Pi1=mod(Pi1,289.0);
  vec3 Pf0=fract(P);vec3 Pf1=Pf0-vec3(1.0);
  vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);
  vec4 iy=vec4(Pi0.yy,Pi1.yy);
  vec4 iz0=Pi0.zzzz;vec4 iz1=Pi1.zzzz;
  vec4 ixy=permute(permute(ix)+iy);
  vec4 ixy0=permute(ixy+iz0);vec4 ixy1=permute(ixy+iz1);
  vec4 gx0=ixy0/7.0;vec4 gy0=fract(floor(gx0)/7.0)-0.5;
  gx0=fract(gx0);vec4 gz0=vec4(0.5)-abs(gx0)-abs(gy0);
  vec4 sz0=step(gz0,vec4(0.0));
  gx0-=sz0*(step(0.0,gx0)-0.5);gy0-=sz0*(step(0.0,gy0)-0.5);
  vec4 gx1=ixy1/7.0;vec4 gy1=fract(floor(gx1)/7.0)-0.5;
  gx1=fract(gx1);vec4 gz1=vec4(0.5)-abs(gx1)-abs(gy1);
  vec4 sz1=step(gz1,vec4(0.0));
  gx1-=sz1*(step(0.0,gx1)-0.5);gy1-=sz1*(step(0.0,gy1)-0.5);
  vec3 g000=vec3(gx0.x,gy0.x,gz0.x);vec3 g100=vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010=vec3(gx0.z,gy0.z,gz0.z);vec3 g110=vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001=vec3(gx1.x,gy1.x,gz1.x);vec3 g101=vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011=vec3(gx1.z,gy1.z,gz1.z);vec3 g111=vec3(gx1.w,gy1.w,gz1.w);
  vec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
  g000*=norm0.x;g010*=norm0.y;g100*=norm0.z;g110*=norm0.w;
  vec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
  g001*=norm1.x;g011*=norm1.y;g101*=norm1.z;g111*=norm1.w;
  float n000=dot(g000,Pf0);float n100=dot(g100,vec3(Pf1.x,Pf0.yz));
  float n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z));float n110=dot(g110,vec3(Pf1.xy,Pf0.z));
  float n001=dot(g001,vec3(Pf0.xy,Pf1.z));float n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z));
  float n011=dot(g011,vec3(Pf0.x,Pf1.yz));float n111=dot(g111,Pf1);
  vec3 fade_xyz=fade(Pf0);
  vec4 n_z=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fade_xyz.z);
  vec2 n_yz=mix(n_z.xy,n_z.zw,fade_xyz.y);
  return 2.2*mix(n_yz.x,n_yz.y,fade_xyz.x);
}

float hash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,151.7182)))*43758.5453);}
float vnoise(vec3 p){
  vec3 i=floor(p);vec3 f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(
    mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
        mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
        mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){
  return vnoise(p)*0.5+vnoise(p*2.0)*0.25+vnoise(p*4.0)*0.125+vnoise(p*8.0)*0.0625;
}
`;

const vertexShader = `
${NOISE_GLSL}

uniform float time;
uniform float displacementScale;
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main(){
  vUv=uv;
  float n=cnoise(position*2.0+time*0.08);
  float n2=cnoise(position*5.0-time*0.04);
  float n3=cnoise(position*9.0+time*0.02);
  float displacement=(n*0.5+n2*0.3+n3*0.2)*displacementScale;
  vec3 newPos=position+normal*displacement;
  vWorldNormal=normalize((modelMatrix*vec4(normal,0.0)).xyz);
  vWorldPosition=(modelMatrix*vec4(newPos,1.0)).xyz;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(newPos,1.0);
}
`;

const LIGHTING_GLSL = `
vec3 calcLight(vec3 surfaceColor,vec3 worldNormal,vec3 worldPos,vec3 rimColor,float roughness){
  vec3 sunDir=normalize(vec3(1.5,2.0,1.0));
  vec3 viewDir=normalize(cameraPosition-worldPos);
  float diff=max(dot(worldNormal,sunDir),0.0);
  float ambient=0.04;
  float light=ambient+diff*(1.0-ambient);
  vec3 halfDir=normalize(sunDir+viewDir);
  float spec=pow(max(dot(worldNormal,halfDir),0.0),32.0*(1.0-roughness)+4.0)*0.4*(1.0-roughness*0.7);
  float rim=1.0-max(dot(worldNormal,viewDir),0.0);
  rim=pow(rim,2.5)*0.6;
  return surfaceColor*light+spec+rimColor*rim;
}
`;

const fragmentShaders: Record<string, string> = {
  hero: `
${NOISE_GLSL}
${LIGHTING_GLSL}
uniform float time;uniform vec3 color;
varying vec3 vWorldNormal;varying vec3 vWorldPosition;varying vec2 vUv;
void main(){
  vec3 p=vWorldPosition*0.8;
  float bands=sin(p.y*8.0+vnoise(p*1.5+time*0.1)*4.0+time*0.3)*0.5+0.5;
  float bands2=sin(p.y*3.0-time*0.15)*0.5+0.5;
  vec3 col1=vec3(0.18,0.12,0.72);
  vec3 col2=vec3(0.08,0.42,0.95);
  vec3 col3=vec3(0.32,0.18,0.88);
  vec3 surface=mix(col1,col2,bands*0.7+bands2*0.3);
  float cracks=smoothstep(0.82,0.92,fbm(vWorldPosition*6.0-time*0.05));
  surface+=vec3(0.2,0.6,1.0)*cracks*1.5;
  surface=calcLight(surface,vWorldNormal,vWorldPosition,vec3(0.3,0.5,1.0),0.6);
  gl_FragColor=vec4(surface,1.0);
}`,

  about: `
${NOISE_GLSL}
${LIGHTING_GLSL}
uniform float time;uniform vec3 color;
varying vec3 vWorldNormal;varying vec3 vWorldPosition;varying vec2 vUv;
void main(){
  vec3 p=vWorldPosition;
  float n=fbm(p*3.0+time*0.04);
  float cracks=smoothstep(0.72,0.82,fbm(p*5.0-time*0.06));
  float cracks2=smoothstep(0.78,0.88,fbm(p*9.0+time*0.03));
  vec3 crust=vec3(0.08,0.04,0.03);
  vec3 rock=vec3(0.18,0.10,0.06);
  vec3 magma=vec3(1.0,0.35,0.0);
  vec3 surface=mix(crust,rock,n);
  surface=mix(surface,magma,cracks*1.2);
  surface+=magma*cracks2*0.8;
  vec3 lit=calcLight(surface,vWorldNormal,vWorldPosition,vec3(1.0,0.4,0.1),0.8);
  lit+=magma*(cracks+cracks2*0.5)*0.4;
  gl_FragColor=vec4(lit,1.0);
}`,

  skills: `
${NOISE_GLSL}
${LIGHTING_GLSL}
uniform float time;uniform vec3 color;
varying vec3 vWorldNormal;varying vec3 vWorldPosition;varying vec2 vUv;
void main(){
  vec3 p=vWorldPosition;
  float n=fbm(p*4.0);
  float facets=fract(n*12.0);
  float facetEdge=smoothstep(0.0,0.15,facets)*smoothstep(1.0,0.85,facets);
  float storms=sin(p.y*6.0+n*4.0+time*0.5)*0.5+0.5;
  vec3 base=vec3(0.02,0.55,0.75);
  vec3 bright=vec3(0.4,0.92,1.0);
  vec3 dark=vec3(0.01,0.25,0.45);
  vec3 surface=mix(dark,base,storms*0.6+n*0.4);
  surface+=bright*facetEdge*0.35;
  float lightning=smoothstep(0.92,1.0,fbm(p*8.0-time*0.4));
  surface+=vec3(0.8,1.0,1.0)*lightning*2.0;
  surface=calcLight(surface,vWorldNormal,vWorldPosition,vec3(0.3,0.9,1.0),0.15);
  gl_FragColor=vec4(surface,1.0);
}`,

  projects: `
${NOISE_GLSL}
${LIGHTING_GLSL}
uniform float time;uniform vec3 color;
varying vec3 vWorldNormal;varying vec3 vWorldPosition;varying vec2 vUv;
void main(){
  vec3 p=vWorldPosition;
  float n1=vnoise(p*2.0+vec3(time*0.08,0.0,0.0));
  float n2=vnoise(p*4.0-vec3(0.0,time*0.12,0.0));
  float n3=vnoise(p*8.0+vec3(time*0.06,time*0.04,0.0));
  float b1=sin(p.y*5.0+n1*3.5)*0.5+0.5;
  float b2=sin(p.y*9.0+n2*2.5-time*0.2)*0.5+0.5;
  vec3 col1=vec3(0.45,0.04,0.18);
  vec3 col2=vec3(0.72,0.08,0.38);
  vec3 col3=vec3(0.28,0.02,0.12);
  vec3 surface=mix(col1,col2,b1);
  surface=mix(surface,col3,b2*0.5);
  float eye=smoothstep(0.88,0.96,vnoise(p*3.0-time*0.05));
  surface+=vec3(0.9,0.3,0.6)*eye;
  surface+=n3*vec3(0.1,0.02,0.05)*0.5;
  surface=calcLight(surface,vWorldNormal,vWorldPosition,vec3(0.8,0.2,0.5),0.5);
  gl_FragColor=vec4(surface,1.0);
}`,

  timeline: `
${NOISE_GLSL}
${LIGHTING_GLSL}
uniform float time;uniform vec3 color;
varying vec3 vWorldNormal;varying vec3 vWorldPosition;varying vec2 vUv;
void main(){
  vec3 p=vWorldPosition;
  float n=fbm(p*2.5+time*0.03);
  float aurora1=sin(p.y*4.0+n*6.0+time*0.4)*0.5+0.5;
  float aurora2=sin(p.y*7.0-n*4.0-time*0.25)*0.5+0.5;
  aurora1=smoothstep(0.4,0.9,aurora1);
  aurora2=smoothstep(0.5,0.95,aurora2);
  vec3 base=vec3(0.55,0.60,0.68);
  vec3 aur1=vec3(0.4,0.8,1.0);
  vec3 aur2=vec3(0.7,0.5,1.0);
  vec3 surface=mix(base,aur1,aurora1*0.5);
  surface=mix(surface,aur2,aurora2*0.35);
  surface*=0.85+n*0.15;
  vec3 viewDir=normalize(cameraPosition-vWorldPosition);
  float vdotn=max(dot(vWorldNormal,viewDir),0.0);
  float translucent=pow(1.0-vdotn,3.0)*0.5;
  surface=calcLight(surface,vWorldNormal,vWorldPosition,vec3(0.6,0.85,1.0),0.4);
  surface+=aur1*translucent*0.4+aur2*translucent*0.3;
  gl_FragColor=vec4(surface,0.92);
}`,

  dreams: `
${NOISE_GLSL}
${LIGHTING_GLSL}
uniform float time;uniform vec3 color;
varying vec3 vWorldNormal;varying vec3 vWorldPosition;varying vec2 vUv;
void main(){
  vec3 p=vWorldPosition;
  float n=fbm(p*2.0+time*0.06);
  float aurora=sin(p.y*3.0+n*5.0-time*0.35)*0.5+0.5;
  aurora=pow(smoothstep(0.35,0.85,aurora),1.5);
  float swirl=fbm(p*4.0+vec3(time*0.1,-time*0.07,0.0));
  vec3 base=vec3(0.22,0.08,0.52);
  vec3 mid=vec3(0.48,0.14,0.80);
  vec3 bright=vec3(0.85,0.55,1.0);
  vec3 surface=mix(base,mid,n);
  surface=mix(surface,bright,aurora*0.7+swirl*0.15);
  surface+=vec3(0.5,0.2,1.0)*smoothstep(0.9,1.0,fbm(p*7.0-time*0.2))*1.2;
  surface=calcLight(surface,vWorldNormal,vWorldPosition,vec3(0.7,0.3,1.0),0.45);
  gl_FragColor=vec4(surface,1.0);
}`,

  contact: `
${NOISE_GLSL}
${LIGHTING_GLSL}
uniform float time;uniform vec3 color;
varying vec3 vWorldNormal;varying vec3 vWorldPosition;varying vec2 vUv;
void main(){
  vec3 p=vWorldPosition;
  float n=fbm(p*6.0-time*0.3);
  float pulse=sin(time*1.5)*0.5+0.5;
  vec3 base=vec3(0.92,0.96,1.0);
  vec3 corona=vec3(0.6,0.8,1.0);
  vec3 surface=mix(corona,base,n);
  surface*=1.2+pulse*0.3;
  float rays=smoothstep(0.85,1.0,fbm(p*4.0+time*0.4));
  surface+=vec3(0.8,0.95,1.0)*rays*2.0;
  vec3 viewDir=normalize(cameraPosition-vWorldPosition);
  float vdotn=max(dot(vWorldNormal,viewDir),0.0);
  float emit=1.5-vdotn*0.5;
  surface*=emit;
  gl_FragColor=vec4(surface,1.0);
}`,
};

export default function Planet({ position, config, active }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    const displacementScale = config.size * 0.06;
    const shader = fragmentShaders[config.type] ?? fragmentShaders.hero;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(config.color) },
        displacementScale: { value: displacementScale },
      },
      vertexShader,
      fragmentShader: shader,
      transparent: config.type === 'timeline',
    });
    return mat;
  }, [config]);

  React.useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    material.uniforms.time.value = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.004;
      meshRef.current.rotation.x += 0.0015;
      const t = active ? 1.08 : 1.0;
      meshRef.current.scale.lerp(new THREE.Vector3(t, t, t), delta * 1.5);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.001;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[config.size, 20]} />
        <primitive object={material} attach="material" />
      </mesh>
      <PlanetAtmosphere size={config.size} color={config.color} active={active} type={config.type} />
      {active && (
        <mesh ref={ringRef} rotation={[Math.PI / 2.2, 0, 0]}>
          <ringGeometry args={[config.size * 1.55, config.size * 1.62, 128]} />
          <meshBasicMaterial
            color={config.color}
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
