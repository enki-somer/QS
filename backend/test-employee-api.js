const { Pool } = require("pg");
const EmployeeService = require("./database/services/employeeService").default;

// Database configuration
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "qs_financial",
  password: "enki",
  port: 5432,
});

async function testEmployeeAPI() {
  const employeeService = new EmployeeService(pool);

  try {
    console.log("🧪 Testing Employee API...\n");

    // Test 1: Get positions
    console.log("1️⃣ Testing getPositions()...");
    const positionsResult = await employeeService.getPositions();
    if (positionsResult.success) {
      console.log(
        "✅ Positions loaded:",
        positionsResult.data.length,
        "positions"
      );
      console.log(
        "📋 Sample positions:",
        positionsResult.data
          .slice(0, 3)
          .map((p) => p.position_name_ar)
          .join(", ")
      );
    } else {
      console.log("❌ Failed to get positions:", positionsResult.error);
    }

    // Test 2: Get all employees
    console.log("\n2️⃣ Testing getEmployees()...");
    const employeesResult = await employeeService.getEmployees();
    if (employeesResult.success) {
      console.log(
        "✅ Employees loaded:",
        employeesResult.data.length,
        "employees"
      );
      if (employeesResult.data.length > 0) {
        console.log("👤 Sample employee:", employeesResult.data[0].name);
      }
    } else {
      console.log("❌ Failed to get employees:", employeesResult.error);
    }

    // Test 3: Create a test employee
    console.log("\n3️⃣ Testing createEmployee()...");
    const testEmployee = {
      name: "أحمد محمد",
      mobile_number: "07901234567",
      age: 30,
      position: "مهندس مدني",
      monthly_salary: 600000,
      status: "active",
    };

    const createResult = await employeeService.createEmployee(testEmployee);
    if (createResult.success) {
      console.log("✅ Employee created successfully:", createResult.data.name);

      // Test 4: Update the employee
      console.log("\n4️⃣ Testing updateEmployee()...");
      const updateResult = await employeeService.updateEmployee(
        createResult.data.id,
        {
          monthly_salary: 650000,
          notes: "تم تحديث الراتب",
        }
      );

      if (updateResult.success) {
        console.log("✅ Employee updated successfully");
      } else {
        console.log("❌ Failed to update employee:", updateResult.error);
      }

      // Test 5: Get employees due for payment
      console.log("\n5️⃣ Testing getEmployeesDueForPayment()...");
      const dueResult = await employeeService.getEmployeesDueForPayment();
      if (dueResult.success) {
        console.log("✅ Employees due for payment:", dueResult.data.length);
      } else {
        console.log("❌ Failed to get due employees:", dueResult.error);
      }

      // Test 6: Process salary payment
      console.log("\n6️⃣ Testing processSalaryPayment()...");
      const paymentResult = await employeeService.processSalaryPayment(
        createResult.data.id,
        {
          payment_amount: 650000,
          notes: "راتب شهر يناير 2025",
        }
      );

      if (paymentResult.success) {
        console.log("✅ Salary payment processed successfully");
      } else {
        console.log("❌ Failed to process payment:", paymentResult.error);
      }

      // Test 7: Get payment history
      console.log("\n7️⃣ Testing getEmployeePaymentHistory()...");
      const historyResult = await employeeService.getEmployeePaymentHistory(
        createResult.data.id
      );
      if (historyResult.success) {
        console.log(
          "✅ Payment history loaded:",
          historyResult.data.length,
          "payments"
        );
      } else {
        console.log("❌ Failed to get payment history:", historyResult.error);
      }
    } else {
      console.log("❌ Failed to create employee:", createResult.error);
    }

    console.log("\n🎉 Employee API testing completed!");
  } catch (error) {
    console.error("❌ Test error:", error.message);
  } finally {
    await pool.end();
  }
}

testEmployeeAPI().catch(console.error);
