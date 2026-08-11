import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, disabled, loading, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
          variant === "primary" &&
            "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-400",
          variant === "secondary" &&
            "bg-slate-100 text-slate-800 hover:bg-slate-200 focus:ring-slate-300",
          variant === "danger" &&
            "bg-red-600 text-white hover:bg-red-700 focus:ring-red-300",
          variant === "success" &&
            "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-300",
          variant === "ghost" &&
            "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-300",
          variant === "outline" &&
            "border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-300",
          size === "sm" && "px-3 py-1.5 text-sm",
          size === "md" && "px-4 py-2 text-sm",
          size === "lg" && "px-5 py-2.5 text-base",
          className
        )}
        {...props}
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
