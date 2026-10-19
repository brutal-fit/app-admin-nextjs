"use client";

import { useApplePlatform } from "@/components/layout/use-apple-platform";
import { Kbd } from "@/components/ui/kbd";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SHORTCUTS, SHORTCUT_GROUPS, keyLabel } from "@/lib/shortcuts";
import { useCommandStore } from "@/stores/command-store";

/** The "?" sheet: every shortcut from the registry, grouped. */
export function ShortcutSheet() {
  const apple = useApplePlatform();
  const open = useCommandStore((state) => state.shortcutsOpen);
  const setOpen = useCommandStore((state) => state.setShortcutsOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="gap-0 overflow-y-auto bg-card">
        <SheetHeader className="border-b">
          <SheetTitle>Keyboard shortcuts</SheetTitle>
          <SheetDescription>
            Letters work when you are not typing in a field. &quot;g&quot; then a letter jumps to a page.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 p-4">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group} aria-labelledby={`shortcuts-${group}`} className="flex flex-col gap-2">
              <h3 id={`shortcuts-${group}`} className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {group}
              </h3>
              <dl className="flex flex-col divide-y rounded-lg border">
                {SHORTCUTS.filter((shortcut) => shortcut.group === group).map((shortcut) => (
                  <div key={shortcut.id} className="flex items-center justify-between gap-4 px-3 py-2">
                    <dt className="text-sm">{shortcut.description}</dt>
                    <dd className="flex shrink-0 items-center gap-1">
                      {shortcut.keys.map((key, index) => (
                        <span key={`${key}-${index}`} className="flex items-center gap-1">
                          {index > 0 && group === "Go to" ? (
                            <span className="text-xs text-muted-foreground">then</span>
                          ) : null}
                          <Kbd>{keyLabel(key, apple)}</Kbd>
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
