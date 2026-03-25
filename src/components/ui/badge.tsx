import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    variant: {
      success: "bg-emerald-500/20 text-emerald-300",
      muted: "bg-zinc-500/20 text-zinc-300",
      purple: "bg-violet-500/20 text-violet-300",
      blue: "bg-blue-500/20 text-blue-300",
      warning: "bg-amber-500/20 text-amber-300",
      danger: "bg-red-500/20 text-red-300",
    },
  },
  defaultVariants: {
    variant: "muted",
  },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

