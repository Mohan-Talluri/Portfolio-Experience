import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Section {
  id: string;
  label: string;
  subtitle: string;
}

interface SectionOverlayProps {
  activeSection: number;
  sections: Section[];
}

export default function SectionOverlay({ activeSection, sections }: SectionOverlayProps) {
  const section = sections[activeSection];

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 1.05 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center flex flex-col items-center"
        >
          <motion.div 
            className="text-sm uppercase tracking-[0.15em] text-foreground/60 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            {section.subtitle}
          </motion.div>
          <h1 className="text-3xl md:text-5xl font-light tracking-[0.3em] uppercase text-foreground drop-shadow-lg">
            {section.label}
          </h1>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
