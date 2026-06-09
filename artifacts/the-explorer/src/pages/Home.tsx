import React, { useEffect, useRef, useState } from "react";
import SpaceScene from "@/components/SpaceScene";
import SpaceBackground from "@/components/SpaceBackground";
import SectionOverlay from "@/components/SectionOverlay";
import Navigation from "@/components/Navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SECTIONS = [
  { id: "hero",     label: "Varshini Muppala",    subtitle: "Scroll to explore the universe" },
  { id: "about",    label: "Origin Story",         subtitle: "Where it all began" },
  { id: "skills",   label: "Technical Core",       subtitle: "The crystalline foundations" },
  { id: "projects", label: "Created Worlds",       subtitle: "Anomalies of imagination" },
  { id: "timeline", label: "Journey Through Time", subtitle: "Echoes of every step" },
  { id: "dreams",   label: "Beyond the Storm",     subtitle: "What lies on the horizon" },
  { id: "contact",  label: "Make Contact",         subtitle: "Establish a connection" },
];

export default function Home() {
  const [activeSection, setActiveSection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const sections = gsap.utils.toArray<HTMLElement>(".scroll-section");
    sections.forEach((section, i) => {
      ScrollTrigger.create({
        trigger: section,
        start: "top center",
        end: "bottom center",
        onEnter: () => setActiveSection(i),
        onEnterBack: () => setActiveSection(i),
      });
    });
    return () => { ScrollTrigger.getAll().forEach(t => t.kill()); };
  }, []);

  const scrollToSection = (index: number) => {
    document.querySelector(`#section-${index}`)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative w-full" style={{ background: "transparent" }} ref={containerRef}>
      {/* Layer 0: Rich space canvas background (nebulae, galaxies, name text) */}
      <SpaceBackground />

      {/* Layer 1: Three.js scene (transparent canvas over background) */}
      <div className="fixed inset-0 z-10">
        <SpaceScene activeSection={activeSection} />
      </div>

      {/* Scroll sections (invisible, just for scroll triggers) */}
      <div className="relative z-20 w-full pointer-events-none">
        {SECTIONS.map((section, i) => (
          <div
            key={section.id}
            id={`section-${i}`}
            className="scroll-section w-full h-[150vh]"
          />
        ))}
      </div>

      {/* Section label overlay */}
      <SectionOverlay activeSection={activeSection} sections={SECTIONS} />

      {/* Navigation dots */}
      <Navigation
        total={SECTIONS.length}
        active={activeSection}
        onChange={scrollToSection}
      />
    </div>
  );
}
