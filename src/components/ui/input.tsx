import * as React from "react"
import { cn } from "@/lib/utils"

/*
 * shadcn/ui Input, adapted for Table (SHADCN-PLAN P2): the shadcn look (radius, border, fill, placeholder), a 44 px
 * minimum height, 16 px text (no zoom-on-focus on iPhone) and the app's tested focus outline. Width is left to the
 * layout (tiny quantity fields, flex rows), so it is not set here.
 */
export const fieldClass =
  "min-h-11 min-w-0 rounded-md border border-input bg-input/30 px-3 py-2 text-base text-foreground transition-colors placeholder:text-muted-foreground hover:border-ring focus:bg-input/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(fieldClass, className)} {...props} />
}

export { Input }
