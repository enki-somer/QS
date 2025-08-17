const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Database configuration (using your updated config)
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "qs_financial",
  password: "enki",
  port: 5432,
});

async function applyHRFieldsSafely() {
  const client = await pool.connect();
  try {
    console.log("🔗 Connected to database...");

    // Read the SAFE SQL file
    const sqlPath = path.join(__dirname, "database", "add-hr-fields-safe.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log(
      "📄 Applying SAFE HR fields (no existing data will be changed)..."
    );

    // Execute the SQL
    await client.query(sql);

    console.log("✅ HR fields added safely!");

    // Simple test - just check if columns exist
    console.log("🧪 Testing new columns...");

    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
      AND column_name IN ('mobile_number', 'age', 'monthly_salary', 'payment_status', 'last_payment_date')
      ORDER BY column_name
    `);

    console.log(
      "🔧 HR columns available:",
      columnsResult.rows.map((r) => r.column_name).join(", ")
    );

    // Check if salary payments table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'employee_salary_payments'
    `);

    if (tableCheck.rows.length > 0) {
      console.log("📊 Salary payments table created successfully");
    }

    // Test the simple function
    const functionTest = await client.query(
      "SELECT * FROM get_all_employees_with_hr_data() LIMIT 3"
    );
    console.log(
      "⚡ HR function works! Found",
      functionTest.rows.length,
      "employees"
    );

    console.log(
      "\n🎉 SUCCESS! Your database now has HR fields and is ready for the frontend!"
    );
    console.log("📝 Next step: Update the frontend to use these new fields");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("💡 Don't worry - no existing data was harmed!");
  } finally {
    client.release();
    await pool.end();
  }
}

applyHRFieldsSafely().catch(console.error);
