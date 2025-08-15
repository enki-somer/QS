import React from "react";
import {
  useUIPermissions,
  maskCurrency,
  maskFinancialNumber,
} from "@/hooks/useUIPermissions";
import { Eye, EyeOff } from "lucide-react";

interface FinancialDisplayProps {
  value: number | string | null | undefined;
  currency?: string;
  className?: string;
  showIcon?: boolean;
  prefix?: string;
  suffix?: string;
  format?: "number" | "currency";
}

/**
 * Component for displaying financial numbers with role-based masking
 * - Admin: Shows actual numbers
 * - Partners: Shows actual numbers (view-only)
 * - Data Entry: Shows ***** instead of numbers
 */
export const FinancialDisplay: React.FC<FinancialDisplayProps> = ({
  value,
  currency = "د.ع",
  className = "",
  showIcon = false,
  prefix = "",
  suffix = "",
  format = "currency",
}) => {
  const permissions = useUIPermissions();

  const displayValue =
    format === "currency"
      ? maskCurrency(value, permissions, currency)
      : maskFinancialNumber(value, permissions);

  const isHidden = !permissions.canViewFinancialNumbers;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {showIcon && (
        <span className="text-gray-400">
          {isHidden ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </span>
      )}
      {prefix}
      <span className={isHidden ? "font-mono text-gray-500" : "font-semibold"}>
        {displayValue}
      </span>
      {suffix}
    </span>
  );
};

interface FinancialCardProps {
  title: string;
  value: number | string | null | undefined;
  currency?: string;
  icon?: React.ReactNode;
  className?: string;
  valueClassName?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

/**
 * Card component for displaying financial information with role-based masking
 */
export const FinancialCard: React.FC<FinancialCardProps> = ({
  title,
  value,
  currency = "د.ع",
  icon,
  className = "",
  valueClassName = "",
  trend,
}) => {
  const permissions = useUIPermissions();

  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        </div>
        {permissions.isDataEntryMode && (
          <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            محظور
          </div>
        )}
      </div>

      <div className="mt-2">
        <FinancialDisplay
          value={value}
          currency={currency}
          className={`text-2xl font-bold ${valueClassName}`}
          showIcon={permissions.isDataEntryMode}
        />

        {trend && permissions.canViewFinancialNumbers && (
          <div
            className={`text-sm mt-1 ${
              trend.isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend.isPositive ? "↗" : "↘"} {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialDisplay;
