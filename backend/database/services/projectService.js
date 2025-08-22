"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectService = void 0;
const config_1 = require("../config");
const safeService_1 = require("./safeService");
class ProjectService {
    calculateProjectFinancials(projectData) {
        const area = projectData.area || 0;
        const pricePerMeter = projectData.price_per_meter || 0;
        const realCostPerMeter = projectData.real_cost_per_meter || 0;
        const ownerDealPrice = projectData.owner_deal_price || 0;
        const constructionCost = area * pricePerMeter;
        const realConstructionCost = area * realCostPerMeter;
        const grossProfit = constructionCost - realConstructionCost;
        const profitMargin = pricePerMeter > 0 ?
            ((pricePerMeter - realCostPerMeter) / pricePerMeter) * 100 : 0;
        return {
            ...projectData,
            construction_cost: constructionCost,
            real_construction_cost: realConstructionCost,
            gross_profit: grossProfit,
            profit_margin: parseFloat(profitMargin.toFixed(2))
        };
    }
    async generateProjectCode() {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const query = `
      SELECT COUNT(*) as count 
      FROM projects 
      WHERE code LIKE $1
    `;
        const pattern = `PRJ-${year}${month}-%`;
        const result = await (0, config_1.getPool)().query(query, [pattern]);
        const count = parseInt(result.rows[0].count) + 1;
        const paddedCount = count.toString().padStart(3, '0');
        return `PRJ-${year}${month}-${paddedCount}`;
    }
    async createProject(data) {
        const client = await (0, config_1.getPool)().connect();
        try {
            await client.query('BEGIN');
            const code = await this.generateProjectCode();
            const calculatedData = this.calculateProjectFinancials(data);
            const projectQuery = `
        INSERT INTO projects (
          name, code, location, area, budget_estimate, client, 
          start_date, end_date, status, created_by,
          price_per_meter, real_cost_per_meter, owner_deal_price, owner_paid_amount, 
          construction_cost, real_construction_cost, gross_profit, profit_margin, total_site_area
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `;
            console.log('Creating project with data:', calculatedData);
            const projectValues = [
                calculatedData.name,
                code,
                calculatedData.location || null,
                calculatedData.area || null,
                calculatedData.budget_estimate,
                calculatedData.client,
                calculatedData.start_date,
                calculatedData.end_date || null,
                calculatedData.status,
                calculatedData.created_by || null,
                calculatedData.price_per_meter || 0,
                calculatedData.real_cost_per_meter || 0,
                calculatedData.owner_deal_price || 0,
                calculatedData.owner_paid_amount || 0,
                calculatedData.construction_cost || 0,
                calculatedData.real_construction_cost || 0,
                calculatedData.gross_profit || 0,
                calculatedData.profit_margin || 0,
                calculatedData.total_site_area || 0
            ];
            console.log('Project values:', projectValues);
            const projectResult = await client.query(projectQuery, projectValues);
            const project = projectResult.rows[0];
            const categoryAssignments = [];
            if (data.categoryAssignments && data.categoryAssignments.length > 0) {
                for (const assignment of data.categoryAssignments) {
                    const assignmentQuery = `
              INSERT INTO project_category_assignments (
                project_id, main_category, subcategory, contractor_id,
                contractor_name, estimated_amount, notes, assignment_type, created_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
                        assignment.assignment_type || (assignment.contractor_id ? 'contractor' : 'purchasing'),
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
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async getAllProjects() {
        try {
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
            'assignment_type', pca.assignment_type,
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
            const result = await (0, config_1.getPool)().query(query);
            return result.rows.map((row) => ({
                ...row,
                allocated_budget: row.allocated_budget || 0,
                available_budget: row.available_budget || row.budget_estimate || 0,
                spent_budget: row.spent_budget || 0,
                categoryAssignments: row.category_assignments || []
            }));
        }
        catch (error) {
            console.error('Error in getAllProjects:', error);
            throw error;
        }
    }
    async getProjectById(id) {
        try {
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
            'assignment_type', pca.assignment_type,
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
            const result = await (0, config_1.getPool)().query(query, [id]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return {
                ...row,
                allocated_budget: row.allocated_budget || 0,
                available_budget: row.available_budget || row.budget_estimate || 0,
                spent_budget: row.spent_budget || 0,
                categoryAssignments: row.category_assignments || []
            };
        }
        catch (error) {
            console.error('Error in getProjectById:', error);
            throw error;
        }
    }
    async updateProject(id, data) {
        const client = await (0, config_1.getPool)().connect();
        try {
            await client.query('BEGIN');
            const existingResult = await client.query('SELECT * FROM projects WHERE id = $1', [id]);
            if (existingResult.rows.length === 0) {
                throw new Error('Project not found');
            }
            const existingProject = existingResult.rows[0];
            const mergedData = { ...existingProject, ...data };
            const calculatedData = this.calculateProjectFinancials(mergedData);
            const setClauses = [];
            const values = [];
            let paramCount = 1;
            Object.entries(calculatedData).forEach(([key, value]) => {
                if (key !== 'categoryAssignments' && key !== 'id' && key !== 'created_at' && key !== 'updated_at' && value !== undefined) {
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
            }
            else {
                project = existingProject;
            }
            let categoryAssignments = [];
            if (data.categoryAssignments !== undefined) {
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
                console.log('🔍 DEBUG: Processing incoming assignments');
                if (data.categoryAssignments && data.categoryAssignments.length > 0) {
                    for (const assignment of data.categoryAssignments) {
                        console.log('📝 DEBUG: Processing assignment:', {
                            category: `${assignment.main_category} - ${assignment.subcategory}`,
                            contractor: assignment.contractor_name,
                            amount: assignment.estimated_amount
                        });
                        const assignmentType = assignment.assignment_type || (assignment.contractor_id ? 'contractor' : 'purchasing');
                        const existingMatch = existingAssignments.find(existing => {
                            const sameCategory = existing.main_category === assignment.main_category &&
                                existing.subcategory === assignment.subcategory;
                            const sameType = existing.assignment_type === assignmentType;
                            if (!sameCategory || !sameType) {
                                return false;
                            }
                            if (assignmentType === 'purchasing') {
                                return true;
                            }
                            return existing.contractor_id === assignment.contractor_id;
                        });
                        if (existingMatch) {
                            console.log('🔄 DEBUG: Updating existing assignment:', existingMatch.id);
                            const updateQuery = `
                UPDATE project_category_assignments 
                SET 
                  estimated_amount = $1,
                  notes = $2,
                  contractor_name = $3,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING *
              `;
                            const updateValues = [
                                assignment.estimated_amount,
                                assignment.notes,
                                assignment.contractor_name,
                                existingMatch.id
                            ];
                            const updateResult = await client.query(updateQuery, updateValues);
                            categoryAssignments.push(updateResult.rows[0]);
                            console.log('✅ DEBUG: Assignment updated:', existingMatch.id);
                        }
                        else {
                            console.log('✨ DEBUG: Creating NEW assignment');
                            const insertQuery = `
                INSERT INTO project_category_assignments (
                  project_id, main_category, subcategory, contractor_id,
                  contractor_name, estimated_amount, notes, assignment_type, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
                                assignmentType,
                                data.created_by || null
                            ];
                            const insertResult = await client.query(insertQuery, insertValues);
                            categoryAssignments.push(insertResult.rows[0]);
                            console.log('✅ DEBUG: NEW assignment created with ID:', insertResult.rows[0].id);
                        }
                    }
                }
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
            }
            else {
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
        }
        catch (error) {
            await client.query('ROLLBACK');
            if (error.code === '23505' && error.constraint === 'unique_project_category_contractor') {
                console.log('🚫 DEBUG: Unique constraint violation:', error.detail);
                throw new Error(`تعيين مكرر: لا يمكن تعيين نفس المقاول أكثر من مرة لنفس الفئة الفرعية. هذا يمنع مشاكل الحسابات المالية.`);
            }
            throw error;
        }
        finally {
            client.release();
        }
    }
    async deleteAssignment(projectId, assignmentId) {
        const client = await (0, config_1.getPool)().connect();
        try {
            await client.query('BEGIN');
            const checkQuery = `
        SELECT pca.*, 
          CASE WHEN COUNT(i.id) > 0 THEN true ELSE false END as has_invoices,
          CASE WHEN COUNT(CASE WHEN i.status IN ('approved', 'paid') THEN 1 END) > 0 THEN true ELSE false END as has_approved_invoices
        FROM project_category_assignments pca
        LEFT JOIN invoices i ON i.category_assignment_id = pca.id
        WHERE pca.id = $1 AND pca.project_id = $2
        GROUP BY pca.id
      `;
            const checkResult = await client.query(checkQuery, [assignmentId, projectId]);
            if (checkResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return false;
            }
            const assignment = checkResult.rows[0];
            if (assignment.has_approved_invoices) {
                const validationError = new Error('لا يمكن حذف التعيين - يوجد فواتير معتمدة أو مدفوعة مرتبطة بهذا التعيين');
                validationError.isValidationError = true;
                throw validationError;
            }
            console.log(`🗑️ Deleting assignment: ${assignment.main_category} - ${assignment.subcategory} (${assignment.contractor_name})`);
            if (assignment.has_invoices) {
                const deletePendingInvoicesQuery = `
          DELETE FROM invoices 
          WHERE category_assignment_id = $1 AND status = 'pending_approval'
        `;
                await client.query(deletePendingInvoicesQuery, [assignmentId]);
                console.log('🗑️ Deleted pending invoices for assignment');
            }
            const deleteQuery = `
        DELETE FROM project_category_assignments 
        WHERE id = $1 AND project_id = $2
      `;
            const deleteResult = await client.query(deleteQuery, [assignmentId, projectId]);
            if (deleteResult.rowCount === 0) {
                await client.query('ROLLBACK');
                return false;
            }
            await client.query('COMMIT');
            console.log('✅ Assignment deleted successfully');
            return true;
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error deleting assignment:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async deleteProject(id) {
        const query = 'DELETE FROM projects WHERE id = $1';
        const result = await (0, config_1.getPool)().query(query, [id]);
        return (result.rowCount || 0) > 0;
    }
    async getAssignmentFinancialSummary(assignmentId) {
        try {
            const query = 'SELECT get_assignment_financial_summary($1) as summary';
            const result = await (0, config_1.getPool)().query(query, [assignmentId]);
            if (result.rows.length === 0) {
                return { success: false, error: 'Assignment not found' };
            }
            return result.rows[0].summary;
        }
        catch (error) {
            console.error('❌ Error getting assignment financial summary:', error);
            throw error;
        }
    }
    async freezeAssignment(assignmentId, reason, userId) {
        try {
            const query = 'SELECT recalculate_assignment_budget($1, $2, $3, $4, $5) as result';
            const result = await (0, config_1.getPool)().query(query, [assignmentId, 'frozen', null, reason, userId]);
            if (result.rows.length === 0) {
                return { success: false, error: 'Assignment not found' };
            }
            return result.rows[0].result;
        }
        catch (error) {
            console.error('❌ Error freezing assignment:', error);
            throw error;
        }
    }
    async unfreezeAssignment(assignmentId, userId) {
        try {
            const checkQuery = `
        SELECT status, estimated_amount, returned_budget 
        FROM project_category_assignments 
        WHERE id = $1
      `;
            const checkResult = await (0, config_1.getPool)().query(checkQuery, [assignmentId]);
            if (checkResult.rows.length === 0) {
                return { success: false, error: 'Assignment not found' };
            }
            const assignment = checkResult.rows[0];
            if (assignment.status !== 'frozen') {
                return { success: false, error: 'Assignment is not frozen', userMessage: 'التعيين غير مجمد' };
            }
            const unfreezeQuery = `
        UPDATE project_category_assignments 
        SET status = 'active',
            frozen_at = NULL,
            frozen_by = NULL,
            freeze_reason = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
            const unfreezeResult = await (0, config_1.getPool)().query(unfreezeQuery, [assignmentId]);
            const updateProjectQuery = `
        UPDATE projects 
        SET available_budget = available_budget - $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT project_id FROM project_category_assignments WHERE id = $2)
        RETURNING available_budget
      `;
            const projectResult = await (0, config_1.getPool)().query(updateProjectQuery, [assignment.returned_budget, assignmentId]);
            return {
                success: true,
                assignment_id: assignmentId,
                status: 'active',
                returned_budget_reversed: assignment.returned_budget,
                new_project_budget: projectResult.rows[0]?.available_budget
            };
        }
        catch (error) {
            console.error('❌ Error unfreezing assignment:', error);
            throw error;
        }
    }
    async editAssignmentAmount(assignmentId, newAmount, reason, userId) {
        try {
            const query = 'SELECT recalculate_assignment_budget($1, $2, $3, $4, $5) as result';
            const result = await (0, config_1.getPool)().query(query, [assignmentId, 'active', newAmount, reason || null, userId]);
            if (result.rows.length === 0) {
                return { success: false, error: 'Assignment not found' };
            }
            return result.rows[0].result;
        }
        catch (error) {
            console.error('❌ Error editing assignment amount:', error);
            throw error;
        }
    }
    async deleteAssignmentEnhanced(projectId, assignmentId) {
        try {
            const budgetQuery = 'SELECT recalculate_assignment_budget($1, $2, $3, $4, $5) as result';
            const budgetResult = await (0, config_1.getPool)().query(budgetQuery, [
                assignmentId,
                'cancelled',
                null,
                'Admin delete - enhanced mode',
                null
            ]);
            if (budgetResult.rows.length === 0 || !budgetResult.rows[0].result.success) {
                throw new Error(budgetResult.rows[0]?.result?.error || 'Failed to recalculate budget');
            }
            const deleteQuery = 'DELETE FROM project_category_assignments WHERE id = $1 AND project_id = $2';
            const deleteResult = await (0, config_1.getPool)().query(deleteQuery, [assignmentId, projectId]);
            return (deleteResult.rowCount || 0) > 0;
        }
        catch (error) {
            console.error('❌ Error in enhanced delete assignment:', error);
            throw error;
        }
    }
    async getProjectEmployees(projectId) {
        try {
            const result = await (0, config_1.getPool)().query(`
        SELECT pe.*, c.full_name as contractor_full_name
        FROM project_employees pe
        LEFT JOIN contractors c ON c.id = pe.contractor_id
        WHERE pe.project_id = $1
        ORDER BY pe.created_at DESC
      `, [projectId]);
            return { success: true, data: result.rows };
        }
        catch (error) {
            console.error('Error fetching project employees:', error);
            return { success: false, error: 'Failed to fetch project employees' };
        }
    }
    async createProjectEmployee(projectId, data) {
        try {
            const salaryNumber = parseFloat(String(data.monthly_salary ?? data.monthlySalary ?? 0).replace(/[^0-9.]/g, '')) || 0;
            let employeeName = '';
            if (data.contractor_id) {
                const contractorRes = await (0, config_1.getPool)().query(`SELECT full_name FROM contractors WHERE id = $1`, [data.contractor_id]);
                employeeName = contractorRes.rows[0]?.full_name || '';
            }
            const result = await (0, config_1.getPool)().query(`
        INSERT INTO project_employees (project_id, contractor_id, name, position, department, monthly_salary, status, notes)
        VALUES ($1,$2,NULLIF($3, ''),$4,$5,$6,$7,$8)
        RETURNING *
      `, [
                projectId,
                data.contractor_id || null,
                employeeName,
                data.position || null,
                data.department || null,
                salaryNumber,
                data.status || 'active',
                data.notes || null
            ]);
            return { success: true, data: result.rows[0] };
        }
        catch (error) {
            console.error('Error creating project employee:', error);
            if (error.code === '23505') {
                return { success: false, error: 'هذا الموظف (المقاول) موجود بالفعل ضمن هذا المشروع' };
            }
            return { success: false, error: 'Failed to create project employee' };
        }
    }
    async processProjectEmployeeSalaryPayment(projectId, projectEmployeeId, paymentData, userId) {
        const client = await (0, config_1.getPool)().connect();
        try {
            await client.query('BEGIN');
            const projResult = await client.query(`SELECT id, name, budget_estimate FROM projects WHERE id = $1`, [projectId]);
            if (projResult.rows.length === 0)
                throw new Error('Project not found');
            const project = projResult.rows[0];
            const empResult = await client.query(`SELECT * FROM project_employees WHERE id = $1 AND project_id = $2`, [projectEmployeeId, projectId]);
            if (empResult.rows.length === 0)
                throw new Error('Project employee not found');
            const employee = empResult.rows[0];
            const currentDate = new Date();
            const monthYear = currentDate.toISOString().slice(0, 7);
            const payResult = await client.query(`
        INSERT INTO project_employee_salary_payments (
          project_employee_id, project_id, payment_amount, payment_type, installment_amount, month_year, is_full_payment, notes, payment_date
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *
      `, [
                projectEmployeeId,
                projectId,
                paymentData.amount,
                paymentData.payment_type,
                paymentData.installment_amount || null,
                monthYear,
                paymentData.is_full_payment,
                paymentData.reason || null,
                currentDate
            ]);
            const description = `راتب موظف مشروع: ${employee.name} - ${paymentData.reason || ''}`.trim();
            const safeResult = await safeService_1.safeService.deductForProjectSalary(parseFloat(paymentData.amount), projectId, project.name, projectEmployeeId, employee.name, description, userId);
            if (!safeResult.success)
                throw new Error(safeResult.error || 'Safe deduction failed');
            await client.query('COMMIT');
            return { success: true, data: { payment: payResult.rows[0], safeTransaction: safeResult.data } };
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error processing project employee salary payment:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        finally {
            client.release();
        }
    }
    async getProjectEmployeeMonthlySummary(projectId, monthYear) {
        try {
            const result = await (0, config_1.getPool)().query(`
        SELECT 
          project_employee_id,
          SUM(payment_amount) AS total_paid,
          MAX(payment_date) AS last_payment_date
        FROM project_employee_salary_payments
        WHERE project_id = $1 AND month_year = $2
        GROUP BY project_employee_id
        `, [projectId, monthYear]);
            return { success: true, data: result.rows };
        }
        catch (error) {
            console.error('Error fetching project employee monthly summary:', error);
            return { success: false, error: 'Failed to fetch monthly summary' };
        }
    }
}
exports.projectService = new ProjectService();
//# sourceMappingURL=projectService.js.map