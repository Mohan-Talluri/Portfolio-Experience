import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import PlanetAtmosphere from './PlanetAtmosphere';

interface PlanetProps {
  position: THREE.Vector3;
  config: any;
  active: boolean;
}

const vertexShader = `
  uniform float time;
  uniform float displacementScale;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  // Classic Perlin 3D Noise by Stefan Gustavson
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}
  float cnoise(vec3 P){
    vec3 Pi0 = floor(P); // Integer part for indexing
    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P); // Fractional part for interpolation
    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;
    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);
    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);
    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);
    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;
    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);
    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
  }

  void main() {
    vUv = uv;
    vNormal = normal;
    
    // Displacement
    float noise = cnoise(position * 2.0 + time * 0.1);
    float noise2 = cnoise(position * 4.0 - time * 0.05);
    float displacement = (noise * 0.5 + noise2 * 0.5) * displacementScale;
    
    vec3 newPosition = position + normal * displacement;
    vPosition = newPosition;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const getFragmentShader = (type: string, baseColor: string) => {
  let shaderCode = `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    float cnoise(vec3 P); // assumed injected if needed or simplified for fragment
    
    // Simple noise for fragment
    float hash(vec3 p) {
      return fract(sin(dot(p, vec3(12.9898, 78.233, 151.7182))) * 43758.5453);
    }
    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
  `;

  if (type === 'hero') {
    shaderCode += `
      void main() {
        float n = noise(vPosition * 3.0 + time * 0.2);
        float bands = sin(vPosition.y * 10.0 + n * 5.0 + time) * 0.5 + 0.5;
        vec3 finalColor = mix(color, vec3(0.1, 0.5, 1.0), bands * 0.5);
        
        // Cracks
        float cracks = smoothstep(0.7, 0.8, noise(vPosition * 8.0 - time * 0.1));
        finalColor += vec3(0.2, 0.8, 1.0) * cracks * 2.0;
        
        // Lighting
        float light = dot(vNormal, vec3(0.5, 1.0, 0.5)) * 0.5 + 0.5;
        gl_FragColor = vec4(finalColor * light, 1.0);
      }
    `;
  } else if (type === 'about') {
    shaderCode += `
      void main() {
        float n = noise(vPosition * 5.0);
        float cracks = sin(n * 20.0 + time) * 0.5 + 0.5;
        cracks = smoothstep(0.8, 1.0, cracks);
        
        vec3 crust = vec3(0.1, 0.05, 0.05);
        vec3 magma = vec3(1.0, 0.4, 0.0);
        
        vec3 finalColor = mix(crust, magma, cracks);
        float light = dot(vNormal, vec3(0.5, 1.0, 0.5)) * 0.5 + 0.5;
        gl_FragColor = vec4(mix(finalColor * light, finalColor, cracks), 1.0); // magma is emissive
      }
    `;
  } else if (type === 'skills') {
    shaderCode += `
      void main() {
        float n = noise(vPosition * 8.0);
        vec3 base = color;
        vec3 highlight = vec3(0.8, 1.0, 1.0);
        
        float facet = step(0.5, fract(n * 10.0));
        vec3 finalColor = mix(base, highlight, facet * 0.3);
        
        float light = dot(vNormal, vec3(0.5, 1.0, 0.5)) * 0.5 + 0.5;
        float specular = pow(max(dot(vNormal, vec3(0.5, 1.0, 0.5)), 0.0), 32.0);
        
        gl_FragColor = vec4(finalColor * light + specular * vec3(0.5, 1.0, 1.0), 1.0);
      }
    `;
  } else if (type === 'projects') {
    shaderCode += `
      void main() {
        float n1 = noise(vPosition * 2.0 + vec3(time * 0.1, 0.0, 0.0));
        float n2 = noise(vPosition * 4.0 - vec3(0.0, time * 0.15, 0.0));
        
        float bands = sin(vPosition.y * 5.0 + n1 * 3.0) * 0.5 + 0.5;
        vec3 col1 = vec3(0.6, 0.1, 0.3); // deep red
        vec3 col2 = vec3(0.9, 0.2, 0.5); // magenta
        
        vec3 finalColor = mix(col1, col2, bands + n2 * 0.5);
        
        float light = dot(vNormal, vec3(0.5, 1.0, 0.5)) * 0.5 + 0.5;
        gl_FragColor = vec4(finalColor * light, 1.0);
      }
    `;
  } else if (type === 'timeline') {
    shaderCode += `
      void main() {
        float n = noise(vPosition * 3.0 + time * 0.05);
        vec3 base = color;
        vec3 aurora = vec3(0.5, 0.8, 1.0);
        
        float patch = smoothstep(0.4, 0.8, n);
        vec3 finalColor = mix(base, aurora, patch * 0.5);
        
        float light = dot(vNormal, vec3(0.5, 1.0, 0.5)) * 0.5 + 0.5;
        // rim light
        float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
        rim = smoothstep(0.6, 1.0, rim);
        
        gl_FragColor = vec4(finalColor * light + vec3(0.8, 0.9, 1.0) * rim * 0.5, 0.9);
      }
    `;
  } else if (type === 'dreams') {
    shaderCode += `
      void main() {
        float n = noise(vPosition * 2.0 + time * 0.2);
        float aurora = sin(vPosition.y * 3.0 + n * 5.0 - time) * 0.5 + 0.5;
        aurora = smoothstep(0.5, 0.9, aurora);
        
        vec3 base = color;
        vec3 glow = vec3(0.9, 0.5, 1.0);
        
        vec3 finalColor = mix(base, glow, aurora);
        float light = dot(vNormal, vec3(0.5, 1.0, 0.5)) * 0.5 + 0.5;
        
        gl_FragColor = vec4(mix(finalColor * light, glow, aurora * 0.5), 1.0);
      }
    `;
  } else if (type === 'contact') {
    shaderCode += `
      void main() {
        float n = noise(vPosition * 10.0 - time);
        vec3 base = color;
        vec3 bright = vec3(1.0, 1.0, 1.0);
        
        vec3 finalColor = mix(base, bright, n * 0.5 + 0.5);
        // Emissive, so ignore lighting
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  } else {
    // Default
    shaderCode += `
      void main() {
        float light = dot(vNormal, vec3(0.5, 1.0, 0.5)) * 0.5 + 0.5;
        gl_FragColor = vec4(color * light, 1.0);
      }
    `;
  }

  return shaderCode;
};

export default function Planet({ position, config, active }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    const displacementScale = config.size * (0.05 + Math.random() * 0.05); // 0.05-0.10 relative to size
    
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(config.color) },
        displacementScale: { value: displacementScale }
      },
      vertexShader,
      fragmentShader: getFragmentShader(config.type, config.color),
      transparent: config.type === 'timeline'
    });
  }, [config]);

  // Handle disposal
  React.useEffect(() => {
    return () => material.dispose();
  }, [material]);

  useFrame((state, delta) => {
    if (material) {
      material.uniforms.time.value = state.clock.elapsedTime;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x += 0.002;

      // Scale animation based on active state
      const targetScale = active ? 1.1 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 2);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.002;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[config.size, 20]} />
        <primitive object={material} attach="material" />
      </mesh>
      
      <PlanetAtmosphere size={config.size} color={config.color} active={active} />
      
      {active && (
        <mesh ref={ringRef} rotation={[Math.PI / 2.2, 0, 0]}>
          <ringGeometry args={[config.size * 1.5, config.size * 1.55, 64]} />
          <meshBasicMaterial color={config.color} transparent opacity={0.5} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
        </mesh>
      )}
    </group>
  );
}
