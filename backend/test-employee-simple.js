const { Pool } = require("pg");

// Database configuration
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "qs_financial",
  password: "enki",
  port: 5432,
});

async function testEmployeeDatabase() {
  const client = await pool.connect();

  try {
    console.log("🧪 Testing Employee Database Setup...\n");

    // Test 1: Check if employee table has new columns
    console.log("1️⃣ Checking employee table structure...");
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
      AND column_name IN ('mobile_number', 'age', 'monthly_salary', 'payment_status', 'last_payment_date')
      ORDER BY column_name
    `);

    console.log("✅ HR columns available:");
    columnsResult.rows.forEach((row) => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });

    // Test 2: Check positions table
    console.log("\n2️⃣ Checking positions table...");
    const positionsResult = await client.query(
      "SELECT position_name_ar FROM employee_positions ORDER BY position_name_ar"
    );
    console.log("✅ Available positions:", positionsResult.rows.length);
    console.log(
      "📋 Sample positions:",
      positionsResult.rows
        .slice(0, 5)
        .map((p) => p.position_name_ar)
        .join(", ")
    );

    // Test 3: Check salary payments table
    console.log("\n3️⃣ Checking salary payments table...");
    const paymentsTableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'employee_salary_payments'
    `);

    if (paymentsTableResult.rows.length > 0) {
      console.log("✅ Salary payments table exists");

      const paymentsCount = await client.query(
        "SELECT COUNT(*) as count FROM employee_salary_payments"
      );
      console.log(
        "📊 Current payments in system:",
        paymentsCount.rows[0].count
      );
    } else {
      console.log("❌ Salary payments table not found");
    }

    // Test 4: Test the database function
    console.log("\n4️⃣ Testing database function...");
    try {
      const functionResult = await client.query(
        "SELECT * FROM get_all_employees_with_hr_data() LIMIT 3"
      );
      console.log(
        "✅ HR function works! Found",
        functionResult.rows.length,
        "employees"
      );

      if (functionResult.rows.length > 0) {
        console.log("👤 Sample employee data:");
        const sample = functionResult.rows[0];
        console.log(`   - Name: ${sample.employee_name}`);
        console.log(`   - Mobile: ${sample.mobile_number || "Not set"}`);
        console.log(`   - Salary: ${sample.monthly_salary || "Not set"}`);
        console.log(`   - Status: ${sample.payment_status || "Not set"}`);
      }
    } catch (error) {
      console.log("❌ Function test failed:", error.message);
    }

    // Test 5: Create a test employee to verify everything works
    console.log("\n5️⃣ Creating test employee...");
    try {
      const insertResult = await client.query(
        `
        INSERT INTO employees (name, mobile_number, age, position, monthly_salary, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, mobile_number, monthly_salary
      `,
        [
          "محمد أحمد - اختبار",
          "07901234567",
          28,
          "مهندس مدني",
          500000,
          "active",
        ]
      );

      const newEmployee = insertResult.rows[0];
      console.log("✅ Test employee created successfully:");
      console.log(`   - ID: ${newEmployee.id}`);
      console.log(`   - Name: ${newEmployee.name}`);
      console.log(`   - Mobile: ${newEmployee.mobile_number}`);
      console.log(`   - Salary: ${newEmployee.monthly_salary}`);

      // Test salary payment
      console.log("\n6️⃣ Testing salary payment...");
      const paymentResult = await client.query(
        `
        INSERT INTO employee_salary_payments (employee_id, payment_amount, month_year, notes)
        VALUES ($1, $2, $3, $4)
        RETURNING id, payment_amount, month_year
      `,
        [newEmployee.id, 500000, "2025-01", "راتب تجريبي"]
      );

      console.log("✅ Salary payment recorded:");
      console.log(`   - Payment ID: ${paymentResult.rows[0].id}`);
      console.log(`   - Amount: ${paymentResult.rows[0].payment_amount}`);
      console.log(`   - Month: ${paymentResult.rows[0].month_year}`);
    } catch (error) {
      console.log("❌ Employee creation failed:", error.message);
    }

    console.log("\n🎉 Database testing completed successfully!");
    console.log("✅ Your HR system database is ready for the frontend!");
  } catch (error) {
    console.error("❌ Test error:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testEmployeeDatabase().catch(console.error);
