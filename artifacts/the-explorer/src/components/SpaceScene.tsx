import React, { useRef, useEffect, Component, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, DepthOfField } from "@react-three/postprocessing";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return <SpaceFallback />;
    return this.props.children;
  }
}

gsap.registerPlugin(ScrollTrigger);

const PLANET_POSITIONS = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(15, 5, -20),
  new THREE.Vector3(-10, -5, -40),
  new THREE.Vector3(20, 10, -60),
  new THREE.Vector3(-15, -10, -80),
  new THREE.Vector3(10, 5, -100),
  new THREE.Vector3(0, 0, -120),
];

const PLANET_CONFIGS = [
  { color: "#4F46E5", type: "hero", size: 3 },
  { color: "#F59E0B", type: "about", size: 2 },
  { color: "#06B6D4", type: "skills", size: 2.5 },
  { color: "#9D174D", type: "projects", size: 3.5 },
  { color: "#E2E8F0", type: "timeline", size: 2 },
  { color: "#8B5CF6", type: "dreams", size: 2.8 },
  { color: "#EFF6FF", type: "contact", size: 1.5, emissive: 2 },
];

function CameraRig({ activeSection }: { activeSection: number }) {
  const { camera, pointer } = useThree();
  const scrollPos   = useRef(0);
  const targetPos   = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const pointerLag  = useRef(new THREE.Vector2());

  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      scrollPos.current = window.scrollY / Math.max(maxScroll, 1);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // Lazy pointer tracking (inertia)
    pointerLag.current.lerp(pointer, delta * 1.8);

    const totalSegments = PLANET_POSITIONS.length - 1;
    const scaledScroll  = scrollPos.current * totalSegments;
    const index    = Math.min(Math.floor(scaledScroll), totalSegments - 1);
    const fraction = scaledScroll - index;

    const currentPos = PLANET_POSITIONS[index];
    const nextPos    = index < totalSegments ? PLANET_POSITIONS[index + 1] : PLANET_POSITIONS[totalSegments];

    // Slight curved arc between planets (not a straight line)
    const mid = currentPos.clone().lerp(nextPos, 0.5).add(new THREE.Vector3(0, 1.5, 0));
    const eased = fraction * fraction * (3 - 2 * fraction); // smoothstep
    const pathPos = new THREE.Vector3();
    pathPos.lerpVectors(currentPos.clone().lerp(nextPos, eased), mid, Math.sin(eased * Math.PI) * 0.25);

    // Floating idle drift
    const drift = new THREE.Vector3(
      Math.sin(t * 0.22) * 0.35,
      Math.cos(t * 0.17) * 0.25,
      Math.sin(t * 0.13) * 0.15,
    );

    const targetCamPos = pathPos.clone()
      .add(new THREE.Vector3(0, 0, 14))
      .add(drift)
      .add(new THREE.Vector3(pointerLag.current.x * 1.8, pointerLag.current.y * 1.4, 0));

    // Slow inertial camera — feels like floating through space
    camera.position.lerp(targetCamPos, delta * 1.1);

    const lookTarget = currentPos.clone().lerp(nextPos, eased);
    targetLookAt.current.lerp(lookTarget, delta * 2.2);
    camera.lookAt(targetLookAt.current);
  });

  return null;
}

function webGLAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export default function SpaceScene({ activeSection }: { activeSection: number }) {
  if (!webGLAvailable()) {
    return <SpaceFallback />;
  }

  return (
    <WebGLErrorBoundary>
      <>
        <Canvas
          camera={{ position: [0, 0, 15], fov: 45 }}
          gl={{ antialias: false, powerPreference: "high-performance" }}
        >
          <color attach="background" args={["#020408"]} />
          <ambientLight intensity={0.1} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          
          <GalaxyLayer />
          <StarField />
          <NebulaCloud />
          <ConstellationSystem activeSection={activeSection} />
          <SpaceEvents />

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
            <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} />
            <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={1.5} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        </Canvas>
        <StardustTrail />
      </>
    </WebGLErrorBoundary>
  );
}
