import { Router, Request, Response } from 'express';
import { userService } from '../services/userService';
import { authenticate, requireAdmin } from '../middleware/auth';
import { LoginRequest, ROLE_PERMISSIONS } from '../types';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const loginRequest: LoginRequest = req.body;
    
    // Validate input
    if (!loginRequest.username || !loginRequest.password) {
      return res.status(400).json({
        success: false,
        message: 'يجب توفير اسم المستخدم وكلمة المرور',
      });
    }

    const result = await userService.login(loginRequest);
    
    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Login route error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
    });
  }
});

// GET /api/auth/profile
router.get('/profile', authenticate, (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'لم يتم العثور على بيانات المستخدم',
      });
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role];

    res.json({
      success: true,
      user: req.user,
      permissions: userPermissions,
    });
  } catch (error) {
    console.error('Profile route error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
    });
  }
});

// POST /api/auth/verify
router.post('/verify', authenticate, (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      user: req.user,
      message: 'الرمز صالح',
    });
  } catch (error) {
    console.error('Verify route error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
    });
  }
});

// GET /api/auth/users (Admin only)
router.get('/users', authenticate, requireAdmin, (req: Request, res: Response) => {
  try {
    const users = userService.getAllUsers();
    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Users route error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
    });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req: Request, res: Response) => {
  try {
    // In a stateful system, you would invalidate the token here
    // Since we're using JWT, we'll just return success
    // The frontend should remove the token from storage
    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح',
    });
  } catch (error) {
    console.error('Logout route error:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
    });
  }
});

export default router; 