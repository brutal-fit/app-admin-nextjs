import { SILHOUETTE_GLYPHS, type SilhouetteName } from "@/components/art/silhouettes";

/*
 * The panel's visual identity: fitness line art tiled very lightly behind the content, and
 * one accent glow behind the page header. Purely decorative (aria-hidden, no pointer events).
 *
 * Contrast check (darkest text over the lightest overlay spot): the lightest spot is a stroke
 * crossing the centre of the glow, background #161616 + 14% accent + 4.5% foreground, about
 * #3f2929. The darkest text drawn on the background is muted-foreground #a8a8a8, which keeps
 * 5.7:1 there (6.9:1 over a stroke outside the glow, 7.6:1 on the plain background), so the
 * backdrop never takes text below 4.5:1. Cards are opaque and sit above it.
 */

/** Opacity of the line art; the package range is 0.035 to 0.05. */
export const BACKDROP_OPACITY = 0.045;

const TILE_WIDTH = 420;
const TILE_HEIGHT = 300;

// Fixed placements inside one tile: slight rotation and scale variance, so the repeat reads as
// scattered rather than as a grid. Deterministic, so server and client render the same SVG.
const PLACEMENTS: readonly { glyph: SilhouetteName; x: number; y: number; rotate: number; scale: number }[] = [
  { glyph: "runner", x: 18, y: 20, rotate: -8, scale: 1.25 },
  { glyph: "dumbbell", x: 170, y: 10, rotate: 14, scale: 0.9 },
  { glyph: "boxer", x: 300, y: 40, rotate: 5, scale: 1.15 },
  { glyph: "plank", x: 40, y: 170, rotate: 3, scale: 1.3 },
  { glyph: "kettlebell", x: 190, y: 150, rotate: -12, scale: 1.05 },
  { glyph: "jumpRope", x: 320, y: 190, rotate: 9, scale: 1.0 },
];

const PATTERN_ID = "brutal-backdrop-silhouettes";

export function Backdrop() {
  return (
    <div
      aria-hidden="true"
      data-backdrop=""
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="glow-radial absolute -top-56 -left-48 h-[36rem] w-[44rem]" />
      <svg
        className="absolute inset-0 h-full w-full text-foreground"
        style={{ opacity: BACKDROP_OPACITY }}
        focusable="false"
      >
        <defs>
          <pattern
            id={PATTERN_ID}
            width={TILE_WIDTH}
            height={TILE_HEIGHT}
            patternUnits="userSpaceOnUse"
          >
            {PLACEMENTS.map(({ glyph, x, y, rotate, scale }) => {
              const Glyph = SILHOUETTE_GLYPHS[glyph];
              return (
                <Glyph
                  key={glyph}
                  transform={`translate(${x} ${y}) rotate(${rotate} 32 32) scale(${scale})`}
                  strokeWidth={1.6}
                />
              );
            })}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${PATTERN_ID})`} />
      </svg>
    </div>
  );
}
