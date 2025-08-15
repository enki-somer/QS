# 🚀 SYSTEM IMPROVEMENTS ROADMAP

## شركة قصر الشام للمقاولات العامة والإنشاءات

**Document Version:** 1.0  
**Created:** January 2025  
**Priority:** High  
**Implementation Complexity:** Advanced (Database Schema + Services + UI)

---

## 📋 **OVERVIEW**

This document outlines critical system improvements focusing on **role-based privileges**, **enhanced project management**, and **advanced safe funding** features. These improvements require careful coordination between database schema, backend services, and frontend interfaces.

---

## 🔐 **1. ENHANCED USER PRIVILEGE SYSTEM**

### **Current State Analysis**

- **Existing Roles:** `admin`, `data_entry` (enum in database)
- **Current Permissions:** Basic role checking in backend middleware
- **Database Schema:** `users` table with `role` field

### **Required Improvements**

#### **1.1 New Role: `partners`**

```sql
-- Database Schema Update
ALTER TYPE user_role ADD VALUE 'partners';

-- Update users table if needed
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'data_entry';
```

#### **1.2 Detailed Role Permissions Matrix**

| **Feature/Action**         | **Admin**      | **Data Entry**  | **Partners** |
| -------------------------- | -------------- | --------------- | ------------ |
| **View Safe Balance**      | ✅ Full Access | ❌ Hidden       | ✅ View Only |
| **View Safe Transactions** | ✅ Full Access | ❌ Hidden       | ✅ View Only |
| **Create Projects**        | ✅ Yes         | ❌ No           | ❌ No        |
| **Edit Projects**          | ✅ All Fields  | ❌ No           | ❌ No        |
| **Delete Projects**        | ✅ Yes         | ❌ No           | ❌ No        |
| **View Project Numbers**   | ✅ Yes         | ❌ Hidden       | ✅ View Only |
| **Create Invoices**        | ✅ Yes         | ✅ Yes          | ❌ No        |
| **Edit Invoices**          | ✅ Yes         | ✅ Pending Only | ❌ No        |
| **Approve Invoices**       | ✅ Yes         | ❌ No           | ❌ No        |
| **Delete Records**         | ✅ Yes         | ❌ No           | ❌ No        |
| **Make Payments**          | ✅ Yes         | ❌ No           | ❌ No        |
| **Edit Safe Funds**        | ✅ Yes         | ❌ No           | ❌ No        |
| **Export Reports**         | ✅ Yes         | ✅ Limited      | ✅ View Only |

#### **1.3 Implementation Requirements**

**Backend Changes:**

```typescript
// backend/src/types/index.ts
export type UserRole = "admin" | "data_entry" | "partners";

export interface RolePermissions {
  // Financial visibility
  canViewSafeBalance: boolean;
  canViewSafeTransactions: boolean;
  canViewProjectNumbers: boolean;
  canViewFinancialReports: boolean;

  // CRUD operations
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canCreateInvoices: boolean;
  canEditInvoices: boolean;
  canApproveInvoices: boolean;
  canDeleteRecords: boolean;

  // Financial operations
  canMakePayments: boolean;
  canEditSafeFunds: boolean;
  canManageExpenses: boolean;

  // Reporting
  canExportReports: boolean;
  canViewDetailedReports: boolean;
}
```

**Frontend Changes:**

```typescript
// sham/src/contexts/AuthContext.tsx
const getRolePermissions = (role: UserRole): RolePermissions => {
  switch (role) {
    case "admin":
      return {
        /* all permissions true */
      };
    case "data_entry":
      return {
        canViewSafeBalance: false,
        canViewProjectNumbers: false,
        canCreateInvoices: true,
        canEditInvoices: true, // pending only
        /* other permissions */
      };
    case "partners":
      return {
        canViewSafeBalance: true,
        canViewProjectNumbers: true,
        // all modification permissions false
        /* view-only access */
      };
  }
};
```

---

## 🏗️ **2. ENHANCED PROJECT MANAGEMENT**

### **Current Project Schema Analysis**

```sql
-- Current projects table fields
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    location VARCHAR(200),
    area DECIMAL(10,2), -- square meters
    budget_estimate DECIMAL(15,2) NOT NULL DEFAULT 0,
    allocated_budget DECIMAL(15,2) DEFAULT 0,
    available_budget DECIMAL(15,2) DEFAULT 0,
    spent_budget DECIMAL(15,2) DEFAULT 0,
    client VARCHAR(150),
    start_date DATE,
    end_date DATE,
    status project_status DEFAULT 'planning',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);
```

### **2.1 New Project Fields Required**

#### **Database Schema Updates**

```sql
-- Add new fields to projects table
ALTER TABLE projects ADD COLUMN price_per_meter DECIMAL(10,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN owner_deal_price DECIMAL(15,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN owner_paid_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN profit_margin DECIMAL(5,2) DEFAULT 0; -- calculated field
ALTER TABLE projects ADD COLUMN construction_cost DECIMAL(15,2) DEFAULT 0; -- calculated field

-- Add comments for clarity
COMMENT ON COLUMN projects.price_per_meter IS 'Price per square meter for construction calculation';
COMMENT ON COLUMN projects.owner_deal_price IS 'Total deal price agreed with project owner';
COMMENT ON COLUMN projects.owner_paid_amount IS 'Amount paid by owner so far (updated from safe transactions)';
COMMENT ON COLUMN projects.profit_margin IS 'Calculated profit percentage';
COMMENT ON COLUMN projects.construction_cost IS 'Total construction cost (price_per_meter * area)';
```

#### **2.2 Project Creation Form Enhancement**

**Frontend Form Fields:**

```typescript
// sham/src/components/projects/CreateProjectModal.tsx
interface CreateProjectFormData {
  // Existing fields
  name: string;
  code: string;
  location?: string;
  area?: number;
  client?: string;
  start_date?: Date;
  end_date?: Date;

  // NEW FIELDS
  price_per_meter: number; // Price per m² for construction
  owner_deal_price: number; // Total deal with owner
  owner_paid_amount: number; // Initial payment from owner

  // Auto-calculated fields (display only)
  construction_cost?: number; // area * price_per_meter
  estimated_profit?: number; // owner_deal_price - construction_cost
  profit_margin?: number; // (estimated_profit / owner_deal_price) * 100
}
```

#### **2.3 Project Details Display Enhancement**

**Enhanced Project Dashboard:**

```typescript
// Project financial summary section
<div className="financial-summary">
  <div className="deal-info">
    <h3>معلومات الصفقة</h3>
    <p>سعر المتر المربع: {project.price_per_meter?.toLocaleString()} د.ع</p>
    <p>المساحة: {project.area} متر مربع</p>
    <p>تكلفة الإنشاء: {project.construction_cost?.toLocaleString()} د.ع</p>
    <p>
      سعر الصفقة مع المالك: {project.owner_deal_price?.toLocaleString()} د.ع
    </p>
    <p>هامش الربح المتوقع: {project.profit_margin}%</p>
  </div>

  <div className="payment-tracking">
    <h3>متابعة المدفوعات</h3>
    <p>
      المبلغ المدفوع من المالك: {project.owner_paid_amount?.toLocaleString()}{" "}
      د.ع
    </p>
    <p>
      المبلغ المتبقي:{" "}
      {(project.owner_deal_price - project.owner_paid_amount)?.toLocaleString()}{" "}
      د.ع
    </p>
    <p>المنفق من الميزانية: {project.spent_budget?.toLocaleString()} د.ع</p>
    <p>
      الربح الحالي:{" "}
      {(project.owner_paid_amount - project.spent_budget)?.toLocaleString()} د.ع
    </p>
  </div>
</div>
```

#### **2.4 Admin-Only Editing Restrictions**

**Backend Validation:**

```typescript
// backend/src/routes/projects.ts
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    // Check if user is admin for sensitive field updates
    const userRole = req.user?.role;
    const sensitiveFields = [
      "budget_estimate",
      "price_per_meter",
      "owner_deal_price",
    ];

    const hasSensitiveUpdates = sensitiveFields.some((field) =>
      req.body.hasOwnProperty(field)
    );

    if (hasSensitiveUpdates && userRole !== "admin") {
      return res.status(403).json({
        error: "Access denied",
        userMessage: "غير مسموح - يتطلب صلاحيات المدير",
      });
    }

    // Proceed with update...
  } catch (error) {
    // Handle error
  }
});
```

---

## 💰 **3. ADVANCED SAFE FUNDING SYSTEM**

### **Current Safe Schema Analysis**

```sql
-- Current safe_transactions table
CREATE TABLE safe_transactions (
    id UUID PRIMARY KEY,
    type transaction_type NOT NULL, -- 'funding', 'invoice_payment', etc.
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    project_id UUID REFERENCES projects(id), -- nullable
    project_name VARCHAR(200),
    funding_source VARCHAR(100), -- current field
    funding_notes TEXT,
    previous_balance DECIMAL(15,2) NOT NULL,
    new_balance DECIMAL(15,2) NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **3.1 Enhanced Safe Funding Features**

#### **3.1.1 Project-Linked Funding Source**

**Database Schema Updates:**

```sql
-- Add project linking and batch tracking to safe_transactions
ALTER TABLE safe_transactions ADD COLUMN batch_number INTEGER DEFAULT 1;
ALTER TABLE safe_transactions ADD COLUMN is_edited BOOLEAN DEFAULT false;
ALTER TABLE safe_transactions ADD COLUMN edit_reason TEXT;
ALTER TABLE safe_transactions ADD COLUMN edited_by UUID REFERENCES users(id);
ALTER TABLE safe_transactions ADD COLUMN edited_at TIMESTAMP;

-- Create index for better performance
CREATE INDEX idx_safe_transactions_project_batch ON safe_transactions(project_id, batch_number);
CREATE INDEX idx_safe_transactions_funding_source ON safe_transactions(funding_source);
```

#### **3.1.2 Dynamic Funding Source Dropdown**

**Backend API Enhancement:**

```typescript
// backend/src/routes/safe.ts
router.get("/funding-sources", authenticateToken, async (req, res) => {
  try {
    // Get all projects for funding source dropdown
    const projectsResult = await getPool().query(`
      SELECT id, name, code, owner_deal_price, owner_paid_amount,
        (owner_deal_price - COALESCE(owner_paid_amount, 0)) as remaining_amount
      FROM projects 
      WHERE status IN ('planning', 'active')
      ORDER BY name
    `);

    // Get existing funding batches per project
    const batchesResult = await getPool().query(`
      SELECT project_id, MAX(batch_number) as max_batch
      FROM safe_transactions 
      WHERE type = 'funding' AND project_id IS NOT NULL
      GROUP BY project_id
    `);

    const batchMap = new Map();
    batchesResult.rows.forEach((row) => {
      batchMap.set(row.project_id, row.max_batch);
    });

    // Prepare funding sources
    const fundingSources = [
      { type: "general", label: "تمويل عام", value: "تمويل عام" },
      { type: "rental", label: "إيجارات", value: "إيجارات" },
      { type: "factory", label: "مصنع", value: "مصنع" },
      { type: "contracts", label: "مقاولات أخرى", value: "مقاولات أخرى" },
    ];

    // Add project-specific sources
    projectsResult.rows.forEach((project) => {
      const currentBatch = (batchMap.get(project.id) || 0) + 1;
      fundingSources.push({
        type: "project",
        label: `${project.name} - الدفعة ${currentBatch}`,
        value: `مشروع ${project.name} - الدفعة ${currentBatch}`,
        projectId: project.id,
        batchNumber: currentBatch,
        remainingAmount: project.remaining_amount,
      });
    });

    res.json({ success: true, fundingSources });
  } catch (error) {
    res.status(500).json({ error: "Failed to get funding sources" });
  }
});
```

#### **3.1.3 Admin Fund Editing with Audit Trail**

**Backend Fund Edit Endpoint:**

```typescript
// backend/src/routes/safe.ts
router.put(
  "/transactions/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, description, edit_reason } = req.body;
      const userId = req.user?.id;

      const client = await getPool().connect();
      await client.query("BEGIN");

      // Get original transaction
      const originalResult = await client.query(
        "SELECT * FROM safe_transactions WHERE id = $1",
        [id]
      );

      if (originalResult.rows.length === 0) {
        throw new Error("Transaction not found");
      }

      const original = originalResult.rows[0];
      const amountDifference = amount - original.amount;

      // Update transaction with edit flags
      await client.query(
        `
      UPDATE safe_transactions 
      SET amount = $1, description = $2, is_edited = true, 
          edit_reason = $3, edited_by = $4, edited_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `,
        [amount, description, edit_reason, userId, id]
      );

      // Adjust safe balance
      await client.query(
        `
      UPDATE safe_state 
      SET current_balance = current_balance + $1,
          last_updated = CURRENT_TIMESTAMP,
          updated_by = $2
      WHERE id = 1
    `,
        [amountDifference, userId]
      );

      // Update project payment tracking if it's a project funding
      if (original.project_id) {
        await client.query(
          `
        UPDATE projects 
        SET owner_paid_amount = owner_paid_amount + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
          [amountDifference, original.project_id]
        );
      }

      await client.query("COMMIT");
      res.json({ success: true, message: "تم تعديل المعاملة بنجاح" });
    } catch (error) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: "فشل في تعديل المعاملة" });
    } finally {
      client.release();
    }
  }
);
```

#### **3.1.4 Project Payment Tracking Integration**

**Automatic Project Payment Updates:**

```sql
-- Create trigger to update project payments when safe funding occurs
CREATE OR REPLACE FUNCTION update_project_payments()
RETURNS TRIGGER AS $$
BEGIN
    -- Only for funding transactions linked to projects
    IF NEW.type = 'funding' AND NEW.project_id IS NOT NULL THEN
        UPDATE projects
        SET owner_paid_amount = COALESCE(owner_paid_amount, 0) + NEW.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.project_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_payments
    AFTER INSERT ON safe_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_project_payments();
```

---

## 🔄 **4. IMPLEMENTATION PHASES**

### **Phase 1: Database Schema Updates (Week 1)**

- [ ] Add `partners` role to user_role enum
- [ ] Add new project fields (price_per_meter, owner_deal_price, etc.)
- [ ] Add safe transaction editing fields (is_edited, edit_reason, etc.)
- [ ] Create project payment tracking trigger
- [ ] Update all existing projects with default values

### **Phase 2: Backend API Enhancement (Week 2)**

- [ ] Update user role permissions system
- [ ] Add project-linked funding sources endpoint
- [ ] Implement safe transaction editing with audit trail
- [ ] Add admin-only project field validation
- [ ] Update project service with new financial calculations

### **Phase 3: Frontend UI Updates (Week 3)**

- [ ] Implement role-based UI restrictions
- [ ] Update project creation form with new fields
- [ ] Enhance project details with financial dashboard
- [ ] Add dynamic funding source dropdown
- [ ] Implement safe transaction editing interface

### **Phase 4: Testing & Deployment (Week 4)**

- [ ] Comprehensive testing of all role permissions
- [ ] Test project financial calculations
- [ ] Test safe funding with project linking
- [ ] User acceptance testing
- [ ] Production deployment with data migration

---

## ⚠️ **CRITICAL IMPLEMENTATION NOTES**

### **Database Considerations**

1. **Data Migration Required:** All existing projects need default values for new fields
2. **Trigger Dependencies:** Safe transaction triggers must be tested thoroughly
3. **Index Performance:** New indexes required for project-batch queries
4. **Constraint Validation:** Ensure financial calculations remain consistent

### **Security Considerations**

1. **Role Validation:** All API endpoints must validate user roles
2. **Audit Trail:** All financial edits must be logged
3. **Data Integrity:** Financial calculations must be atomic operations
4. **Access Control:** Partners role must be truly read-only

### **Frontend Considerations**

1. **State Management:** Complex financial data requires careful state management
2. **Real-time Updates:** Project financial data should update in real-time
3. **Error Handling:** Clear error messages for permission violations
4. **Performance:** Large project lists need pagination/virtualization

---

## 📊 **SUCCESS METRICS**

### **Technical Metrics**

- [ ] All API endpoints respect role permissions (100%)
- [ ] Financial calculations accurate to 2 decimal places
- [ ] Safe balance updates remain consistent
- [ ] Project payment tracking synchronized

### **Business Metrics**

- [ ] Admin can manage all system aspects
- [ ] Data entry users cannot see financial numbers
- [ ] Partners have read-only access to all data
- [ ] Project profitability clearly visible
- [ ] Owner payment tracking accurate

### **User Experience Metrics**

- [ ] Role-appropriate UI elements shown/hidden
- [ ] Financial dashboards provide clear insights
- [ ] Safe funding process streamlined with project linking
- [ ] Edit audit trail provides transparency

---

## 🚀 **NEXT STEPS FOR IMPLEMENTATION**

1. **Review and Approve:** Stakeholder review of this roadmap
2. **Database Backup:** Full backup before schema changes
3. **Development Environment:** Implement changes in dev first
4. **Testing Protocol:** Comprehensive testing plan for each phase
5. **Production Deployment:** Staged rollout with rollback plan

---

**Document Owner:** System Development Team  
**Last Updated:** January 2025  
**Next Review:** After Phase 1 Completion
