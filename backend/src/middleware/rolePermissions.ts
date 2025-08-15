import { Request, Response, NextFunction } from 'express';
import { UserRole, RolePermissions, ROLE_PERMISSIONS } from '../types';

// Extend the Request interface to include user information
export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: UserRole;
    fullName: string;
  };
}

/**
 * Get role permissions for a specific user role
 */
export const getRolePermissions = (role: UserRole): RolePermissions => {
  return ROLE_PERMISSIONS[role] || {
    canViewSafe: false,
    canEditSafe: false,
    canDeleteRecords: false,
    canMakePayments: false,
    canManageProjects: false,
    canManageEmployees: false,
    canViewReports: false,
    canExportReports: false,
    canManageExpenses: false,
  };
};

/**
 * Middleware to check if user has a specific permission
 */
export const requirePermission = (permission: keyof RolePermissions) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.role;
      
      if (!userRole) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          userMessage: 'يرجى تسجيل الدخول أولاً'
        });
      }

      const permissions = getRolePermissions(userRole);

      if (!permissions[permission]) {
        console.log(`🚫 Permission denied: ${req.user?.username} (${userRole}) tried to access ${permission}`);
        
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          userMessage: 'غير مسموح - ليس لديك الصلاحية المطلوبة',
          requiredPermission: permission,
          userRole: userRole
        });
      }

      console.log(`✅ Permission granted: ${req.user?.username} (${userRole}) accessing ${permission}`);
      next();
    } catch (error) {
      console.error('Error in requirePermission middleware:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        userMessage: 'حدث خطأ في الخادم'
      });
    }
  };
};

/**
 * Middleware to check if user has any of the specified permissions
 */
export const requireAnyPermission = (permissions: (keyof RolePermissions)[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.role;
      
      if (!userRole) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          userMessage: 'يرجى تسجيل الدخول أولاً'
        });
      }

      const rolePermissions = getRolePermissions(userRole);
      const hasAnyPermission = permissions.some(permission => rolePermissions[permission]);

      if (!hasAnyPermission) {
        console.log(`🚫 Permission denied: ${req.user?.username} (${userRole}) tried to access any of [${permissions.join(', ')}]`);
        
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          userMessage: 'غير مسموح - ليس لديك أي من الصلاحيات المطلوبة',
          requiredPermissions: permissions,
          userRole: userRole
        });
      }

      console.log(`✅ Permission granted: ${req.user?.username} (${userRole}) has access to one of [${permissions.join(', ')}]`);
      next();
    } catch (error) {
      console.error('Error in requireAnyPermission middleware:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        userMessage: 'حدث خطأ في الخادم'
      });
    }
  };
};

/**
 * Middleware to check if user has all of the specified permissions
 */
export const requireAllPermissions = (permissions: (keyof RolePermissions)[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.role;
      
      if (!userRole) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          userMessage: 'يرجى تسجيل الدخول أولاً'
        });
      }

      const rolePermissions = getRolePermissions(userRole);
      const hasAllPermissions = permissions.every(permission => rolePermissions[permission]);

      if (!hasAllPermissions) {
        const missingPermissions = permissions.filter(permission => !rolePermissions[permission]);
        console.log(`🚫 Permission denied: ${req.user?.username} (${userRole}) missing permissions [${missingPermissions.join(', ')}]`);
        
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          userMessage: 'غير مسموح - ليس لديك جميع الصلاحيات المطلوبة',
          requiredPermissions: permissions,
          missingPermissions: missingPermissions,
          userRole: userRole
        });
      }

      console.log(`✅ Permission granted: ${req.user?.username} (${userRole}) has all permissions [${permissions.join(', ')}]`);
      next();
    } catch (error) {
      console.error('Error in requireAllPermissions middleware:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        userMessage: 'حدث خطأ في الخادم'
      });
    }
  };
};

/**
 * Helper function to check permissions programmatically (not middleware)
 */
export const hasPermission = (userRole: UserRole, permission: keyof RolePermissions): boolean => {
  const permissions = getRolePermissions(userRole);
  return permissions[permission];
};

/**
 * Helper function to get all permissions for a role
 */
export const getAllPermissions = (userRole: UserRole): RolePermissions => {
  return getRolePermissions(userRole);
};

/**
 * Middleware to add user permissions to response (for frontend use)
 */
export const addPermissionsToResponse = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user?.role;
    
    if (userRole) {
      const permissions = getRolePermissions(userRole);
      // Add permissions to response locals so they can be included in API responses
      res.locals.userPermissions = permissions;
    }
    
    next();
  } catch (error) {
    console.error('Error in addPermissionsToResponse middleware:', error);
    next(); // Continue even if there's an error
  }
};
