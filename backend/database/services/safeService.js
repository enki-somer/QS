"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeService = exports.SafeService = void 0;
const config_1 = require("../config");
class SafeService {
    async getSafeState() {
        try {
            const pool = (0, config_1.getPool)();
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
                await this.initializeSafeState();
                return this.getSafeState();
            }
            return {
                success: true,
                data: result.rows[0]
            };
        }
        catch (error) {
            console.error('Error getting safe state:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async initializeSafeState() {
        const pool = (0, config_1.getPool)();
        await pool.query(`
      INSERT INTO safe_state (id, current_balance, total_funded, total_spent)
      VALUES (1, 0, 0, 0)
      ON CONFLICT (id) DO NOTHING
    `);
    }
    async addFunding(data, userId) {
        const client = await (0, config_1.getPool)().connect();
        try {
            await client.query('BEGIN');
            const balanceResult = await client.query(`
        SELECT current_balance FROM safe_state WHERE id = 1
      `);
            const currentBalance = parseFloat(balanceResult.rows[0]?.current_balance || 0);
            const newBalance = currentBalance + data.amount;
            console.log('🔍 SafeService.addFunding DEBUG:', {
                currentBalance,
                amount: data.amount,
                newBalance,
                amountType: typeof data.amount,
                currentBalanceType: typeof currentBalance
            });
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
            await client.query('COMMIT');
            return {
                success: true,
                data: transactionResult.rows[0]
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error adding funding:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
        finally {
            client.release();
        }
    }
    async deductForInvoice(amount, projectId, projectName, invoiceId, invoiceNumber, userId) {
        const client = await (0, config_1.getPool)().connect();
        try {
            await client.query('BEGIN');
            const result = await client.query(`
        SELECT deduct_from_safe_for_invoice($1, $2, $3, $4, $5, $6) as success
      `, [amount, projectId, projectName, invoiceId, invoiceNumber, userId]);
            if (!result.rows[0]?.success) {
                throw new Error('Failed to deduct from safe');
            }
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
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error deducting for invoice:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
        finally {
            client.release();
        }
    }
    async deductForSalary(amount, employeeId, employeeName, userId) {
        const client = await (0, config_1.getPool)().connect();
        try {
            await client.query('BEGIN');
            const balanceResult = await client.query(`
        SELECT current_balance FROM safe_state WHERE id = 1
      `);
            const currentBalance = balanceResult.rows[0]?.current_balance || 0;
            if (currentBalance < amount) {
                throw new Error(`رصيد غير كافي. الرصيد الحالي: ${currentBalance}, المطلوب: ${amount}`);
            }
            const newBalance = currentBalance - amount;
            const transactionResult = await client.query(`
        INSERT INTO safe_transactions (
          type, amount, description, date,
          employee_id, employee_name,
          previous_balance, new_balance, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
                'salary_payment',
                -amount,
                `راتب الموظف: ${employeeName}`,
                new Date().toISOString().split('T')[0],
                employeeId,
                employeeName,
                currentBalance,
                newBalance,
                userId
            ]);
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
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error deducting for salary:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
        finally {
            client.release();
        }
    }
    async deductForProjectSalary(amount, projectId, projectName, projectEmployeeId, projectEmployeeName, description, userId) {
        const client = await (0, config_1.getPool)().connect();
        try {
            await client.query('BEGIN');
            const balanceResult = await client.query(`
        SELECT current_balance FROM safe_state WHERE id = 1
      `);
            const currentBalance = parseFloat(balanceResult.rows[0]?.current_balance || 0);
            if (currentBalance < amount) {
                throw new Error(`رصيد غير كافي. الرصيد الحالي: ${currentBalance}, المطلوب: ${amount}`);
            }
            const newBalance = currentBalance - amount;
            const transactionResult = await client.query(`
        INSERT INTO safe_transactions (
          type, amount, description, date,
          project_id, project_name,
          employee_id, employee_name,
          previous_balance, new_balance, created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING *
      `, [
                'salary_payment',
                -amount,
                description || `راتب موظف مشروع: ${projectEmployeeName}`,
                new Date().toISOString().split('T')[0],
                projectId,
                projectName,
                projectEmployeeId,
                projectEmployeeName,
                currentBalance,
                newBalance,
                userId
            ]);
            await client.query(`
        UPDATE safe_state
        SET current_balance = $1,
            total_spent = total_spent + $2,
            last_updated = CURRENT_TIMESTAMP,
            updated_by = $3
        WHERE id = 1
      `, [newBalance, amount, userId]);
            await client.query('COMMIT');
            return { success: true, data: transactionResult.rows[0] };
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error deducting for project salary:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        finally {
            client.release();
        }
    }
    async deductForExpense(amount, expenseId, description, category, userId) {
        const client = await (0, config_1.getPool)().connect();
        try {
            await client.query('BEGIN');
            const balanceResult = await client.query(`
        SELECT current_balance FROM safe_state WHERE id = 1
      `);
            const currentBalance = balanceResult.rows[0]?.current_balance || 0;
            if (currentBalance < amount) {
                throw new Error(`رصيد غير كافي. الرصيد الحالي: ${currentBalance}, المطلوب: ${amount}`);
            }
            const newBalance = currentBalance - amount;
            const transactionResult = await client.query(`
        INSERT INTO safe_transactions (
          type, amount, description, date,
          expense_id, previous_balance, new_balance, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
                'general_expense',
                -amount,
                `${category}: ${description}`,
                new Date().toISOString().split('T')[0],
                expenseId,
                currentBalance,
                newBalance,
                userId
            ]);
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
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error deducting for expense:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
        finally {
            client.release();
        }
    }
    async getTransactionHistory(filter, page = 1, limit = 50) {
        try {
            const pool = (0, config_1.getPool)();
            const offset = (page - 1) * limit;
            const conditions = [];
            const values = [];
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
            const countResult = await pool.query(`
        SELECT COUNT(*) as total FROM safe_transactions ${whereClause}
      `, values);
            const total = parseInt(countResult.rows[0].total);
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
        }
        catch (error) {
            console.error('Error getting transaction history:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async hasBalance(amount) {
        try {
            const pool = (0, config_1.getPool)();
            const result = await pool.query(`
        SELECT current_balance FROM safe_state WHERE id = 1
      `);
            const currentBalance = result.rows[0]?.current_balance || 0;
            return {
                success: true,
                data: currentBalance >= amount
            };
        }
        catch (error) {
            console.error('Error checking balance:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async getSafeSummary() {
        try {
            const pool = (0, config_1.getPool)();
            const stateResult = await pool.query(`
        SELECT current_balance, total_funded, total_spent 
        FROM safe_state WHERE id = 1
      `);
            const countResult = await pool.query(`
        SELECT COUNT(*) as transaction_count FROM safe_transactions
      `);
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
        }
        catch (error) {
            console.error('Error getting safe summary:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async editTransaction(transactionId, editData, userId) {
        const client = await (0, config_1.getPool)().connect();
        try {
            await client.query('BEGIN');
            const originalResult = await client.query(`
        SELECT * FROM safe_transactions WHERE id = $1
      `, [transactionId]);
            if (originalResult.rows.length === 0) {
                throw new Error('Transaction not found');
            }
            const original = originalResult.rows[0];
            const newAmount = editData.amount !== undefined ? editData.amount : original.amount;
            const amountDifference = newAmount - original.amount;
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
            updateFields.push(`is_edited = $${paramIndex++}`);
            updateValues.push(true);
            updateFields.push(`edit_reason = $${paramIndex++}`);
            updateValues.push(editData.edit_reason);
            updateFields.push(`edited_by = $${paramIndex++}`);
            updateValues.push(userId);
            updateFields.push(`edited_at = $${paramIndex++}`);
            updateValues.push(new Date());
            updateValues.push(transactionId);
            const updateQuery = `
        UPDATE safe_transactions 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
            const transactionResult = await client.query(updateQuery, updateValues);
            if (amountDifference !== 0) {
                await client.query(`
          UPDATE safe_state 
          SET current_balance = current_balance + $1,
              last_updated = CURRENT_TIMESTAMP,
              updated_by = $2
          WHERE id = 1
        `, [amountDifference, userId]);
                if (original.type === 'funding') {
                    await client.query(`
            UPDATE safe_state 
            SET total_funded = total_funded + $1
            WHERE id = 1
          `, [amountDifference]);
                }
                else {
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
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error editing transaction:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
        finally {
            client.release();
        }
    }
    async getTransactionById(transactionId) {
        try {
            const result = await (0, config_1.getPool)().query(`
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
        }
        catch (error) {
            console.error('Error getting transaction by ID:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async getFundingSources() {
        try {
            const projectsResult = await (0, config_1.getPool)().query(`
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
            const batchesResult = await (0, config_1.getPool)().query(`
        SELECT project_id, MAX(batch_number) as max_batch
        FROM safe_transactions
        WHERE type = 'funding' AND project_id IS NOT NULL
        GROUP BY project_id
      `);
            const batchMap = new Map();
            batchesResult.rows.forEach(row => {
                batchMap.set(row.project_id, row.max_batch);
            });
            const fundingSources = [
                { type: 'general', label: 'تمويل عام', value: 'تمويل عام' },
                { type: 'rental', label: 'إيجارات', value: 'إيجارات' },
                { type: 'factory', label: 'مصنع', value: 'مصنع' },
                { type: 'contracts', label: 'مقاولات أخرى', value: 'مقاولات أخرى' }
            ];
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
        }
        catch (error) {
            console.error('Error getting funding sources:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
exports.SafeService = SafeService;
exports.safeService = new SafeService();
//# sourceMappingURL=safeService.js.map