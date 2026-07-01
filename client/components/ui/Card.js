import { cn } from "@/lib/utils";

export default function Card({ children, className, glow = false, ...props }) {
  return (
    <div
      className={cn(
        "glass rounded-xl p-5",
        glow && "glow-green-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }) {
  return (
    <div className={cn("mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }) {
  return (
    <h3 className={cn("text-lg font-semibold text-foreground", className)}>
      {children}
    </h3>
  );
}
