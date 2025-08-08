import express from 'express';
import { generalExpenseService } from '../../database/services/generalExpenseService';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * POST /api/general-expenses
 * Create a new general expense
 */
router.post('/', async (req, res) => {
  try {
    console.log('POST /api/general-expenses - Request body:', req.body);

    const { project_id, expense_name, category, cost, details, expense_date, receipt_url } = req.body;

    // Validation
    if (!project_id || !expense_name || !category || cost === undefined || cost === null) {
      return res.status(400).json({
        error: 'Missing required fields',
        userMessage: 'يرجى تعبئة جميع الحقول المطلوبة',
        required: ['project_id', 'expense_name', 'category', 'cost']
      });
    }

    if (cost < 0) {
      return res.status(400).json({
        error: 'Cost cannot be negative',
        userMessage: 'لا يمكن أن يكون المبلغ سالباً'
      });
    }

    // Get user from auth middleware
    const userId = (req as any).user?.id;

    const expenseData = {
      project_id,
      expense_name: expense_name.trim(),
      category: category.trim(),
      cost: parseFloat(cost),
      details: details?.trim() || undefined,
      expense_date: expense_date || new Date().toISOString().split('T')[0],
      receipt_url: receipt_url?.trim() || undefined,
      submitted_by: userId
    };

    const expense = await generalExpenseService.createGeneralExpense(expenseData);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المصروف بنجاح',
      expense
    });

  } catch (error: any) {
    console.error('Error creating general expense:', error);

    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({
        error: 'Invalid project ID',
        userMessage: 'معرف المشروع غير صحيح'
      });
    }

    res.status(500).json({
      error: 'Failed to create general expense',
      userMessage: 'فشل في إنشاء المصروف',
      details: error.message
    });
  }
});

/**
 * GET /api/general-expenses/project/:projectId
 * Get all general expenses for a project
 */
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log('GET /api/general-expenses/project/:projectId - Project ID:', projectId);

    if (!projectId) {
      return res.status(400).json({
        error: 'Project ID is required',
        userMessage: 'معرف المشروع مطلوب'
      });
    }

    const expenses = await generalExpenseService.getGeneralExpensesByProject(projectId);

    res.json({
      success: true,
      expenses,
      count: expenses.length
    });

  } catch (error: any) {
    console.error('Error fetching general expenses:', error);
    res.status(500).json({
      error: 'Failed to fetch general expenses',
      userMessage: 'فشل في جلب المصروفات',
      details: error.message
    });
  }
});

/**
 * GET /api/general-expenses/pending-count
 * Get count of all pending project expenses (for notifications)
 */
router.get('/pending-count', async (req, res) => {
  try {
    console.log('GET /api/general-expenses/pending-count - Getting pending count');

    const count = await generalExpenseService.getPendingExpensesCount();

    res.json({
      success: true,
      count
    });

  } catch (error: any) {
    console.error('Error fetching pending expenses count:', error);
    res.status(500).json({
      error: 'Failed to fetch pending count',
      userMessage: 'فشل في جلب عدد المصروفات المعلقة',
      details: error.message
    });
  }
});

/**
 * GET /api/general-expenses/pending
 * Get all pending project expenses (for approval modal)
 */
router.get('/pending', async (req, res) => {
  try {
    console.log('GET /api/general-expenses/pending - Getting all pending expenses');

    const expenses = await generalExpenseService.getAllPendingExpenses();

    res.json({
      success: true,
      expenses,
      count: expenses.length
    });

  } catch (error: any) {
    console.error('Error fetching pending expenses:', error);
    res.status(500).json({
      error: 'Failed to fetch pending expenses',
      userMessage: 'فشل في جلب المصروفات المعلقة',
      details: error.message
    });
  }
});

/**
 * GET /api/general-expenses/:expenseId
 * Get a single general expense by ID
 */
router.get('/:expenseId', async (req, res) => {
  try {
    const { expenseId } = req.params;
    console.log('GET /api/general-expenses/:expenseId - Expense ID:', expenseId);

    const expense = await generalExpenseService.getGeneralExpenseById(expenseId);

    if (!expense) {
      return res.status(404).json({
        error: 'General expense not found',
        userMessage: 'المصروف غير موجود'
      });
    }

    res.json({
      success: true,
      expense
    });

  } catch (error: any) {
    console.error('Error fetching general expense:', error);
    res.status(500).json({
      error: 'Failed to fetch general expense',
      userMessage: 'فشل في جلب المصروف',
      details: error.message
    });
  }
});

/**
 * PUT /api/general-expenses/:expenseId
 * Update a general expense
 */
router.put('/:expenseId', async (req, res) => {
  try {
    const { expenseId } = req.params;
    const updateData = req.body;
    console.log('PUT /api/general-expenses/:expenseId - Expense ID:', expenseId, 'Data:', updateData);

    // Validation for cost if provided
    if (updateData.cost !== undefined && updateData.cost < 0) {
      return res.status(400).json({
        error: 'Cost cannot be negative',
        userMessage: 'لا يمكن أن يكون المبلغ سالباً'
      });
    }

    // If updating status to approved, add approved_by
    if (updateData.status === 'approved') {
      updateData.approved_by = (req as any).user?.id;
    }

    const expense = await generalExpenseService.updateGeneralExpense(expenseId, updateData);

    res.json({
      success: true,
      message: 'تم تحديث المصروف بنجاح',
      expense
    });

  } catch (error: any) {
    console.error('Error updating general expense:', error);

    if (error.message === 'General expense not found') {
      return res.status(404).json({
        error: 'General expense not found',
        userMessage: 'المصروف غير موجود'
      });
    }

    res.status(500).json({
      error: 'Failed to update general expense',
      userMessage: 'فشل في تحديث المصروف',
      details: error.message
    });
  }
});

/**
 * DELETE /api/general-expenses/:expenseId
 * Delete a general expense
 */
router.delete('/:expenseId', async (req, res) => {
  try {
    const { expenseId } = req.params;
    console.log('DELETE /api/general-expenses/:expenseId - Expense ID:', expenseId);

    const deleted = await generalExpenseService.deleteGeneralExpense(expenseId);

    if (!deleted) {
      return res.status(404).json({
        error: 'General expense not found',
        userMessage: 'المصروف غير موجود'
      });
    }

    res.json({
      success: true,
      message: 'تم حذف المصروف بنجاح'
    });

  } catch (error: any) {
    console.error('Error deleting general expense:', error);
    res.status(500).json({
      error: 'Failed to delete general expense',
      userMessage: 'فشل في حذف المصروف',
      details: error.message
    });
  }
});

/**
 * GET /api/general-expenses/project/:projectId/summary
 * Get expense summary for a project
 */
router.get('/project/:projectId/summary', async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log('GET /api/general-expenses/project/:projectId/summary - Project ID:', projectId);

    const summary = await generalExpenseService.getExpenseSummaryByProject(projectId);

    res.json({
      success: true,
      summary
    });

  } catch (error: any) {
    console.error('Error fetching expense summary:', error);
    res.status(500).json({
      error: 'Failed to fetch expense summary',
      userMessage: 'فشل في جلب ملخص المصروفات',
      details: error.message
    });
  }
});

/**
 * POST /api/general-expenses/:expenseId/approve
 * Approve a general expense
 */
router.post('/:expenseId/approve', async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = (req as any).user?.id;
    console.log('POST /api/general-expenses/:expenseId/approve - Expense ID:', expenseId, 'User:', userId);

    const expense = await generalExpenseService.approveGeneralExpense(expenseId, userId);

    res.json({
      success: true,
      message: 'تم اعتماد المصروف بنجاح',
      expense
    });

  } catch (error: any) {
    console.error('Error approving general expense:', error);

    if (error.message === 'General expense not found') {
      return res.status(404).json({
        error: 'General expense not found',
        userMessage: 'المصروف غير موجود'
      });
    }

    res.status(500).json({
      error: 'Failed to approve general expense',
      userMessage: 'فشل في اعتماد المصروف',
      details: error.message
    });
  }
});

/**
 * POST /api/general-expenses/:expenseId/reject
 * Reject a general expense
 */
router.post('/:expenseId/reject', async (req, res) => {
  try {
    const { expenseId } = req.params;
    console.log('POST /api/general-expenses/:expenseId/reject - Expense ID:', expenseId);

    const expense = await generalExpenseService.rejectGeneralExpense(expenseId);

    res.json({
      success: true,
      message: 'تم رفض المصروف',
      expense
    });

  } catch (error: any) {
    console.error('Error rejecting general expense:', error);

    if (error.message === 'General expense not found') {
      return res.status(404).json({
        error: 'General expense not found',
        userMessage: 'المصروف غير موجود'
      });
    }

    res.status(500).json({
      error: 'Failed to reject general expense',
      userMessage: 'فشل في رفض المصروف',
      details: error.message
    });
  }
});

export default router;