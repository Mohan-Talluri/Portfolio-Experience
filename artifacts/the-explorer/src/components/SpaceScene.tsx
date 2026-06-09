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
  const dummyCamera = useRef(new THREE.PerspectiveCamera());
  const scrollPos = useRef(0);
  const targetLookAt = useRef(new THREE.Vector3());

  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      scrollPos.current = window.scrollY / maxScroll;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useFrame((state, delta) => {
    const totalSegments = PLANET_POSITIONS.length - 1;
    const scaledScroll = scrollPos.current * totalSegments;
    const index = Math.floor(scaledScroll);
    const fraction = scaledScroll - index;

    let currentPos, nextPos;
    if (index >= totalSegments) {
      currentPos = PLANET_POSITIONS[totalSegments];
      nextPos = PLANET_POSITIONS[totalSegments];
    } else {
      currentPos = PLANET_POSITIONS[index];
      nextPos = PLANET_POSITIONS[index + 1];
    }

    // Camera paths
    const camOffset = new THREE.Vector3(0, 0, 15);
    const targetCamPos = currentPos.clone().lerp(nextPos, fraction).add(camOffset);
    
    // Parallax
    targetCamPos.x += pointer.x * 2;
    targetCamPos.y += pointer.y * 2;

    camera.position.lerp(targetCamPos, delta * 2);

    const lookAtTarget = currentPos.clone().lerp(nextPos, fraction);
    targetLookAt.current.lerp(lookAtTarget, delta * 3);
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
