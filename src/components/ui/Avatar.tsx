import { getInitials, cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const colors = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-indigo-600",
  "bg-teal-600",
];

function colorFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const sizeClasses = cn(
    size === "sm" && "h-7 w-7 text-xs",
    size === "md" && "h-9 w-9 text-sm",
    size === "lg" && "h-12 w-12 text-base"
  );
  if (src) {
    return <img src={src} alt={name} className={cn("shrink-0 rounded-full object-cover", sizeClasses, className)} />;
  }
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full text-white font-medium shrink-0",
        colorFromName(name),
        sizeClasses,
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
