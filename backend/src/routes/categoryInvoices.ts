import express from 'express';
import CategoryInvoiceService, { CategoryInvoiceData } from '../../database/services/categoryInvoiceService';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

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

    console.log('🔍 DEBUG: Calling CategoryInvoiceService.createCategoryInvoice...');
    const invoice = await CategoryInvoiceService.createCategoryInvoice(invoiceData, userId);
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

    const invoices = await CategoryInvoiceService.getCategoryInvoices(assignmentId);

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

    const invoices = await CategoryInvoiceService.getInvoicesByProjectAndCategory(projectId, categoryName);

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

    const counts = await CategoryInvoiceService.getInvoiceCountsByProject(projectId);

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

    const statusData = await CategoryInvoiceService.getProjectCategoryInvoiceStatus(projectId);

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
 * GET /api/category-invoices/assignment/:assignmentId/can-edit
 * Check if a category assignment can be edited (financial protection)
 */
router.get('/assignment/:assignmentId/can-edit', async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const canEdit = await CategoryInvoiceService.canEditCategoryAssignment(assignmentId);

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

    await CategoryInvoiceService.approveCategoryInvoice(invoiceId, userId);

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

export default router;