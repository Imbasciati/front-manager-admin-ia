import * as React from "react";
import { cn } from "../../utils/cn";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-white/20 bg-surface px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary",
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };

