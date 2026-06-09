import React, { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function SpaceEvents() {
  const eventsRef = useRef<THREE.Group>(null);
  
  // Shooting Star refs
  const shootingStarRef = useRef<THREE.Mesh>(null);
  const ssMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const ssState = useRef({
    active: false,
    timer: Math.random() * 12 + 8,
    progress: 0,
    duration: 0,
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
  });

  // Comet refs
  const cometRef = useRef<THREE.Group>(null);
  const cometState = useRef({
    active: false,
    timer: Math.random() * 50 + 40,
    progress: 0,
    duration: 0,
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
  });

  // Supernova refs
  const supernovaRef = useRef<THREE.Sprite>(null);
  const supernovaState = useRef({
    active: false,
    timer: Math.random() * 60 + 60,
    progress: 0,
    duration: 1.5,
  });

  // Satellite refs
  const satelliteRef = useRef<THREE.Mesh>(null);
  const satelliteState = useRef({
    active: false,
    timer: Math.random() * 60 + 120,
    progress: 0,
    duration: 0,
    start: new THREE.Vector3(),
    end: new THREE.Vector3(),
  });

  useFrame((state, delta) => {
    // 1. Shooting Star
    if (ssState.current.active) {
      ssState.current.progress += delta / ssState.current.duration;
      if (ssState.current.progress >= 1) {
        ssState.current.active = false;
        ssState.current.timer = Math.random() * 12 + 8;
        if (shootingStarRef.current) shootingStarRef.current.visible = false;
      } else {
        if (shootingStarRef.current && ssMaterialRef.current) {
          const p = ssState.current.progress;
          const pos = new THREE.Vector3().lerpVectors(ssState.current.start, ssState.current.end, p);
          shootingStarRef.current.position.copy(pos);
          ssMaterialRef.current.opacity = Math.max(0, 1 - p * 1.5); // fade out
        }
      }
    } else {
      ssState.current.timer -= delta;
      if (ssState.current.timer <= 0) {
        ssState.current.active = true;
        ssState.current.progress = 0;
        ssState.current.duration = 0.3 + Math.random() * 0.5;
        
        const x = (Math.random() - 0.5) * 100;
        const y = (Math.random() - 0.5) * 100;
        const z = -50 - Math.random() * 100;
        ssState.current.start.set(x, y + 40, z);
        ssState.current.end.set(x - 30 - Math.random() * 30, y - 40 - Math.random() * 30, z);
        
        if (shootingStarRef.current && ssMaterialRef.current) {
          shootingStarRef.current.visible = true;
          shootingStarRef.current.lookAt(ssState.current.end);
          ssMaterialRef.current.opacity = 1;
        }
      }
    }

    // 2. Comet
    if (cometState.current.active) {
      cometState.current.progress += delta / cometState.current.duration;
      if (cometState.current.progress >= 1) {
        cometState.current.active = false;
        cometState.current.timer = Math.random() * 50 + 40;
        if (cometRef.current) cometRef.current.visible = false;
      } else {
        if (cometRef.current) {
          const p = cometState.current.progress;
          const pos = new THREE.Vector3().lerpVectors(cometState.current.start, cometState.current.end, p);
          cometRef.current.position.copy(pos);
        }
      }
    } else {
      cometState.current.timer -= delta;
      if (cometState.current.timer <= 0) {
        cometState.current.active = true;
        cometState.current.progress = 0;
        cometState.current.duration = 3 + Math.random() * 3;
        
        const x = (Math.random() - 0.5) * 200;
        const y = 80 + Math.random() * 40;
        const z = -100 - Math.random() * 100;
        cometState.current.start.set(x, y, z);
        cometState.current.end.set(x + 100 * (Math.random() > 0.5 ? 1 : -1), -80, z - 50);
        
        if (cometRef.current) {
          cometRef.current.visible = true;
          cometRef.current.lookAt(cometState.current.end);
        }
      }
    }

    // 3. Supernova
    if (supernovaState.current.active) {
      supernovaState.current.progress += delta / supernovaState.current.duration;
      if (supernovaState.current.progress >= 1) {
        supernovaState.current.active = false;
        supernovaState.current.timer = Math.random() * 60 + 60;
        if (supernovaRef.current) supernovaRef.current.visible = false;
      } else {
        if (supernovaRef.current) {
          const p = supernovaState.current.progress;
          // flash bright then fade
          let opacity = 0;
          let scale = 1;
          if (p < 0.1) {
            opacity = p / 0.1; // attack
            scale = 1 + p * 10;
          } else {
            opacity = 1 - (p - 0.1) / 0.9; // decay
            scale = 2 + (p - 0.1) * 2;
          }
          supernovaRef.current.material.opacity = opacity;
          supernovaRef.current.scale.set(scale * 15, scale * 15, 1);
          supernovaRef.current.material.color.setHSL(0.1 + p * 0.1, 1, 0.8 - p * 0.3); // white to yellow to red
        }
      }
    } else {
      supernovaState.current.timer -= delta;
      if (supernovaState.current.timer <= 0) {
        supernovaState.current.active = true;
        supernovaState.current.progress = 0;
        if (supernovaRef.current) {
          supernovaRef.current.position.set(
            (Math.random() - 0.5) * 300,
            (Math.random() - 0.5) * 200,
            -250 - Math.random() * 100
          );
          supernovaRef.current.visible = true;
        }
      }
    }

    // 4. Satellite
    if (satelliteState.current.active) {
      satelliteState.current.progress += delta / satelliteState.current.duration;
      if (satelliteState.current.progress >= 1) {
        satelliteState.current.active = false;
        satelliteState.current.timer = Math.random() * 60 + 120;
        if (satelliteRef.current) satelliteRef.current.visible = false;
      } else {
        if (satelliteRef.current) {
          const p = satelliteState.current.progress;
          const pos = new THREE.Vector3().lerpVectors(satelliteState.current.start, satelliteState.current.end, p);
          satelliteRef.current.position.copy(pos);
          satelliteRef.current.rotation.x += 0.005;
          satelliteRef.current.rotation.y += 0.01;
        }
      }
    } else {
      satelliteState.current.timer -= delta;
      if (satelliteState.current.timer <= 0) {
        satelliteState.current.active = true;
        satelliteState.current.progress = 0;
        satelliteState.current.duration = 8 + Math.random() * 4;
        
        satelliteState.current.start.set(-150, (Math.random() - 0.5) * 50, -40 - Math.random() * 20);
        satelliteState.current.end.set(150, (Math.random() - 0.5) * 50, -40 - Math.random() * 20);
        
        if (satelliteRef.current) {
          satelliteRef.current.visible = true;
        }
      }
    }
  });

  const supernovaTex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255, 255, 255, 1)");
      grad.addColorStop(0.2, "rgba(255, 255, 200, 0.8)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <group ref={eventsRef}>
      {/* Shooting Star */}
      <mesh ref={shootingStarRef} visible={false}>
        <cylinderGeometry args={[0.05, 0.2, 8, 4]} />
        <meshBasicMaterial ref={ssMaterialRef} color="#ffffff" transparent blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Comet */}
      <group ref={cometRef} visible={false}>
        <mesh>
          <sphereGeometry args={[0.4, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, -4, 0]}>
          <coneGeometry args={[1.5, 8, 8]} />
          <meshBasicMaterial color="#aaffff" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>

      {/* Supernova */}
      <sprite ref={supernovaRef} visible={false}>
        <spriteMaterial map={supernovaTex} color="#ffffff" transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>

      {/* Satellite */}
      <mesh ref={satelliteRef} visible={false}>
        <boxGeometry args={[0.8, 0.1, 0.4]} />
        <meshBasicMaterial color="#111111" />
      </mesh>
    </group>
  );
}
