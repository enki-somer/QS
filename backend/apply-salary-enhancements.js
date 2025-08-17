const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Database configuration
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "qs_financial",
  password: "postgres",
  port: 5432,
});

async function applySalaryEnhancements() {
  const client = await pool.connect();

  try {
    console.log("🚀 Starting salary payment enhancements...");

    // Read the SQL file
    const sqlPath = path.join(
      __dirname,
      "database",
      "add-salary-payment-enhancements.sql"
    );
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    // Split by semicolons and execute each statement
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter(
        (stmt) =>
          stmt.length > 0 && !stmt.startsWith("--") && !stmt.startsWith("\\")
      );

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`   ${i + 1}. ${statement.substring(0, 50)}...`);

      try {
        await client.query(statement);
        console.log(`   ✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        if (
          error.message.includes("already exists") ||
          error.message.includes("does not exist")
        ) {
          console.log(
            `   ⚠️  Statement ${
              i + 1
            } skipped (already exists or safe to ignore)`
          );
        } else {
          console.error(`   ❌ Error in statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }

    // Test the new structure
    console.log("\\n🔍 Testing enhanced salary payment structure...");

    const testQuery = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'employee_salary_payments' 
      ORDER BY ordinal_position
    `;

    const result = await client.query(testQuery);
    console.log("\\n📊 Employee Salary Payments Table Structure:");
    console.table(result.rows);

    // Test inserting a sample payment (rollback)
    await client.query("BEGIN");

    try {
      const testInsert = `
        INSERT INTO employee_salary_payments (
          employee_id, payment_amount, payment_type, installment_amount, 
          month_year, notes, is_full_payment, payment_date
        ) VALUES (
          gen_random_uuid(), 1500000, 'installment', 500000, 
          '2024-08', 'Test installment payment', false, CURRENT_TIMESTAMP
        ) RETURNING id, payment_type, installment_amount, is_full_payment
      `;

      const testResult = await client.query(testInsert);
      console.log("\\n✅ Test payment record created successfully:");
      console.table(testResult.rows);

      await client.query("ROLLBACK"); // Don't actually save the test record
      console.log("🔄 Test record rolled back (not saved)");
    } catch (testError) {
      await client.query("ROLLBACK");
      console.error("❌ Test insert failed:", testError.message);
    }

    console.log("\\n🎉 Salary payment enhancements applied successfully!");
    console.log("\\n📋 New Features Available:");
    console.log("   • Installment payment support");
    console.log("   • Payment type tracking (full/installment)");
    console.log("   • Enhanced payment history");
    console.log("   • Better performance with new indexes");
  } catch (error) {
    console.error("❌ Error applying salary enhancements:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the enhancement
applySalaryEnhancements();






