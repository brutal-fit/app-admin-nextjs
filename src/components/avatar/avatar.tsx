"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { readSupabasePublicEnv } from "@/lib/supabase/env";
import { avatarInitials, avatarSources, type AvatarRef } from "@/lib/utils/avatar";

const SIZES = {
  sm: { px: 24, className: "size-6 text-[0.625rem]" },
  md: { px: 32, className: "size-8 text-xs" },
  lg: { px: 56, className: "size-14 text-lg" },
} as const;

export type AvatarSize = keyof typeof SIZES;

/**
 * One person's avatar: the photo when there is one, else their preset, else initials
 * (src/lib/utils/avatar.ts). Hand-written rather than shadcn's Avatar because that shows a
 * single image and only once the browser has loaded it; here the server renders the chosen
 * image straight away and a source that fails to load falls through to the next one. It is
 * decorative: every place that shows it prints the name beside it.
 */
export function Avatar({
  name,
  avatar,
  size = "sm",
  className,
}: {
  name: string | null | undefined;
  avatar?: AvatarRef | null;
  size?: AvatarSize;
  className?: string;
}) {
  const [failed, setFailed] = useState<readonly string[]>([]);
  const sources = avatarSources(avatar, readSupabasePublicEnv()?.url ?? null);
  const src = sources.find((candidate) => !failed.includes(candidate)) ?? null;
  const dimensions = SIZES[size];
  const isPreset = src?.startsWith("/avatars/") ?? false;
  const onError = () => {
    if (src) setFailed((current) => (current.includes(src) ? current : [...current, src]));
  };

  return (
    <span
      aria-hidden="true"
      data-avatar={src ? (isPreset ? "preset" : "photo") : "initials"}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-semibold text-muted-foreground select-none",
        dimensions.className,
        className,
      )}
    >
      {src && isPreset ? (
        // A plain img keeps the preset path relative. next/image rendered it as an absolute
        // URL built from the request origin, which is http behind the preview proxy and made
        // https pages load the SVGs as mixed content.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={dimensions.px}
          height={dimensions.px}
          decoding="async"
          loading="lazy"
          className="size-full object-cover"
          onError={onError}
        />
      ) : src ? (
        <Image
          // Photos come straight from the public bucket, so the optimizer (and its remote host
          // list) is skipped.
          unoptimized
          src={src}
          alt=""
          width={dimensions.px}
          height={dimensions.px}
          className="size-full object-cover"
          onError={onError}
        />
      ) : (
        avatarInitials(name)
      )}
    </span>
  );
}
