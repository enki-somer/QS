"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractorService = void 0;
const config_1 = require("../config");
class ContractorService {
    pool;
    constructor() {
        this.pool = (0, config_1.getPool)();
    }
    async createContractor(data, userId) {
        const client = await this.pool.connect();
        try {
            const duplicateCheck = await client.query('SELECT id FROM contractors WHERE full_name = $1 AND is_active = true', [data.full_name]);
            if (duplicateCheck.rows.length > 0) {
                return {
                    success: false,
                    error: 'يوجد مقاول بنفس الاسم مسبقاً. لا يسمح بالأسماء المكررة.'
                };
            }
            const query = `
        INSERT INTO contractors (full_name, phone_number, category, notes, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
            const values = [
                data.full_name,
                data.phone_number || null,
                data.category || null,
                data.notes || null,
                userId || null
            ];
            const result = await client.query(query, values);
            if (result.rows.length > 0) {
                return {
                    success: true,
                    data: result.rows[0]
                };
            }
            else {
                return {
                    success: false,
                    error: 'فشل في إضافة المقاول'
                };
            }
        }
        catch (error) {
            console.error('Error creating contractor:', error);
            if (error.code === '23505' && error.constraint?.includes('full_name')) {
                return {
                    success: false,
                    error: 'يوجد مقاول بنفس الاسم مسبقاً. لا يسمح بالأسماء المكررة.'
                };
            }
            return {
                success: false,
                error: 'حدث خطأ في قاعدة البيانات'
            };
        }
        finally {
            client.release();
        }
    }
    async getContractors(filter = {}, page = 1, limit = 50) {
        const client = await this.pool.connect();
        try {
            const conditions = [];
            const values = [];
            let paramIndex = 1;
            if (filter.category) {
                conditions.push(`category = $${paramIndex}`);
                values.push(filter.category);
                paramIndex++;
            }
            if (filter.is_active !== undefined) {
                conditions.push(`is_active = $${paramIndex}`);
                values.push(filter.is_active);
                paramIndex++;
            }
            if (filter.search) {
                conditions.push(`(full_name ILIKE $${paramIndex} OR phone_number ILIKE $${paramIndex})`);
                values.push(`%${filter.search}%`);
                paramIndex++;
            }
            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const countQuery = `SELECT COUNT(*) FROM contractors ${whereClause}`;
            const countResult = await client.query(countQuery, values);
            const total = parseInt(countResult.rows[0].count);
            const offset = (page - 1) * limit;
            const dataQuery = `
        SELECT c.*, u.full_name as created_by_name
        FROM contractors c
        LEFT JOIN users u ON c.created_by = u.id
        ${whereClause}
        ORDER BY c.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
            values.push(limit, offset);
            const dataResult = await client.query(dataQuery, values);
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
            console.error('Error getting contractors:', error);
            return {
                success: false,
                error: 'فشل في جلب بيانات المقاولين'
            };
        }
        finally {
            client.release();
        }
    }
    async getContractorById(id) {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT c.*, u.full_name as created_by_name
        FROM contractors c
        LEFT JOIN users u ON c.created_by = u.id
        WHERE c.id = $1
      `;
            const result = await client.query(query, [id]);
            if (result.rows.length > 0) {
                return {
                    success: true,
                    data: result.rows[0]
                };
            }
            else {
                return {
                    success: false,
                    error: 'المқاول غير موجود'
                };
            }
        }
        catch (error) {
            console.error('Error getting contractor by ID:', error);
            return {
                success: false,
                error: 'فشل في جلب بيانات المقاول'
            };
        }
        finally {
            client.release();
        }
    }
    async updateContractor(id, data, userId) {
        const client = await this.pool.connect();
        try {
            const existingCheck = await client.query('SELECT id FROM contractors WHERE id = $1', [id]);
            if (existingCheck.rows.length === 0) {
                return {
                    success: false,
                    error: 'المقاول غير موجود'
                };
            }
            if (data.full_name) {
                const duplicateCheck = await client.query('SELECT id FROM contractors WHERE full_name = $1 AND id != $2 AND is_active = true', [data.full_name, id]);
                if (duplicateCheck.rows.length > 0) {
                    return {
                        success: false,
                        error: 'يوجد مقاول بنفس الاسم مسبقاً. لا يسمح بالأسماء المكررة.'
                    };
                }
            }
            const updates = [];
            const values = [];
            let paramIndex = 1;
            if (data.full_name !== undefined) {
                updates.push(`full_name = $${paramIndex}`);
                values.push(data.full_name);
                paramIndex++;
            }
            if (data.phone_number !== undefined) {
                updates.push(`phone_number = $${paramIndex}`);
                values.push(data.phone_number);
                paramIndex++;
            }
            if (data.category !== undefined) {
                updates.push(`category = $${paramIndex}`);
                values.push(data.category);
                paramIndex++;
            }
            if (data.notes !== undefined) {
                updates.push(`notes = $${paramIndex}`);
                values.push(data.notes);
                paramIndex++;
            }
            if (updates.length === 0) {
                return {
                    success: false,
                    error: 'لا توجد بيانات للتحديث'
                };
            }
            values.push(id);
            const query = `
        UPDATE contractors 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
        RETURNING *
      `;
            const result = await client.query(query, values);
            if (result.rows.length > 0) {
                return {
                    success: true,
                    data: result.rows[0]
                };
            }
            else {
                return {
                    success: false,
                    error: 'فشل في تحديث بيانات المقاول'
                };
            }
        }
        catch (error) {
            console.error('Error updating contractor:', error);
            if (error.code === '23505' && error.constraint?.includes('full_name')) {
                return {
                    success: false,
                    error: 'يوجد مقاول بنفس الاسم مسبقاً. لا يسمح بالأسماء المكررة.'
                };
            }
            return {
                success: false,
                error: 'حدث خطأ في قاعدة البيانات'
            };
        }
        finally {
            client.release();
        }
    }
    async deleteContractor(id, userId) {
        const client = await this.pool.connect();
        try {
            const query = `
        UPDATE contractors 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND is_active = true
        RETURNING id
      `;
            const result = await client.query(query, [id]);
            if (result.rows.length > 0) {
                return {
                    success: true,
                    data: true
                };
            }
            else {
                return {
                    success: false,
                    error: 'المقاول غير موجود أو محذوف مسبقاً'
                };
            }
        }
        catch (error) {
            console.error('Error deleting contractor:', error);
            return {
                success: false,
                error: 'فشل في حذف المقاول'
            };
        }
        finally {
            client.release();
        }
    }
    async activateContractor(id, userId) {
        const client = await this.pool.connect();
        try {
            const query = `
        UPDATE contractors 
        SET is_active = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
            const result = await client.query(query, [id]);
            if (result.rows.length > 0) {
                return {
                    success: true,
                    data: result.rows[0]
                };
            }
            else {
                return {
                    success: false,
                    error: 'المقاول غير موجود'
                };
            }
        }
        catch (error) {
            console.error('Error activating contractor:', error);
            return {
                success: false,
                error: 'فشل في تفعيل المقاول'
            };
        }
        finally {
            client.release();
        }
    }
    async getContractorsSummary() {
        const client = await this.pool.connect();
        try {
            const totalQuery = 'SELECT COUNT(*) as total, COUNT(CASE WHEN is_active THEN 1 END) as active FROM contractors';
            const totalResult = await client.query(totalQuery);
            const total = parseInt(totalResult.rows[0].total);
            const active = parseInt(totalResult.rows[0].active);
            const inactive = total - active;
            return {
                success: true,
                data: {
                    total,
                    active,
                    inactive
                }
            };
        }
        catch (error) {
            console.error('Error getting contractors summary:', error);
            return {
                success: false,
                error: 'فشل في جلب إحصائيات المقاولين'
            };
        }
        finally {
            client.release();
        }
    }
}
exports.contractorService = new ContractorService();
//# sourceMappingURL=contractorService.js.map