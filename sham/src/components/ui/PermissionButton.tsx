import React from "react";
import { Button } from "./Button";
import { useUIPermissions } from "@/hooks/useUIPermissions";

interface PermissionButtonProps {
  permission: keyof ReturnType<typeof useUIPermissions>;
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "destructive" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
  disabled?: boolean;
  title?: string;
  tooltip?: string;
  viewOnlyTooltip?: string;
}

/**
 * Button component that respects user permissions
 * - Admin: Full functionality
 * - Partners: Disabled with tooltip explaining view-only mode
 * - Data Entry: Hidden if no permission, or disabled for restricted actions
 */
export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permission,
  children,
  onClick,
  variant = "primary",
  size = "default",
  className = "",
  disabled = false,
  title,
  tooltip,
  viewOnlyTooltip = "غير متاح - وضع العرض فقط",
  ...props
}) => {
  const permissions = useUIPermissions();
  const hasPermission = permissions[permission];

  // For data entry users, hide buttons they shouldn't see
  if (permissions.isDataEntryMode && !hasPermission) {
    return null;
  }

  // For partners (view-only mode), show disabled button
  if (permissions.isViewOnlyMode && !hasPermission) {
    return (
      <Button
        variant="outline"
        size={size}
        className={`opacity-50 cursor-not-allowed ${className}`}
        disabled={true}
        title={viewOnlyTooltip}
        {...props}
      >
        {children}
      </Button>
    );
  }

  // For admin or when user has permission
  const buttonElement = (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || !hasPermission}
      onClick={hasPermission ? onClick : undefined}
      title={title}
      {...props}
    >
      {children}
    </Button>
  );

  return buttonElement;
};

export default PermissionButton;
