import express from 'express';
import { projectService, CreateProjectData } from '../../database/services/projectService';
import { authenticate } from '../middleware/auth';

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
router.get('/generate-code', async (req, res) => {
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
router.get('/', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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
router.post('/', async (req, res) => {
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
      categoryAssignments
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
      categoryAssignments: preparedCategoryAssignments
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
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
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
      categoryAssignments
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
    if (notes !== undefined) updateData.notes = notes;

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
          } else if (assignment.main_category && assignment.contractor_id) {
            // Flat format - each assignment is a single contractor assignment
            // Validate contractor_id is not empty
            const contractorId = assignment.contractor_id?.trim();
            if (!contractorId) {
              return res.status(400).json({
                error: 'Invalid assignment data',
                details: `Contractor ID is required for assignment: ${assignment.main_category} - ${assignment.subcategory}`
              });
            }

            preparedCategoryAssignments.push({
              main_category: assignment.main_category,
              subcategory: assignment.subcategory,
              contractor_id: contractorId,
              contractor_name: assignment.contractor_name,
              estimated_amount: parseFloat(assignment.estimated_amount?.toString() || '0'),
              notes: assignment.notes || null
            });
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

// Delete project
router.delete('/:id', async (req, res) => {
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

export default router;