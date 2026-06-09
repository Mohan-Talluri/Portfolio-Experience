import React, { useRef, useEffect, useState, Component, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import StarField from "./StarField";
import Planet from "./planets/Planet";
import SpaceFallback from "./SpaceFallback";
import ConstellationSystem from "./ConstellationSystem";
import SpaceEvents from "./SpaceEvents";
import StardustTrail from "./StardustTrail";
import BlackHole from "./BlackHole";
import NameConstellation from "./NameConstellation";
import { PLANET_POSITIONS, PLANET_CONFIGS } from "./planetData";

class WebGLErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <SpaceFallback />;
    return this.props.children;
  }
}

// ─── Camera: scroll navigation + planet zoom ─────────────────────────────────
function CameraRig({
  activeSection,
  selectedPlanet,
}: {
  activeSection: number;
  selectedPlanet: number | null;
}) {
  const { camera, pointer } = useThree();
  const scrollPos   = useRef(0);
  const camPos      = useRef(new THREE.Vector3(0, 0, 16));
  const camVel      = useRef(new THREE.Vector3());
  const ptrLag      = useRef(new THREE.Vector2());
  const ptrVel      = useRef(new THREE.Vector2());
  const lookTgt     = useRef(new THREE.Vector3());
  const lookVel     = useRef(new THREE.Vector3());
  const driftSeed   = useRef(Math.random() * 6.28);

  useEffect(() => {
    const fn = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      scrollPos.current = window.scrollY / Math.max(max, 1);
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useFrame((state, delta) => {
    const t   = state.clock.elapsedTime;
    const dt  = Math.min(delta, 0.05);

    // ── Planet zoom mode ─────────────────────────────────────────────────────
    if (selectedPlanet !== null && selectedPlanet < PLANET_POSITIONS.length) {
      const pp = PLANET_POSITIONS[selectedPlanet];
      const pr = PLANET_CONFIGS[selectedPlanet].size;
      // Position camera in front of planet, slightly above and to the side
      const zoomTarget = new THREE.Vector3(
        pp.x + pr * 0.4,
        pp.y + pr * 0.3,
        pp.z + pr * 3.2 + 7,
      );
      camPos.current.lerp(zoomTarget, dt * 2.2);
      camera.position.copy(camPos.current);

      // Also dampen camVel so return is smooth
      camVel.current.multiplyScalar(1 - dt * 12);

      const lookTarget = pp.clone();
      lookTgt.current.lerp(lookTarget, dt * 5);
      camera.lookAt(lookTgt.current);
      return;
    }

    // ── Normal scroll navigation ─────────────────────────────────────────────
    const N   = PLANET_POSITIONS.length - 1;
    const sc  = scrollPos.current * N;
    const idx = Math.min(Math.floor(sc), N - 1);
    const fr  = sc - idx;

    const cur  = PLANET_POSITIONS[idx];
    const nxt  = PLANET_POSITIONS[Math.min(idx + 1, N)];
    const ease = fr * fr * (3 - 2 * fr);

    const pathP = new THREE.Vector3().lerpVectors(cur, nxt, ease);
    pathP.y += Math.sin(ease * Math.PI) * 1.0;

    // Pointer spring
    const pd = new THREE.Vector2(pointer.x - ptrLag.current.x, pointer.y - ptrLag.current.y);
    ptrVel.current.addScaledVector(pd, dt * 14);
    ptrVel.current.multiplyScalar(1 - dt * 7);
    ptrLag.current.addScaledVector(ptrVel.current, dt);

    // Organic drift
    const ds = driftSeed.current;
    const drift = new THREE.Vector3(
      Math.sin(t * 0.18 + ds)       * 0.28,
      Math.cos(t * 0.13 + ds * 1.3) * 0.20,
      Math.sin(t * 0.09 + ds * 0.7) * 0.10,
    );

    const desired = pathP.clone()
      .add(new THREE.Vector3(0, 0, 16))
      .add(drift)
      .add(new THREE.Vector3(ptrLag.current.x * 2.0, ptrLag.current.y * 1.5, 0));

    // Spring toward desired
    const disp = desired.clone().sub(camPos.current);
    camVel.current.addScaledVector(disp, 3.2 * dt);
    camVel.current.multiplyScalar(1 - 0.88 * dt);
    camPos.current.addScaledVector(camVel.current, dt);
    camera.position.copy(camPos.current);

    // Look-at spring
    const desiredLook = new THREE.Vector3().lerpVectors(cur, nxt, ease);
    const ld = desiredLook.clone().sub(lookTgt.current);
    lookVel.current.addScaledVector(ld, 8 * dt);
    lookVel.current.multiplyScalar(1 - 5 * dt);
    lookTgt.current.addScaledVector(lookVel.current, dt);
    camera.lookAt(lookTgt.current);
  });

  return null;
}

// ─── Parallax group ───────────────────────────────────────────────────────────
function ParallaxGroup({ children, depth }: { children: ReactNode; depth: number }) {
  const ref = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  const offset = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const tgt = new THREE.Vector3(pointer.x * depth * 7, pointer.y * depth * 5, 0);
    offset.current.lerp(tgt, dt * 0.9);
    if (ref.current) ref.current.position.copy(offset.current);
  });

  return <group ref={ref}>{children}</group>;
}

// ─── Invisible background sphere — click to deselect ─────────────────────────
function BackgroundClickCatcher({ onDeselect }: { onDeselect: () => void }) {
  return (
    <mesh onClick={onDeselect}>
      <sphereGeometry args={[450, 6, 6]} />
      <meshBasicMaterial color="#000000" side={THREE.BackSide} transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function webGLAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext &&
      (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch { return false; }
}

export default function SpaceScene({ activeSection }: { activeSection: number }) {
  const [selectedPlanet, setSelectedPlanet] = useState<number | null>(null);

  // Escape key deselects
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedPlanet(null); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  if (!webGLAvailable()) return <SpaceFallback />;

  return (
    <WebGLErrorBoundary>
      <>
        <Canvas
          camera={{ position: [0, 0, 16], fov: 44 }}
          gl={{
            antialias: false,
            powerPreference: "high-performance",
            alpha: true,
          }}
          // Adaptive DPR: cap at 1.5 on desktop, 1.0 on mobile for performance
          dpr={[1, 1.5]}
          style={{ touchAction: 'none' }}
        >
          <ambientLight intensity={0.05} />
          <directionalLight position={[20, 15, 10]} intensity={1.3} color="#fff8f0" />
          <pointLight position={[0, 0, 0]} intensity={0.12} color="#6688ff" distance={60} />

          {/* Background click-catcher (deselect) */}
          <BackgroundClickCatcher onDeselect={() => setSelectedPlanet(null)} />

          {/* Layer 1 – stars */}
          <ParallaxGroup depth={0.08}>
            <StarField />
          </ParallaxGroup>

          {/* Layer 2 – constellations */}
          <ParallaxGroup depth={0.22}>
            <ConstellationSystem activeSection={activeSection} />
          </ParallaxGroup>

          {/* Name as constellation — always in background sky */}
          <NameConstellation />

          {/* Space events */}
          <SpaceEvents />

          {/* Black hole */}
          <BlackHole position={[-20, 9, -38]} />

          {/* Planets */}
          {PLANET_POSITIONS.map((pos, i) => (
            <Planet
              key={i}
              position={pos}
              config={PLANET_CONFIGS[i]}
              active={activeSection === i}
              selected={selectedPlanet === i}
              onSelect={() => setSelectedPlanet(prev => prev === i ? null : i)}
            />
          ))}

          <CameraRig activeSection={activeSection} selectedPlanet={selectedPlanet} />
        </Canvas>

        {/* Foreground stardust cursor trail */}
        <StardustTrail />

        {/* Hint shown when a planet is focused */}
        {selectedPlanet !== null && (
          <div
            style={{
              position: 'fixed',
              bottom: 32,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(180,210,255,0.75)',
              fontSize: 13,
              fontFamily: 'sans-serif',
              letterSpacing: '0.12em',
              pointerEvents: 'none',
              textShadow: '0 0 12px rgba(100,160,255,0.5)',
              zIndex: 100,
            }}
          >
            DRAG OR SWIPE TO ROTATE 360° &nbsp;·&nbsp; TAP SPACE OR ESC TO EXIT
          </div>
        )}
      </>
    </WebGLErrorBoundary>
  );
}
