"use client";

import Image from "next/image";
import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { Trash2, Upload } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { addGymPhotoAction, removeGymPhotoAction } from "@/features/my-gym/actions";
import { PHOTOS_MAX, PHOTO_BYTES_MAX, PHOTO_TYPES } from "@/features/my-gym/schemas";
import { gymPhotoUrl, removeGymPhotoFiles, uploadGymPhoto } from "@/lib/db/gyms-manager";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { readSupabasePublicEnv } from "@/lib/supabase/env";
import { toAppError } from "@/lib/supabase/errors";
import { showToast } from "@/stores/toast-store";

/**
 * The gym's photos. A new photo uploads from the browser into the gym's folder of the public
 * gym-photos bucket (the storage policy admits the gym's managers), then a server action adds
 * its path to the gym through gym_update_profile. The first photo is the cover. Gated by
 * gym.self and the gym's manager row.
 */
export function MyGymPhotos({
  gymId,
  gymName,
  photos,
}: {
  gymId: string;
  gymName: string;
  photos: readonly string[];
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const supabaseUrl = readSupabasePublicEnv()?.url;
  const full = photos.length >= PHOTOS_MAX;

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) {
      setError("Use a JPEG, PNG or WebP photo.");
      return;
    }
    if (file.size > PHOTO_BYTES_MAX) {
      setError("Use a photo under 5 MB.");
      return;
    }
    setError(null);
    startTransition(async () => {
      let path: string;
      let client: ReturnType<typeof createSupabaseBrowserClient>;
      try {
        client = createSupabaseBrowserClient();
        path = await uploadGymPhoto(client, gymId, file);
      } catch (uploadError) {
        const message = toAppError(uploadError).message;
        setError(message);
        showToast("error", message);
        return;
      }
      const result = await addGymPhotoAction({ gymId, path });
      if (!result.ok) {
        // The gym does not show the file, so it is removed again.
        try {
          await removeGymPhotoFiles(client, [path]);
        } catch {
          // An unused file in the gym's folder is harmless.
        }
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", "Photo added.");
    });
  }

  function remove(path: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeGymPhotoAction({ gymId, path });
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", "Photo removed.");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos yet. The first photo is the cover in the app.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((path, index) => {
            const src = gymPhotoUrl(path, supabaseUrl);
            const label = index === 0 ? `${gymName}, cover photo` : `${gymName}, photo ${index + 1}`;
            return (
              <li key={path} className="flex flex-col gap-2 overflow-hidden rounded-lg border bg-card">
                {src ? (
                  <Image
                    // Public bucket files; the optimizer and its remote host list are skipped.
                    unoptimized
                    src={src}
                    alt={label}
                    width={320}
                    height={200}
                    className="aspect-[8/5] w-full object-cover"
                  />
                ) : (
                  <p className="p-3 text-xs text-muted-foreground">Supabase URL not configured</p>
                )}
                <div className="flex items-center justify-between gap-2 px-3 pb-2 text-xs text-muted-foreground">
                  <span>{index === 0 ? "Cover" : `Photo ${index + 1}`}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(path)}
                    disabled={pending}
                    aria-label={`Remove ${label}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={input}
          type="file"
          accept={PHOTO_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onFile}
        />
        <Button variant="outline" onClick={() => input.current?.click()} disabled={pending || full}>
          <Upload size={16} aria-hidden="true" />
          {pending ? "Working..." : "Upload photo"}
        </Button>
        <p className="text-xs text-muted-foreground">
          {full
            ? `The gym shows ${PHOTOS_MAX} photos, the most it can. Remove one to add another.`
            : `JPEG, PNG or WebP under 5 MB; up to ${PHOTOS_MAX} photos.`}
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
