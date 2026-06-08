import React, { useEffect, useRef, useState } from "react";
import SpaceScene from "@/components/SpaceScene";
import SectionOverlay from "@/components/SectionOverlay";
import Navigation from "@/components/Navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SECTIONS = [
  { id: "hero", label: "[ HERO_PLACEHOLDER ]", subtitle: "Scroll to explore" },
  { id: "about", label: "[ ABOUT_PLACEHOLDER ]", subtitle: "Discover the origin" },
  { id: "skills", label: "[ SKILLS_PLACEHOLDER ]", subtitle: "Technical core" },
  { id: "projects", label: "[ PROJECTS_PLACEHOLDER ]", subtitle: "Formed anomalies" },
  { id: "timeline", label: "[ TIMELINE_PLACEHOLDER ]", subtitle: "Echoes in time" },
  { id: "dreams", label: "[ DREAMS_PLACEHOLDER ]", subtitle: "Beyond the horizon" },
  { id: "contact", label: "[ CONTACT_PLACEHOLDER ]", subtitle: "Establish connection" },
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

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  const scrollToSection = (index: number) => {
    const section = document.querySelector(`#section-${index}`);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative w-full bg-background" ref={containerRef}>
      <div className="fixed inset-0 z-0">
        <SpaceScene activeSection={activeSection} />
      </div>
      
      <div className="relative z-10 w-full pointer-events-none">
        {SECTIONS.map((section, i) => (
          <div 
            key={section.id} 
            id={`section-${i}`}
            className="scroll-section w-full h-[150vh]"
          ></div>
        ))}
      </div>

      <SectionOverlay activeSection={activeSection} sections={SECTIONS} />
      <Navigation 
        total={SECTIONS.length} 
        active={activeSection} 
        onChange={scrollToSection} 
      />
    </div>
  );
}
