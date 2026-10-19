import type { SVGProps } from "react";

/*
 * Fitness line art for the backdrop: single-stroke figures on a 64 x 64 grid, drawn with
 * `currentColor` so the caller picks the colour through a token. Each glyph is a <g> so the
 * backdrop can place many inside one SVG pattern; <Silhouette> wraps one for standalone use.
 */

type GlyphProps = SVGProps<SVGGElement>;

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function RunnerGlyph(props: GlyphProps) {
  return (
    <g {...STROKE} {...props}>
      <circle cx="39" cy="9" r="4" />
      <path d="M37 15 L31 32 M35 20 L43 26 L49 21 M35 20 L27 23 L22 17 M31 32 L39 41 L36 53 L40 54 M31 32 L24 42 L13 44" />
    </g>
  );
}

export function BoxerGlyph(props: GlyphProps) {
  return (
    <g {...STROKE} {...props}>
      <circle cx="30" cy="10" r="4" />
      <path d="M30 15 L28 32 M30 19 L23 26 L26 17 M30 19 L38 25 L43 18 M28 32 L21 43 L19 54 M28 32 L36 42 L41 54" />
      <circle cx="26" cy="15" r="2.5" />
      <circle cx="44" cy="16" r="2.5" />
    </g>
  );
}

export function KettlebellSwingGlyph(props: GlyphProps) {
  return (
    <g {...STROKE} {...props}>
      <circle cx="41" cy="13" r="4" />
      <path d="M38 19 L27 34 M37 21 L51 25 M27 34 L31 44 L27 54 M27 34 L34 44 L33 54" />
      <path d="M50 26 Q53 22 56 26" />
      <circle cx="53" cy="31" r="4.5" />
    </g>
  );
}

export function PlankGlyph(props: GlyphProps) {
  return (
    <g {...STROKE} {...props}>
      <circle cx="53" cy="29" r="3.5" />
      <path d="M48 34 L10 40 L10 45 M48 34 L48 45 L57 45 M5 47 L60 47" />
    </g>
  );
}

export function DumbbellGlyph(props: GlyphProps) {
  return (
    <g {...STROKE} {...props}>
      <path d="M22 32 L42 32" />
      <rect x="15" y="22" width="7" height="20" rx="2" />
      <rect x="42" y="22" width="7" height="20" rx="2" />
      <rect x="10" y="26" width="5" height="12" rx="1.5" />
      <rect x="49" y="26" width="5" height="12" rx="1.5" />
    </g>
  );
}

export function JumpRopeGlyph(props: GlyphProps) {
  return (
    <g {...STROKE} {...props}>
      <circle cx="32" cy="11" r="4" />
      <path d="M32 16 L32 33 M32 20 L25 27 L21 33 M32 20 L39 27 L43 33 M32 33 L28 43 L30 50 M32 33 L36 43 L34 50" />
      <path d="M21 33 C 13 62, 51 62, 43 33" />
    </g>
  );
}

export const SILHOUETTE_GLYPHS = {
  runner: RunnerGlyph,
  boxer: BoxerGlyph,
  kettlebell: KettlebellSwingGlyph,
  plank: PlankGlyph,
  dumbbell: DumbbellGlyph,
  jumpRope: JumpRopeGlyph,
} as const;

export type SilhouetteName = keyof typeof SILHOUETTE_GLYPHS;

/** One glyph as its own decorative SVG (empty states, illustrations). */
export function Silhouette({
  name,
  ...props
}: { name: SilhouetteName } & Omit<SVGProps<SVGSVGElement>, "children">) {
  const Glyph = SILHOUETTE_GLYPHS[name];
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" {...props}>
      <Glyph />
    </svg>
  );
}
