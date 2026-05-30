import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight avatar (no extra radix dependency). API mirrors shadcn:
 *   <Avatar><AvatarImage src=... /><AvatarFallback>AB</AvatarFallback></Avatar>
 * The image hides itself on error so the fallback shows through.
 */
function Avatar({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar"
      className={cn(
        "relative flex size-9 shrink-0 overflow-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, src, ...props }: React.ComponentProps<"img">) {
  const [failed, setFailed] = React.useState(false);
  if (!src || failed) return null;
  return (
    <img
      data-slot="avatar-image"
      src={src}
      onError={() => setFailed(true)}
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full text-xs font-medium text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
