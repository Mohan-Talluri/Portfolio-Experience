import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Letter definitions ───────────────────────────────────────────────────────
// Normalized [0–2] wide × [0–4] tall bounding box per letter
// s = star coords [x,y]; l = connection pairs (indices into s)
type LD = { s: [number,number][]; l: [number,number][] };

const FONT: Record<string,LD> = {
  ' ': { s: [], l: [] },
  'V': { s: [[0,4],[2,4],[1,0]],         l: [[0,2],[1,2]] },
  'A': { s: [[1,4],[0,2],[2,2],[0,0],[2,0]], l: [[0,1],[0,2],[1,2],[1,3],[2,4]] },
  'R': {
    s: [[0,4],[2,4],[2,2.5],[0,2.5],[2,0],[0,0]],
    l: [[0,5],[0,1],[1,2],[2,3],[3,0],[3,4]],
  },
  'S': {
    s: [[1.8,4],[0,4],[0,2.5],[2,1.5],[2,0],[0.2,0]],
    l: [[0,1],[1,2],[2,3],[3,4],[4,5]],
  },
  'H': {
    s: [[0,4],[2,4],[0,2],[2,2],[0,0],[2,0]],
    l: [[0,2],[2,4],[1,3],[3,5],[2,3]],
  },
  'I': {
    s: [[0,4],[2,4],[1,4],[1,0],[0,0],[2,0]],
    l: [[0,1],[2,3],[4,5]],
  },
  'N': {
    s: [[0,4],[2,4],[0,0],[2,0]],
    l: [[0,2],[0,3],[1,3]],
  },
  'M': {
    s: [[0,4],[1,2.2],[2,4],[0,0],[2,0]],
    l: [[0,3],[0,1],[1,2],[2,4]],
  },
  'U': {
    s: [[0,4],[2,4],[0,0.6],[1,0],[2,0.6]],
    l: [[0,2],[2,3],[3,4],[4,1]],
  },
  'P': {
    s: [[0,4],[2,4],[2,2.3],[0,2.3],[0,0]],
    l: [[0,4],[0,1],[1,2],[2,3],[3,0]],
  },
  'L': { s: [[0,4],[0,0],[2,0]], l: [[0,1],[1,2]] },
};

// ─── Shaders ──────────────────────────────────────────────────────────────────
const STAR_VERT = `
attribute float aPhase;
attribute float aSize;
uniform float time;
varying float vTwinkle;
void main(){
  float tw = 0.55 + 0.30*sin(time*1.2+aPhase) + 0.15*sin(time*2.1+aPhase*1.7);
  vTwinkle = tw;
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  gl_PointSize = clamp(aSize * 380.0 / -mv.z, 1.5, 8.0);
  gl_Position = projectionMatrix * mv;
}`;
const STAR_FRAG = `
uniform vec3 starColor;
varying float vTwinkle;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if(d > 0.5) discard;
  float core = exp(-d*d*14.0);
  float halo = exp(-d*d*4.0)*0.45;
  float sp = max(exp(-abs(c.x)*60.0)*exp(-abs(c.y)*8.0),
                 exp(-abs(c.y)*60.0)*exp(-abs(c.x)*8.0))*0.28;
  gl_FragColor = vec4(starColor,(core+halo+sp)*vTwinkle);
}`;

const LINE_VERT = `
attribute float aAlpha;
varying float vAlpha;
void main(){
  vAlpha = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}`;
const LINE_FRAG = `
uniform float opacity;
uniform vec3 lineColor;
varying float vAlpha;
void main(){
  gl_FragColor = vec4(lineColor, opacity*vAlpha);
}`;

// ─── Geometry builder ────────────────────────────────────────────────────────
const SCALE    = 2.0;
const CHAR_GAP = 5.8;
const SPACE_W  = 3.5;

function addWord(
  text: string,
  cx: number, cy: number, cz: number,
  starPts: number[], starPhases: number[], starSizes: number[],
  linePts: number[], lineAlphas: number[],
) {
  // Total width for centering
  let totalW = 0;
  for (const ch of text) totalW += ch === ' ' ? SPACE_W : CHAR_GAP;
  let x0 = cx - totalW / 2 + CHAR_GAP / 2;

  for (const ch of text) {
    if (ch === ' ') { x0 += SPACE_W; continue; }
    const def = FONT[ch];
    if (!def) { x0 += CHAR_GAP; continue; }

    const ws: THREE.Vector3[] = def.s.map(([nx, ny]) => new THREE.Vector3(
      x0 + nx * SCALE - SCALE,
      cy + ny * SCALE - 2 * SCALE,
      cz + (Math.random() - 0.5) * 2.5,
    ));

    for (const v of ws) {
      starPts.push(v.x, v.y, v.z);
      starPhases.push(Math.random() * Math.PI * 2);
      starSizes.push(0.016 + Math.random() * 0.013);
    }

    for (const [a, b] of def.l) {
      if (a >= ws.length || b >= ws.length) continue;
      const pa = ws[a], pb = ws[b];
      // Subdivide into 4 segments — fades at endpoints, bright at center
      for (let seg = 0; seg < 4; seg++) {
        const t0 = seg / 4, t1 = (seg + 1) / 4;
        const p0 = pa.clone().lerp(pb, t0);
        const p1 = pa.clone().lerp(pb, t1);
        const alpha = 1 - Math.abs(t0 + t1 - 1);
        linePts.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
        lineAlphas.push(alpha, alpha);
      }
    }

    x0 += CHAR_GAP;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
// Positions: "VARSHINI" and "MUPPALA" arc across the far background sky
const WORDS = [
  { text: 'VARSHINI', cy: 42, cz: -165 },
  { text: 'MUPPALA',  cy: 31, cz: -165 },
];

export default function NameConstellation() {
  const starMatRef = useRef<THREE.ShaderMaterial>(null!);
  const lineMatRef = useRef<THREE.ShaderMaterial>(null!);

  // Build ALL geometry merged into single arrays (one Points + one LineSegments)
  const { starGeo, lineGeo } = useMemo(() => {
    const starPts:    number[] = [];
    const starPhases: number[] = [];
    const starSizes:  number[] = [];
    const linePts:    number[] = [];
    const lineAlphas: number[] = [];

    for (const w of WORDS) {
      addWord(w.text, 0, w.cy, w.cz, starPts, starPhases, starSizes, linePts, lineAlphas);
    }

    // Points geometry
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(starPts),    3));
    sg.setAttribute('aPhase',   new THREE.BufferAttribute(new Float32Array(starPhases), 1));
    sg.setAttribute('aSize',    new THREE.BufferAttribute(new Float32Array(starSizes),  1));

    // Lines geometry
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePts),    3));
    lg.setAttribute('aAlpha',   new THREE.BufferAttribute(new Float32Array(lineAlphas), 1));

    return { starGeo: sg, lineGeo: lg };
  }, []);

  const starMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time:      { value: 0 },
      starColor: { value: new THREE.Color('#cce8ff') },
    },
    vertexShader:   STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
  }), []);

  const lineMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      opacity:   { value: 0.30 },
      lineColor: { value: new THREE.Color('#7799bb') },
    },
    vertexShader:   LINE_VERT,
    fragmentShader: LINE_FRAG,
    transparent: true,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false,
  }), []);

  // Dispose on unmount
  React.useEffect(() => () => {
    starGeo.dispose(); lineGeo.dispose();
    starMat.dispose(); lineMat.dispose();
  }, [starGeo, lineGeo, starMat, lineMat]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    starMat.uniforms.time.value = t;
    // Gentle global brightness pulse
    lineMat.uniforms.opacity.value = 0.30 * (0.70 + 0.30 * Math.sin(t * 0.19));
  });

  return (
    <group>
      <points geometry={starGeo}>
        <primitive object={starMat} attach="material" />
      </points>
      <lineSegments geometry={lineGeo}>
        <primitive object={lineMat} attach="material" />
      </lineSegments>
    </group>
  );
}
