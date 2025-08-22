import express from 'express';
import { projectService, CreateProjectData } from '../../database/services/projectService';
import { authenticate, requirePermission } from '../middleware/auth';

const router = express.Router();

// Health check for projects API
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Projects API is working',
    timestamp: new Date().toISOString()
  });
});

// Generate unique project code
router.get('/generate-code', authenticate, async (req, res) => {
  try {
    const code = await projectService.generateProjectCode();
    res.json({ code });
  } catch (error) {
    console.error('Error generating project code:', error);
    res.status(500).json({ 
      error: 'Failed to generate project code',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all projects
router.get('/', authenticate, async (req, res) => {
  try {
    const projects = await projectService.getAllProjects();
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ 
      error: 'Failed to fetch projects',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get single project by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const project = await projectService.getProjectById(id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ 
      error: 'Failed to fetch project',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new project with category assignments
router.post('/', authenticate, requirePermission('canManageProjects'), async (req, res) => {
  try {
    console.log('POST /api/projects - Request body:', req.body);
    
    const {
      name,
      location,
      area,
      budgetEstimate,
      client,
      startDate,
      endDate,
      status,
      categoryAssignments,
      // NEW FINANCIAL FIELDS
      pricePerMeter,
      realCostPerMeter,
      ownerDealPrice,
      ownerPaidAmount,
      totalSiteArea
    } = req.body;

    // Validate required fields
    if (!name || !budgetEstimate || !client || !startDate) {
      console.log('Validation failed - missing required fields:', {
        name: !!name,
        budgetEstimate: !!budgetEstimate,
        client: !!client,
        startDate: !!startDate
      });
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'budgetEstimate', 'client', 'startDate'],
        received: { name, budgetEstimate, client, startDate }
      });
    }

    // Generate project code
    const code = await projectService.generateProjectCode();

    // Prepare category assignments data
    const preparedCategoryAssignments = [];
    if (categoryAssignments && Array.isArray(categoryAssignments)) {
      for (const assignment of categoryAssignments) {
        // Each assignment now contains multiple contractors
        if (assignment.contractors && Array.isArray(assignment.contractors)) {
          for (const contractor of assignment.contractors) {
            preparedCategoryAssignments.push({
              main_category: assignment.mainCategory,
              subcategory: assignment.subcategory,
              contractor_id: contractor.contractorId || null,
              contractor_name: contractor.contractorName,
              estimated_amount: parseFloat(contractor.estimatedAmount),
              notes: contractor.notes || null
            });
          }
        }
      }
    }

    const projectData: CreateProjectData = {
      name,
      code,
      location: location || null,
      area: area ? parseFloat(area) : null,
      budget_estimate: parseFloat(budgetEstimate),
      client,
      start_date: new Date(startDate),
      end_date: endDate ? new Date(endDate) : null,
      status: status || 'planning',
      created_by: null, // TODO: Get from authenticated user
      categoryAssignments: preparedCategoryAssignments,
      // NEW FINANCIAL FIELDS
      price_per_meter: pricePerMeter ? parseFloat(pricePerMeter) : 0,
      real_cost_per_meter: realCostPerMeter ? parseFloat(realCostPerMeter) : 0,
      owner_deal_price: ownerDealPrice ? parseFloat(ownerDealPrice) : 0,
      owner_paid_amount: ownerPaidAmount ? parseFloat(ownerPaidAmount) : 0,
      total_site_area: totalSiteArea ? parseFloat(totalSiteArea) : 0
    };

    const project = await projectService.createProject(projectData);
    
    res.status(201).json({
      message: 'Project created successfully',
      project
    });

  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ 
      error: 'Failed to create project',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update project
router.put('/:id', authenticate, requirePermission('canManageProjects'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is admin for sensitive field updates
    const userRole = (req as any).user?.role;
    const SENSITIVE_FIELDS = ['budgetEstimate', 'pricePerMeter', 'realCostPerMeter', 'ownerDealPrice', 'totalSiteArea'];
    
    const hasSensitiveUpdates = SENSITIVE_FIELDS.some(field => 
      req.body.hasOwnProperty(field)
    );
    
    if (hasSensitiveUpdates && userRole !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        userMessage: 'غير مسموح - يتطلب صلاحيات المدير'
      });
    }
    
    const {
      name,
      location,
      area,
      budgetEstimate,
      client,
      startDate,
      endDate,
      status,
      notes,
      categoryAssignments,
      // NEW FINANCIAL FIELDS
      pricePerMeter,
      realCostPerMeter,
      ownerDealPrice,
      ownerPaidAmount,
      totalSiteArea
    } = req.body;

    console.log('PUT /api/projects/:id - Request body:', req.body);

    const updateData: Partial<CreateProjectData> = {};
    
    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (area !== undefined) updateData.area = area ? parseFloat(area) : null;
    if (budgetEstimate !== undefined) updateData.budget_estimate = parseFloat(budgetEstimate);
    if (client !== undefined) updateData.client = client;
    if (startDate !== undefined) updateData.start_date = new Date(startDate);
    if (endDate !== undefined) updateData.end_date = endDate ? new Date(endDate) : null;
    if (status !== undefined) updateData.status = status;
    
    // NEW FINANCIAL FIELDS
    if (pricePerMeter !== undefined) updateData.price_per_meter = parseFloat(pricePerMeter);
    if (realCostPerMeter !== undefined) updateData.real_cost_per_meter = parseFloat(realCostPerMeter);
    if (ownerDealPrice !== undefined) updateData.owner_deal_price = parseFloat(ownerDealPrice);
    if (ownerPaidAmount !== undefined) updateData.owner_paid_amount = parseFloat(ownerPaidAmount);
    if (totalSiteArea !== undefined) updateData.total_site_area = parseFloat(totalSiteArea);

    // Handle category assignments if provided
    if (categoryAssignments !== undefined) {
      const preparedCategoryAssignments = [];
      if (categoryAssignments && Array.isArray(categoryAssignments)) {
        for (const assignment of categoryAssignments) {
          // Handle both nested format (with contractors array) and flat format
          if (assignment.contractors && Array.isArray(assignment.contractors)) {
            // Nested format - each assignment contains multiple contractors
            for (const contractor of assignment.contractors) {
              preparedCategoryAssignments.push({
                main_category: assignment.mainCategory,
                subcategory: assignment.subcategory,
                contractor_id: contractor.contractorId || null,
                contractor_name: contractor.contractorName,
                estimated_amount: parseFloat(contractor.estimatedAmount || '0'),
                notes: contractor.notes || null
              });
            }
          } else if (assignment.main_category) {
            // Flat format - each assignment is either a contractor or purchasing assignment
            
            // Handle contractor assignments (require contractor_id)
            if (assignment.assignment_type === 'contractor' || (assignment.contractor_id && assignment.assignment_type !== 'purchasing')) {
              const contractorId = assignment.contractor_id?.trim();
              if (!contractorId) {
                return res.status(400).json({
                  error: 'Invalid assignment data',
                  details: `Contractor ID is required for contractor assignment: ${assignment.main_category} - ${assignment.subcategory}`
                });
              }

              preparedCategoryAssignments.push({
                main_category: assignment.main_category,
                subcategory: assignment.subcategory,
                contractor_id: contractorId,
                contractor_name: assignment.contractor_name,
                estimated_amount: parseFloat(assignment.estimated_amount?.toString() || '0'),
                notes: assignment.notes || null,
                assignment_type: assignment.assignment_type || 'contractor'
              });
            }
            // Handle purchasing assignments (contractor_id can be null)
            else if (assignment.assignment_type === 'purchasing' || !assignment.contractor_id) {
              preparedCategoryAssignments.push({
                main_category: assignment.main_category,
                subcategory: assignment.subcategory,
                contractor_id: null,
                contractor_name: assignment.contractor_name || 'مشتريات',
                estimated_amount: parseFloat(assignment.estimated_amount?.toString() || '0'),
                notes: assignment.notes || null,
                assignment_type: 'purchasing'
              });
            }
          }
        }
      }
      updateData.categoryAssignments = preparedCategoryAssignments;
    }

    const project = await projectService.updateProject(id, updateData);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      message: 'Project updated successfully',
      project
    });

  } catch (error: any) {
    // Check if this is a business validation error (not a technical error)
    if (error?.isValidationError) {
      console.log('ℹ️ Business validation failed:', error.message);
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.message
      });
    }
    
    // This is a technical error, log it properly
    console.error('❌ Technical error updating project:', error);
    res.status(500).json({ 
      error: 'Failed to update project',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete a specific assignment from a project
router.delete('/:projectId/assignments/:assignmentId', authenticate, requirePermission('canManageProjects'), async (req, res) => {
  try {
    const { projectId, assignmentId } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    
    console.log(`🗑️ DELETE assignment request - Project: ${projectId}, Assignment: ${assignmentId}, User: ${userId} (${userRole})`);
    
    // Use enhanced delete for admins, regular delete for others
    const success = userRole === 'admin' 
      ? await projectService.deleteAssignmentEnhanced(projectId, assignmentId)
      : await projectService.deleteAssignment(projectId, assignmentId);
    
    if (!success) {
      return res.status(404).json({ 
        error: 'Assignment not found or cannot be deleted',
        userMessage: 'التعيين غير موجود أو لا يمكن حذفه'
      });
    }

    res.json({ 
      message: 'Assignment deleted successfully',
      userMessage: userRole === 'admin' 
        ? 'تم حذف التعيين بنجاح (صلاحيات المدير)'
        : 'تم حذف التعيين بنجاح'
    });

  } catch (error: any) {
    console.error('❌ Error deleting assignment:', error);
    
    // Handle business validation errors
    if (error?.isValidationError) {
      return res.status(400).json({ 
        error: 'Cannot delete assignment',
        userMessage: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to delete assignment',
      userMessage: 'فشل في حذف التعيين',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get assignment financial summary
router.get('/:projectId/assignments/:assignmentId/summary', authenticate, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    const result = await projectService.getAssignmentFinancialSummary(assignmentId);
    
    if (!result.success) {
      return res.status(404).json({ 
        error: result.error,
        userMessage: 'التعيين غير موجود'
      });
    }

    res.json(result);

  } catch (error) {
    console.error('❌ Error getting assignment summary:', error);
    res.status(500).json({ 
      error: 'Failed to get assignment summary',
      userMessage: 'فشل في جلب ملخص التعيين',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Freeze assignment
router.put('/:projectId/assignments/:assignmentId/freeze', authenticate, requirePermission('canManageProjects'), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user?.id;

    console.log(`🧊 FREEZE assignment request - Assignment: ${assignmentId}, User: ${userId}`);

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        error: 'Freeze reason is required',
        userMessage: 'سبب التجميد مطلوب'
      });
    }

    const result = await projectService.freezeAssignment(assignmentId, reason, userId);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: result.error,
        userMessage: result.userMessage || 'فشل في تجميد التعيين'
      });
    }

    res.json({
      success: true,
      message: 'Assignment frozen successfully',
      userMessage: 'تم تجميد التعيين بنجاح',
      data: result
    });

  } catch (error) {
    console.error('❌ Error freezing assignment:', error);
    res.status(500).json({ 
      error: 'Failed to freeze assignment',
      userMessage: 'فشل في تجميد التعيين',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Unfreeze assignment
router.put('/:projectId/assignments/:assignmentId/unfreeze', authenticate, requirePermission('canManageProjects'), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userId = (req as any).user?.id;

    console.log(`🔓 UNFREEZE assignment request - Assignment: ${assignmentId}, User: ${userId}`);

    const result = await projectService.unfreezeAssignment(assignmentId, userId);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: result.error,
        userMessage: result.userMessage || 'فشل في إلغاء تجميد التعيين'
      });
    }

    res.json({
      success: true,
      message: 'Assignment unfrozen successfully',
      userMessage: 'تم إلغاء تجميد التعيين بنجاح',
      data: result
    });

  } catch (error) {
    console.error('❌ Error unfreezing assignment:', error);
    res.status(500).json({ 
      error: 'Failed to unfreeze assignment',
      userMessage: 'فشل في إلغاء تجميد التعيين',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Edit assignment amount
router.put('/:projectId/assignments/:assignmentId/amount', authenticate, requirePermission('canManageProjects'), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { newAmount, reason } = req.body;
    const userId = (req as any).user?.id;

    console.log(`✏️ EDIT assignment amount request - Assignment: ${assignmentId}, New Amount: ${newAmount}`);

    if (!newAmount || newAmount <= 0) {
      return res.status(400).json({
        error: 'Valid amount is required',
        userMessage: 'مبلغ صحيح مطلوب'
      });
    }

    const result = await projectService.editAssignmentAmount(assignmentId, newAmount, reason, userId);
    
    if (!result.success) {
      return res.status(400).json({ 
        error: result.error,
        userMessage: result.userMessage || 'فشل في تعديل مبلغ التعيين'
      });
    }

    res.json({
      success: true,
      message: 'Assignment amount updated successfully',
      userMessage: 'تم تحديث مبلغ التعيين بنجاح',
      data: result
    });

  } catch (error) {
    console.error('❌ Error editing assignment amount:', error);
    res.status(500).json({ 
      error: 'Failed to edit assignment amount',
      userMessage: 'فشل في تعديل مبلغ التعيين',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete project
router.delete('/:id', authenticate, requirePermission('canDeleteRecords'), async (req, res) => {
  try {
    const { id } = req.params;
    const success = await projectService.deleteProject(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });

  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ 
      error: 'Failed to delete project',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Project Employees CRUD and Salary Payments
router.get('/:id/employees', authenticate, requirePermission('canManageProjects'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.getProjectEmployees(id);
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ success: false, message: result.error || 'Failed to fetch project employees' });
    }
  } catch (error) {
    console.error('Error fetching project employees:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/:id/employees', authenticate, requirePermission('canManageProjects'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await projectService.createProjectEmployee(id, req.body);
    if (result.success) {
      res.status(201).json({ success: true, data: result.data });
    } else {
      res.status(400).json({ success: false, message: result.error || 'Failed to create project employee' });
    }
  } catch (error) {
    console.error('Error creating project employee:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

router.post('/:projectId/employees/:employeeId/pay-salary', authenticate, requirePermission('canManageProjects'), async (req, res) => {
  try {
    const { projectId, employeeId } = req.params;
    const userId = (req as any).user?.id;
    const result = await projectService.processProjectEmployeeSalaryPayment(projectId, employeeId, req.body, userId);
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ success: false, message: result.error || 'Failed to process project salary payment' });
    }
  } catch (error) {
    console.error('Error processing project salary payment:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

// Monthly summary for project employees (paid totals and last payment)
router.get('/:projectId/employees/monthly-summary', authenticate, requirePermission('canManageProjects'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { month } = req.query as { month?: string };
    const monthYear = month || new Date().toISOString().slice(0,7);
    const result = await projectService.getProjectEmployeeMonthlySummary(projectId, monthYear);
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({ success: false, message: result.error || 'Failed to fetch summary' });
    }
  } catch (error) {
    console.error('Error fetching project employee monthly summary:', error);
    res.status(500).json({ success: false, message: 'خطأ في الخادم' });
  }
});

export default router;