// Simple test script for projects API using built-in fetch (Node.js 18+)
const API_BASE = "http://localhost:8000/api/projects";

async function testProjectsAPI() {
  console.log("🧪 Testing Projects API...\n");

  try {
    // Test 1: Health check
    console.log("1. Testing health check...");
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log("✅ Health check:", healthData);

    // Test 2: Generate project code
    console.log("\n2. Testing project code generation...");
    const codeResponse = await fetch(`${API_BASE}/generate-code`);
    const codeData = await codeResponse.json();
    console.log("✅ Generated code:", codeData);

    // Test 3: Get all projects
    console.log("\n3. Testing get all projects...");
    const projectsResponse = await fetch(`${API_BASE}/`);
    const projectsData = await projectsResponse.json();
    console.log("✅ Projects count:", projectsData.length);

    // Test 4: Create a simple project
    console.log("\n4. Testing project creation...");
    const testProject = {
      name: "مشروع تجريبي",
      location: "بغداد",
      area: 100.5,
      budgetEstimate: 50000,
      client: "عميل تجريبي",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      status: "planning",
      categoryAssignments: [
        {
          mainCategory: "أعمال تنفيذية وإنشائية",
          subcategory: "تنفيذ الهدم والحفر",
          contractors: [
            {
              contractorName: "أحمد عمار",
              estimatedAmount: "10000",
              notes: "مقاول رئيسي",
            },
          ],
        },
      ],
    };

    const createResponse = await fetch(`${API_BASE}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testProject),
    });

    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log("✅ Project created successfully:", createData.project.name);
      console.log("   Project ID:", createData.project.id);
    } else {
      const errorData = await createResponse.text();
      console.log(
        "❌ Project creation failed:",
        createResponse.status,
        errorData
      );
    }
  } catch (error) {
    console.error("❌ API Test failed:", error.message);
    console.log("\n💡 Make sure:");
    console.log("   - Backend server is running (npm run dev in backend/)");
    console.log("   - PostgreSQL is running");
    console.log("   - Database schema is applied");
    console.log("   - Environment variables are set correctly");
  }
}

// Run the test
testProjectsAPI();
