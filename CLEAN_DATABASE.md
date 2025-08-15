# 🗑️ Clean All Data - Start Fresh

## 🔥 **Method 1: Using SQL Script (Recommended)**

Connect to your PostgreSQL database and run:

```sql
-- Clean all data and start fresh
\i backend/database/reset-all-data.sql

-- Add the budget columns (if not already added)
\i backend/database/add-budget-columns.sql

-- Verify clean state
SELECT 'Safe State' as item, current_balance, total_funded, total_spent FROM safe_state WHERE id = 1;
SELECT 'Projects Count' as item, COUNT(*) as count FROM projects;
SELECT 'Contractors Count' as item, COUNT(*) as count FROM contractors;
SELECT 'Invoices Count' as item, COUNT(*) as count FROM invoices;
```

## 🔧 **Method 2: Manual SQL Commands**

If you prefer to run commands manually:

```sql
-- 1. Drop all data (in correct order to avoid FK constraints)
TRUNCATE TABLE safe_transactions CASCADE;
TRUNCATE TABLE invoice_line_items CASCADE;
TRUNCATE TABLE invoices CASCADE;
TRUNCATE TABLE project_category_assignments CASCADE;
TRUNCATE TABLE general_expenses CASCADE;
TRUNCATE TABLE employees CASCADE;
TRUNCATE TABLE contractors CASCADE;
TRUNCATE TABLE projects CASCADE;
TRUNCATE TABLE audit_log CASCADE;

-- 2. Reset safe state to zero
UPDATE safe_state
SET
    current_balance = 0,
    total_funded = 0,
    total_spent = 0,
    last_updated = CURRENT_TIMESTAMP,
    updated_by = NULL
WHERE id = 1;

-- 3. Verify everything is clean
SELECT 'Data cleaned successfully!' as status;
```

## 🚀 **Method 3: Complete Reset + Test Data**

To clean and add test data:

```sql
-- Clean everything
\i backend/database/reset-all-data.sql

-- Add budget columns
\i backend/database/add-budget-columns.sql

-- Add test data and verify financial flow
\i backend/database/test-complete-flow.sql
```

## 📋 **How to Connect to PostgreSQL:**

### Option A: Command Line

```bash
# Replace with your database details
psql -U your_username -d your_database_name -h localhost -p 5432
```

### Option B: pgAdmin

1. Open pgAdmin
2. Connect to your database
3. Open Query Tool
4. Paste and run the SQL commands

## ✅ **After Cleaning:**

1. **Restart your backend server**:

   ```bash
   cd backend
   npm run dev
   ```

2. **Refresh your frontend** - you should see:
   - Empty projects list
   - Safe balance: 0 IQD
   - No transactions
   - Clean slate to test the financial logic

## 🧪 **Test the Clean System:**

After cleaning, test the financial flow:

1. **Fund Safe**: Add 1,000,000 IQD
2. **Create Project**: 200,000 IQD budget
3. **Add Contractor**: Create contractor
4. **Create Assignment**: 50,000 IQD to contractor
5. **Create Invoice**: 25,000 IQD invoice
6. **Approve Invoice**: Should deduct from safe

Expected results:

- Safe Balance: 975,000 IQD
- Project Available Budget: 150,000 IQD
- Assignment Remaining: 25,000 IQD

## 🔴 **Warning:**

This will delete ALL your data permanently. Make sure you want to start completely fresh!
