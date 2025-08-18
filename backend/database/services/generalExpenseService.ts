import { getPool } from '../config';

export interface GeneralExpense {
  id: string;
  project_id: string;
  expense_name: string;
  category: string;
  cost: number;
  details?: string;
  expense_date: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  submitted_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
}

export interface CreateGeneralExpenseData {
  project_id: string;
  expense_name: string;
  category: string;
  cost: number;
  details?: string;
  expense_date: string;
  receipt_url?: string;
  submitted_by?: string;
}

export interface UpdateGeneralExpenseData {
  expense_name?: string;
  category?: string;
  cost?: number;
  details?: string;
  expense_date?: string;
  receipt_url?: string;
  status?: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  rejection_reason?: string;
}

export class GeneralExpenseService {
  private pool = getPool();

  /**
   * Create a new general expense
   */
  async createGeneralExpense(data: CreateGeneralExpenseData): Promise<GeneralExpense> {
    console.log('Creating general expense:', data);

    const query = `
      INSERT INTO general_expenses (
        project_id, expense_name, category, cost, details, expense_date, receipt_url, submitted_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      data.project_id,
      data.expense_name,
      data.category,
      data.cost,
      data.details || null,
      data.expense_date,
      data.receipt_url || null,
      data.submitted_by || null
    ];

    try {
      const result = await this.pool.query(query, values);
      console.log('General expense created successfully:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating general expense:', error);
      throw error;
    }
  }

  /**
   * Get all general expenses for a project
   */
  async getGeneralExpensesByProject(projectId: string): Promise<GeneralExpense[]> {
    console.log('Fetching general expenses for project:', projectId);

    const query = `
      SELECT 
        ge.*,
        creator.full_name as submitted_by_name,
        approver.full_name as approved_by_name
      FROM general_expenses ge
      LEFT JOIN users creator ON ge.submitted_by = creator.id
      LEFT JOIN users approver ON ge.approved_by = approver.id
      WHERE ge.project_id = $1
      ORDER BY ge.created_at DESC
    `;

    try {
      const result = await this.pool.query(query, [projectId]);
      console.log(`Found ${result.rows.length} general expenses for project ${projectId}`);
      return result.rows;
    } catch (error) {
      console.error('Error fetching general expenses:', error);
      throw error;
    }
  }

  /**
   * Get a single general expense by ID
   */
  async getGeneralExpenseById(expenseId: string): Promise<GeneralExpense | null> {
    console.log('Fetching general expense by ID:', expenseId);

    const query = `
      SELECT 
        ge.*,
        creator.full_name as submitted_by_name,
        approver.full_name as approved_by_name
      FROM general_expenses ge
      LEFT JOIN users creator ON ge.submitted_by = creator.id
      LEFT JOIN users approver ON ge.approved_by = approver.id
      WHERE ge.id = $1
    `;

    try {
      const result = await this.pool.query(query, [expenseId]);
      if (result.rows.length === 0) {
        console.log('General expense not found:', expenseId);
        return null;
      }
      console.log('General expense found:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching general expense by ID:', error);
      throw error;
    }
  }

  /**
   * Update a general expense
   */
  async updateGeneralExpense(expenseId: string, data: UpdateGeneralExpenseData): Promise<GeneralExpense> {
    console.log('Updating general expense:', expenseId, data);

    const updateFields: string[] = [];
    const values: any[] = [];
    let valueIndex = 1;

    if (data.expense_name !== undefined) {
      updateFields.push(`expense_name = $${valueIndex++}`);
      values.push(data.expense_name);
    }

    if (data.category !== undefined) {
      updateFields.push(`category = $${valueIndex++}`);
      values.push(data.category);
    }

    if (data.cost !== undefined) {
      updateFields.push(`cost = $${valueIndex++}`);
      values.push(data.cost);
    }

    if (data.details !== undefined) {
      updateFields.push(`details = $${valueIndex++}`);
      values.push(data.details);
    }

    if (data.expense_date !== undefined) {
      updateFields.push(`expense_date = $${valueIndex++}`);
      values.push(data.expense_date);
    }

    if (data.receipt_url !== undefined) {
      updateFields.push(`receipt_url = $${valueIndex++}`);
      values.push(data.receipt_url);
    }

    if (data.status !== undefined) {
      updateFields.push(`status = $${valueIndex++}`);
      values.push(data.status);
    }

    if (data.approved_by !== undefined) {
      updateFields.push(`approved_by = $${valueIndex++}`);
      values.push(data.approved_by);
    }

    if (data.rejection_reason !== undefined) {
      updateFields.push(`rejection_reason = $${valueIndex++}`);
      values.push(data.rejection_reason);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    const query = `
      UPDATE general_expenses 
      SET ${updateFields.join(', ')}
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    values.push(expenseId);

    try {
      const result = await this.pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error('General expense not found');
      }
      console.log('General expense updated successfully:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating general expense:', error);
      throw error;
    }
  }

  /**
   * Delete a general expense
   */
  async deleteGeneralExpense(expenseId: string): Promise<boolean> {
    console.log('Deleting general expense:', expenseId);

    const query = 'DELETE FROM general_expenses WHERE id = $1';

    try {
      const result = await this.pool.query(query, [expenseId]);
      const deleted = (result.rowCount || 0) > 0;
      console.log('General expense deletion result:', deleted);
      return deleted;
    } catch (error) {
      console.error('Error deleting general expense:', error);
      throw error;
    }
  }

  /**
   * Get expense summary for a project
   */
  async getExpenseSummaryByProject(projectId: string): Promise<{
    total_expenses: number;
    approved_expenses: number;
    pending_expenses: number;
    rejected_expenses: number;
    total_approved_amount: number;
    total_pending_amount: number;
  }> {
    console.log('Fetching expense summary for project:', projectId);

    const query = `
      SELECT 
        COUNT(*) as total_expenses,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_expenses,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_expenses,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_expenses,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN cost ELSE 0 END), 0) as total_approved_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN cost ELSE 0 END), 0) as total_pending_amount
      FROM general_expenses 
      WHERE project_id = $1
    `;

    try {
      const result = await this.pool.query(query, [projectId]);
      const summary = result.rows[0];
      console.log('Expense summary:', summary);
      return {
        total_expenses: parseInt(summary.total_expenses) || 0,
        approved_expenses: parseInt(summary.approved_expenses) || 0,
        pending_expenses: parseInt(summary.pending_expenses) || 0,
        rejected_expenses: parseInt(summary.rejected_expenses) || 0,
        total_approved_amount: parseFloat(summary.total_approved_amount) || 0,
        total_pending_amount: parseFloat(summary.total_pending_amount) || 0,
      };
    } catch (error) {
      console.error('Error fetching expense summary:', error);
      throw error;
    }
  }

  /**
   * Approve a general expense and create safe transaction
   */
  async approveGeneralExpense(expenseId: string, approvedBy: string): Promise<GeneralExpense> {
    console.log('Approving general expense:', expenseId, 'by user:', approvedBy);
    
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // First get the expense details
      const expenseResult = await client.query(
        'SELECT * FROM general_expenses WHERE id = $1',
        [expenseId]
      );
      
      if (expenseResult.rows.length === 0) {
        throw new Error('General expense not found');
      }
      
      const expense = expenseResult.rows[0];
      
      // Check if already approved
      if (expense.status === 'approved') {
        console.log('Expense already approved, skipping safe transaction');
        await client.query('ROLLBACK');
        return expense;
      }
      
      // Update expense status
      const updatedExpenseResult = await client.query(`
        UPDATE general_expenses 
        SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [approvedBy, expenseId]);
      
      const updatedExpense = updatedExpenseResult.rows[0];
      
      // Get current safe balance
      const balanceResult = await client.query('SELECT current_balance FROM safe_state WHERE id = 1');
      const currentBalance = parseFloat(balanceResult.rows[0]?.current_balance || '0');
      
      // Check if sufficient balance
      if (currentBalance < expense.cost) {
        throw new Error(`رصيد غير كافي. الرصيد الحالي: ${currentBalance.toLocaleString()} د.ع، المطلوب: ${expense.cost.toLocaleString()} د.ع`);
      }
      
      const newBalance = currentBalance - expense.cost;
      
      // Get project name for transaction description
      const projectResult = await client.query('SELECT name FROM projects WHERE id = $1', [expense.project_id]);
      const projectName = projectResult.rows[0]?.name || 'Unknown Project';
      
      // Create safe transaction
      await client.query(`
        INSERT INTO safe_transactions (
          type, amount, description, date,
          project_id, project_name, expense_id,
          previous_balance, new_balance, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        'general_expense',
        -expense.cost, // Negative for outflow
        `${expense.category}: ${expense.expense_name} - ${projectName}`,
        expense.expense_date,
        expense.project_id,
        projectName,
        expense.id,
        currentBalance,
        newBalance,
        approvedBy
      ]);
      
      // Update safe state
      await client.query(`
        UPDATE safe_state 
        SET 
          current_balance = $1,
          total_spent = total_spent + $2,
          last_updated = CURRENT_TIMESTAMP,
          updated_by = $3
        WHERE id = 1
      `, [newBalance, expense.cost, approvedBy]);
      
      await client.query('COMMIT');
      
      console.log('General expense approved and safe transaction created:', {
        expenseId,
        amount: expense.cost,
        newBalance,
        projectName
      });
      
      return updatedExpense;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error approving general expense:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reject a general expense
   */
  async rejectGeneralExpense(expenseId: string): Promise<GeneralExpense> {
    return this.updateGeneralExpense(expenseId, {
      status: 'rejected',
      approved_by: undefined
    });
  }

  /**
   * Get count of pending expenses across all projects (for notifications)
   */
  async getPendingExpensesCount(): Promise<number> {
    console.log('Getting count of pending expenses');

    const query = `
      SELECT COUNT(*) as count
      FROM general_expenses 
      WHERE status = 'pending'
    `;

    try {
      const result = await this.pool.query(query);
      const count = parseInt(result.rows[0]?.count || '0');
      console.log('Pending expenses count:', count);
      return count;
    } catch (error) {
      console.error('Error getting pending expenses count:', error);
      throw error;
    }
  }

  /**
   * Get all pending expenses across all projects (for approval modal)
   */
  async getAllPendingExpenses(): Promise<GeneralExpense[]> {
    console.log('Getting all pending expenses');

    const query = `
      SELECT 
        ge.*,
        creator.full_name as submitted_by_name,
        approver.full_name as approved_by_name,
        p.name as project_name
      FROM general_expenses ge
      LEFT JOIN users creator ON ge.submitted_by = creator.id
      LEFT JOIN users approver ON ge.approved_by = approver.id
      LEFT JOIN projects p ON ge.project_id = p.id
      WHERE ge.status = 'pending'
      ORDER BY ge.created_at DESC
    `;

    try {
      const result = await this.pool.query(query);
      console.log(`Found ${result.rows.length} pending expenses`);
      return result.rows;
    } catch (error) {
      console.error('Error getting all pending expenses:', error);
      throw error;
    }
  }

  /**
   * Get all general expenses across all projects (for export/reporting)
   */
  async getAllGeneralExpenses(): Promise<GeneralExpense[]> {
    console.log('Getting all general expenses');

    const query = `
      SELECT 
        ge.*,
        creator.full_name as submitted_by_name,
        approver.full_name as approved_by_name,
        p.name as project_name
      FROM general_expenses ge
      LEFT JOIN users creator ON ge.submitted_by = creator.id
      LEFT JOIN users approver ON ge.approved_by = approver.id
      LEFT JOIN projects p ON ge.project_id = p.id
      ORDER BY ge.created_at DESC
    `;

    try {
      const result = await this.pool.query(query);
      console.log(`Found ${result.rows.length} total expenses`);
      return result.rows;
    } catch (error) {
      console.error('Error getting all general expenses:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const generalExpenseService = new GeneralExpenseService();