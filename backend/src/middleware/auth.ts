import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { AuthenticatedUser, UserRole, ROLE_PERMISSIONS } from '../types';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: 'لم يتم توفير رمز التفويض',
      });
      return;
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'تنسيق رمز التفويض غير صحيح',
      });
      return;
    }

    const user = userService.verifyToken(token);
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'رمز التفويض غير صالح أو منتهي الصلاحية',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء التحقق من الهوية',
    });
  }
};

// Role-based middleware
export const requireRole = (roles: UserRole | UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'يجب تسجيل الدخول أولاً',
      });
      return;
    }

    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!requiredRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للوصول لهذا المورد',
      });
      return;
    }

    next();
  };
};

// Permission-based middleware
export const requirePermission = (permission: keyof typeof ROLE_PERMISSIONS.admin) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'يجب تسجيل الدخول أولاً',
      });
      return;
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role as UserRole];
    
    if (!userPermissions[permission]) {
      res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لتنفيذ هذا الإجراء',
      });
      return;
    }

    next();
  };
};

// Admin only middleware
export const requireAdmin = requireRole('admin');

// Middleware to check if user can view SAFE
export const requireSafeAccess = requirePermission('canViewSafe');

// Middleware to check if user can make payments
export const requirePaymentAccess = requirePermission('canMakePayments');

// Middleware to check if user can delete records
export const requireDeleteAccess = requirePermission('canDeleteRecords'); 