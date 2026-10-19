"use client";

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Wraps a status badge and plays one ring pulse when `value` changes after the first render,
 * which only happens when the server answered with a new status. Nothing plays on load.
 */
export function StatusPulse({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();
  const [seen, setSeen] = useState(value);
  const [pulses, setPulses] = useState(0);
  // Adjusting state during render (not in an effect) is React's pattern for "props changed".
  if (seen !== value) {
    setSeen(value);
    if (!reduce) setPulses((count) => count + 1);
  }
  return (
    <span className={cn("relative inline-flex", className)} data-status-pulse={pulses}>
      {children}
      {pulses > 0 && !reduce ? (
        <motion.span
          key={pulses}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-md border-2 border-current"
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 1.35 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      ) : null}
    </span>
  );
}
