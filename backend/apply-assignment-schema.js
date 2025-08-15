const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "qs_financial",
  password: process.env.DB_PASSWORD || "enki",
  port: process.env.DB_PORT || 5432,
});

async function applySchema() {
  try {
    console.log("🔄 Applying assignment management schema...");

    const sqlPath = path.join(
      __dirname,
      "database",
      "add-assignment-management-fields.sql"
    );
    const sql = fs.readFileSync(sqlPath, "utf8");

    await pool.query(sql);

    console.log("✅ Assignment management schema applied successfully!");
    console.log("📋 Added fields:");
    console.log("   • status (active, frozen, cancelled)");
    console.log("   • frozen_at, frozen_by, freeze_reason");
    console.log("   • returned_budget, budget_return_date, original_amount");
    console.log("   • recalculate_assignment_budget() function");
    console.log("   • get_assignment_financial_summary() function");
  } catch (error) {
    console.error("❌ Error applying schema:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applySchema();
