import { Pool, PoolClient } from 'pg';
import { getPool } from '../config';
import {
  Contractor,
  CreateContractorData,
  ContractorFilter,
  DatabaseResult,
  PaginatedResult
} from '../types';

class ContractorService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Create a new contractor
   */
  async createContractor(data: CreateContractorData, userId?: string): Promise<DatabaseResult<Contractor>> {
    const client: PoolClient = await this.pool.connect();
    
    try {
      // Check for duplicate name
      const duplicateCheck = await client.query(
        'SELECT id FROM contractors WHERE full_name = $1 AND is_active = true',
        [data.full_name]
      );

      if (duplicateCheck.rows.length > 0) {
        return {
          success: false,
          error: 'يوجد مقاول بنفس الاسم مسبقاً. لا يسمح بالأسماء المكررة.'
        };
      }

      // Insert new contractor
      const query = `
        INSERT INTO contractors (full_name, phone_number, category, notes, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const values = [
        data.full_name,
        data.phone_number,
        data.category,
        data.notes || null,
        userId || null
      ];

      const result = await client.query(query, values);

      if (result.rows.length > 0) {
        return {
          success: true,
          data: result.rows[0] as Contractor
        };
      } else {
        return {
          success: false,
          error: 'فشل في إضافة المقاول'
        };
      }
    } catch (error: any) {
      console.error('Error creating contractor:', error);
      
      // Handle unique constraint error
      if (error.code === '23505' && error.constraint === 'contractors_full_name_key') {
        return {
          success: false,
          error: 'يوجد مقاول بنفس الاسم مسبقاً. لا يسمح بالأسماء المكررة.'
        };
      }

      return {
        success: false,
        error: 'حدث خطأ في قاعدة البيانات'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get contractors with optional filtering and pagination
   */
  async getContractors(
    filter: ContractorFilter = {},
    page: number = 1,
    limit: number = 50
  ): Promise<DatabaseResult<PaginatedResult<Contractor>>> {
    const client: PoolClient = await this.pool.connect();
    
    try {
      // Build WHERE clause
      const conditions: string[] = [];
      const values: any[] = [];
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

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM contractors ${whereClause}`;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated data
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
          data: dataResult.rows as Contractor[],
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error: any) {
      console.error('Error getting contractors:', error);
      return {
        success: false,
        error: 'فشل في جلب بيانات المقاولين'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get contractor by ID
   */
  async getContractorById(id: string): Promise<DatabaseResult<Contractor>> {
    const client: PoolClient = await this.pool.connect();
    
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
          data: result.rows[0] as Contractor
        };
      } else {
        return {
          success: false,
          error: 'المқاول غير موجود'
        };
      }
    } catch (error: any) {
      console.error('Error getting contractor by ID:', error);
      return {
        success: false,
        error: 'فشل في جلب بيانات المقاول'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Update contractor
   */
  async updateContractor(
    id: string,
    data: Partial<CreateContractorData>,
    userId?: string
  ): Promise<DatabaseResult<Contractor>> {
    const client: PoolClient = await this.pool.connect();
    
    try {
      // Check if contractor exists
      const existingCheck = await client.query('SELECT id FROM contractors WHERE id = $1', [id]);
      if (existingCheck.rows.length === 0) {
        return {
          success: false,
          error: 'المقاول غير موجود'
        };
      }

      // Check for duplicate name if name is being updated
      if (data.full_name) {
        const duplicateCheck = await client.query(
          'SELECT id FROM contractors WHERE full_name = $1 AND id != $2 AND is_active = true',
          [data.full_name, id]
        );

        if (duplicateCheck.rows.length > 0) {
          return {
            success: false,
            error: 'يوجد مقاول بنفس الاسم مسبقاً. لا يسمح بالأسماء المكررة.'
          };
        }
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
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

      // Add ID to values array
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
          data: result.rows[0] as Contractor
        };
      } else {
        return {
          success: false,
          error: 'فشل في تحديث بيانات المقاول'
        };
      }
    } catch (error: any) {
      console.error('Error updating contractor:', error);
      
      // Handle unique constraint error
      if (error.code === '23505' && error.constraint === 'contractors_full_name_key') {
        return {
          success: false,
          error: 'يوجد مقاول بنفس الاسم مسبقاً. لا يسمح بالأسماء المكررة.'
        };
      }

      return {
        success: false,
        error: 'حدث خطأ في قاعدة البيانات'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Delete contractor (soft delete by setting is_active to false)
   */
  async deleteContractor(id: string, userId?: string): Promise<DatabaseResult<boolean>> {
    const client: PoolClient = await this.pool.connect();
    
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
      } else {
        return {
          success: false,
          error: 'المقاول غير موجود أو محذوف مسبقاً'
        };
      }
    } catch (error: any) {
      console.error('Error deleting contractor:', error);
      return {
        success: false,
        error: 'فشل في حذف المقاول'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Activate contractor (restore from soft delete)
   */
  async activateContractor(id: string, userId?: string): Promise<DatabaseResult<Contractor>> {
    const client: PoolClient = await this.pool.connect();
    
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
          data: result.rows[0] as Contractor
        };
      } else {
        return {
          success: false,
          error: 'المقاول غير موجود'
        };
      }
    } catch (error: any) {
      console.error('Error activating contractor:', error);
      return {
        success: false,
        error: 'فشل في تفعيل المقاول'
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get contractors summary/statistics
   */
  async getContractorsSummary(): Promise<DatabaseResult<{
    total: number;
    active: number;
    inactive: number;
    byCategory: { [key: string]: number };
  }>> {
    const client: PoolClient = await this.pool.connect();
    
    try {
      // Get total and active counts
      const totalQuery = 'SELECT COUNT(*) as total, COUNT(CASE WHEN is_active THEN 1 END) as active FROM contractors';
      const totalResult = await client.query(totalQuery);

      // Get by category counts
      const categoryQuery = 'SELECT category, COUNT(*) as count FROM contractors WHERE is_active = true GROUP BY category';
      const categoryResult = await client.query(categoryQuery);

      const total = parseInt(totalResult.rows[0].total);
      const active = parseInt(totalResult.rows[0].active);
      const inactive = total - active;

      const byCategory: { [key: string]: number } = {};
      categoryResult.rows.forEach(row => {
        byCategory[row.category] = parseInt(row.count);
      });

      return {
        success: true,
        data: {
          total,
          active,
          inactive,
          byCategory
        }
      };
    } catch (error: any) {
      console.error('Error getting contractors summary:', error);
      return {
        success: false,
        error: 'فشل في جلب إحصائيات المقاولين'
      };
    } finally {
      client.release();
    }
  }
}

export const contractorService = new ContractorService(); 