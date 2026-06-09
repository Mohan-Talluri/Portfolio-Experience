import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function NebulaCloud() {
  const cloudsRef = useRef<THREE.Group>(null);
  
  const cloudTextures = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (context) {
      // Create turbulence by layering multiple gradients
      for (let i = 0; i < 4; i++) {
        const cx = 256 + (Math.random() - 0.5) * 100;
        const cy = 256 + (Math.random() - 0.5) * 100;
        const r = 150 + Math.random() * 100;
        const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, `rgba(255,255,255,${0.3 + Math.random() * 0.3})`);
        gradient.addColorStop(0.5, `rgba(255,255,255,${0.1 + Math.random() * 0.1})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        
        context.globalCompositeOperation = 'screen';
        context.fillStyle = gradient;
        
        context.save();
        context.translate(cx, cy);
        context.rotate(Math.random() * Math.PI * 2);
        context.scale(1 + Math.random() * 0.5, 0.5 + Math.random() * 0.5);
        context.translate(-cx, -cy);
        context.fillRect(0, 0, 512, 512);
        context.restore();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  const colors = ['#4F46E5', '#7C3AED', '#06B6D4', '#BE185D', '#1E3A5F'];

  const clouds = useMemo(() => {
    return Array.from({ length: 10 }).map(() => {
      return {
        position: [
          (Math.random() - 0.5) * 200,
          (Math.random() - 0.5) * 150,
          -200 + Math.random() * 250 // -200 to +50
        ] as [number, number, number],
        scale: Math.random() * 60 + 40, // 40-100
        opacity: 0.08 + Math.random() * 0.1, // 0.08-0.18
        color: new THREE.Color(colors[Math.floor(Math.random() * colors.length)]),
        rotSpeed: (Math.random() - 0.5) * 0.002,
        oscSpeed: 0.0005 + Math.random() * 0.001,
        oscPhase: Math.random() * Math.PI * 2,
        basePos: new THREE.Vector3()
      };
    });
  }, []);

  // Set base positions
  useMemo(() => {
    clouds.forEach(c => {
      c.basePos.set(c.position[0], c.position[1], c.position[2]);
    });
  }, [clouds]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (cloudsRef.current) {
      cloudsRef.current.children.forEach((sprite: THREE.Object3D, i: number) => {
        const data = clouds[i];
        sprite.rotation.z += data.rotSpeed;
        
        // Slight oscillation
        sprite.position.x = data.basePos.x + Math.sin(time * data.oscSpeed + data.oscPhase) * 5;
        sprite.position.y = data.basePos.y + Math.cos(time * data.oscSpeed + data.oscPhase) * 5;
      });
    }
  });

  return (
    <group ref={cloudsRef}>
      {clouds.map((cloud, i) => (
        <sprite 
          key={i} 
          position={cloud.position} 
          scale={[cloud.scale, cloud.scale, 1]}
        >
          <spriteMaterial 
            map={cloudTextures} 
            color={cloud.color} 
            transparent 
            opacity={cloud.opacity} 
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  );
}
