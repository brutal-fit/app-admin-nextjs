"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";

/** Seconds between items. */
const STAGGER_S = 0.04;
// Past this many items the rest arrive together, so a long list never feels slow.
const MAX_STAGGERED = 12;

const FirstPaintContext = createContext(false);

/**
 * Marks a list whose items stagger in on first paint only: items that mount later (a filter
 * change, a new row from the server) appear without animation.
 */
export function StaggerList({ children }: { children: ReactNode }) {
  const [firstPaint, setFirstPaint] = useState(true);
  useEffect(() => {
    // After the first commit, anything that mounts is an update, not the first paint.
    const timer = setTimeout(() => setFirstPaint(false), 0);
    return () => clearTimeout(timer);
  }, []);
  return <FirstPaintContext value={firstPaint}>{children}</FirstPaintContext>;
}

type ItemElement = "li" | "tr" | "div";

const MOTION_ELEMENTS = { li: motion.li, tr: motion.tr, div: motion.div } as const;

/** One item of a StaggerList: rises 4px and fades in, 40 ms after the one before it. */
export function StaggerItem({
  as = "li",
  index,
  className,
  children,
  ...rest
}: {
  as?: ItemElement;
  index: number;
  className?: string;
  children: ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "children" | "className">) {
  const firstPaint = useContext(FirstPaintContext);
  const reduce = usePrefersReducedMotion();
  // Captured at mount: an item is animated only if it was part of the first paint.
  const [animateIn] = useState(firstPaint);
  const Element = MOTION_ELEMENTS[as];
  const animated = animateIn && !reduce;
  return (
    <Element
      data-motion=""
      className={className}
      initial={animated ? { opacity: 0, y: 4 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={
        animated
          ? { duration: 0.18, ease: "easeOut", delay: Math.min(index, MAX_STAGGERED) * STAGGER_S }
          : { duration: 0 }
      }
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </Element>
  );
}
