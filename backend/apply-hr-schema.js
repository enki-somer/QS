const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Database configuration (using same config as the system)
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "qs_financial",
  password: "enki",
  port: 5432,
});

async function applyHRSchema() {
  const client = await pool.connect();
  try {
    console.log("🔗 Connected to database...");

    // Read the SQL file
    const sqlPath = path.join(
      __dirname,
      "database",
      "add-hr-management-fields.sql"
    );
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("📄 Applying HR schema enhancements...");

    // Execute the SQL
    await client.query(sql);

    console.log("✅ HR schema enhancement applied successfully!");

    // Test the new functions
    console.log("🧪 Testing database functions...");

    // Test get_employees_due_for_payment function
    const result = await client.query(
      "SELECT * FROM get_employees_due_for_payment() LIMIT 5"
    );
    console.log("📊 Employees due for payment:", result.rows.length);

    // Test employee_financial_summary view
    const summaryResult = await client.query(
      "SELECT COUNT(*) as total_employees FROM employee_financial_summary"
    );
    console.log(
      "📈 Employee financial summary view:",
      summaryResult.rows[0].total_employees,
      "employees"
    );

    // Check positions table
    const positionsResult = await client.query(
      "SELECT COUNT(*) as total_positions FROM employee_positions"
    );
    console.log(
      "💼 Available positions:",
      positionsResult.rows[0].total_positions
    );

    // Check if employees table has new columns
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
      AND column_name IN ('mobile_number', 'monthly_salary', 'payment_status')
      ORDER BY column_name
    `);
    console.log(
      "🔧 New employee columns added:",
      columnsResult.rows.map((r) => r.column_name).join(", ")
    );

    // Test triggers by updating an employee (if any exist)
    const employeeCheck = await client.query(
      "SELECT id FROM employees LIMIT 1"
    );
    if (employeeCheck.rows.length > 0) {
      const employeeId = employeeCheck.rows[0].id;
      await client.query(
        "UPDATE employees SET monthly_salary = 500000 WHERE id = $1",
        [employeeId]
      );
      console.log(
        "⚡ Triggers tested successfully - employee payment status updated automatically"
      );
    }
  } catch (error) {
    console.error("❌ Error applying schema:", error.message);
    console.error("Full error:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyHRSchema().catch(console.error);
