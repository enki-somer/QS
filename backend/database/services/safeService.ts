import { getPool } from '../config';
import { 
  SafeTransaction, 
  SafeState, 
  CreateSafeTransactionData,
  EditSafeTransactionData,
  SafeTransactionFilter,
  DatabaseResult,
  PaginatedResult,
  TransactionType,
  FundingSource
} from '../types';

export class SafeService {
  
  /**
   * Get current safe state (balance, totals)
   */
  async getSafeState(): Promise<DatabaseResult<SafeState>> {
    try {
      const pool = getPool();
      const result = await pool.query(`
        SELECT 
          id,
          current_balance,
          total_funded,
          total_spent,
          last_updated,
          updated_by
        FROM safe_state 
        WHERE id = 1
      `);

      if (result.rows.length === 0) {
        // Initialize safe state if not exists
        await this.initializeSafeState();
        return this.getSafeState();
      }

      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error getting safe state:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Initialize safe state (for first-time setup)
   */
  private async initializeSafeState(): Promise<void> {
    const pool = getPool();
    await pool.query(`
      INSERT INTO safe_state (id, current_balance, total_funded, total_spent)
      VALUES (1, 0, 0, 0)
      ON CONFLICT (id) DO NOTHING
    `);
  }

  /**
   * Add funding to safe
   */
  async addFunding(
    data: CreateSafeTransactionData, 
    userId: string
  ): Promise<DatabaseResult<SafeTransaction>> {
    const client = await getPool().connect();
    
    try {
      await client.query('BEGIN');

      // Get current balance
      const balanceResult = await client.query(`
        SELECT current_balance FROM safe_state WHERE id = 1
      `);
      
      const currentBalance = parseFloat(balanceResult.rows[0]?.current_balance || 0);
      const newBalance = currentBalance + data.amount;
      
      // Debug logging
      console.log('🔍 SafeService.addFunding DEBUG:', {
        currentBalance,
        amount: data.amount,
        newBalance,
        amountType: typeof data.amount,
        currentBalanceType: typeof currentBalance
      });

      // Insert funding transaction
      const transactionResult = await client.query(`
        INSERT INTO safe_transactions (
          type, amount, description, date,
          previous_balance, new_balance,
          funding_source, funding_notes,
          project_id, project_name, batch_number,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        'funding',
        data.amount,
        data.description,
        data.date,
        currentBalance,
        newBalance,
        data.funding_source,
        data.funding_notes,
        data.project_id,
        data.project_name,
        data.batch_number || 1,
        userId
      ]);

      // Safe state will be updated automatically by the database trigger
      // No manual update needed to avoid double-counting

      await client.query('COMMIT');

      return {
        success: true,
        data: transactionResult.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adding funding:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Deduct money for invoice payment using database function
   */
  async deductForInvoice(
    amount: number,
    projectId: string,
    projectName: string,
    invoiceId: string,
    invoiceNumber: string,
    userId: string
  ): Promise<DatabaseResult<SafeTransaction>> {
    const client = await getPool().connect();
    
    try {
      await client.query('BEGIN');

      // Use the database function for consistent safe deduction
      const result = await client.query(`
        SELECT deduct_from_safe_for_invoice($1, $2, $3, $4, $5, $6) as success
      `, [amount, projectId, projectName, invoiceId, invoiceNumber, userId]);

      if (!result.rows[0]?.success) {
        throw new Error('Failed to deduct from safe');
      }

      // Get the transaction record that was created
      const transactionResult = await client.query(`
        SELECT * FROM safe_transactions 
        WHERE invoice_id = $1 AND created_by = $2
        ORDER BY created_at DESC 
        LIMIT 1
      `, [invoiceId, userId]);

      await client.query('COMMIT');

      return {
        success: true,
        data: transactionResult.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deducting for invoice:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Deduct money for salary payment
   */
  async deductForSalary(
    amount: number,
    employeeId: string,
    employeeName: string,
    userId: string
  ): Promise<DatabaseResult<SafeTransaction>> {
    const client = await getPool().connect();
    
    try {
      await client.query('BEGIN');

      // Check current balance
      const balanceResult = await client.query(`
        SELECT current_balance FROM safe_state WHERE id = 1
      `);
      
      const currentBalance = balanceResult.rows[0]?.current_balance || 0;
      
      if (currentBalance < amount) {
        throw new Error(`رصيد غير كافي. الرصيد الحالي: ${currentBalance}, المطلوب: ${amount}`);
      }

      const newBalance = currentBalance - amount;

      // Insert salary payment transaction
      const transactionResult = await client.query(`
        INSERT INTO safe_transactions (
          type, amount, description, date,
          employee_id, employee_name,
          previous_balance, new_balance, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        'salary_payment',
        -amount, // Negative for outflow
        `راتب الموظف: ${employeeName}`,
        new Date().toISOString().split('T')[0],
        employeeId,
        employeeName,
        currentBalance,
        newBalance,
        userId
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
      `, [newBalance, amount, userId]);

      await client.query('COMMIT');

      return {
        success: true,
        data: transactionResult.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deducting for salary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Deduct money for general expense
   */
  async deductForExpense(
    amount: number,
    expenseId: string,
    description: string,
    category: string,
    userId: string
  ): Promise<DatabaseResult<SafeTransaction>> {
    const client = await getPool().connect();
    
    try {
      await client.query('BEGIN');

      // Check current balance
      const balanceResult = await client.query(`
        SELECT current_balance FROM safe_state WHERE id = 1
      `);
      
      const currentBalance = balanceResult.rows[0]?.current_balance || 0;
      
      if (currentBalance < amount) {
        throw new Error(`رصيد غير كافي. الرصيد الحالي: ${currentBalance}, المطلوب: ${amount}`);
      }

      const newBalance = currentBalance - amount;

      // Insert expense payment transaction
      const transactionResult = await client.query(`
        INSERT INTO safe_transactions (
          type, amount, description, date,
          expense_id, previous_balance, new_balance, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        'general_expense',
        -amount, // Negative for outflow
        `${category}: ${description}`,
        new Date().toISOString().split('T')[0],
        expenseId,
        currentBalance,
        newBalance,
        userId
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
      `, [newBalance, amount, userId]);

      await client.query('COMMIT');

      return {
        success: true,
        data: transactionResult.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deducting for expense:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get transaction history with optional filtering and pagination
   */
  async getTransactionHistory(
    filter?: SafeTransactionFilter,
    page = 1,
    limit = 50
  ): Promise<DatabaseResult<PaginatedResult<SafeTransaction>>> {
    try {
      const pool = getPool();
      const offset = (page - 1) * limit;

      // Build WHERE clause
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (filter?.type) {
        conditions.push(`type = $${paramIndex++}`);
        values.push(filter.type);
      }

      if (filter?.date_from) {
        conditions.push(`date >= $${paramIndex++}`);
        values.push(filter.date_from);
      }

      if (filter?.date_to) {
        conditions.push(`date <= $${paramIndex++}`);
        values.push(filter.date_to);
      }

      if (filter?.project_id) {
        conditions.push(`project_id = $${paramIndex++}`);
        values.push(filter.project_id);
      }

      if (filter?.employee_id) {
        conditions.push(`employee_id = $${paramIndex++}`);
        values.push(filter.employee_id);
      }

      if (filter?.expense_id) {
        conditions.push(`expense_id = $${paramIndex++}`);
        values.push(filter.expense_id);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await pool.query(`
        SELECT COUNT(*) as total FROM safe_transactions ${whereClause}
      `, values);

      const total = parseInt(countResult.rows[0].total);

      // Get paginated data
      const dataResult = await pool.query(`
        SELECT * FROM safe_transactions 
        ${whereClause}
        ORDER BY created_at DESC, date DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `, [...values, limit, offset]);

      return {
        success: true,
        data: {
          data: dataResult.rows,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if safe has sufficient balance
   */
  async hasBalance(amount: number): Promise<DatabaseResult<boolean>> {
    try {
      const pool = getPool();
      const result = await pool.query(`
        SELECT current_balance FROM safe_state WHERE id = 1
      `);

      const currentBalance = result.rows[0]?.current_balance || 0;
      
      return {
        success: true,
        data: currentBalance >= amount
      };
    } catch (error) {
      console.error('Error checking balance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get safe summary statistics
   */
  async getSafeSummary(): Promise<DatabaseResult<{
    current_balance: number;
    total_funded: number;
    total_spent: number;
    transaction_count: number;
    transactions_by_type: { type: TransactionType; count: number; total: number }[];
  }>> {
    try {
      const pool = getPool();
      
      // Get basic stats
      const stateResult = await pool.query(`
        SELECT current_balance, total_funded, total_spent 
        FROM safe_state WHERE id = 1
      `);

      // Get transaction count
      const countResult = await pool.query(`
        SELECT COUNT(*) as transaction_count FROM safe_transactions
      `);

      // Get transactions by type
      const typeResult = await pool.query(`
        SELECT 
          type,
          COUNT(*) as count,
          SUM(ABS(amount)) as total
        FROM safe_transactions 
        GROUP BY type
        ORDER BY type
      `);

      const safeState = stateResult.rows[0] || { current_balance: 0, total_funded: 0, total_spent: 0 };

      return {
        success: true,
        data: {
          ...safeState,
          transaction_count: parseInt(countResult.rows[0].transaction_count),
          transactions_by_type: typeResult.rows
        }
      };
    } catch (error) {
      console.error('Error getting safe summary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Edit an existing safe transaction (admin only)
   */
  async editTransaction(
    transactionId: string,
    editData: EditSafeTransactionData,
    userId: string
  ): Promise<DatabaseResult<SafeTransaction>> {
    const client = await getPool().connect();
    
    try {
      await client.query('BEGIN');

      // Get original transaction
      const originalResult = await client.query(`
        SELECT * FROM safe_transactions WHERE id = $1
      `, [transactionId]);

      if (originalResult.rows.length === 0) {
        throw new Error('Transaction not found');
      }

      const original = originalResult.rows[0];
      
      // Calculate balance difference if amount is being changed
      const newAmount = editData.amount !== undefined ? editData.amount : original.amount;
      const amountDifference = newAmount - original.amount;

      // Update transaction with audit trail
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (editData.amount !== undefined) {
        updateFields.push(`amount = $${paramIndex++}`);
        updateValues.push(editData.amount);
      }

      if (editData.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(editData.description);
      }

      if (editData.funding_source !== undefined) {
        updateFields.push(`funding_source = $${paramIndex++}`);
        updateValues.push(editData.funding_source);
      }

      if (editData.funding_notes !== undefined) {
        updateFields.push(`funding_notes = $${paramIndex++}`);
        updateValues.push(editData.funding_notes);
      }

      // Always add audit fields
      updateFields.push(`is_edited = $${paramIndex++}`);
      updateValues.push(true);
      
      updateFields.push(`edit_reason = $${paramIndex++}`);
      updateValues.push(editData.edit_reason);
      
      updateFields.push(`edited_by = $${paramIndex++}`);
      updateValues.push(userId);
      
      updateFields.push(`edited_at = $${paramIndex++}`);
      updateValues.push(new Date());

      // Add transaction ID for WHERE clause
      updateValues.push(transactionId);

      const updateQuery = `
        UPDATE safe_transactions 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const transactionResult = await client.query(updateQuery, updateValues);

      // Adjust safe balance if amount changed
      if (amountDifference !== 0) {
        await client.query(`
          UPDATE safe_state 
          SET current_balance = current_balance + $1,
              last_updated = CURRENT_TIMESTAMP,
              updated_by = $2
          WHERE id = 1
        `, [amountDifference, userId]);

        // Update totals based on transaction type
        if (original.type === 'funding') {
          await client.query(`
            UPDATE safe_state 
            SET total_funded = total_funded + $1
            WHERE id = 1
          `, [amountDifference]);
        } else {
          await client.query(`
            UPDATE safe_state 
            SET total_spent = total_spent - $1
            WHERE id = 1
          `, [amountDifference]);
        }
      }

      await client.query('COMMIT');

      return {
        success: true,
        data: transactionResult.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error editing transaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get transaction by ID (for editing)
   */
  async getTransactionById(transactionId: string): Promise<DatabaseResult<SafeTransaction>> {
    try {
      const result = await getPool().query(`
        SELECT * FROM safe_transactions WHERE id = $1
      `, [transactionId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Transaction not found'
        };
      }

      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error getting transaction by ID:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get available funding sources including dynamic project sources
   */
  async getFundingSources(): Promise<DatabaseResult<FundingSource[]>> {
    try {
      // Get active projects with enhanced information
      const projectsResult = await getPool().query(`
        SELECT id, name, code, location, client, owner_deal_price, owner_paid_amount,
          (owner_deal_price - COALESCE(owner_paid_amount, 0)) as remaining_amount,
          status, created_at
        FROM projects
        WHERE status IN ('planning', 'active') AND owner_deal_price > 0
        ORDER BY 
          CASE 
            WHEN (owner_deal_price - COALESCE(owner_paid_amount, 0)) > 0 THEN 0 
            ELSE 1 
          END,
          (owner_deal_price - COALESCE(owner_paid_amount, 0)) DESC,
          name
      `);

      // Get max batch per project
      const batchesResult = await getPool().query(`
        SELECT project_id, MAX(batch_number) as max_batch
        FROM safe_transactions
        WHERE type = 'funding' AND project_id IS NOT NULL
        GROUP BY project_id
      `);

      const batchMap = new Map();
      batchesResult.rows.forEach(row => {
        batchMap.set(row.project_id, row.max_batch);
      });

      // Prepare funding sources
      const fundingSources: FundingSource[] = [
        { type: 'general', label: 'تمويل عام', value: 'تمويل عام' },
        { type: 'rental', label: 'إيجارات', value: 'إيجارات' },
        { type: 'factory', label: 'مصنع', value: 'مصنع' },
        { type: 'contracts', label: 'مقاولات أخرى', value: 'مقاولات أخرى' }
      ];

      // Add project-specific sources with enhanced information
      projectsResult.rows.forEach(project => {
        const currentBatch = (batchMap.get(project.id) || 0) + 1;
        const remainingAmount = parseFloat(project.remaining_amount || 0);
        
        fundingSources.push({
          type: 'project',
          label: `${project.name} - الدفعة ${currentBatch}`,
          value: `مشروع ${project.name} - الدفعة ${currentBatch}`,
          projectId: project.id,
          projectCode: project.code,
          projectLocation: project.location,
          projectClient: project.client,
          projectStatus: project.status,
          batchNumber: currentBatch,
          remainingAmount: remainingAmount,
          totalDealPrice: parseFloat(project.owner_deal_price || 0),
          paidAmount: parseFloat(project.owner_paid_amount || 0),
          isAvailable: remainingAmount > 0
        });
      });

      return {
        success: true,
        data: fundingSources
      };
    } catch (error) {
      console.error('Error getting funding sources:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const safeService = new SafeService(); 