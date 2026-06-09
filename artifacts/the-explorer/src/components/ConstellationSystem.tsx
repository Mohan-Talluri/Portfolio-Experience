import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const CONSTELLATIONS = [
  {
    name: 'Orion-like',
    targetSection: 0,
    stars: [
      [4, 6, -12], [6, 4, -14], [8, 2, -16],
      [2, 10, -18], [10, -2, -10],
      [12, 8, -20], [0, -4, -12]
    ] as [number,number,number][],
    connections: [[0,1],[1,2],[3,0],[2,4],[5,1],[0,6]] as [number,number][],
  },
  {
    name: 'Dipper',
    targetSection: 2,
    stars: [
      [-14, -3, -42], [-16, 0, -45], [-18, 1, -47],
      [-20, -2, -49], [-19, -5, -50], [-16, -4, -48]
    ] as [number,number,number][],
    connections: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,2]] as [number,number][],
  },
  {
    name: 'Crown',
    targetSection: 4,
    stars: [
      [-12, -6, -82], [-14, -3, -85], [-17, 0, -87],
      [-20, -4, -89], [-22, -8, -92]
    ] as [number,number,number][],
    connections: [[0,1],[1,2],[2,3],[3,4]] as [number,number][],
  },
  {
    name: 'Triangle',
    targetSection: 1,
    stars: [
      [14, 10, -18], [20, 3, -22], [12, 0, -26]
    ] as [number,number,number][],
    connections: [[0,1],[1,2],[2,0]] as [number,number][],
  },
  {
    name: 'Serpent',
    targetSection: 5,
    stars: [
      [6, 10, -60], [9, 12, -70], [16, 9, -80],
      [13, 5, -90], [19, 1, -100], [16, -5, -108],
      [21, -9, -114], [26, -6, -120]
    ] as [number,number,number][],
    connections: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]] as [number,number][],
  },
  {
    name: 'Phoenix',
    targetSection: 3,
    stars: [
      [18, 12, -55], [22, 8, -60], [25, 14, -58],
      [20, 5, -62], [24, 2, -65]
    ] as [number,number,number][],
    connections: [[0,1],[1,2],[0,3],[3,4],[1,4]] as [number,number][],
  },
];

const lineVertShader = `
attribute float alpha;
varying float vAlpha;
void main(){
  vAlpha = alpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const lineFragShader = `
uniform vec3 color;
uniform float opacity;
varying float vAlpha;
void main(){
  gl_FragColor = vec4(color, opacity * vAlpha);
}
`;

const starVertShader = `
attribute float starSize;
attribute float phase;
uniform float time;
varying float vPhase;
void main(){
  vPhase = phase;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = starSize * 200.0 / -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const starFragShader = `
uniform float time;
uniform vec3 color;
uniform float opacity;
varying float vPhase;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if(d > 0.5) discard;
  float core = exp(-d * d * 10.0);
  float halo = exp(-d * d * 3.0) * 0.5;
  float twinkle = 0.6 + 0.4 * sin(time * 1.8 + vPhase);
  gl_FragColor = vec4(color, (core + halo) * opacity * twinkle);
}
`;

export default function ConstellationSystem({ activeSection }: { activeSection: number }) {
  const lineMats = useRef<THREE.ShaderMaterial[]>([]);
  const starMats = useRef<THREE.ShaderMaterial[]>([]);
  const opacities = useRef(CONSTELLATIONS.map(() => 0));

  const { lineGeoms, starGeoms } = useMemo(() => {
    const lgs: THREE.BufferGeometry[] = [];
    const sgs: THREE.BufferGeometry[] = [];

    CONSTELLATIONS.forEach(c => {
      // Line geometry with alpha fade from center
      const pts: number[] = [];
      const alphas: number[] = [];
      c.connections.forEach(([s1, s2]) => {
        const p1 = new THREE.Vector3(...c.stars[s1]);
        const p2 = new THREE.Vector3(...c.stars[s2]);
        pts.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        alphas.push(1.0, 1.0);
      });
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      lg.setAttribute('alpha', new THREE.Float32BufferAttribute(alphas, 1));
      lgs.push(lg);

      // Star geometry
      const starPts: number[] = [];
      const phases: number[] = [];
      const sizes: number[] = [];
      c.stars.forEach((s, j) => {
        starPts.push(s[0], s[1], s[2]);
        phases.push(j * 1.37 + Math.random() * 0.5);
        sizes.push(0.008 + Math.random() * 0.008);
      });
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.Float32BufferAttribute(starPts, 3));
      sg.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
      sg.setAttribute('starSize', new THREE.Float32BufferAttribute(sizes, 1));
      sgs.push(sg);
    });

    return { lineGeoms: lgs, starGeoms: sgs };
  }, []);

  useMemo(() => {
    lineMats.current = CONSTELLATIONS.map(() => new THREE.ShaderMaterial({
      uniforms: {
        color:   { value: new THREE.Color('#99ccff') },
        opacity: { value: 0 },
        time:    { value: 0 },
      },
      vertexShader: lineVertShader,
      fragmentShader: lineFragShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));

    starMats.current = CONSTELLATIONS.map(() => new THREE.ShaderMaterial({
      uniforms: {
        color:   { value: new THREE.Color('#cce8ff') },
        opacity: { value: 0 },
        time:    { value: 0 },
      },
      vertexShader: starVertShader,
      fragmentShader: starFragShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
  }, []);

  useEffect(() => {
    return () => {
      lineMats.current.forEach(m => m.dispose());
      starMats.current.forEach(m => m.dispose());
      lineGeoms.forEach(g => g.dispose());
      starGeoms.forEach(g => g.dispose());
    };
  }, [lineGeoms, starGeoms]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    CONSTELLATIONS.forEach((c, i) => {
      const isActive = activeSection === c.targetSection;
      const targetOpacity = isActive ? 0.28 : 0.04;

      // Slow pulse — feels discovered, not displayed
      const pulse = Math.sin(time * 0.4 + i * 1.1) * 0.025;
      const revealed = Math.sin(time * 0.08 + i * 0.7) * 0.5 + 0.5;
      const finalTarget = targetOpacity + pulse + (isActive ? 0 : revealed * 0.03);

      opacities.current[i] += (finalTarget - opacities.current[i]) * 0.025;

      const lm = lineMats.current[i];
      const sm = starMats.current[i];
      if (lm) {
        lm.uniforms.opacity.value = opacities.current[i];
        lm.uniforms.time.value = time;
      }
      if (sm) {
        sm.uniforms.opacity.value = opacities.current[i] * 2.5;
        sm.uniforms.time.value = time;
      }
    });
  });

  return (
    <group>
      {CONSTELLATIONS.map((_, i) => (
        <group key={i}>
          <lineSegments geometry={lineGeoms[i]} material={lineMats.current[i]} />
          <points geometry={starGeoms[i]} material={starMats.current[i]} />
        </group>
      ))}
    </group>
  );
}
