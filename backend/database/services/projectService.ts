import { getPool } from '../config';
import { Project, ProjectStatus, CreateProjectCategoryAssignmentData } from '../types';

export interface CreateProjectData {
  name: string;
  code: string;
  location?: string | null;
  area?: number | null;
  budget_estimate: number;
  client?: string | null;
  start_date?: Date | null;
  end_date?: Date | null;
  status: ProjectStatus;
  notes?: string | null;
  created_by?: string | null;
  categoryAssignments?: CreateProjectCategoryAssignmentData[];
}

export interface ProjectWithAssignments extends Project {
  categoryAssignments: Array<{
    id: string;
    main_category: string;
    subcategory: string;
    contractor_id?: string;
    contractor_name: string;
    estimated_amount: number;
    actual_amount?: number;
    notes?: string;
    status: string;
  }>;
}

class ProjectService {
  // Generate unique project code
  async generateProjectCode(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Get the next sequential number for this month
    const query = `
      SELECT COUNT(*) as count 
      FROM projects 
      WHERE code LIKE $1
    `;
    const pattern = `PRJ-${year}${month}-%`;
    const result = await getPool().query(query, [pattern]);
    const count = parseInt(result.rows[0].count) + 1;
    const paddedCount = count.toString().padStart(3, '0');
    
    return `PRJ-${year}${month}-${paddedCount}`;
  }

  // Create a new project with category assignments
  async createProject(data: CreateProjectData): Promise<ProjectWithAssignments> {
    const client = await getPool().connect();
    
    try {
      await client.query('BEGIN');

      // Insert the main project
      const projectQuery = `
        INSERT INTO projects (
          name, code, location, area, budget_estimate, client, 
          start_date, end_date, status, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      console.log('Creating project with data:', data);
      
      const projectValues = [
        data.name,
        data.code,
        data.location || null,
        data.area || null,
        data.budget_estimate,
        data.client,
        data.start_date,
        data.end_date || null,
        data.status,
        data.notes || null,
        data.created_by || null
      ];
      
      console.log('Project values:', projectValues);

      const projectResult = await client.query(projectQuery, projectValues);
      const project = projectResult.rows[0] as Project;

      // Insert category assignments if provided
      const categoryAssignments = [];
      if (data.categoryAssignments && data.categoryAssignments.length > 0) {
        for (const assignment of data.categoryAssignments) {
          const assignmentQuery = `
            INSERT INTO project_category_assignments (
              project_id, main_category, subcategory, contractor_id,
              contractor_name, estimated_amount, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
          `;

          const assignmentValues = [
            project.id,
            assignment.main_category,
            assignment.subcategory,
            assignment.contractor_id,
            assignment.contractor_name,
            assignment.estimated_amount,
            assignment.notes,
            data.created_by
          ];

          const assignmentResult = await client.query(assignmentQuery, assignmentValues);
          categoryAssignments.push(assignmentResult.rows[0]);
        }
      }

      await client.query('COMMIT');

      return {
        ...project,
        categoryAssignments
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get all projects with their category assignments
  async getAllProjects(): Promise<ProjectWithAssignments[]> {
    const query = `
      SELECT 
        p.*,
        json_agg(
          json_build_object(
            'id', pca.id,
            'main_category', pca.main_category,
            'subcategory', pca.subcategory,
            'contractor_id', pca.contractor_id,
            'contractor_name', pca.contractor_name,
            'estimated_amount', pca.estimated_amount,
            'actual_amount', pca.actual_amount,
            'notes', pca.notes,
            'status', pca.status,
            'has_approved_invoice', pca.has_approved_invoice,
            'budget_exhausted', pca.budget_exhausted,
            'invoice_count', pca.invoice_count,
            'last_invoice_date', pca.last_invoice_date,
            'total_invoices', COALESCE(inv_counts.total_invoices, 0),
            'pending_invoices', COALESCE(inv_counts.pending_invoices, 0),
            'approved_invoices', COALESCE(inv_counts.approved_invoices, 0),
            'paid_invoices', COALESCE(inv_counts.paid_invoices, 0)
          ) ORDER BY pca.main_category, pca.subcategory, pca.contractor_name
        ) FILTER (WHERE pca.id IS NOT NULL) as category_assignments
      FROM projects p
      LEFT JOIN project_category_assignments pca ON p.id = pca.project_id
      LEFT JOIN (
        SELECT 
          category_assignment_id,
          COUNT(*) as total_invoices,
          SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) as pending_invoices,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_invoices,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_invoices
        FROM invoices 
        GROUP BY category_assignment_id
      ) inv_counts ON pca.id = inv_counts.category_assignment_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;

    const result = await getPool().query(query);
    
    return result.rows.map((row: any) => ({
      ...row,
      categoryAssignments: row.category_assignments || []
    }));
  }

  // Get a single project with its category assignments
  async getProjectById(id: string): Promise<ProjectWithAssignments | null> {
    const query = `
      SELECT 
        p.*,
        json_agg(
          json_build_object(
            'id', pca.id,
            'main_category', pca.main_category,
            'subcategory', pca.subcategory,
            'contractor_id', pca.contractor_id,
            'contractor_name', pca.contractor_name,
            'estimated_amount', pca.estimated_amount,
            'actual_amount', pca.actual_amount,
            'notes', pca.notes,
            'status', pca.status,
            'has_approved_invoice', pca.has_approved_invoice,
            'budget_exhausted', pca.budget_exhausted,
            'invoice_count', pca.invoice_count,
            'last_invoice_date', pca.last_invoice_date,
            'total_invoices', COALESCE(inv_counts.total_invoices, 0),
            'pending_invoices', COALESCE(inv_counts.pending_invoices, 0),
            'approved_invoices', COALESCE(inv_counts.approved_invoices, 0),
            'paid_invoices', COALESCE(inv_counts.paid_invoices, 0)
          ) ORDER BY pca.main_category, pca.subcategory, pca.contractor_name
        ) FILTER (WHERE pca.id IS NOT NULL) as category_assignments
      FROM projects p
      LEFT JOIN project_category_assignments pca ON p.id = pca.project_id
      LEFT JOIN (
        SELECT 
          category_assignment_id,
          COUNT(*) as total_invoices,
          SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) as pending_invoices,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_invoices,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_invoices
        FROM invoices 
        GROUP BY category_assignment_id
      ) inv_counts ON pca.id = inv_counts.category_assignment_id
      WHERE p.id = $1
      GROUP BY p.id
    `;

    const result = await getPool().query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      categoryAssignments: row.category_assignments || []
    };
  }

  // Update project with category assignments
  async updateProject(id: string, data: Partial<CreateProjectData>): Promise<ProjectWithAssignments | null> {
    const client = await getPool().connect();
    
    try {
      await client.query('BEGIN');

      // Update basic project fields
    const setClauses = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'categoryAssignments' && value !== undefined) {
        setClauses.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

      let project = null;
      if (setClauses.length > 0) {
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE projects 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

        const result = await client.query(query, values);
        project = result.rows[0];
      } else {
        // If no basic fields to update, just get the existing project
        const result = await client.query('SELECT * FROM projects WHERE id = $1', [id]);
        project = result.rows[0];
      }

      if (!project) {
        throw new Error('Project not found');
      }

      // Handle category assignments update if provided
      let categoryAssignments = [];
      if (data.categoryAssignments !== undefined) {
        // Get existing assignments with invoice information
        const existingAssignmentsQuery = `
          SELECT pca.*, 
            CASE WHEN COUNT(i.id) > 0 THEN true ELSE false END as has_invoices
          FROM project_category_assignments pca
          LEFT JOIN invoices i ON i.category_assignment_id = pca.id
          WHERE pca.project_id = $1
          GROUP BY pca.id
        `;
        const existingResult = await client.query(existingAssignmentsQuery, [id]);
        const existingAssignments = existingResult.rows;

        console.log('🔍 DEBUG: Existing assignments:', existingAssignments.map(a => ({
          id: a.id,
          category: `${a.main_category} - ${a.subcategory}`,
          contractor: a.contractor_name,
          has_invoices: a.has_invoices
        })));

        console.log('🔍 DEBUG: Incoming assignments from frontend:', data.categoryAssignments?.map(a => ({
          category: `${a.main_category} - ${a.subcategory}`,
          contractor: a.contractor_name,
          amount: a.estimated_amount
        })));

        // Frontend now sends ONLY new assignments in ADD mode, complete list in EDIT mode
        console.log('🔍 DEBUG: Processing incoming assignments');

        // Insert or update assignments
        if (data.categoryAssignments && data.categoryAssignments.length > 0) {
          for (const assignment of data.categoryAssignments) {
            console.log('📝 DEBUG: Processing assignment:', {
              category: `${assignment.main_category} - ${assignment.subcategory}`,
              contractor: assignment.contractor_name,
              amount: assignment.estimated_amount
            });

            // Check if this exact assignment already exists
            const existingMatch = existingAssignments.find(existing => 
              existing.main_category === assignment.main_category &&
              existing.subcategory === assignment.subcategory &&
              existing.contractor_id === assignment.contractor_id
            );

            if (existingMatch) {
              const errorMessage = `التعيين موجود مسبقاً: المقاول "${assignment.contractor_name}" مُعيّن بالفعل لـ "${assignment.main_category} - ${assignment.subcategory}". استخدم زر التعديل لتحديث التعيين الموجود.`;
              
              console.log('✋ Business validation: Duplicate assignment rejected', {
                existingId: existingMatch.id,
                category: `${assignment.main_category} - ${assignment.subcategory}`,
                contractor: assignment.contractor_name,
                existingAmount: existingMatch.estimated_amount,
                attemptedAmount: assignment.estimated_amount
              });
              
              // Create a validation error (not a technical error)
              const validationError = new Error(errorMessage);
              (validationError as any).isValidationError = true;
              throw validationError;
            }

            // Insert NEW assignment only
            console.log('✨ DEBUG: Creating NEW assignment');
            const insertQuery = `
              INSERT INTO project_category_assignments (
                project_id, main_category, subcategory, contractor_id,
                contractor_name, estimated_amount, notes, created_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              RETURNING *
            `;

            const insertValues = [
              id,
              assignment.main_category,
              assignment.subcategory,
              assignment.contractor_id,
              assignment.contractor_name,
              assignment.estimated_amount,
              assignment.notes,
              data.created_by || null
            ];

            const insertResult = await client.query(insertQuery, insertValues);
            categoryAssignments.push(insertResult.rows[0]);
            console.log('✅ DEBUG: NEW assignment created with ID:', insertResult.rows[0].id);
          }
        }

        // Get ALL assignments for this project (existing + newly created)
        const allAssignmentsQuery = `
          SELECT * FROM project_category_assignments 
          WHERE project_id = $1 
          ORDER BY main_category, subcategory, contractor_name
        `;
        const allResult = await client.query(allAssignmentsQuery, [id]);
        categoryAssignments = allResult.rows;
        
        console.log('✅ DEBUG: All assignments after operation:', categoryAssignments.map(a => ({
          id: a.id,
          category: `${a.main_category} - ${a.subcategory}`,
          contractor: a.contractor_name,
          amount: a.estimated_amount
        })));
      } else {
        // If category assignments not provided, get existing ones
        const assignmentsQuery = `
          SELECT * FROM project_category_assignments 
          WHERE project_id = $1 
          ORDER BY main_category, subcategory, contractor_name
        `;
        const assignmentsResult = await client.query(assignmentsQuery, [id]);
        categoryAssignments = assignmentsResult.rows;
      }

      await client.query('COMMIT');

      return {
        ...project,
        categoryAssignments
      };

    } catch (error: any) {
      await client.query('ROLLBACK');
      
      // Handle unique constraint violation specifically
      if (error.code === '23505' && error.constraint === 'unique_project_category_contractor') {
        console.log('🚫 DEBUG: Unique constraint violation:', error.detail);
        throw new Error(`تعيين مكرر: لا يمكن تعيين نفس المقاول أكثر من مرة لنفس الفئة الفرعية. هذا يمنع مشاكل الحسابات المالية.`);
      }
      
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete project
  async deleteProject(id: string): Promise<boolean> {
    const query = 'DELETE FROM projects WHERE id = $1';
    const result = await getPool().query(query, [id]);
    return (result.rowCount || 0) > 0;
  }
}

export const projectService = new ProjectService();