import Image from "next/image";
import { gymPhotoUrl } from "@/lib/db/gyms";
import { readSupabasePublicEnv } from "@/lib/supabase/env";

/** The gym's photos from the public gym-photos bucket, first one being the cover. */
export function GymPhotoGrid({ photos, gymName }: { photos: readonly string[]; gymName: string }) {
  const supabaseUrl = readSupabasePublicEnv()?.url;
  if (photos.length === 0) {
    return <p className="text-sm text-muted-foreground">No photos yet.</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((path, index) => {
        const src = gymPhotoUrl(path, supabaseUrl);
        return (
          <li key={path} className="overflow-hidden rounded-lg border bg-muted">
            {src ? (
              <Image
                // Public bucket files; the optimizer and its remote host list are skipped.
                unoptimized
                src={src}
                alt={index === 0 ? `${gymName}, cover photo` : `${gymName}, photo ${index + 1}`}
                width={320}
                height={200}
                className="aspect-[8/5] size-full object-cover"
              />
            ) : (
              <p className="p-3 text-xs text-muted-foreground">Supabase URL not configured</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
