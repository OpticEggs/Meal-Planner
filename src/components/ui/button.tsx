import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/*
 * shadcn/ui Button (new-york), adapted for Table (SHADCN-PLAN P2):
 *  - labels wrap instead of overflowing (B18: 320 px at 200% text) and heights are minimums, so a target is never
 *    smaller than 44 px (38 px for `sm`, still above WCAG 2.5.8's 24 px);
 *  - focus shows the app's tested 3 px outline (theme-contrast.test.ts), not a ring;
 *  - a disabled button keeps pointer events so it is never reported as covered by what is under it;
 *  - `brand` is S2's one warm accent (selection and +); `default` is the near-white primary.
 */
const buttonVariants = cva(
  "ui-btn inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium text-center whitespace-normal [overflow-wrap:anywhere] no-underline cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        brand: "bg-brand text-brand-foreground hover:bg-brand/90",
        destructive: "border border-destructive/60 bg-transparent text-destructive hover:bg-destructive/10",
        outline: "border border-border bg-input/30 text-foreground hover:bg-input/60",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        "ghost-destructive": "bg-transparent text-destructive hover:bg-destructive/10",
        link: "bg-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 px-4 py-2",
        sm: "min-h-9.5 gap-1.5 px-3 py-1.5 text-[0.86rem]",
        lg: "min-h-13.5 px-6 py-3 text-base",
        icon: "size-11",
        "icon-sm": "size-9.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
