import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const CONSTELLATIONS = [
  {
    name: 'Orion-like',
    targetSection: 0,
    stars: [
      [2, 3, -5], [3, 2, -6], [4, 1, -7], // belt
      [1, 5, -8], [5, -1, -4], // shoulders/knees
      [6, 4, -9], [0, -2, -5]
    ],
    connections: [[0,1], [1,2], [3,0], [2,4], [5,1], [0,6]]
  },
  {
    name: 'Dipper',
    targetSection: 2,
    stars: [
      [-12, -2, -35], [-14, 0, -38], [-16, 1, -40], // handle
      [-18, -1, -42], [-17, -4, -43], [-14, -3, -41] // bowl
    ],
    connections: [[0,1], [1,2], [2,3], [3,4], [4,5], [5,2]]
  },
  {
    name: 'Crown',
    targetSection: 4,
    stars: [
      [-10, -5, -75], [-12, -2, -78], [-15, 0, -80], [-18, -3, -82], [-20, -7, -85]
    ],
    connections: [[0,1], [1,2], [2,3], [3,4]]
  },
  {
    name: 'Triangle',
    targetSection: 1,
    stars: [
      [12, 8, -15], [18, 2, -20], [10, 0, -25]
    ],
    connections: [[0,1], [1,2], [2,0]]
  },
  {
    name: 'Serpent',
    targetSection: 5,
    stars: [
      [5, 8, -55], [8, 10, -65], [15, 8, -75], [12, 4, -85], 
      [18, 0, -95], [15, -4, -100], [20, -8, -105], [25, -5, -110]
    ],
    connections: [[0,1], [1,2], [2,3], [3,4], [4,5], [5,6], [6,7]]
  }
];

export default function ConstellationSystem({ activeSection }: { activeSection: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const materialsRef = useRef<THREE.LineBasicMaterial[]>([]);

  useMemo(() => {
    materialsRef.current = CONSTELLATIONS.map(() => 
      new THREE.LineBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending
      })
    );
  }, []);

  useEffect(() => {
    return () => {
      materialsRef.current.forEach(m => m.dispose());
    };
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    CONSTELLATIONS.forEach((c, i) => {
      const mat = materialsRef.current[i];
      if (!mat) return;
      
      const isActive = activeSection === c.targetSection;
      
      // Pulse animation
      const baseOpacity = isActive ? 0.32 : 0.07;
      const pulse = Math.sin(time * 0.6 + i) * 0.06;
      
      // Lerp opacity for smooth transition
      mat.opacity += ((baseOpacity + pulse) - mat.opacity) * 0.05;
    });
  });

  const starTex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, "rgba(255, 255, 255, 1)");
      grad.addColorStop(0.3, "rgba(100, 200, 255, 0.8)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <group ref={groupRef}>
      {CONSTELLATIONS.map((c, i) => {
        const isActive = activeSection === c.targetSection;
        
        // Lines
        const points: THREE.Vector3[] = [];
        c.connections.forEach(([s1, s2]) => {
          points.push(new THREE.Vector3(...c.stars[s1] as [number, number, number]));
          points.push(new THREE.Vector3(...c.stars[s2] as [number, number, number]));
        });
        const lineGeom = new THREE.BufferGeometry().setFromPoints(points);

        return (
          <group key={i}>
            <lineSegments geometry={lineGeom} material={materialsRef.current[i]} />
            {c.stars.map((pos, j) => (
              <sprite key={j} position={pos as [number, number, number]} scale={isActive ? [0.6, 0.6, 1] : [0.4, 0.4, 1]}>
                <spriteMaterial map={starTex} color="#ffffff" transparent blending={THREE.AdditiveBlending} depthWrite={false} />
              </sprite>
            ))}
          </group>
        );
      })}
    </group>
  );
}
