"use client";

import { useEffect, useRef } from "react";
import { animate } from "motion/react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";

function format(value: number): string {
  return Math.round(value).toLocaleString("en-IN");
}

/**
 * A number that counts up to its value on load (600 ms, ease-out) and from the old value
 * when it changes. The markup always holds the real value, so without scripts, under reduced
 * motion and for screen readers the number is never anything but the server's.
 */
export function CountUp({
  value,
  suffix = "",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const reduce = usePrefersReducedMotion();
  const node = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);

  useEffect(() => {
    const element = node.current;
    if (!element) return;
    if (reduce) {
      element.textContent = format(value);
      shown.current = value;
      return;
    }
    const controls = animate(shown.current, value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (latest) => {
        element.textContent = format(latest);
        shown.current = latest;
      },
    });
    return () => {
      controls.stop();
      element.textContent = format(value);
      shown.current = value;
    };
  }, [value, reduce]);

  return (
    <span className={className}>
      <span ref={node} aria-hidden="true" data-count-up="" className="tabular-nums">
        {format(value)}
      </span>
      {suffix ? <span aria-hidden="true">{suffix}</span> : null}
      <span className="sr-only">
        {format(value)}
        {suffix}
      </span>
    </span>
  );
}
