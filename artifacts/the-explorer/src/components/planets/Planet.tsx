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
float hash2(float n){return fract(sin(n)*43758.5453);}

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
  float v=0.0;float a=0.5;
  vec3 shift=vec3(100.0);
  for(int i=0;i<6;i++){v+=a*vnoise(p);p=p*2.0+shift;a*=0.5;}
  return v;
}

float fbm4(vec3 p){
  return vnoise(p)*0.5+vnoise(p*2.0+3.7)*0.25+vnoise(p*4.0+7.3)*0.125+vnoise(p*8.0+13.1)*0.0625;
}
`;

const LIGHTING_GLSL = `
vec3 calcLight(vec3 surfaceColor, vec3 worldNormal, vec3 worldPos, vec3 rimColor, float roughness, float specularStrength){
  vec3 sunDir = normalize(vec3(2.0, 1.5, 1.0));
  vec3 viewDir = normalize(cameraPosition - worldPos);
  
  float NdotL = max(dot(worldNormal, sunDir), 0.0);
  float ambient = 0.03;
  float shadow = NdotL * 0.97 + ambient;
  
  // Blinn-Phong specular
  vec3 halfDir = normalize(sunDir + viewDir);
  float NdotH = max(dot(worldNormal, halfDir), 0.0);
  float shininess = 64.0 * (1.0 - roughness) + 4.0;
  float spec = pow(NdotH, shininess) * specularStrength * (1.0 - roughness * 0.5);
  
  // Multi-layer rim
  float NdotV = max(dot(worldNormal, viewDir), 0.0);
  float rim1 = pow(1.0 - NdotV, 3.0) * 0.7;
  float rim2 = pow(1.0 - NdotV, 6.0) * 0.4;
  
  // Terminator softening
  float terminator = smoothstep(-0.1, 0.1, NdotL);
  
  vec3 lit = surfaceColor * shadow + spec * vec3(1.0, 0.95, 0.9);
  lit += rimColor * (rim1 + rim2);
  return lit;
}
`;

const vertexShader = `
${NOISE_GLSL}

uniform float time;
uniform float displacementScale;
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying float vElevation;

void main(){
  vUv = uv;
  
  float n1 = cnoise(position * 1.5 + time * 0.05);
  float n2 = cnoise(position * 3.5 - time * 0.025);
  float n3 = cnoise(position * 7.0 + time * 0.015);
  float n4 = cnoise(position * 14.0 - time * 0.01);
  
  float displacement = (n1 * 0.5 + n2 * 0.3 + n3 * 0.15 + n4 * 0.05) * displacementScale;
  vElevation = displacement;
  
  vec3 newPos = position + normal * displacement;
  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vWorldPosition = (modelMatrix * vec4(newPos, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}
`;

const cloudVertexShader = `
uniform float time;
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main(){
  vUv = uv;
  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const cloudFragmentShader = `
${NOISE_GLSL}

uniform float time;
uniform vec3 cloudColor;
uniform float cloudDensity;
varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main(){
  vec3 p = vWorldPosition * 0.6;
  float cloud = fbm(p + time * 0.04);
  float cloud2 = fbm(p * 2.5 - time * 0.02 + 5.3);
  
  float density = smoothstep(0.52, 0.75, cloud * 0.6 + cloud2 * 0.4);
  
  vec3 sunDir = normalize(vec3(2.0, 1.5, 1.0));
  float NdotL = max(dot(vWorldNormal, sunDir), 0.0) * 0.7 + 0.3;
  
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float rim = pow(1.0 - max(dot(vWorldNormal, viewDir), 0.0), 2.0) * 0.3;
  
  vec3 col = cloudColor * NdotL;
  gl_FragColor = vec4(col, density * cloudDensity + rim * density * 0.5);
}
`;

const fragmentShaders: Record<string, string> = {
  hero: `
${NOISE_GLSL}
${LIGHTING_GLSL}
uniform float time;
uniform vec3 color;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vElevation;

void main(){
  vec3 p = vWorldPosition;
  
  // Multi-layered atmospheric bands like a gas giant
  float turb = fbm4(p * 0.8 + time * 0.03) * 2.0 - 1.0;
  float bands1 = sin(p.y * 6.0 + turb * 2.5 + time * 0.15) * 0.5 + 0.5;
  float bands2 = sin(p.y * 14.0 - turb * 1.5 - time * 0.1) * 0.5 + 0.5;
  float bands3 = sin(p.y * 3.0 + turb * 0.8 + time * 0.05) * 0.5 + 0.5;
  
  vec3 c1 = vec3(0.08, 0.04, 0.38); // deep navy
  vec3 c2 = vec3(0.18, 0.10, 0.72); // royal blue
  vec3 c3 = vec3(0.30, 0.20, 0.90); // bright violet
  vec3 c4 = vec3(0.05, 0.30, 0.80); // cerulean
  vec3 c5 = vec3(0.55, 0.40, 1.00); // lavender
  
  vec3 surface = mix(c1, c2, bands1);
  surface = mix(surface, c3, bands2 * 0.6);
  surface = mix(surface, c4, bands3 * 0.4);
  
  // Great storm oval
  vec2 stormUV = vec2(p.x * 0.5 - 0.3, (p.y - 0.5) * 1.5);
  float stormDist = length(stormUV);
  float storm = smoothstep(0.5, 0.2, stormDist);
  float stormTwirl = fbm4(vec3(stormUV * 3.0 + time * 0.1, 0.5));
  storm *= smoothstep(0.55, 0.3, stormDist + stormTwirl * 0.2);
  surface = mix(surface, c5, storm * 0.7);
  
  // Fine detail streaks
  float streaks = fbm4(p * 4.0 + time * 0.06);
  surface += vec3(0.1, 0.05, 0.3) * streaks * 0.2;
  
  surface = calcLight(surface, vWorldNormal, vWorldPosition, vec3(0.4, 0.5, 1.0), 0.65, 0.5);
  gl_FragColor = vec4(surface, 1.0);
}`,

  about: `
${NOISE_GLSL}
${LIGHTING_GLSL}
uniform float time;
uniform vec3 color;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vElevation;

void main(){
  vec3 p = vWorldPosition;
  
  // Layered crustal noise
  float crust = fbm(p * 2.5 + time * 0.015);
  float rock = fbm4(p * 4.0 - time * 0.008);
  
  // Crack network — tectonic fissures
  float cracks = smoothstep(0.68, 0.80, fbm(p * 3.5 - time * 0.04));
  float cracks2 = smoothstep(0.72, 0.82, fbm4(p * 7.0 + time * 0.025));
  float cracks3 = smoothstep(0.75, 0.88, fbm(p * 12.0 + time * 0.05));
  
  vec3 darkRock = vec3(0.06, 0.03, 0.02);
  vec3 midRock  = vec3(0.16, 0.08, 0.05);
  vec3 lightRock= vec3(0.25, 0.14, 0.08);
  vec3 magmaOrange = vec3(1.0, 0.40, 0.05);
  vec3 magmaYellow = vec3(1.0, 0.80, 0.10);
  vec3 lavaGlow    = vec3(1.0, 0.20, 0.00);
  
  vec3 surface = mix(darkRock, midRock, rock);
  surface = mix(surface, lightRock, crust * 0.3);
  
  // Lava in cracks with glow
  float lavaAmount = max(cracks, max(cracks2 * 0.7, cracks3 * 0.5));
  vec3 lavaColor = mix(magmaOrange, magmaYellow, cracks3);
  surface = mix(surface, lavaColor, lavaAmount);
  
  // Emissive lava that self-illuminates
  vec3 emissive = lavaGlow * lavaAmount * 1.8;
  
  vec3 lit = calcLight(surface, vWorldNormal, vWorldPosition, vec3(1.0, 0.4, 0.1), 0.85, 0.15);
  lit += emissive * 0.7;
  
  // Night side city/lava glow
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 sunDir = normalize(vec3(2.0, 1.5, 1.0));
  float nightSide = 1.0 - max(dot(vWorldNormal, sunDir), 0.0);
  lit += lavaColor * lavaAmount * nightSide * 1.2;
  
  gl_FragColor = vec4(lit, 1.0);
}`,

  skills: `
${NOISE_GLSL}
${LIGHTING_GLSL}
uniform float time;
uniform vec3 color;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vElevation;

void main(){
  vec3 p = vWorldPosition;
  
  // Ice crystal structure — sharp geometric facets
  float crystal = fbm4(p * 3.5);
  float facetBase = fract(crystal * 8.0);
  float facet = smoothstep(0.0, 0.08, facetBase) * smoothstep(1.0, 0.92, facetBase);
  float facetGlow = smoothstep(0.0, 0.04, facetBase) * smoothstep(1.0, 0.96, facetBase);
  
  // Deep ocean underneath ice
  float depth = fbm(p * 2.0 + time * 0.02);
  
  // Ice caps at poles
  float iceCap = smoothstep(0.55, 0.85, abs(p.y / length(p)));
  
  // Storm systems
  float storm1 = sin(p.y * 5.0 + crystal * 4.0 + time * 0.4) * 0.5 + 0.5;
  float storm2 = sin(p.x * 3.0 - crystal * 3.0 - time * 0.3) * 0.5 + 0.5;
  float storms = storm1 * storm2;
  
  vec3 deepOcean = vec3(0.01, 0.18, 0.35);
  vec3 shallowIce = vec3(0.05, 0.55, 0.80);
  vec3 brightIce  = vec3(0.50, 0.92, 1.00);
  vec3 snowWhite  = vec3(0.85, 0.95, 1.00);
  vec3 stormBlue  = vec3(0.02, 0.35, 0.65);
  
  vec3 surface = mix(deepOcean, shallowIce, depth);
  surface = mix(surface, stormBlue, storms * 0.4);
  surface += brightIce * facet * 0.4;
  surface = mix(surface, snowWhite, iceCap);
  
  // Crystal edge highlight
  surface += vec3(0.6, 0.95, 1.0) * facetGlow * 0.5;
  
  // Lightning arcs
  float lightning = smoothstep(0.88, 1.0, fbm(p * 9.0 - time * 0.5));
  surface += vec3(0.7, 0.95, 1.0) * lightning * 2.5;
  
  // Subsurface scattering simulation
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float sss = pow(max(dot(vWorldNormal, viewDir), 0.0), 0.5) * 0.15;
  surface += vec3(0.2, 0.7, 1.0) * sss;
  
  surface = calcLight(surface, vWorldNormal, vWorldPosition, vec3(0.3, 0.85, 1.0), 0.12, 0.9);
  gl_FragColor = vec4(surface, 1.0);
}`,

  projects: `
${NOISE_GLSL}
${LIGHTING_GLSL}
uniform float time;
uniform vec3 color;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vElevation;

void main(){
  vec3 p = vWorldPosition;
  
  // Dark alien surface with biological patterns
  float bio1 = fbm(p * 1.8 + time * 0.04);
  float bio2 = fbm4(p * 3.5 - time * 0.06);
  float bio3 = fbm(p * 7.0 + time * 0.03);
  
  // Fluid band system
  float bands1 = sin(p.y * 4.0 + bio1 * 3.5) * 0.5 + 0.5;
  float bands2 = sin(p.y * 9.0 + bio2 * 2.5 - time * 0.15) * 0.5 + 0.5;
  
  // Bioluminescent veins
  float veins = smoothstep(0.75, 0.90, fbm(p * 5.0 - time * 0.05));
  float veins2 = smoothstep(0.80, 0.95, fbm(p * 9.0 + time * 0.04));
  
  // Eye-like anomalies
  float eyes = smoothstep(0.85, 0.96, vnoise(p * 2.5 - time * 0.03));
  
  vec3 darkBase  = vec3(0.08, 0.01, 0.05);
  vec3 midPurple = vec3(0.30, 0.03, 0.14);
  vec3 deepRed   = vec3(0.55, 0.06, 0.22);
  vec3 bioGlow   = vec3(0.95, 0.25, 0.55);
  vec3 bioGlow2  = vec3(0.70, 0.10, 0.80);
  vec3 eyeColor  = vec3(1.00, 0.60, 0.80);
  
  vec3 surface = mix(darkBase, midPurple, bands1 * 0.5 + bio1 * 0.5);
  surface = mix(surface, deepRed, bands2 * 0.4);
  
  // Glowing veins
  surface = mix(surface, bioGlow, veins);
  surface = mix(surface, bioGlow2, veins2 * 0.8);
  surface = mix(surface, eyeColor, eyes);
  
  vec3 lit = calcLight(surface, vWorldNormal, vWorldPosition, vec3(0.8, 0.2, 0.5), 0.5, 0.25);
  
  // Self-glow from bioluminescence
  vec3 sunDir = normalize(vec3(2.0, 1.5, 1.0));
  float nightSide = 1.0 - max(dot(vWorldNormal, sunDir), 0.0);
  lit += bioGlow * veins * nightSide * 0.8;
  lit += bioGlow2 * veins2 * nightSide * 0.5;
  
  gl_FragColor = vec4(lit, 1.0);
}`,

  timeline: `
${NOISE_GLSL}
${LIGHTING_GLSL}
uniform float time;
uniform vec3 color;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vElevation;

void main(){
  vec3 p = vWorldPosition;
  
  // Silver-grey rocky terrain
  float terrain = fbm(p * 2.0 + time * 0.01);
  float detail  = fbm4(p * 5.0 + time * 0.008);
  float craters = smoothstep(0.72, 0.78, vnoise(p * 3.5));
  
  // Polar ice caps
  float latAbs = abs(normalize(p).y);
  float iceCap = smoothstep(0.55, 0.80, latAbs);
  float iceDetail = fbm4(p * 4.0) * 0.3;
  
  // Aurora ribbons — animated light bands
  float auroraLat = smoothstep(0.45, 0.70, latAbs);
  float aurora1 = sin(p.y * 5.0 + fbm(p * 1.5 + time * 0.3) * 8.0 + time * 0.6) * 0.5 + 0.5;
  float aurora2 = sin(p.y * 9.0 - fbm(p * 2.5 - time * 0.2) * 6.0 - time * 0.45) * 0.5 + 0.5;
  aurora1 = pow(smoothstep(0.3, 0.9, aurora1), 1.8) * auroraLat;
  aurora2 = pow(smoothstep(0.4, 0.95, aurora2), 1.5) * auroraLat;
  
  vec3 greyBase  = vec3(0.42, 0.44, 0.50);
  vec3 greyLight = vec3(0.62, 0.64, 0.70);
  vec3 craterRim = vec3(0.70, 0.72, 0.80);
  vec3 iceWhite  = vec3(0.88, 0.92, 1.00);
  vec3 aur1Col   = vec3(0.30, 0.90, 0.80); // teal aurora
  vec3 aur2Col   = vec3(0.70, 0.40, 1.00); // violet aurora
  
  vec3 surface = mix(greyBase, greyLight, terrain);
  surface = mix(surface, craterRim, craters * 0.4);
  surface = mix(surface, iceWhite, iceCap * (0.8 + iceDetail));
  
  // Aurora overlay
  surface = mix(surface, aur1Col, aurora1 * 0.5);
  surface = mix(surface, aur2Col, aurora2 * 0.4);
  
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float vdotn = max(dot(vWorldNormal, viewDir), 0.0);
  float translucent = pow(1.0 - vdotn, 4.0) * 0.4;
  
  vec3 lit = calcLight(surface, vWorldNormal, vWorldPosition, vec3(0.6, 0.85, 1.0), 0.45, 0.6);
  lit += aur1Col * aurora1 * 0.4 + aur2Col * aurora2 * 0.3;
  lit += (aur1Col + aur2Col) * translucent * 0.3;
  
  gl_FragColor = vec4(lit, 0.97);
}`,

  dreams: `
${NOISE_GLSL}
${LIGHTING_GLSL}
uniform float time;
uniform vec3 color;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vElevation;

void main(){
  vec3 p = vWorldPosition;
  
  // Violent storm system like Neptune but more alien
  float turb = fbm(p * 1.5 + time * 0.05);
  float swirl1 = fbm4(vec3(p.xy * 2.5 + time * 0.08, turb * 2.0));
  float swirl2 = fbm(p * 4.0 - vec3(time * 0.06, -time * 0.04, 0.0));
  
  float bands = sin(p.y * 4.0 + turb * 5.0 - time * 0.25) * 0.5 + 0.5;
  float vortex = fbm(p * 3.0 + vec3(time * 0.1, -time * 0.07, 0.0));
  
  // Eye of the storm
  float stormEye = length(p.xz / length(p));
  float eyeGlow = smoothstep(0.4, 0.0, stormEye - 0.3 + vortex * 0.1);
  
  vec3 deepViolet = vec3(0.14, 0.04, 0.40);
  vec3 midPurple  = vec3(0.38, 0.10, 0.72);
  vec3 brightPurp = vec3(0.65, 0.30, 1.00);
  vec3 stormWhite = vec3(0.85, 0.75, 1.00);
  vec3 eyeCore    = vec3(1.00, 0.90, 1.00);
  
  vec3 surface = mix(deepViolet, midPurple, bands * 0.6 + swirl1 * 0.4);
  surface = mix(surface, brightPurp, swirl2 * 0.5 + vortex * 0.3);
  surface = mix(surface, stormWhite, swirl1 * bands * 0.4);
  surface = mix(surface, eyeCore, eyeGlow * 0.8);
  
  // Lightning deep in the clouds
  float lightning = smoothstep(0.90, 1.0, fbm(p * 7.0 - time * 0.3));
  float lightning2 = smoothstep(0.93, 1.0, fbm(p * 12.0 + time * 0.4));
  surface += vec3(0.8, 0.5, 1.0) * lightning * 2.0;
  surface += vec3(1.0, 0.8, 1.0) * lightning2 * 1.5;
  
  surface = calcLight(surface, vWorldNormal, vWorldPosition, vec3(0.7, 0.3, 1.0), 0.4, 0.4);
  
  // Storm self-illumination
  vec3 sunDir = normalize(vec3(2.0, 1.5, 1.0));
  float nightSide = 1.0 - max(dot(vWorldNormal, sunDir), 0.0);
  surface += brightPurp * lightning * nightSide * 0.6;
  
  gl_FragColor = vec4(surface, 1.0);
}`,

  contact: `
${NOISE_GLSL}
uniform float time;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vElevation;

void main(){
  vec3 p = vWorldPosition;
  
  // Solar granulation — convection cells
  float granules = fbm4(p * 4.0 - time * 0.15);
  float granules2 = fbm4(p * 8.0 + time * 0.1);
  float granuleBounds = fract(granules * 6.0);
  float cell = smoothstep(0.0, 0.25, granuleBounds) * smoothstep(1.0, 0.75, granuleBounds);
  
  // Sunspot regions
  float spots = smoothstep(0.78, 0.86, fbm(p * 2.5 - time * 0.04));
  float spots2 = smoothstep(0.82, 0.90, vnoise(p * 1.8 + time * 0.02));
  
  // Pulsing energy
  float pulse = 0.85 + 0.15 * sin(time * 1.2 + granules * 5.0);
  float pulse2 = 0.9 + 0.1 * sin(time * 0.7 + 1.5);
  
  vec3 coreColor  = vec3(1.00, 0.98, 0.85);
  vec3 hotGranule = vec3(1.00, 0.92, 0.60);
  vec3 coolGroove = vec3(0.95, 0.60, 0.15);
  vec3 sunspot    = vec3(0.30, 0.12, 0.02);
  vec3 coronaGlow = vec3(0.70, 0.88, 1.00);
  
  vec3 surface = mix(coolGroove, coreColor, granules);
  surface = mix(surface, hotGranule, cell * 0.5);
  surface = mix(surface, sunspot, spots * 0.7);
  surface = mix(surface, sunspot * 0.5, spots2 * 0.4);
  
  // Solar flare regions
  float flares = smoothstep(0.88, 1.0, fbm(p * 3.0 + time * 0.3));
  surface += vec3(1.0, 0.7, 0.2) * flares * 1.5;
  
  // View-dependent corona
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float vdotn = max(dot(vWorldNormal, viewDir), 0.0);
  float corona = pow(1.0 - vdotn, 1.5);
  
  surface *= pulse * pulse2;
  surface += coronaGlow * corona * 0.6;
  surface += vec3(1.0, 0.9, 0.5) * (1.0 - vdotn) * 0.3;
  
  gl_FragColor = vec4(surface * 1.3, 1.0);
}`,
};

const CLOUD_CONFIGS: Record<string, { color: string; density: number; show: boolean }> = {
  hero:     { color: '#c0d8ff', density: 0.55, show: true },
  about:    { color: '#ff6633', density: 0.0, show: false },
  skills:   { color: '#e8f8ff', density: 0.65, show: true },
  projects: { color: '#ff44aa', density: 0.35, show: true },
  timeline: { color: '#ddeeff', density: 0.50, show: true },
  dreams:   { color: '#cc88ff', density: 0.60, show: true },
  contact:  { color: '#ffffff', density: 0.0, show: false },
};

export default function Planet({ position, config, active }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const ringRef  = useRef<THREE.Mesh>(null);

  const surfaceMat = useMemo(() => {
    const displacementScale = config.size * 0.055;
    const shader = fragmentShaders[config.type] ?? fragmentShaders.hero;
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(config.color) },
        displacementScale: { value: displacementScale },
      },
      vertexShader,
      fragmentShader: shader,
      transparent: config.type === 'timeline',
    });
  }, [config]);

  const cloudConfig = CLOUD_CONFIGS[config.type] ?? { color: '#ffffff', density: 0.4, show: false };

  const cloudMat = useMemo(() => {
    if (!cloudConfig.show) return null;
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        cloudColor: { value: new THREE.Color(cloudConfig.color) },
        cloudDensity: { value: cloudConfig.density },
      },
      vertexShader: cloudVertexShader,
      fragmentShader: cloudFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.FrontSide,
    });
  }, [cloudConfig]);

  React.useEffect(() => () => { surfaceMat.dispose(); cloudMat?.dispose(); }, [surfaceMat, cloudMat]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    surfaceMat.uniforms.time.value = t;
    if (cloudMat) cloudMat.uniforms.time.value = t;

    if (meshRef.current) {
      meshRef.current.rotation.y += 0.003;
      meshRef.current.rotation.x += 0.0008;
      const s = active ? 1.08 : 1.0;
      meshRef.current.scale.lerp(new THREE.Vector3(s, s, s), delta * 1.2);
    }
    if (cloudRef.current) {
      cloudRef.current.rotation.y += 0.0018;
      cloudRef.current.rotation.z += 0.0005;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.0008;
    }
  });

  const segments = config.type === 'contact' ? 32 : 48;

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[config.size, 24]} />
        <primitive object={surfaceMat} attach="material" />
      </mesh>

      {cloudConfig.show && cloudMat && (
        <mesh ref={cloudRef}>
          <sphereGeometry args={[config.size * 1.035, 48, 48]} />
          <primitive object={cloudMat} attach="material" />
        </mesh>
      )}

      <PlanetAtmosphere size={config.size} color={config.color} active={active} type={config.type} />

      {active && (
        <mesh ref={ringRef} rotation={[Math.PI / 2.3, 0.1, 0]}>
          <ringGeometry args={[config.size * 1.6, config.size * 1.68, 160]} />
          <meshBasicMaterial
            color={config.color}
            transparent
            opacity={0.28}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
      {active && (
        <mesh rotation={[Math.PI / 2.3, 0.1, 0]}>
          <ringGeometry args={[config.size * 1.72, config.size * 1.76, 160]} />
          <meshBasicMaterial
            color={config.color}
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
