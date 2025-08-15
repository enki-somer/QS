import { Router, Request, Response } from 'express';
import { safeService, CreateSafeTransactionData, EditSafeTransactionData, SafeTransactionFilter, FundingSource } from '../services/safeService';
import { authenticate, requireSafeAccess, requirePaymentAccess } from '../middleware/auth';

const router = Router();

// All safe routes require authentication and safe access
router.use(authenticate);
router.use(requireSafeAccess);

/**
 * GET /api/safe/state
 * Get current safe state (balance, totals) with recent transactions
 */
router.get('/state', async (req: Request, res: Response) => {
  try {
    const [stateResult, transactionsResult] = await Promise.all([
      safeService.getSafeState(),
      safeService.getTransactionHistory({}, 1, 100) // Get recent 100 transactions
    ]);
    
    if (stateResult.success) {
      const responseData = {
        ...stateResult.data,
        transactions: transactionsResult.success ? transactionsResult.data?.data || [] : []
      };
      
      res.json({
        success: true,
        ...responseData
      });
    } else {
      res.status(500).json({
        success: false,
        message: stateResult.error || 'Failed to get safe state'
      });
    }
  } catch (error) {
    console.error('Safe state error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/safe/funding
 * Add funding to the safe
 */
router.post('/funding', requirePaymentAccess, async (req: Request, res: Response) => {
  try {
    const { amount, description, funding_source, funding_notes, project_id, project_name, batch_number } = req.body;
    const userId = (req as any).user?.id;

    // Validate required fields
    if (!amount || !description) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ والوصف مطلوبان'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يجب أن يكون أكبر من الصفر'
      });
    }

    // Special validation for "اخرى" funding source
    if (funding_source === 'اخرى' && !funding_notes?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال وصف لمصدر التمويل عند اختيار "اخرى"'
      });
    }

    const transactionData: CreateSafeTransactionData = {
      type: 'funding',
      amount: parseFloat(amount),
      description,
      date: new Date(),
      funding_source,
      funding_notes,
      project_id,
      project_name,
      batch_number: batch_number ? parseInt(batch_number) : undefined
    };

    // Debug logging
    console.log('🔍 Safe Route DEBUG:', {
      originalAmount: amount,
      parsedAmount: parseFloat(amount),
      amountType: typeof parseFloat(amount),
      transactionData
    });

    const result = await safeService.addFunding(transactionData, userId);

    if (result.success) {
      res.json({
        success: true,
        message: 'تم تمويل الخزينة بنجاح',
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'فشل في تمويل الخزينة'
      });
    }
  } catch (error) {
    console.error('Funding error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * POST /api/safe/deduct/invoice
 * Deduct money for invoice payment
 */
router.post('/deduct/invoice', requirePaymentAccess, async (req: Request, res: Response) => {
  try {
    const { amount, projectId, projectName, invoiceId, invoiceNumber } = req.body;
    const userId = (req as any).user?.id;

    // Validate required fields
    if (!amount || !projectId || !projectName || !invoiceId || !invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: 'جميع بيانات الفاتورة مطلوبة'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يجب أن يكون أكبر من الصفر'
      });
    }

    const result = await safeService.deductForInvoice(
      parseFloat(amount),
      projectId,
      projectName,
      invoiceId,
      invoiceNumber,
      userId
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'تم دفع الفاتورة بنجاح',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'فشل في دفع الفاتورة'
      });
    }
  } catch (error) {
    console.error('Invoice payment error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * POST /api/safe/deduct/salary
 * Deduct money for salary payment
 */
router.post('/deduct/salary', requirePaymentAccess, async (req: Request, res: Response) => {
  try {
    const { amount, employeeId, employeeName } = req.body;
    const userId = (req as any).user?.id;

    // Validate required fields
    if (!amount || !employeeId || !employeeName) {
      return res.status(400).json({
        success: false,
        message: 'جميع بيانات الموظف مطلوبة'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يجب أن يكون أكبر من الصفر'
      });
    }

    const result = await safeService.deductForSalary(
      parseFloat(amount),
      employeeId,
      employeeName,
      userId
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'تم دفع الراتب بنجاح',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'فشل في دفع الراتب'
      });
    }
  } catch (error) {
    console.error('Salary payment error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * POST /api/safe/deduct/expense
 * Deduct money for general expense
 */
router.post('/deduct/expense', requirePaymentAccess, async (req: Request, res: Response) => {
  try {
    const { amount, expenseId, description, category } = req.body;
    const userId = (req as any).user?.id;

    // Validate required fields
    if (!amount || !expenseId || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'جميع بيانات المصروف مطلوبة'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يجب أن يكون أكبر من الصفر'
      });
    }

    const result = await safeService.deductForExpense(
      parseFloat(amount),
      expenseId,
      description,
      category,
      userId
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'تم دفع المصروف بنجاح',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'فشل في دفع المصروف'
      });
    }
  } catch (error) {
    console.error('Expense payment error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * GET /api/safe/transactions
 * Get transaction history with optional filtering and pagination
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const {
      type,
      date_from,
      date_to,
      project_id,
      employee_id,
      expense_id,
      page = '1',
      limit = '50'
    } = req.query;

    // Build filter object
    const filter: SafeTransactionFilter = {};
    if (type) filter.type = type as any;
    if (date_from) filter.date_from = new Date(date_from as string);
    if (date_to) filter.date_to = new Date(date_to as string);
    if (project_id) filter.project_id = project_id as string;
    if (employee_id) filter.employee_id = employee_id as string;
    if (expense_id) filter.expense_id = expense_id as string;

    const result = await safeService.getTransactionHistory(
      filter,
      parseInt(page as string),
      parseInt(limit as string)
    );

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'فشل في جلب سجل المعاملات'
      });
    }
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * GET /api/safe/balance-check/:amount
 * Check if safe has sufficient balance
 */
router.get('/balance-check/:amount', async (req: Request, res: Response) => {
  try {
    const { amount } = req.params;

    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({
        success: false,
        message: 'مبلغ غير صحيح'
      });
    }

    const result = await safeService.hasBalance(parseFloat(amount));

    if (result.success) {
      res.json({
        success: true,
        data: {
          hasBalance: result.data,
          message: result.data ? 'الرصيد كافي' : 'الرصيد غير كافي'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'فشل في فحص الرصيد'
      });
    }
  } catch (error) {
    console.error('Balance check error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * GET /api/safe/summary
 * Get safe summary statistics
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const result = await safeService.getSafeSummary();

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'فشل في جلب ملخص الخزينة'
      });
    }
  } catch (error) {
    console.error('Safe summary error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * GET /api/safe/transactions/:id
 * Get a specific transaction by ID (for editing)
 */
router.get('/transactions/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user?.role;

    // Only admins can access individual transactions for editing
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مسموح - يتطلب صلاحيات المدير'
      });
    }

    const result = await safeService.getTransactionById(id);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.error || 'المعاملة غير موجودة'
      });
    }
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * PUT /api/safe/transactions/:id
 * Edit a safe transaction (admin only)
 */
router.put('/transactions/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, description, funding_source, funding_notes, edit_reason } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // Only admins can edit transactions
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مسموح - يتطلب صلاحيات المدير'
      });
    }

    // Validate edit reason is provided
    if (!edit_reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'سبب التعديل مطلوب'
      });
    }

    // Validate amount if provided
    if (amount !== undefined && (isNaN(amount) || amount <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'المبلغ يجب أن يكون رقماً موجباً'
      });
    }

    const editData: EditSafeTransactionData = {
      edit_reason: edit_reason.trim()
    };

    // Add optional fields if provided
    if (amount !== undefined) editData.amount = parseFloat(amount);
    if (description?.trim()) editData.description = description.trim();
    if (funding_source?.trim()) editData.funding_source = funding_source.trim();
    if (funding_notes?.trim()) editData.funding_notes = funding_notes.trim();

    const result = await safeService.editTransaction(id, editData, userId);

    if (result.success) {
      res.json({
        success: true,
        message: 'تم تعديل المعاملة بنجاح',
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'فشل في تعديل المعاملة'
      });
    }
  } catch (error) {
    console.error('Edit transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * GET /api/safe/funding-sources
 * Get available funding sources including dynamic project sources
 */
router.get('/funding-sources', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await safeService.getFundingSources();

    if (result.success) {
      res.json({
        success: true,
        fundingSources: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'فشل في جلب مصادر التمويل'
      });
    }
  } catch (error) {
    console.error('Funding sources error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

export default router; 