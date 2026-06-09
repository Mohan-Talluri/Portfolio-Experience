import * as THREE from 'three';

export const PLANET_POSITIONS = [
  new THREE.Vector3(0,    0,    0),
  new THREE.Vector3(16,   6,  -22),
  new THREE.Vector3(-11, -6,  -44),
  new THREE.Vector3(22,  11,  -66),
  new THREE.Vector3(-16, -11, -88),
  new THREE.Vector3(11,   6, -110),
  new THREE.Vector3(0,    0, -130),
];

export const PLANET_CONFIGS = [
  { color: "#3D3AC9", type: "hero",     size: 3.2 },
  { color: "#D4820A", type: "about",    size: 2.2 },
  { color: "#0596C1", type: "skills",   size: 2.7 },
  { color: "#8B0D40", type: "projects", size: 3.8 },
  { color: "#C8D8F0", type: "timeline", size: 2.2 },
  { color: "#7C3FB8", type: "dreams",   size: 3.0 },
  { color: "#F0F4FF", type: "contact",  size: 1.8 },
];
