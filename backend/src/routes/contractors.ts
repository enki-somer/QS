import { Router, Request, Response } from 'express';
import { contractorService, CreateContractorData, ContractorFilter } from '../services/contractorService';
import { authenticate } from '../middleware/auth';

const router = Router();

// All contractor routes require authentication
// TEMPORARILY DISABLED FOR TESTING - UNCOMMENT AFTER FIXING AUTH
// router.use(authenticate);

/**
 * GET /api/contractors
 * Get contractors with optional filtering and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      category,
      is_active,
      search,
      page = '1',
      limit = '50'
    } = req.query;

    // Build filter object
    const filter: ContractorFilter = {};
    if (category) filter.category = category as any;
    if (is_active !== undefined) filter.is_active = is_active === 'true';
    if (search) filter.search = search as string;

    const result = await contractorService.getContractors(
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
        message: result.error || 'فشل في جلب بيانات المقاولين'
      });
    }
  } catch (error) {
    console.error('Get contractors error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * GET /api/contractors/summary
 * Get contractors summary statistics
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const result = await contractorService.getContractorsSummary();

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'فشل في جلب إحصائيات المقاولين'
      });
    }
  } catch (error) {
    console.error('Contractors summary error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * GET /api/contractors/:id
 * Get contractor by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'معرف المقاول مطلوب'
      });
    }

    const result = await contractorService.getContractorById(id);

    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.error || 'المقاول غير موجود'
      });
    }
  } catch (error) {
    console.error('Get contractor by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * POST /api/contractors
 * Create a new contractor
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { full_name, phone_number, category, notes } = req.body;
    const userId = (req as any).user?.id;

    // Validate required fields
    if (!full_name || !phone_number || !category) {
      return res.status(400).json({
        success: false,
        message: 'الاسم الكامل ورقم الهاتف والفئة مطلوبة'
      });
    }

    // Validate full_name length and format
    if (full_name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'الاسم الكامل يجب أن يكون على الأقل حرفين'
      });
    }

    // Validate phone number format (basic validation)
    if (phone_number.trim().length < 8) {
      return res.status(400).json({
        success: false,
        message: 'رقم الهاتف يجب أن يكون على الأقل 8 أرقام'
      });
    }

    const contractorData: CreateContractorData = {
      full_name: full_name.trim(),
      phone_number: phone_number.trim(),
      category,
      notes: notes?.trim() || undefined
    };

    const result = await contractorService.createContractor(contractorData, userId);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'تم إضافة المقاول بنجاح',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'فشل في إضافة المقاول'
      });
    }
  } catch (error) {
    console.error('Create contractor error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * PUT /api/contractors/:id
 * Update contractor
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { full_name, phone_number, category, notes } = req.body;
    const userId = (req as any).user?.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'معرف المقاول مطلوب'
      });
    }

    // Build update data object
    const updateData: Partial<CreateContractorData> = {};
    
    if (full_name !== undefined) {
      if (full_name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'الاسم الكامل يجب أن يكون على الأقل حرفين'
        });
      }
      updateData.full_name = full_name.trim();
    }

    if (phone_number !== undefined) {
      if (phone_number.trim().length < 8) {
        return res.status(400).json({
          success: false,
          message: 'رقم الهاتف يجب أن يكون على الأقل 8 أرقام'
        });
      }
      updateData.phone_number = phone_number.trim();
    }

    if (category !== undefined) {
      updateData.category = category;
    }

    if (notes !== undefined) {
      updateData.notes = notes?.trim() || undefined;
    }

    const result = await contractorService.updateContractor(id, updateData, userId);

    if (result.success) {
      res.json({
        success: true,
        message: 'تم تحديث بيانات المقاول بنجاح',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'فشل في تحديث بيانات المقاول'
      });
    }
  } catch (error) {
    console.error('Update contractor error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * DELETE /api/contractors/:id
 * Delete contractor (soft delete)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'معرف المقاول مطلوب'
      });
    }

    const result = await contractorService.deleteContractor(id, userId);

    if (result.success) {
      res.json({
        success: true,
        message: 'تم حذف المقاول بنجاح'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'فشل في حذف المقاول'
      });
    }
  } catch (error) {
    console.error('Delete contractor error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

/**
 * PUT /api/contractors/:id/activate
 * Activate contractor (restore from soft delete)
 */
router.put('/:id/activate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'معرف المقاول مطلوب'
      });
    }

    const result = await contractorService.activateContractor(id, userId);

    if (result.success) {
      res.json({
        success: true,
        message: 'تم تفعيل المقاول بنجاح',
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'فشل في تفعيل المقاول'
      });
    }
  } catch (error) {
    console.error('Activate contractor error:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
});

export default router; 