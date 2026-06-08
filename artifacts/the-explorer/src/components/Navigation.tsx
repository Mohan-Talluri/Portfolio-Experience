import React from "react";
import { motion } from "framer-motion";

interface NavigationProps {
  total: number;
  active: number;
  onChange: (index: number) => void;
}

export default function Navigation({ total, active, onChange }: NavigationProps) {
  return (
    <div className="fixed right-8 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-4">
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === active;
        return (
          <button
            key={i}
            onClick={() => onChange(i)}
            className="relative w-2 h-8 group focus:outline-none"
            aria-label={`Go to section ${i + 1}`}
          >
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 w-[2px] rounded-full bg-white transition-all duration-300"
              initial={false}
              animate={{
                height: isActive ? "100%" : "30%",
                opacity: isActive ? 1 : 0.3,
                boxShadow: isActive ? "0 0 10px 2px rgba(255,255,255,0.5)" : "none",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
