"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../config");
class CategoryInvoiceService {
    async checkDuplicateCustomerInvoiceNumber(customerInvoiceNumber) {
        const client = await (0, config_1.getPool)().connect();
        try {
            const duplicateQuery = `
        SELECT 
          i.customer_invoice_number,
          i.invoice_number,
          p.name as project_name,
          p.code as project_code,
          COALESCE(c.full_name, 'غير محدد') as contractor_name,
          i.status,
          i.created_at
        FROM invoices i
        LEFT JOIN projects p ON i.project_id = p.id
        LEFT JOIN project_category_assignments pca ON i.category_assignment_id = pca.id
        LEFT JOIN contractors c ON pca.contractor_id = c.id
        WHERE i.customer_invoice_number = $1
        AND i.customer_invoice_number IS NOT NULL
        AND i.customer_invoice_number != ''
        ORDER BY i.created_at DESC
        LIMIT 1
      `;
            const result = await client.query(duplicateQuery, [customerInvoiceNumber.trim()]);
            if (result.rows.length > 0) {
                return result.rows[0];
            }
            return null;
        }
        catch (error) {
            console.error('Error checking duplicate customer invoice number:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async createCategoryInvoice(data, createdBy) {
        const client = await (0, config_1.getPool)().connect();
        try {
            await client.query('BEGIN');
            console.log('🔍 CategoryInvoiceService DEBUG: createdBy parameter:', createdBy);
            if (!createdBy) {
                console.log('❌ CategoryInvoiceService: No createdBy user provided');
                throw new Error('User authentication required - no user ID provided');
            }
            const assignmentQuery = `
        SELECT * FROM project_category_assignments 
        WHERE id = $1 AND project_id = $2
      `;
            const assignmentResult = await client.query(assignmentQuery, [data.categoryAssignmentId, data.projectId]);
            if (assignmentResult.rows.length === 0) {
                throw new Error('Category assignment not found');
            }
            const assignment = assignmentResult.rows[0];
            console.log(`📋 Creating invoice for assignment: ${assignment.id} (${assignment.main_category} - ${assignment.subcategory})`);
            const invoiceQuery = `
        INSERT INTO invoices (
          project_id, category_assignment_id, category_name, subcategory_name,
          invoice_number, amount, subtotal, date, notes, status, submitted_by,
          customer_invoice_number, attachment_data, attachment_filename, 
          attachment_size, attachment_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;
            const invoiceValues = [
                data.projectId,
                data.categoryAssignmentId,
                data.categoryName,
                data.subcategoryName,
                data.invoiceNumber,
                data.amount,
                data.amount,
                data.date,
                data.notes,
                'pending_approval',
                createdBy,
                data.customerInvoiceNumber || null,
                data.attachmentData || null,
                data.attachmentFilename || null,
                data.attachmentSize || null,
                data.attachmentType || null
            ];
            console.log('🔍 CategoryInvoiceService DEBUG: Executing invoice insert query...');
            console.log('🔍 CategoryInvoiceService DEBUG: Query values:', invoiceValues);
            const invoiceResult = await client.query(invoiceQuery, invoiceValues);
            const invoice = invoiceResult.rows[0];
            console.log('✅ CategoryInvoiceService DEBUG: Invoice created successfully:', invoice.id);
            const lineItemQuery = `
        INSERT INTO invoice_line_items (
          invoice_id, description, quantity, unit_price, total
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
            const lineItemValues = [
                invoice.id,
                data.description,
                1,
                data.amount,
                data.amount
            ];
            await client.query(lineItemQuery, lineItemValues);
            const updateAssignmentQuery = `
        UPDATE project_category_assignments 
        SET 
          invoice_count = invoice_count + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
            await client.query(updateAssignmentQuery, [data.categoryAssignmentId]);
            await client.query('COMMIT');
            return {
                ...invoice,
                categoryAssignmentId: data.categoryAssignmentId,
                categoryName: data.categoryName,
                subcategoryName: data.subcategoryName,
                assignmentDetails: assignment,
                customerInvoiceNumber: invoice.customer_invoice_number,
                attachmentData: invoice.attachment_data,
                attachmentFilename: invoice.attachment_filename,
                attachmentSize: invoice.attachment_size,
                attachmentType: invoice.attachment_type
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ CategoryInvoiceService ERROR:', error);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error detail:', error.detail);
            console.error('❌ Error constraint:', error.constraint);
            console.error('❌ Error code:', error.code);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async getCategoryInvoices(categoryAssignmentId) {
        const query = `
      SELECT 
        i.*,
        pca.main_category as category_name,
        pca.subcategory as subcategory_name,
        pca.contractor_name,
        pca.estimated_amount,
        pca.has_approved_invoice
      FROM invoices i
      JOIN project_category_assignments pca ON i.category_assignment_id = pca.id
      WHERE i.category_assignment_id = $1
      ORDER BY i.created_at DESC
    `;
        const result = await (0, config_1.getPool)().query(query, [categoryAssignmentId]);
        return result.rows.map((row) => ({
            ...row,
            categoryAssignmentId: row.category_assignment_id,
            categoryName: row.category_name,
            subcategoryName: row.subcategory_name,
            customerInvoiceNumber: row.customer_invoice_number,
            attachmentData: row.attachment_data,
            attachmentFilename: row.attachment_filename,
            attachmentSize: row.attachment_size,
            attachmentType: row.attachment_type,
            assignmentDetails: {
                id: categoryAssignmentId,
                main_category: row.category_name,
                subcategory: row.subcategory_name,
                contractor_name: row.contractor_name,
                estimated_amount: row.estimated_amount,
                has_approved_invoice: row.has_approved_invoice
            }
        }));
    }
    async getInvoicesByProjectAndCategory(projectId, categoryName) {
        const categoryIdToName = {
            "implementation_construction": "أعمال تنفيذية وإنشائية",
            "materials_supply": "تجهيز مواد البناء والتشطيب",
            "specialized_works": "أعمال متخصصة وتنفيذ متكامل",
            "administrative_operational": "إدارية وتشغيلية",
        };
        const arabicCategoryName = categoryIdToName[categoryName] || categoryName;
        const query = `
      SELECT 
        i.*,
        pca.main_category as category_name,
        pca.subcategory as subcategory_name,
        u.full_name as submitted_by_name,
        u_approved.full_name as approved_by_name
      FROM invoices i
      JOIN project_category_assignments pca ON i.category_assignment_id = pca.id
      LEFT JOIN users u ON i.submitted_by = u.id
      LEFT JOIN users u_approved ON i.approved_by = u_approved.id  
      WHERE i.project_id = $1 AND pca.main_category = $2
      ORDER BY i.created_at DESC
    `;
        try {
            const pool = (0, config_1.getPool)();
            const result = await pool.query(query, [projectId, arabicCategoryName]);
            console.log('🔍 DEBUG: Found', result.rows.length, 'invoices for category:', arabicCategoryName);
            return result.rows.map((row) => ({
                id: row.id,
                invoice_number: row.invoice_number,
                amount: parseFloat(row.amount),
                date: row.date,
                status: row.status,
                notes: row.notes,
                category_name: row.category_name,
                subcategory_name: row.subcategory_name,
                submitted_by: row.submitted_by,
                submitted_by_name: row.submitted_by_name,
                approved_by: row.approved_by,
                approved_by_name: row.approved_by_name,
                approved_at: row.approved_at,
                rejection_reason: row.rejection_reason,
                created_at: row.created_at,
                updated_at: row.updated_at,
                customerInvoiceNumber: row.customer_invoice_number,
                attachmentData: row.attachment_data,
                attachmentFilename: row.attachment_filename,
                attachmentSize: row.attachment_size,
                attachmentType: row.attachment_type
            }));
        }
        catch (error) {
            console.error('Error fetching invoices by project and category:', error);
            throw error;
        }
    }
    async getInvoiceCountsByProject(projectId) {
        const categoryNameToId = {
            "أعمال تنفيذية وإنشائية": "implementation_construction",
            "تجهيز مواد البناء والتشطيب": "materials_supply",
            "أعمال متخصصة وتنفيذ متكامل": "specialized_works",
            "إدارية وتشغيلية": "administrative_operational",
        };
        const query = `
      SELECT 
        pca.main_category,
        COUNT(i.id) as invoice_count
      FROM project_category_assignments pca
      LEFT JOIN invoices i ON i.category_assignment_id = pca.id
      WHERE pca.project_id = $1
      GROUP BY pca.main_category
    `;
        try {
            const pool = (0, config_1.getPool)();
            const result = await pool.query(query, [projectId]);
            const counts = {};
            result.rows.forEach((row) => {
                const englishCategoryId = categoryNameToId[row.main_category] || row.main_category;
                counts[englishCategoryId] = parseInt(row.invoice_count) || 0;
            });
            console.log('🔍 DEBUG: Invoice counts by category:', counts);
            return counts;
        }
        catch (error) {
            console.error('Error fetching invoice counts:', error);
            throw error;
        }
    }
    async getProjectCategoryInvoiceStatus(projectId) {
        const query = `
      SELECT 
        pca.id as assignment_id,
        pca.main_category,
        pca.subcategory,
        pca.contractor_name,
        pca.estimated_amount,
        pca.actual_amount,
        pca.has_approved_invoice,
        pca.invoice_count,
        pca.status as assignment_status,
        CASE 
          WHEN pca.has_approved_invoice THEN 'locked'
          ELSE 'editable'
        END as edit_status,
        COUNT(i.id) as total_invoices,
        SUM(CASE WHEN i.status = 'pending_approval' THEN 1 ELSE 0 END) as pending_invoices,
        SUM(CASE WHEN i.status = 'approved' THEN 1 ELSE 0 END) as approved_invoices,
        SUM(CASE WHEN i.status = 'paid' THEN 1 ELSE 0 END) as paid_invoices,
        MAX(i.date) as last_invoice_date
      FROM project_category_assignments pca
      LEFT JOIN invoices i ON pca.id = i.category_assignment_id
      WHERE pca.project_id = $1
      GROUP BY 
        pca.id, pca.main_category, pca.subcategory, pca.contractor_name,
        pca.estimated_amount, pca.actual_amount, pca.has_approved_invoice,
        pca.invoice_count, pca.status
      ORDER BY pca.main_category, pca.subcategory
    `;
        const result = await (0, config_1.getPool)().query(query, [projectId]);
        return result.rows;
    }
    async getAllPendingCategoryInvoices() {
        const query = `
      SELECT 
        i.*,
        pca.main_category as category_name,
        pca.subcategory as subcategory_name,
        pca.contractor_name,
        pca.estimated_amount,
        pca.has_approved_invoice,
        p.name as project_name,
        creator.full_name as submitted_by_name,
        approver.full_name as approved_by_name
      FROM invoices i
      JOIN project_category_assignments pca ON i.category_assignment_id = pca.id
      JOIN projects p ON i.project_id = p.id
      LEFT JOIN users creator ON i.submitted_by = creator.id
      LEFT JOIN users approver ON i.approved_by = approver.id
      WHERE i.status = 'pending_approval'
      ORDER BY i.created_at DESC
    `;
        const result = await (0, config_1.getPool)().query(query);
        const mappedRows = result.rows.map((row) => {
            const mappedRow = {
                id: row.id,
                projectId: row.project_id,
                categoryAssignmentId: row.category_assignment_id,
                categoryName: row.category_name,
                subcategoryName: row.subcategory_name,
                contractorName: row.contractor_name,
                invoiceNumber: row.invoice_number,
                amount: parseFloat(row.amount),
                subtotal: parseFloat(row.subtotal),
                date: row.date,
                dueDate: row.due_date,
                notes: row.notes,
                status: row.status,
                submittedBy: row.submitted_by,
                approvedBy: row.approved_by,
                approvedAt: row.approved_at,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                projectName: row.project_name,
                submittedByName: row.submitted_by_name,
                approvedByName: row.approved_by_name,
                estimatedAmount: parseFloat(row.estimated_amount || 0),
                hasApprovedInvoice: row.has_approved_invoice,
                customerInvoiceNumber: row.customer_invoice_number,
                attachmentData: row.attachment_data,
                attachmentFilename: row.attachment_filename,
                attachmentSize: row.attachment_size,
                attachmentType: row.attachment_type
            };
            if (row.customer_invoice_number || row.attachment_data) {
                console.log('🔍 Backend Debug - Invoice with attachment:', {
                    invoiceId: row.id,
                    invoiceNumber: row.invoice_number,
                    customerInvoiceNumber: row.customer_invoice_number,
                    hasAttachmentData: !!row.attachment_data,
                    attachmentType: row.attachment_type,
                    attachmentSize: row.attachment_size
                });
            }
            return mappedRow;
        });
        console.log(`📋 getAllPendingCategoryInvoices returning ${mappedRows.length} invoices`);
        return mappedRows;
    }
    async getAllCategoryInvoices() {
        const query = `
      SELECT 
        i.*,
        pca.main_category as category_name,
        pca.subcategory as subcategory_name,
        pca.contractor_name,
        pca.estimated_amount,
        pca.has_approved_invoice,
        p.name as project_name,
        creator.full_name as submitted_by_name,
        approver.full_name as approved_by_name
      FROM invoices i
      JOIN project_category_assignments pca ON i.category_assignment_id = pca.id
      JOIN projects p ON i.project_id = p.id
      LEFT JOIN users creator ON i.submitted_by = creator.id
      LEFT JOIN users approver ON i.approved_by = approver.id
      ORDER BY i.created_at DESC
    `;
        const result = await (0, config_1.getPool)().query(query);
        const mappedRows = result.rows.map((row) => {
            const mappedRow = {
                id: row.id,
                projectId: row.project_id,
                categoryAssignmentId: row.category_assignment_id,
                categoryName: row.category_name,
                subcategoryName: row.subcategory_name,
                contractorName: row.contractor_name,
                invoiceNumber: row.invoice_number,
                amount: parseFloat(row.amount),
                subtotal: parseFloat(row.subtotal),
                date: row.date,
                dueDate: row.due_date,
                notes: row.notes,
                status: row.status,
                submittedBy: row.submitted_by,
                approvedBy: row.approved_by,
                approvedAt: row.approved_at,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                projectName: row.project_name,
                submittedByName: row.submitted_by_name,
                approvedByName: row.approved_by_name,
                estimatedAmount: parseFloat(row.estimated_amount || 0),
                hasApprovedInvoice: row.has_approved_invoice
            };
            return mappedRow;
        });
        console.log(`📋 getAllCategoryInvoices returning ${mappedRows.length} invoices`);
        return mappedRows;
    }
    async canEditCategoryAssignment(assignmentId) {
        const query = `
      SELECT has_approved_invoice 
      FROM project_category_assignments 
      WHERE id = $1
    `;
        const result = await (0, config_1.getPool)().query(query, [assignmentId]);
        if (result.rows.length === 0) {
            throw new Error('Category assignment not found');
        }
        return !result.rows[0].has_approved_invoice;
    }
    async approveCategoryInvoice(invoiceId, approvedBy) {
        const client = await (0, config_1.getPool)().connect();
        try {
            await client.query('BEGIN');
            const invoiceQuery = `
        SELECT i.*, p.name as project_name 
        FROM invoices i
        JOIN projects p ON i.project_id = p.id
        WHERE i.id = $1 AND i.status = 'pending_approval'
      `;
            const invoiceDetails = await client.query(invoiceQuery, [invoiceId]);
            if (invoiceDetails.rows.length === 0) {
                throw new Error('Invoice not found or not in pending status');
            }
            const invoice = invoiceDetails.rows[0];
            const updateInvoiceQuery = `
        UPDATE invoices 
        SET 
          status = 'approved',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
            const invoiceResult = await client.query(updateInvoiceQuery, [approvedBy, invoiceId]);
            console.log(`💰 Deducting ${invoice.amount} from safe for invoice ${invoice.invoice_number}`);
            const deductionResult = await client.query(`
        SELECT deduct_from_safe_for_invoice($1, $2, $3, $4, $5, $6) as success
      `, [
                invoice.amount,
                invoice.project_id,
                invoice.project_name,
                invoice.id,
                invoice.invoice_number,
                approvedBy
            ]);
            if (!deductionResult.rows[0]?.success) {
                throw new Error('Failed to deduct from safe - insufficient balance or system error');
            }
            console.log(`✅ Safe deduction successful for invoice ${invoice.invoice_number}`);
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error in approveCategoryInvoice:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async rejectCategoryInvoice(invoiceId, rejectedBy, rejectionReason) {
        const client = await (0, config_1.getPool)().connect();
        try {
            await client.query('BEGIN');
            const updateInvoiceQuery = `
        UPDATE invoices 
        SET 
          status = 'rejected',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP,
          notes = CASE 
            WHEN notes IS NULL OR notes = '' THEN $3
            ELSE notes || E'\n\n' || 'سبب الرفض: ' || $3
          END
        WHERE id = $2 AND status = 'pending_approval'
        RETURNING category_assignment_id, amount
      `;
            const defaultReason = rejectionReason || 'تم الرفض من المدير - يرجى مراجعة البيانات';
            const invoiceResult = await client.query(updateInvoiceQuery, [rejectedBy, invoiceId, defaultReason]);
            if (invoiceResult.rows.length === 0) {
                throw new Error('Invoice not found or not in pending status');
            }
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.default = new CategoryInvoiceService();
//# sourceMappingURL=categoryInvoiceService.js.map