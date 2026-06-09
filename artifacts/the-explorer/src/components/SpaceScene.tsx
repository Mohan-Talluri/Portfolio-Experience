import React, { useRef, useEffect, Component, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import StarField from "./StarField";
import NebulaCloud from "./NebulaCloud";
import Planet from "./planets/Planet";
import SpaceFallback from "./SpaceFallback";
import GalaxyLayer from "./GalaxyLayer";
import ConstellationSystem from "./ConstellationSystem";
import SpaceEvents from "./SpaceEvents";
import StardustTrail from "./StardustTrail";

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
  { color: "#F0F4FF", type: "contact",  size: 1.8, emissive: 2 },
];

// ──────────────────────────────────────────────
// Premium camera with inertia, momentum, drift
// ──────────────────────────────────────────────
function CameraRig({ activeSection }: { activeSection: number }) {
  const { camera, pointer } = useThree();

  const scrollPos     = useRef(0);
  const camPos        = useRef(new THREE.Vector3(0, 0, 16));
  const camVel        = useRef(new THREE.Vector3());
  const pointerLag    = useRef(new THREE.Vector2());
  const pointerVel    = useRef(new THREE.Vector2());
  const lookTarget    = useRef(new THREE.Vector3());
  const lookVel       = useRef(new THREE.Vector3());
  const driftPhase    = useRef(Math.random() * Math.PI * 2);

  useEffect(() => {
    const onScroll = () => {
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      scrollPos.current = window.scrollY / Math.max(maxScroll, 1);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05); // cap to avoid large jumps

    // ── Scroll interpolation along path ──
    const totalSegs = PLANET_POSITIONS.length - 1;
    const scaled    = scrollPos.current * totalSegs;
    const idx       = Math.min(Math.floor(scaled), totalSegs - 1);
    const frac      = scaled - idx;

    const cur  = PLANET_POSITIONS[idx];
    const next = PLANET_POSITIONS[Math.min(idx + 1, totalSegs)];

    // Smoothstep easing between planets
    const eased = frac * frac * (3 - 2 * frac);

    // Catmull-Rom-like arc — slight upward bow on transit
    const pathPos = new THREE.Vector3().lerpVectors(cur, next, eased);
    const arcLift = Math.sin(eased * Math.PI) * 1.2;
    pathPos.y += arcLift;

    // ── Pointer inertia (spring-damper) ──
    const pointerDelta = new THREE.Vector2(
      pointer.x - pointerLag.current.x,
      pointer.y - pointerLag.current.y,
    );
    pointerVel.current.addScaledVector(pointerDelta, dt * 12);
    pointerVel.current.multiplyScalar(1 - dt * 6);
    pointerLag.current.addScaledVector(pointerVel.current, dt);

    // ── Organic floating drift ──
    const dp = driftPhase.current;
    const drift = new THREE.Vector3(
      Math.sin(t * 0.19 + dp)        * 0.30,
      Math.cos(t * 0.14 + dp * 1.3)  * 0.22,
      Math.sin(t * 0.10 + dp * 0.7)  * 0.12,
    );

    // ── Mouse parallax offset ──
    const parallax = new THREE.Vector3(
      pointerLag.current.x * 2.2,
      pointerLag.current.y * 1.6,
      0,
    );

    const desiredPos = pathPos.clone()
      .add(new THREE.Vector3(0, 0, 16))
      .add(drift)
      .add(parallax);

    // ── Spring camera to desired position (gives momentum/inertia) ──
    const springK  = 3.5;   // stiffness
    const dampC    = 0.85;  // damping
    const disp     = desiredPos.clone().sub(camPos.current);
    camVel.current.addScaledVector(disp, springK * dt);
    camVel.current.multiplyScalar(1 - dampC * dt);
    camPos.current.addScaledVector(camVel.current, dt);

    camera.position.copy(camPos.current);

    // ── Look-at with spring ──
    const desiredLook = new THREE.Vector3().lerpVectors(cur, next, eased);
    const lookDisp = desiredLook.clone().sub(lookTarget.current);
    lookVel.current.addScaledVector(lookDisp, 8 * dt);
    lookVel.current.multiplyScalar(1 - 5.5 * dt);
    lookTarget.current.addScaledVector(lookVel.current, dt);

    camera.lookAt(lookTarget.current);
  });

  return null;
}

// ──────────────────────────────────────────────
// Parallax wrapper — moves child group based on
// scroll & pointer with independent depth factor
// ──────────────────────────────────────────────
function ParallaxGroup({
  children,
  depthFactor,
  scrollFactor = 0,
}: {
  children: React.ReactNode;
  depthFactor: number;
  scrollFactor?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const scrollPos = useRef(0);
  const { pointer } = useThree();
  const offset = useRef(new THREE.Vector3());

  useEffect(() => {
    const onScroll = () => {
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      scrollPos.current = window.scrollY / Math.max(maxScroll, 1);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);
    const target = new THREE.Vector3(
      pointer.x * depthFactor * 8,
      pointer.y * depthFactor * 6,
      scrollPos.current * scrollFactor,
    );
    offset.current.lerp(target, dt * 0.8);
    groupRef.current.position.copy(offset.current);
  });

  return <group ref={groupRef}>{children}</group>;
}

function webGLAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch { return false; }
}

export default function SpaceScene({ activeSection }: { activeSection: number }) {
  if (!webGLAvailable()) return <SpaceFallback />;

  return (
    <WebGLErrorBoundary>
      <>
        <Canvas
          camera={{ position: [0, 0, 16], fov: 42 }}
          gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
          dpr={[1, 1.5]}
        >
          <color attach="background" args={["#010309"]} />
          <ambientLight intensity={0.04} />
          <directionalLight position={[20, 15, 10]} intensity={1.2} color="#fff5ee" />
          <pointLight position={[0, 0, 0]} intensity={0.15} color="#6688ff" distance={80} />

          {/* Layer 1 — deepest: galaxies, barely moves */}
          <ParallaxGroup depthFactor={0.04} scrollFactor={0}>
            <GalaxyLayer />
          </ParallaxGroup>

          {/* Layer 2 — nebulae: slow parallax */}
          <ParallaxGroup depthFactor={0.12} scrollFactor={0}>
            <NebulaCloud />
          </ParallaxGroup>

          {/* Layer 3 — starfield: four internal depth layers */}
          <ParallaxGroup depthFactor={0.20} scrollFactor={0}>
            <StarField />
          </ParallaxGroup>

          {/* Layer 4 — constellations: moderate depth */}
          <ParallaxGroup depthFactor={0.30} scrollFactor={0}>
            <ConstellationSystem activeSection={activeSection} />
          </ParallaxGroup>

          {/* Layer 5 — space events: same depth as planets */}
          <SpaceEvents />

          {/* Layer 6 — planets */}
          {PLANET_POSITIONS.map((pos, i) => (
            <Planet
              key={i}
              position={pos}
              config={PLANET_CONFIGS[i]}
              active={activeSection === i}
            />
          ))}

          <CameraRig activeSection={activeSection} />

          <EffectComposer>
            <Bloom
              luminanceThreshold={0.15}
              luminanceSmoothing={0.85}
              intensity={1.8}
              height={400}
            />
            <Vignette eskil={false} offset={0.15} darkness={1.05} />
          </EffectComposer>
        </Canvas>

        {/* Layer 7 — foreground UI particle dust */}
        <StardustTrail />
      </>
    </WebGLErrorBoundary>
  );
}
