import React from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, icon, children, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-900 arabic-spacing">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              {icon}
            </div>
          )}
          <select
            ref={ref}
            className={cn(
              "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900",
              "focus:border-[#182C61] focus:outline-none focus:ring-2 focus:ring-[#182C61]/20",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100",
              icon && "pr-10",
              error &&
                "border-red-300 focus:border-red-500 focus:ring-red-500/20",
              "arabic-spacing",
              className
            )}
            {...props}
          >
            {children}
          </select>
        </div>
        {error && (
          <p className="text-sm text-red-600 arabic-spacing" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500 arabic-spacing">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
