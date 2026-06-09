import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const trailVert = `
attribute float trailAlpha;
varying float vTrailAlpha;
void main(){
  vTrailAlpha = trailAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const trailFrag = `
uniform vec3 color;
uniform float opacity;
varying float vTrailAlpha;
void main(){
  gl_FragColor = vec4(color, opacity * vTrailAlpha);
}
`;

function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.15,'rgba(220,240,255,0.8)');
  g.addColorStop(0.5, 'rgba(150,200,255,0.3)');
  g.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(c);
}

export default function SpaceEvents() {
  const glowTex = useMemo(() => makeGlowTexture(), []);

  // ---- Shooting Stars ----
  const ssCount = 3;
  const ssRefs = useRef<(THREE.Mesh | null)[]>(Array(ssCount).fill(null));
  const ssTrailRefs = useRef<(THREE.LineSegments | null)[]>(Array(ssCount).fill(null));
  const ssMatRefs = useRef<(THREE.MeshBasicMaterial | null)[]>(Array(ssCount).fill(null));
  const ssTrailMatRefs = useRef<(THREE.ShaderMaterial | null)[]>(Array(ssCount).fill(null));
  const ssStates = useRef(
    Array.from({ length: ssCount }, (_, i) => ({
      active: false,
      timer: Math.random() * 10 + 6 + i * 4,
      progress: 0,
      duration: 0,
      start: new THREE.Vector3(),
      end: new THREE.Vector3(),
    }))
  );

  // ---- Comet ----
  const cometGroupRef = useRef<THREE.Group>(null);
  const cometState = useRef({
    active: false,
    timer: Math.random() * 45 + 35,
    progress: 0,
    duration: 0,
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
  });

  // ---- Pulsar ----
  const pulsarRef = useRef<THREE.Sprite>(null);
  const pulsarRingRef = useRef<THREE.Mesh>(null);
  const pulsarState = useRef({
    active: false,
    timer: Math.random() * 80 + 60,
    progress: 0,
    duration: 3.0,
    pos: new THREE.Vector3(),
  });

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // Shooting stars
    ssStates.current.forEach((ss, i) => {
      if (ss.active) {
        ss.progress += delta / ss.duration;
        if (ss.progress >= 1) {
          ss.active = false;
          ss.timer = Math.random() * 12 + 8;
          const mesh = ssRefs.current[i];
          if (mesh) mesh.visible = false;
          const trail = ssTrailRefs.current[i];
          if (trail) trail.visible = false;
        } else {
          const p = ss.progress;
          const eased = 1 - Math.pow(1 - p, 2);
          const pos = new THREE.Vector3().lerpVectors(ss.start, ss.end, eased);

          const mesh = ssRefs.current[i];
          const mat  = ssMatRefs.current[i];
          if (mesh && mat) {
            mesh.position.copy(pos);
            // Fade out near end, bright at start
            mat.opacity = Math.max(0, 1 - p * 1.8) * 0.9;
          }

          // Trail — update end point to current pos
          const trail = ssTrailRefs.current[i];
          const trailMat = ssTrailMatRefs.current[i];
          if (trail && trailMat) {
            trail.visible = true;
            const trailStart = new THREE.Vector3().lerpVectors(ss.start, ss.end, Math.max(0, eased - 0.25));
            const geom = trail.geometry as THREE.BufferGeometry;
            const pts = [trailStart.x, trailStart.y, trailStart.z, pos.x, pos.y, pos.z];
            geom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
            geom.setAttribute('trailAlpha', new THREE.Float32BufferAttribute([0, 1], 1));
            geom.attributes.position.needsUpdate = true;
            trailMat.uniforms.opacity.value = Math.max(0, 1 - p * 1.6) * 0.6;
          }
        }
      } else {
        ss.timer -= delta;
        if (ss.timer <= 0) {
          ss.active = true;
          ss.progress = 0;
          ss.duration = 0.4 + Math.random() * 0.5;

          const x = (Math.random() - 0.5) * 120;
          const y = 40 + Math.random() * 40;
          const z = -30 - Math.random() * 80;
          ss.start.set(x, y, z);
          ss.end.set(x - 25 - Math.random() * 35, y - 45 - Math.random() * 25, z + Math.random() * 5);

          const mesh = ssRefs.current[i];
          if (mesh) { mesh.visible = true; mesh.position.copy(ss.start); }
          const trail = ssTrailRefs.current[i];
          if (trail) trail.visible = false;
          const mat = ssMatRefs.current[i];
          if (mat) mat.opacity = 1;
        }
      }
    });

    // Comet
    const cs = cometState.current;
    if (cs.active) {
      cs.progress += delta / cs.duration;
      if (cs.progress >= 1) {
        cs.active = false;
        cs.timer = Math.random() * 55 + 40;
        if (cometGroupRef.current) cometGroupRef.current.visible = false;
      } else {
        if (cometGroupRef.current) {
          const eased = cs.progress;
          const pos = new THREE.Vector3().lerpVectors(cs.start, cs.end, eased);
          cometGroupRef.current.position.copy(pos);
          cometGroupRef.current.lookAt(cs.end);
          cometGroupRef.current.rotation.x += Math.PI / 2;
        }
      }
    } else {
      cs.timer -= delta;
      if (cs.timer <= 0) {
        cs.active = true;
        cs.progress = 0;
        cs.duration = 4 + Math.random() * 4;
        const x = (Math.random() - 0.5) * 200;
        const y = 60 + Math.random() * 30;
        const z = -60 - Math.random() * 80;
        cs.start.set(x, y, z);
        cs.end.set(x + 80 * (Math.random() > 0.5 ? 1 : -1), -60, z - 30);
        if (cometGroupRef.current) cometGroupRef.current.visible = true;
      }
    }

    // Pulsar
    const ps = pulsarState.current;
    if (ps.active) {
      ps.progress += delta / ps.duration;
      if (ps.progress >= 1) {
        ps.active = false;
        ps.timer = Math.random() * 80 + 60;
        if (pulsarRef.current) pulsarRef.current.visible = false;
        if (pulsarRingRef.current) pulsarRingRef.current.visible = false;
      } else {
        const p = ps.progress;
        // Double pulse pattern
        const pulse1 = Math.exp(-Math.pow((p - 0.15) * 15, 2));
        const pulse2 = Math.exp(-Math.pow((p - 0.55) * 15, 2)) * 0.7;
        const intensity = pulse1 + pulse2;

        if (pulsarRef.current) {
          pulsarRef.current.material.opacity = intensity * 0.9;
          const s = 3 + intensity * 8;
          pulsarRef.current.scale.set(s, s, 1);
        }
        if (pulsarRingRef.current) {
          pulsarRingRef.current.visible = true;
          const ring = p * 30;
          pulsarRingRef.current.scale.set(ring, ring, ring);
          (pulsarRingRef.current.material as THREE.MeshBasicMaterial).opacity = intensity * 0.4;
        }
      }
    } else {
      ps.timer -= delta;
      if (ps.timer <= 0) {
        ps.active = true;
        ps.progress = 0;
        ps.pos.set(
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 150,
          -200 - Math.random() * 150
        );
        if (pulsarRef.current) {
          pulsarRef.current.position.copy(ps.pos);
          pulsarRef.current.visible = true;
        }
        if (pulsarRingRef.current) {
          pulsarRingRef.current.position.copy(ps.pos);
          pulsarRingRef.current.visible = false;
          pulsarRingRef.current.scale.set(1, 1, 1);
        }
      }
    }
  });

  const trailGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0,0,0,0], 3));
    g.setAttribute('trailAlpha', new THREE.Float32BufferAttribute([0,1], 1));
    return g;
  }, []);

  return (
    <group>
      {/* Shooting stars */}
      {Array.from({ length: ssCount }, (_, i) => (
        <group key={i}>
          <mesh
            ref={el => { ssRefs.current[i] = el; }}
            visible={false}
          >
            <sphereGeometry args={[0.12, 6, 6]} />
            <meshBasicMaterial
              ref={el => { ssMatRefs.current[i] = el; }}
              color="#ddeeff"
              transparent
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <lineSegments
            ref={el => { ssTrailRefs.current[i] = el as THREE.LineSegments; }}
            visible={false}
          >
            <bufferGeometry
              ref={(g) => {
                if (g) {
                  g.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0,0,0,0], 3));
                  g.setAttribute('trailAlpha', new THREE.Float32BufferAttribute([0,1], 1));
                }
              }}
            />
            <shaderMaterial
              ref={el => { ssTrailMatRefs.current[i] = el; }}
              uniforms={{
                color: { value: new THREE.Color('#cce8ff') },
                opacity: { value: 0 },
              }}
              vertexShader={trailVert}
              fragmentShader={trailFrag}
              transparent
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </lineSegments>
        </group>
      ))}

      {/* Comet */}
      <group ref={cometGroupRef} visible={false}>
        <sprite scale={[1.5, 1.5, 1]}>
          <spriteMaterial map={glowTex} color="#ffffff" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
        {/* Ion tail — long thin cone */}
        <mesh position={[0, -6, 0]}>
          <coneGeometry args={[0.6, 12, 8, 1, true]} />
          <meshBasicMaterial color="#88ccff" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -4, 0]}>
          <coneGeometry args={[1.2, 8, 8, 1, true]} />
          <meshBasicMaterial color="#aaddff" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {/* Dust tail — slightly curved different direction */}
        <mesh position={[1.5, -5, 0]} rotation={[0, 0, 0.3]}>
          <coneGeometry args={[1.0, 10, 6, 1, true]} />
          <meshBasicMaterial color="#ffeecc" transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Pulsar */}
      <sprite ref={pulsarRef} visible={false}>
        <spriteMaterial map={glowTex} color="#aaccff" transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <mesh ref={pulsarRingRef} visible={false}>
        <ringGeometry args={[0.8, 1, 64]} />
        <meshBasicMaterial color="#88aaff" transparent blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
