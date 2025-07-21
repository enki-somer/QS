import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "default" | "lg";
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "default", children, ...props },
    ref
  ) => {
    return (
      <button
        className={cn(
          // Base styles
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium btn-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          // Size variants
          {
            "h-8 px-3 text-xs": size === "sm",
            "h-10 px-4 py-2": size === "default",
            "h-12 px-6 text-base": size === "lg",
          },
          // Color variants
          {
            "bg-[#182C61] text-white hover:bg-[#1a2e66] shadow-sm":
              variant === "primary",
            "bg-gray-100 text-gray-900 hover:bg-gray-200 shadow-sm":
              variant === "secondary",
            "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm":
              variant === "outline",
            "hover:bg-gray-100 text-gray-700": variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700 shadow-sm":
              variant === "destructive",
          },
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
