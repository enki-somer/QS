import express, { Request, Response } from 'express';
import categoryInvoiceService, { CategoryInvoiceData } from '../../database/services/categoryInvoiceService';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/category-invoices/check-duplicate
 * Check for duplicate customer invoice numbers
 */
router.get('/check-duplicate', async (req, res) => {
  try {
    const { customerInvoiceNumber } = req.query;
    
    if (!customerInvoiceNumber || typeof customerInvoiceNumber !== 'string') {
      return res.status(400).json({ 
        error: 'Customer invoice number is required' 
      });
    }

    // Check if customer invoice number already exists
    const duplicate = await categoryInvoiceService.checkDuplicateCustomerInvoiceNumber(customerInvoiceNumber.trim());
    
    if (duplicate) {
      return res.json({
        isDuplicate: true,
        projectName: duplicate.project_name,
        projectCode: duplicate.project_code,
        contractorName: duplicate.contractor_name,
        invoiceNumber: duplicate.invoice_number,
        status: duplicate.status,
        createdAt: duplicate.created_at
      });
    } else {
      return res.json({
        isDuplicate: false
      });
    }
    
  } catch (error) {
    console.error('Error checking duplicate customer invoice number:', error);
    if (error instanceof Error) {
      res.status(500).json({ 
        error: 'Internal server error while checking duplicate invoice number',
        details: error.message
      });
    } else {
      res.status(500).json({ 
        error: 'Internal server error while checking duplicate invoice number',
        details: String(error)
      });
    }
  }
});



/**
 * POST /api/category-invoices
 * Create a new category-specific invoice
 */
router.post('/', async (req, res) => {
  try {
    const invoiceData: CategoryInvoiceData = req.body;
    const user = (req as any).user; // Get full user object
    const userId = user?.id; // Get user ID from authenticated user

    console.log('🔍 DEBUG: Received invoice data:', JSON.stringify(invoiceData, null, 2));
    console.log('🔍 DEBUG: Authenticated user:', JSON.stringify(user, null, 2));
    console.log('🔍 DEBUG: User ID:', userId);
    console.log('🔍 DEBUG: User role:', user?.role);

    // Check if user is authenticated
    if (!user || !userId) {
      console.log('❌ DEBUG: User not authenticated properly');
      return res.status(401).json({
        error: 'User not authenticated',
        debug: { hasUser: !!user, hasUserId: !!userId }
      });
    }

    // Validate required fields
    if (!invoiceData.projectId || !invoiceData.categoryAssignmentId || !invoiceData.amount) {
      console.log('❌ DEBUG: Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields: projectId, categoryAssignmentId, amount'
      });
    }

    if (invoiceData.amount <= 0) {
      return res.status(400).json({
        error: 'Invoice amount must be greater than zero'
      });
    }

    console.log('🔍 DEBUG: Calling categoryInvoiceService.createCategoryInvoice...');
    const invoice = await categoryInvoiceService.createCategoryInvoice(invoiceData, userId);
    console.log('✅ DEBUG: Invoice created successfully:', invoice);

    res.status(201).json({
      success: true,
      message: 'Category invoice created successfully',
      invoice
    });

  } catch (error: any) {
    console.error('❌ DEBUG: Error creating category invoice:', error);
    console.error('❌ DEBUG: Error message:', error.message);
    console.error('❌ DEBUG: Error stack:', error.stack);
    
    if (error.message && error.message.includes('Category assignment not found')) {
      return res.status(404).json({ error: 'Category assignment not found' });
    }
    
    if (error.message && error.message.includes('existing approved invoices')) {
      return res.status(409).json({ 
        error: 'Cannot create invoice for category with existing approved invoices'
      });
    }
    
    if (error.constraint === 'invoices_invoice_number_key') {
      return res.status(409).json({ 
        error: 'Invoice number already exists. Please try again.',
        userMessage: 'رقم الفاتورة موجود مسبقاً. يرجى المحاولة مرة أخرى.'
      });
    }
    
    // Handle duplicate customer invoice number constraint
    if (error.code === '23505' && error.constraint === 'idx_invoices_customer_number_unique') {
      return res.status(400).json({
        error: 'DUPLICATE_CUSTOMER_INVOICE',
        message: 'رقم فاتورة العميل مستخدم مسبقاً',
        userMessage: 'رقم فاتورة العميل مستخدم مسبقاً. يرجى استخدام رقم مختلف أو ترك الحقل فارغاً.',
        details: 'Customer invoice number already exists in the system',
        customerInvoiceNumber: error.detail?.match(/\(([^)]+)\)/)?.[1] || 'unknown'
      });
    }

    // Return more detailed error for debugging
    res.status(500).json({
      error: 'Failed to create category invoice',
      details: error.message,
      debug: true
    });
  }
});

/**
 * GET /api/category-invoices/assignment/:assignmentId
 * Get all invoices for a specific category assignment
 */
router.get('/assignment/:assignmentId', async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const invoices = await categoryInvoiceService.getCategoryInvoices(assignmentId);

    res.json({
      success: true,
      invoices
    });

  } catch (error: any) {
    console.error('Error fetching category invoices:', error);
    res.status(500).json({
      error: 'Failed to fetch category invoices'
    });
  }
});

/**
 * GET /api/category-invoices/project/:projectId/category/:categoryName
 * Get all invoices for a specific project and category
 */
router.get('/project/:projectId/category/:categoryName', async (req, res) => {
  try {
    const { projectId, categoryName } = req.params;

    console.log('🔍 DEBUG: Fetching invoices for project:', projectId, 'category:', categoryName);

    const invoices = await categoryInvoiceService.getInvoicesByProjectAndCategory(projectId, categoryName);

    res.json(invoices);

  } catch (error: any) {
    console.error('Error fetching project category invoices:', error);
    res.status(500).json({
      error: 'Failed to fetch project category invoices',
      details: error.message
    });
  }
});

/**
 * GET /api/category-invoices/project/:projectId/counts
 * Get invoice counts for all categories in a project
 */
router.get('/project/:projectId/counts', async (req, res) => {
  try {
    const { projectId } = req.params;

    console.log('🔍 DEBUG: Fetching invoice counts for project:', projectId);

    const counts = await categoryInvoiceService.getInvoiceCountsByProject(projectId);

    res.json(counts);

  } catch (error: any) {
    console.error('Error fetching invoice counts:', error);
    res.status(500).json({
      error: 'Failed to fetch invoice counts',
      details: error.message
    });
  }
});

/**
 * GET /api/category-invoices/project/:projectId/status
 * Get invoice status for all category assignments in a project
 */
router.get('/project/:projectId/status', async (req, res) => {
  try {
    const { projectId } = req.params;

    const statusData = await categoryInvoiceService.getProjectCategoryInvoiceStatus(projectId);

    res.json({
      success: true,
      categoryStatus: statusData
    });

  } catch (error: any) {
    console.error('Error fetching project category invoice status:', error);
    res.status(500).json({
      error: 'Failed to fetch category invoice status'
    });
  }
});

/**
 * GET /api/category-invoices/pending
 * Get all pending category invoices across all projects (for approval modal)
 */
router.get('/pending', async (req, res) => {
  try {
    const pendingInvoices = await categoryInvoiceService.getAllPendingCategoryInvoices();

    res.json({
      success: true,
      invoices: pendingInvoices
    });

  } catch (error: any) {
    console.error('Error fetching pending category invoices:', error);
    res.status(500).json({
      error: 'Failed to fetch pending category invoices',
      details: error.message
    });
  }
});

/**
 * GET /api/category-invoices/pending-count
 * Get count of pending category invoices (for notification badge)
 */
router.get('/pending-count', async (req, res) => {
  try {
    const pendingInvoices = await categoryInvoiceService.getAllPendingCategoryInvoices();

    res.json({
      success: true,
      count: pendingInvoices.length
    });

  } catch (error: any) {
    console.error('Error fetching pending category invoices count:', error);
    res.status(500).json({
      error: 'Failed to fetch pending category invoices count',
      details: error.message
    });
  }
});

/**
 * GET /api/category-invoices/assignment/:assignmentId/can-edit
 * Check if a category assignment can be edited (financial protection)
 */
router.get('/assignment/:assignmentId/can-edit', async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const canEdit = await categoryInvoiceService.canEditCategoryAssignment(assignmentId);

    res.json({
      success: true,
      canEdit,
      message: canEdit ? 'Category can be edited' : 'Category is locked due to approved invoices'
    });

  } catch (error: any) {
    console.error('Error checking edit permission:', error);
    
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Category assignment not found' });
    }

    res.status(500).json({
      error: 'Failed to check edit permission'
    });
  }
});

/**
 * POST /api/category-invoices/:invoiceId/approve
 * Approve a category invoice (admin only)
 */
router.post('/:invoiceId/approve', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // Check if user has admin permissions
    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Only administrators can approve invoices'
      });
    }

    await categoryInvoiceService.approveCategoryInvoice(invoiceId, userId);

    res.json({
      success: true,
      message: 'Invoice approved successfully. Category assignment is now locked for editing.'
    });

  } catch (error: any) {
    console.error('Error approving invoice:', error);
    
    if (error.message && (error.message.includes('not found') || error.message.includes('not in pending'))) {
      return res.status(404).json({ 
        error: 'Invoice not found or not in pending approval status' 
      });
    }

    res.status(500).json({
      error: 'Failed to approve invoice'
    });
  }
});

/**
 * POST /api/category-invoices/:invoiceId/reject
 * Reject a category invoice (admin only)
 */
router.post('/:invoiceId/reject', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { rejectionReason } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // Check if user has admin permissions
    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Only administrators can reject invoices'
      });
    }

    await categoryInvoiceService.rejectCategoryInvoice(invoiceId, userId, rejectionReason);

    res.json({
      success: true,
      message: 'Invoice rejected successfully.'
    });

  } catch (error: any) {
    console.error('Error rejecting invoice:', error);
    
    if (error.message && (error.message.includes('not found') || error.message.includes('not in pending'))) {
      return res.status(404).json({ 
        error: 'Invoice not found or not in pending approval status' 
      });
    }

    res.status(500).json({
      error: 'Failed to reject invoice'
    });
  }
});

export default router;