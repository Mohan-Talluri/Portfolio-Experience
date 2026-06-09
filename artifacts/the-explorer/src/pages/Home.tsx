import React, { useEffect, useRef, useState } from "react";
import SpaceScene from "@/components/SpaceScene";
import SpaceBackground from "@/components/SpaceBackground";
import SectionOverlay from "@/components/SectionOverlay";
import Navigation from "@/components/Navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { planetDragging } from "@/components/planets/Planet";

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
  const activeSectionRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const snapLock = useRef(false);

  // Keep ref in sync with state (so touch handler reads latest value without stale closure)
  useEffect(() => { activeSectionRef.current = activeSection; }, [activeSection]);

  // ── GSAP scroll triggers ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const sections = gsap.utils.toArray<HTMLElement>(".scroll-section");
    sections.forEach((section, i) => {
      ScrollTrigger.create({
        trigger: section,
        start: "top center",
        end: "bottom center",
        onEnter:     () => setActiveSection(i),
        onEnterBack: () => setActiveSection(i),
      });
    });
    return () => { ScrollTrigger.getAll().forEach(t => t.kill()); };
  }, []);

  const scrollToSection = (index: number) => {
    const clamped = Math.max(0, Math.min(SECTIONS.length - 1, index));
    document.querySelector(`#section-${clamped}`)?.scrollIntoView({ behavior: "smooth" });
  };

  // ── Mobile swipe-to-snap ────────────────────────────────────────────────────
  useEffect(() => {
    let touchStartY = 0;
    let touchStartX = 0;
    let touchStartTime = 0;

    function onTouchStart(e: TouchEvent) {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      touchStartTime = Date.now();
    }

    function onTouchEnd(e: TouchEvent) {
      // Don't snap if user was rotating a planet
      if (planetDragging) return;

      const dy = touchStartY - e.changedTouches[0].clientY;
      const dx = touchStartX - e.changedTouches[0].clientX;
      const elapsed = Date.now() - touchStartTime;

      // Only snap on clearly vertical swipes (more vertical than horizontal)
      // and only if the gesture was fast enough and long enough
      const isVertical = Math.abs(dy) > Math.abs(dx) * 1.4;
      const isFastSwipe = elapsed < 450 && Math.abs(dy) > 55;

      if (isVertical && isFastSwipe && !snapLock.current) {
        snapLock.current = true;
        const next = dy > 0
          ? Math.min(activeSectionRef.current + 1, SECTIONS.length - 1)
          : Math.max(activeSectionRef.current - 1, 0);
        scrollToSection(next);
        // Prevent rapid double-snaps
        setTimeout(() => { snapLock.current = false; }, 800);
      }
    }

    // Use passive: true so we don't block the browser's default scroll behavior
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend',   onTouchEnd);
    };
  }, []);

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
