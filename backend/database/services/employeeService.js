"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EmployeeService {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async createEmployee(data) {
        const client = await this.pool.connect();
        try {
            const query = `
        INSERT INTO employees (
          name, mobile_number, age, position, department, phone, email, 
          hire_date, monthly_salary, status, assigned_project_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
            const values = [
                data.name,
                data.mobile_number || null,
                data.age || null,
                data.position || null,
                data.department || null,
                data.phone || null,
                data.email || null,
                data.hire_date || new Date(),
                data.monthly_salary || 0,
                data.status || 'active',
                data.assigned_project_id || null,
                data.notes || null
            ];
            const result = await client.query(query, values);
            return {
                success: true,
                data: result.rows[0]
            };
        }
        catch (error) {
            console.error('Error creating employee:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
        finally {
            client.release();
        }
    }
    async getEmployees(filter) {
        const client = await this.pool.connect();
        try {
            let query = `
        SELECT e.*, p.name as project_name
        FROM employees e
        LEFT JOIN projects p ON e.assigned_project_id = p.id
        WHERE 1=1
      `;
            const values = [];
            let paramCount = 0;
            if (filter?.status) {
                paramCount++;
                query += ` AND e.status = $${paramCount}`;
                values.push(filter.status);
            }
            if (filter?.position) {
                paramCount++;
                query += ` AND e.position ILIKE $${paramCount}`;
                values.push(`%${filter.position}%`);
            }
            if (filter?.search) {
                paramCount++;
                query += ` AND (e.name ILIKE $${paramCount} OR e.position ILIKE $${paramCount} OR e.mobile_number ILIKE $${paramCount})`;
                values.push(`%${filter.search}%`);
            }
            query += ` ORDER BY e.name ASC`;
            const result = await client.query(query, values);
            return {
                success: true,
                data: result.rows
            };
        }
        catch (error) {
            console.error('Error fetching employees:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
        finally {
            client.release();
        }
    }
    async getEmployeeById(id) {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT e.*, p.name as project_name
        FROM employees e
        LEFT JOIN projects p ON e.assigned_project_id = p.id
        WHERE e.id = $1
      `;
            const result = await client.query(query, [id]);
            if (result.rows.length === 0) {
                return {
                    success: false,
                    error: 'Employee not found'
                };
            }
            return {
                success: true,
                data: result.rows[0]
            };
        }
        catch (error) {
            console.error('Error fetching employee:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
        finally {
            client.release();
        }
    }
    async updateEmployee(id, data) {
        const client = await this.pool.connect();
        try {
            const updateFields = [];
            const values = [];
            let paramCount = 0;
            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined) {
                    paramCount++;
                    updateFields.push(`${key} = $${paramCount}`);
                    values.push(value);
                }
            });
            if (updateFields.length === 0) {
                return {
                    success: false,
                    error: 'No fields to update'
                };
            }
            paramCount++;
            updateFields.push(`updated_at = $${paramCount}`);
            values.push(new Date());
            paramCount++;
            values.push(id);
            const query = `
        UPDATE employees 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
            const result = await client.query(query, values);
            if (result.rows.length === 0) {
                return {
                    success: false,
                    error: 'Employee not found'
                };
            }
            return {
                success: true,
                data: result.rows[0]
            };
        }
        catch (error) {
            console.error('Error updating employee:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
        finally {
            client.release();
        }
    }
    async deleteEmployee(id) {
        const client = await this.pool.connect();
        try {
            const query = `
        UPDATE employees 
        SET status = 'terminated', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id
      `;
            const result = await client.query(query, [id]);
            if (result.rows.length === 0) {
                return {
                    success: false,
                    error: 'Employee not found'
                };
            }
            return {
                success: true,
                data: true
            };
        }
        catch (error) {
            console.error('Error deleting employee:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
        finally {
            client.release();
        }
    }
    async processSalaryPayment(employeeId, paymentData) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const employeeResult = await client.query('SELECT * FROM employees WHERE id = $1', [employeeId]);
            if (employeeResult.rows.length === 0) {
                throw new Error('Employee not found');
            }
            const employee = employeeResult.rows[0];
            const currentDate = new Date();
            const monthYear = currentDate.toISOString().slice(0, 7);
            const paymentQuery = `
        INSERT INTO employee_salary_payments (
          employee_id, payment_amount, payment_type, installment_amount, 
          month_year, notes, is_full_payment, payment_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
            const paymentResult = await client.query(paymentQuery, [
                employeeId,
                paymentData.amount,
                paymentData.payment_type,
                paymentData.installment_amount || null,
                monthYear,
                paymentData.reason || null,
                paymentData.is_full_payment,
                currentDate
            ]);
            const updateEmployeeQuery = `
        UPDATE employees 
        SET last_payment_date = CURRENT_DATE,
            payment_status = CASE 
              WHEN $2 = true THEN 'current'
              ELSE 'partial'
            END
        WHERE id = $1
      `;
            await client.query(updateEmployeeQuery, [employeeId, paymentData.is_full_payment]);
            await client.query('COMMIT');
            return {
                success: true,
                data: {
                    payment: paymentResult.rows[0],
                    employee: employee.name,
                    amount: paymentData.amount,
                    type: paymentData.payment_type
                }
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error processing salary payment:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
        finally {
            client.release();
        }
    }
    async getEmployeePaymentHistory(employeeId) {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT esp.*, e.name as employee_name
        FROM employee_salary_payments esp
        JOIN employees e ON esp.employee_id = e.id
        WHERE esp.employee_id = $1
        ORDER BY esp.payment_date DESC
      `;
            const result = await client.query(query, [employeeId]);
            return {
                success: true,
                data: result.rows
            };
        }
        catch (error) {
            console.error('Error fetching payment history:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
        finally {
            client.release();
        }
    }
    async calculateRemainingSalary(employeeId) {
        const client = await this.pool.connect();
        try {
            const employeeQuery = 'SELECT monthly_salary FROM employees WHERE id = $1';
            const employeeResult = await client.query(employeeQuery, [employeeId]);
            if (employeeResult.rows.length === 0) {
                throw new Error('Employee not found');
            }
            const monthlySalary = parseFloat(employeeResult.rows[0].monthly_salary) || 0;
            const currentMonth = new Date().toISOString().slice(0, 7);
            const paymentsQuery = `
        SELECT COALESCE(SUM(payment_amount), 0) as total_paid_this_month
        FROM employee_salary_payments 
        WHERE employee_id = $1 AND month_year = $2
      `;
            const paymentsResult = await client.query(paymentsQuery, [employeeId, currentMonth]);
            const totalPaidThisMonth = parseFloat(paymentsResult.rows[0].total_paid_this_month) || 0;
            const remainingSalary = Math.max(0, monthlySalary - totalPaidThisMonth);
            return {
                success: true,
                data: {
                    remainingSalary,
                    totalPaidThisMonth,
                    monthlySalary
                }
            };
        }
        catch (error) {
            console.error('Error calculating remaining salary:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
        finally {
            client.release();
        }
    }
    async getPositions() {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT * FROM employee_positions 
        WHERE is_active = true 
        ORDER BY position_name_ar
      `;
            const result = await client.query(query);
            return {
                success: true,
                data: result.rows
            };
        }
        catch (error) {
            console.error('Error fetching positions:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
        finally {
            client.release();
        }
    }
    async getProjects() {
        const client = await this.pool.connect();
        try {
            console.log('🔍 Querying projects from database...');
            const query = `
        SELECT id, name 
        FROM projects 
        ORDER BY name
      `;
            const result = await client.query(query);
            console.log('📊 Database returned', result.rows.length, 'projects');
            console.log('🏗️ Projects:', result.rows.map(p => p.name));
            return {
                success: true,
                data: result.rows
            };
        }
        catch (error) {
            console.error('❌ Error fetching projects:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
        finally {
            client.release();
        }
    }
    async getEmployeesDueForPayment() {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT e.*, 
               COALESCE(
                 EXTRACT(DAY FROM CURRENT_DATE - e.last_payment_date)::INTEGER, 
                 EXTRACT(DAY FROM CURRENT_DATE - e.hire_date)::INTEGER
               ) as days_since_payment
        FROM employees e
        WHERE e.status = 'active'
        AND (
          e.last_payment_date IS NULL 
          OR e.last_payment_date <= CURRENT_DATE - INTERVAL '30 days'
        )
        ORDER BY days_since_payment DESC, e.name
      `;
            const result = await client.query(query);
            return {
                success: true,
                data: result.rows
            };
        }
        catch (error) {
            console.error('Error fetching employees due for payment:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
        finally {
            client.release();
        }
    }
}
exports.default = EmployeeService;
//# sourceMappingURL=employeeService.js.map