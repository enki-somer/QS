import express, { Request, Response } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import EmployeeService from '../../database/services/employeeService';
import { getPool } from '../../database/config';

const router = express.Router();
const employeeService = new EmployeeService(getPool());

// Middleware to require authentication for all employee routes
router.use(authenticate);

/**
 * GET /api/employees
 * Get all employees with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, position, search } = req.query;
    
    const filter = {
      status: status as string,
      position: position as string,
      search: search as string
    };

    const result = await employeeService.getEmployees(filter);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'فشل في جلب بيانات الموظفين'
      });
    }
  } catch (error) {
    console.error('Error in GET /employees:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * GET /api/employees/positions
 * Get all available positions
 */
router.get('/positions', async (req: Request, res: Response) => {
  try {
    const result = await employeeService.getPositions();

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'فشل في جلب المناصب'
      });
    }
  } catch (error) {
    console.error('Error in GET /employees/positions:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * GET /api/employees/projects
 * Get all available projects for dropdown (view-only reference)
 */
router.get('/projects', async (req: Request, res: Response) => {
  try {
    console.log('🏗️ GET /employees/projects endpoint called');
    const result = await employeeService.getProjects();
    console.log('📊 Projects service result:', result);

    if (result.success) {
      console.log('✅ Returning', result.data?.length || 0, 'projects');
      res.json({
        success: true,
        data: result.data
      });
    } else {
      console.error('❌ Projects service failed:', result.error);
      res.status(500).json({
        success: false,
        message: result.error || 'فشل في جلب المشاريع'
      });
    }
  } catch (error) {
    console.error('❌ Error in GET /employees/projects:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * GET /api/employees/due-payments
 * Get employees due for payment
 */
router.get('/due-payments', requirePermission('canManageEmployees'), async (req: Request, res: Response) => {
  try {
    const result = await employeeService.getEmployeesDueForPayment();

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'فشل في جلب الموظفين المستحقين للراتب'
      });
    }
  } catch (error) {
    console.error('Error in GET /employees/due-payments:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * GET /api/employees/:id
 * Get employee by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await employeeService.getEmployeeById(id);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.error || 'الموظف غير موجود'
      });
    }
  } catch (error) {
    console.error('Error in GET /employees/:id:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * POST /api/employees
 * Create new employee
 */
router.post('/', requirePermission('canManageEmployees'), async (req: Request, res: Response) => {
  try {
    const employeeData = req.body;
    const userId = (req as any).user?.id;

    // Add created_by field
    employeeData.created_by = userId;

    // Validate required fields
    if (!employeeData.name) {
      return res.status(400).json({
        success: false,
        message: 'اسم الموظف مطلوب'
      });
    }

    const result = await employeeService.createEmployee(employeeData);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'تم إضافة الموظف بنجاح',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'فشل في إضافة الموظف'
      });
    }
  } catch (error) {
    console.error('Error in POST /employees:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * PUT /api/employees/:id
 * Update employee
 */
router.put('/:id', requirePermission('canManageEmployees'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const result = await employeeService.updateEmployee(id, updateData);

    if (result.success) {
      res.json({
        success: true,
        message: 'تم تحديث بيانات الموظف بنجاح',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'فشل في تحديث بيانات الموظف'
      });
    }
  } catch (error) {
    console.error('Error in PUT /employees/:id:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * DELETE /api/employees/:id
 * Delete employee (admin only)
 */
router.delete('/:id', requirePermission('canManageEmployees'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user?.role;

    // Only admin can delete employees
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مسموح - المدير فقط يمكنه حذف الموظفين'
      });
    }

    const result = await employeeService.deleteEmployee(id);

    if (result.success) {
      res.json({
        success: true,
        message: 'تم حذف الموظف بنجاح'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'فشل في حذف الموظف'
      });
    }
  } catch (error) {
    console.error('Error in DELETE /employees/:id:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * POST /api/employees/:id/pay-salary
 * Process salary payment
 */
router.post('/:id/pay-salary', requirePermission('canManageEmployees'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, payment_type, installment_amount, reason, is_full_payment } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // Only admin can process salary payments
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مسموح - المدير فقط يمكنه دفع الرواتب'
      });
    }

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'مبلغ الراتب مطلوب ويجب أن يكون أكبر من الصفر'
      });
    }

    if (!payment_type || !['full', 'installment'].includes(payment_type)) {
      return res.status(400).json({
        success: false,
        message: 'نوع الدفع مطلوب ويجب أن يكون "full" أو "installment"'
      });
    }

    if (typeof is_full_payment !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'حالة اكتمال الدفع مطلوبة'
      });
    }

    const paymentData = {
      amount: parseFloat(amount),
      payment_type,
      installment_amount: installment_amount ? parseFloat(installment_amount) : undefined,
      reason,
      is_full_payment
    };

    const result = await employeeService.processSalaryPayment(id, paymentData);

    if (result.success) {
      res.json({
        success: true,
        message: `تم دفع ${payment_type === 'full' ? 'الراتب كاملاً' : 'قسط من الراتب'} لـ ${result.data.employee} بنجاح`,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'فشل في دفع الراتب'
      });
    }
  } catch (error) {
    console.error('Error in POST /employees/:id/pay-salary:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * GET /api/employees/:id/payment-history
 * Get employee payment history
 */
router.get('/:id/payment-history', requirePermission('canManageEmployees'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await employeeService.getEmployeePaymentHistory(id);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'فشل في جلب تاريخ المدفوعات'
      });
    }
  } catch (error) {
    console.error('Error in GET /employees/:id/payment-history:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * GET /api/employees/:id/remaining-salary
 * Calculate remaining salary for employee for current month
 */
router.get('/:id/remaining-salary', requirePermission('canManageEmployees'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await employeeService.calculateRemainingSalary(id);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'فشل في حساب الراتب المتبقي'
      });
    }
  } catch (error) {
    console.error('Error in GET /employees/:id/remaining-salary:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

export default router;
