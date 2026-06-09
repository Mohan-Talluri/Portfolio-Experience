import React, { useRef, useMemo, useEffect } from 'react';
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

// ─── Shared noise GLSL ───────────────────────────────────────────────────────
const NOISE = `
float hash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,151.7182)))*43758.5453);}
float vnoise(vec3 p){
  vec3 i=floor(p);vec3 f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.0;float a=0.5;
  for(int i=0;i<6;i++){v+=a*vnoise(p);p=p*2.1+vec3(100.0);a*=0.5;}return v;}
float fbm4(vec3 p){return vnoise(p)*0.5+vnoise(p*2.1+3.3)*0.25+vnoise(p*4.3+7.7)*0.125+vnoise(p*8.7+15.1)*0.0625;}
`;

// Lighting uses world-space N and P for correct shading regardless of rotation
const LIGHT = `
vec3 light(vec3 col,vec3 N,vec3 P,vec3 rimCol,float rough,float specStr){
  vec3 L=normalize(vec3(2.0,1.5,1.0));
  vec3 V=normalize(cameraPosition-P);
  float NdL=max(dot(N,L),0.0);
  float amb=0.012;
  vec3 H=normalize(L+V);
  float spec=pow(max(dot(N,H),0.0),mix(16.0,256.0,1.0-rough))*specStr;
  float NdV=max(dot(N,V),0.0);
  float rim=pow(1.0-NdV,2.8)*1.1;
  float rim2=pow(1.0-NdV,6.0)*0.7;
  vec3 lit=col*(NdL+amb)+spec*vec3(1.0,0.97,0.92);
  lit+=rimCol*(rim+rim2);
  return lit;
}
`;

// KEY FIX: vPLocal = object-space position (rotates with the mesh).
// Patterns are generated from vPLocal so rotating the mesh visibly moves the texture.
// vN and vP remain world-space for correct lighting.
const vert = `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vP;
varying vec3 vPLocal;
void main(){
  vUv=uv;
  vN=normalize((modelMatrix*vec4(normal,0.0)).xyz);
  vP=(modelMatrix*vec4(position,1.0)).xyz;
  vPLocal=position;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}`;

// Each fragment shader declares vPLocal and uses it for pattern, but vN/vP for lighting
const frags: Record<string, string> = {
  hero: `${NOISE}${LIGHT}
uniform float time;
varying vec3 vN,vP,vPLocal;varying vec2 vUv;
void main(){
  vec3 p=vPLocal*0.55;
  float turb=fbm(p*1.2+time*0.025)*2.0-1.0;
  float b1=sin(p.y*7.0+turb*2.8+time*0.18)*0.5+0.5;
  float b2=sin(p.y*15.0-turb*1.8-time*0.12)*0.5+0.5;
  float b3=sin(p.y*3.5+turb*0.9+time*0.06)*0.5+0.5;
  float fine=sin(p.y*30.0+turb*5.0+time*0.3)*0.5+0.5;
  vec3 c1=vec3(0.03,0.01,0.22);vec3 c2=vec3(0.08,0.04,0.65);
  vec3 c3=vec3(0.18,0.10,0.88);vec3 c4=vec3(0.02,0.20,0.72);vec3 c5=vec3(0.50,0.38,1.00);
  vec3 s=mix(c1,c2,b1);s=mix(s,c3,b2*0.7);s=mix(s,c4,b3*0.45);
  s+=vec3(0.10,0.06,0.22)*fine*0.4;
  vec3 lp=normalize(vPLocal);
  float sdist=length(vec2(lp.x-0.35,lp.y*1.8-0.25));
  float stormTwirl=fbm4(vec3(lp.xy*4.0+time*0.08,0.5));
  float storm=smoothstep(0.28,0.05,sdist+stormTwirl*0.15)*0.85;
  s=mix(s,c5,storm);
  s=light(s,vN,vP,vec3(0.55,0.65,1.0),0.62,0.7);
  gl_FragColor=vec4(s,1.0);
}`,

  about: `${NOISE}${LIGHT}
uniform float time;
varying vec3 vN,vP,vPLocal;varying vec2 vUv;
void main(){
  vec3 p=vPLocal;
  float crust=fbm(p*2.2+time*0.012);float rock=fbm4(p*4.5-time*0.007);
  float c1=smoothstep(0.63,0.74,fbm(p*3.0-time*0.035));
  float c2=smoothstep(0.68,0.79,fbm4(p*6.5+time*0.022));
  float c3=smoothstep(0.72,0.84,fbm(p*11.0+time*0.045));
  float c4=smoothstep(0.78,0.90,vnoise(p*18.0-time*0.06));
  vec3 dRock=vec3(0.04,0.02,0.01);vec3 mRock=vec3(0.11,0.06,0.03);vec3 lRock=vec3(0.20,0.11,0.05);
  vec3 magO=vec3(1.0,0.38,0.02);vec3 magY=vec3(1.0,0.82,0.06);vec3 magW=vec3(1.0,1.0,0.65);
  vec3 s=mix(dRock,mRock,rock);s=mix(s,lRock,crust*0.25);
  float lava=max(c1,max(c2*0.8,max(c3*0.6,c4*0.45)));
  vec3 lavaCol=mix(magO,magY,c3);lavaCol=mix(lavaCol,magW,c4*0.6);
  s=mix(s,lavaCol,lava);
  vec3 L=normalize(vec3(2.0,1.5,1.0));float night=1.0-max(dot(vN,L),0.0);
  vec3 lit=light(s,vN,vP,vec3(1.0,0.35,0.08),0.92,0.08);
  lit+=lavaCol*lava*(0.8+night*1.4);
  gl_FragColor=vec4(lit,1.0);
}`,

  skills: `${NOISE}${LIGHT}
uniform float time;
varying vec3 vN,vP,vPLocal;varying vec2 vUv;
void main(){
  vec3 p=vPLocal;
  float crystal=fbm4(p*3.5);float faceBase=fract(crystal*9.0);
  float face=smoothstep(0.0,0.07,faceBase)*smoothstep(1.0,0.93,faceBase);
  float faceEdge=smoothstep(0.0,0.03,faceBase)*smoothstep(1.0,0.97,faceBase);
  float depth=fbm(p*2.0+time*0.018);
  float latAbs=abs(normalize(p).y);
  float ice=smoothstep(0.48,0.78,latAbs);
  float storm=sin(p.y*5.5+crystal*4.0+time*0.45)*0.5+0.5;
  float storm2=sin(p.x*3.5-crystal*3.0-time*0.32)*0.5+0.5;
  vec3 ocean=vec3(0.00,0.12,0.28);vec3 iceBlue=vec3(0.02,0.45,0.80);
  vec3 iceWhite=vec3(0.65,0.90,1.00);vec3 snowCap=vec3(0.88,0.96,1.00);vec3 stormBlue=vec3(0.00,0.25,0.55);
  vec3 s=mix(ocean,iceBlue,depth);s=mix(s,stormBlue,storm*storm2*0.42);
  s+=iceBlue*face*0.55;s+=vec3(0.9,1.0,1.0)*faceEdge*0.7;s=mix(s,snowCap,ice);
  vec3 V=normalize(cameraPosition-vP);float sss=pow(max(dot(vN,V),0.0),0.4)*0.15;
  s+=vec3(0.08,0.55,1.0)*sss;
  float bolt=smoothstep(0.905,1.0,fbm(p*9.0-time*0.55));s+=vec3(0.5,0.92,1.0)*bolt*3.0;
  s=light(s,vN,vP,vec3(0.25,0.85,1.0),0.10,1.1);
  gl_FragColor=vec4(s,1.0);
}`,

  projects: `${NOISE}${LIGHT}
uniform float time;
varying vec3 vN,vP,vPLocal;varying vec2 vUv;
void main(){
  vec3 p=vPLocal;
  float base=fbm(p*2.0+time*0.038);float swirl=fbm4(p*3.5-time*0.055);
  float b1=sin(p.y*4.5+base*3.5)*0.5+0.5;float b2=sin(p.y*9.0+swirl*2.5-time*0.14)*0.5+0.5;
  float v1=smoothstep(0.70,0.86,fbm(p*5.0-time*0.04));
  float v2=smoothstep(0.75,0.91,fbm4(p*9.0+time*0.035));
  float v3=smoothstep(0.80,0.93,vnoise(p*15.0-time*0.025));
  float eyes=smoothstep(0.84,0.95,vnoise(p*2.5-time*0.028));
  vec3 dark=vec3(0.05,0.01,0.03);vec3 mid=vec3(0.22,0.02,0.10);
  vec3 bio1=vec3(0.98,0.18,0.50);vec3 bio2=vec3(0.62,0.06,0.90);vec3 eyeC=vec3(1.00,0.60,0.78);
  vec3 s=mix(dark,mid,b1*0.5+base*0.5);
  float vein=max(v1,max(v2*0.85,v3*0.65));vec3 veinCol=mix(bio1,bio2,v2);
  s=mix(s,veinCol,vein);s=mix(s,eyeC,eyes*0.9);
  vec3 L=normalize(vec3(2.0,1.5,1.0));float night=1.0-max(dot(vN,L),0.0);
  vec3 lit=light(s,vN,vP,vec3(0.85,0.15,0.55),0.52,0.25);
  lit+=veinCol*vein*night*1.4;lit+=bio2*eyes*night*1.0;
  gl_FragColor=vec4(lit,1.0);
}`,

  timeline: `${NOISE}${LIGHT}
uniform float time;
varying vec3 vN,vP,vPLocal;varying vec2 vUv;
void main(){
  vec3 p=vPLocal;
  float terrain=fbm(p*1.8+time*0.008);float detail=fbm4(p*4.5+time*0.005);
  float crater=smoothstep(0.68,0.74,vnoise(p*3.2));
  float latAbs=abs(normalize(p).y);
  float ice=smoothstep(0.50,0.76,latAbs);float aurLat=smoothstep(0.38,0.66,latAbs);
  float n=fbm(p*1.2+time*0.018);
  float a1=pow(smoothstep(0.28,0.92,sin(p.y*5.0+n*8.0+time*0.65)*0.5+0.5),1.8)*aurLat;
  float a2=pow(smoothstep(0.35,0.96,sin(p.y*9.0-n*6.0-time*0.50)*0.5+0.5),1.5)*aurLat;
  vec3 grey=vec3(0.32,0.34,0.40);vec3 lgrey=vec3(0.52,0.54,0.60);vec3 iceW=vec3(0.82,0.90,1.00);
  vec3 aur1=vec3(0.15,1.00,0.72);vec3 aur2=vec3(0.68,0.28,1.00);
  vec3 s=mix(grey,lgrey,terrain);s=mix(s,lgrey*1.2,crater*0.5);
  s=mix(s,iceW,ice*(0.80+detail*0.20));s=mix(s,aur1,a1*0.65);s=mix(s,aur2,a2*0.55);
  vec3 V=normalize(cameraPosition-vP);float sss=pow(1.0-max(dot(vN,V),0.0),4.0)*0.40;
  vec3 lit=light(s,vN,vP,vec3(0.50,0.88,1.0),0.45,0.65);
  lit+=aur1*a1*0.65+aur2*a2*0.50;lit+=(aur1+aur2)*sss*0.35;
  gl_FragColor=vec4(lit,1.0);
}`,

  dreams: `${NOISE}${LIGHT}
uniform float time;
varying vec3 vN,vP,vPLocal;varying vec2 vUv;
void main(){
  vec3 p=vPLocal;
  float turb=fbm(p*1.4+time*0.048);
  float s1=fbm4(vec3(p.xy*2.2+time*0.07,turb*2.0));
  float s2=fbm(p*3.8-vec3(time*0.055,-time*0.038,0.0));
  float bands=sin(p.y*4.2+turb*5.5-time*0.28)*0.5+0.5;
  vec3 lp=normalize(p);float eyeDist=length(lp.xz);
  float vortex=fbm(p*2.8+vec3(time*0.09,-time*0.065,0.0));
  float eyeGlow=smoothstep(0.5,0.0,eyeDist-0.25+vortex*0.10);
  vec3 dv=vec3(0.10,0.02,0.32);vec3 mv=vec3(0.30,0.06,0.68);
  vec3 bv=vec3(0.58,0.22,1.00);vec3 sw=vec3(0.80,0.68,1.00);vec3 eyeC=vec3(1.00,0.90,1.00);
  vec3 s=mix(dv,mv,bands*0.65+s1*0.35);s=mix(s,bv,s2*0.55+vortex*0.32);
  s=mix(s,sw,s1*bands*0.45);s=mix(s,eyeC,eyeGlow*0.80);
  float bolt=smoothstep(0.896,1.0,fbm(p*7.5-time*0.32));
  float bolt2=smoothstep(0.920,1.0,fbm(p*13.0+time*0.42));
  s+=vec3(0.85,0.45,1.0)*bolt*3.0;s+=vec3(1.0,0.78,1.0)*bolt2*2.0;
  vec3 L=normalize(vec3(2.0,1.5,1.0));float night=1.0-max(dot(vN,L),0.0);
  vec3 lit=light(s,vN,vP,vec3(0.72,0.25,1.0),0.38,0.42);
  lit+=bv*bolt*night*0.75;
  gl_FragColor=vec4(lit,1.0);
}`,

  contact: `${NOISE}
uniform float time;
varying vec3 vN,vP,vPLocal;varying vec2 vUv;
void main(){
  vec3 p=vPLocal;
  float gran=fbm4(p*3.8-time*0.14);float gran2=fbm4(p*8.0+time*0.10);
  float granCell=fract(gran*7.0);
  float cell=smoothstep(0.0,0.22,granCell)*smoothstep(1.0,0.78,granCell);
  float spot=smoothstep(0.74,0.82,fbm(p*2.2-time*0.03));
  float flare=smoothstep(0.88,1.0,fbm(p*3.0+time*0.28));
  float pulse=0.86+0.14*sin(time*1.1+gran*4.0);
  vec3 core=vec3(1.00,0.97,0.82);vec3 hot=vec3(1.00,0.88,0.50);
  vec3 cool=vec3(0.90,0.52,0.10);vec3 sp=vec3(0.22,0.08,0.01);vec3 flareC=vec3(1.0,0.70,0.18);
  vec3 s=mix(cool,core,gran);s=mix(s,hot,cell*0.60);s=mix(s,sp,spot*0.82);
  s+=flareC*flare*1.8;s*=pulse;
  vec3 V=normalize(cameraPosition-vP);float NdV=max(dot(vN,V),0.0);
  float limb=pow(NdV,0.38);s*=0.55+limb*0.45;
  float rim=pow(1.0-NdV,1.4)*0.9;s+=vec3(0.65,0.82,1.0)*rim;
  gl_FragColor=vec4(s*1.35,1.0);
}`,
};

const _scaleVec = new THREE.Vector3();

// Global flag so Home.tsx swipe handler knows a planet is being dragged
export let planetDragging = false;

export default function Planet({ position, config, active }: PlanetProps) {
  const groupRef   = useRef<THREE.Group>(null);
  const meshRef    = useRef<THREE.Mesh>(null);
  const ringRef    = useRef<THREE.Mesh>(null);
  const ring2Ref   = useRef<THREE.Mesh>(null);

  // Drag: pendingDelta accumulates all pointermove events between frames
  const drag         = useRef({ active: false, x: 0, y: 0 });
  const pendingDelta = useRef({ x: 0, y: 0 });
  const rotVel       = useRef({ x: 0, y: 0 });
  const ringAng      = useRef(0);
  const ring2Ang     = useRef(0);

  const mat = useMemo(() => {
    const frag = frags[config.type] ?? frags.hero;
    return new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: vert,
      fragmentShader: frag,
    });
  }, [config.type]);

  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(config.color),
    transparent: true, opacity: 0.38,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
  }), [config.color]);

  const ring2Mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(config.color),
    transparent: true, opacity: 0.18,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
  }), [config.color]);

  useEffect(() => () => {
    mat.dispose(); ringMat.dispose(); ring2Mat.dispose();
  }, [mat, ringMat, ring2Mat]);

  // Window-level listeners: capture ALL pointer moves, even when cursor leaves mesh
  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      const sens = e.pointerType === 'touch' ? 0.012 : 0.009;
      // ACCUMULATE so no movements are lost between frames
      pendingDelta.current.y += dx * sens;
      pendingDelta.current.x += dy * sens;
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
    }
    function onUp() {
      drag.current.active = false;
      planetDragging = false;
    }
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup',   onUp,   { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
    };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    mat.uniforms.time.value = state.clock.elapsedTime;

    const group = groupRef.current;
    if (group) {
      if (drag.current.active) {
        // Apply ALL accumulated movement since last frame — instant, no lag
        const dy = pendingDelta.current.y;
        const dx = pendingDelta.current.x;
        group.rotation.y += dy;
        group.rotation.x += dx;
        // Blend into velocity for post-drag inertia
        rotVel.current.y = dy * 0.8 + rotVel.current.y * 0.2;
        rotVel.current.x = dx * 0.8 + rotVel.current.x * 0.2;
        // Clear pending so we don't double-apply
        pendingDelta.current.x = 0;
        pendingDelta.current.y = 0;
      } else {
        // Inertia: coast to a stop
        rotVel.current.x *= 0.92;
        rotVel.current.y *= 0.92;
        group.rotation.y += rotVel.current.y;
        group.rotation.x += rotVel.current.x;

        // Auto-rotate only once fully stopped
        const speed = Math.abs(rotVel.current.x) + Math.abs(rotVel.current.y);
        if (speed < 0.0003) {
          group.rotation.y += 0.0025;
        }
      }
      // Allow full 360° on Y; clamp X to avoid flipping upside-down
      group.rotation.x = Math.max(-1.2, Math.min(1.2, group.rotation.x));
    }

    if (meshRef.current) {
      _scaleVec.setScalar(active ? 1.08 : 1.0);
      meshRef.current.scale.lerp(_scaleVec, dt * 1.5);
    }

    // Ring orbit spin
    ringAng.current  += 0.0006;
    ring2Ang.current -= 0.0004;
    if (ringRef.current)  ringRef.current.rotation.z  = ringAng.current;
    if (ring2Ref.current) ring2Ref.current.rotation.z = ring2Ang.current;
  });

  function handlePointerDown(e: any) {
    e.stopPropagation();
    drag.current = { active: true, x: e.clientX, y: e.clientY };
    pendingDelta.current = { x: 0, y: 0 };
    rotVel.current = { x: 0, y: 0 };
    planetDragging = true;
  }

  const r = config.size;

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={meshRef} onPointerDown={handlePointerDown}>
        <sphereGeometry args={[r, 64, 64]} />
        <primitive object={mat} attach="material" />
      </mesh>

      <PlanetAtmosphere size={r} color={config.color} active={active} type={config.type} />

      <mesh ref={ringRef} rotation={[Math.PI / 2.2, 0.08, 0]}>
        <ringGeometry args={[r * 1.55, r * 1.64, 180]} />
        <primitive object={ringMat} attach="material" />
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI / 2.2, 0.08, 0]}>
        <ringGeometry args={[r * 1.70, r * 1.75, 180]} />
        <primitive object={ring2Mat} attach="material" />
      </mesh>
    </group>
  );
}
