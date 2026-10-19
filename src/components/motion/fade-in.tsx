"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";

/** Page and section entrance: fade with an 8px rise over 180 ms. Decorative only. */
export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Seconds. */
  delay?: number;
}) {
  const reduce = usePrefersReducedMotion();
  return (
    <motion.div
      data-motion=""
      className={className}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.18, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
