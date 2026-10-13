import * as React from "react"
import { cn } from "@/lib/utils"
import { fieldClass } from "./input"

/* A native <select> in the Input style (SHADCN-PLAN §2: native selects keep the phone's own picker). */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return <select data-slot="native-select" className={cn(fieldClass, "cursor-pointer pr-8", className)} {...props} />
}

export { NativeSelect }
