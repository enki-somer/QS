// Simple database connection test
const { Pool } = require("pg");
require("dotenv").config();

async function testConnection() {
  console.log("🔍 Testing PostgreSQL connection...");
  console.log("Configuration:");
  console.log("  Host:", process.env.DB_HOST || "localhost");
  console.log("  Port:", process.env.DB_PORT || "5432");
  console.log("  Database:", process.env.DB_NAME || "qs_financial");
  console.log("  User:", process.env.DB_USER || "postgres");
  console.log(
    "  Password:",
    process.env.DB_PASSWORD ? "***set***" : "***empty***"
  );
  console.log("");

  const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "qs_financial",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    ssl: false,
  });

  try {
    const client = await pool.connect();
    console.log("✅ Database connection successful!");

    // Test a simple query
    const result = await client.query(
      "SELECT current_balance FROM safe_state WHERE id = 1"
    );
    console.log("✅ Safe state query successful!");
    console.log(
      "   Current balance:",
      result.rows[0]?.current_balance || 0,
      "دينار"
    );

    // Test users table
    const usersResult = await client.query("SELECT username, role FROM users");
    console.log("✅ Users table accessible!");
    console.log("   Users found:", usersResult.rows.length);
    usersResult.rows.forEach((user) => {
      console.log("   -", user.username, "(" + user.role + ")");
    });

    client.release();
    await pool.end();

    console.log("");
    console.log("🎉 Database is ready! You can now start the backend server.");
    console.log("   Command: npm run dev");
  } catch (error) {
    console.log("❌ Database connection failed!");
    console.log("Error:", error.message);
    console.log("");

    if (error.message.includes("password authentication failed")) {
      console.log(
        "🔧 Solution: You need to set the correct PostgreSQL password"
      );
      console.log("   1. Edit backend/.env file");
      console.log("   2. Set DB_PASSWORD to your PostgreSQL password");
      console.log(
        "   3. The password is what you use when running: psql -U postgres"
      );
      console.log("");
    } else if (error.message.includes("Connection refused")) {
      console.log("🔧 Solution: PostgreSQL service is not running");
      console.log("   1. Start PostgreSQL service in Windows Services");
      console.log("   2. Or run: net start postgresql-x64-17");
      console.log("");
    } else {
      console.log("🔧 Please check your database configuration");
    }

    await pool.end();
    process.exit(1);
  }
}

testConnection();
