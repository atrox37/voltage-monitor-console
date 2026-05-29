import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full border border-panel-border bg-panel backdrop-blur-md">
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-primary/70 to-primary shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_60%,transparent)]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary/60 bg-background shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_18%,transparent),0_0_10px_color-mix(in_oklab,var(--primary)_55%,transparent)] transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:pointer-events-none disabled:opacity-50" />

));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
