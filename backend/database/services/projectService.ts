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
            'status', pca.status
          ) ORDER BY pca.main_category, pca.subcategory, pca.contractor_name
        ) FILTER (WHERE pca.id IS NOT NULL) as category_assignments
      FROM projects p
      LEFT JOIN project_category_assignments pca ON p.id = pca.project_id
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
            'status', pca.status
          ) ORDER BY pca.main_category, pca.subcategory, pca.contractor_name
        ) FILTER (WHERE pca.id IS NOT NULL) as category_assignments
      FROM projects p
      LEFT JOIN project_category_assignments pca ON p.id = pca.project_id
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

  // Update project
  async updateProject(id: string, data: Partial<CreateProjectData>): Promise<Project | null> {
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

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE projects 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await getPool().query(query, values);
    return result.rows[0] || null;
  }

  // Delete project
  async deleteProject(id: string): Promise<boolean> {
    const query = 'DELETE FROM projects WHERE id = $1';
    const result = await getPool().query(query, [id]);
    return (result.rowCount || 0) > 0;
  }
}

export const projectService = new ProjectService();