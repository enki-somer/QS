import CategoryInvoicesClient from "./CategoryInvoicesClient";

// Required for static export with dynamic routes
export async function generateStaticParams() {
  try {
    // Fetch all projects to generate static params
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      }/api/projects`
    );

    if (!response.ok) {
      console.warn("Failed to fetch projects for static generation");
      return [];
    }

    const projects = await response.json();
    const params: { id: string; categoryId: string }[] = [];

    // For each project, generate params for all possible categories
    const possibleCategories = [
      "implementation_construction",
      "materials_supply",
      "specialized_works",
      "administrative_operational",
    ];

    projects.forEach((project: any) => {
      possibleCategories.forEach((categoryId) => {
        params.push({
          id: project.id,
          categoryId: categoryId,
        });
      });
    });

    console.log(
      `Generated ${params.length} static params for category invoices`
    );
    return params;
  } catch (error) {
    console.warn(
      "Error generating static params for category invoices:",
      error
    );
    return [];
  }
}

export default function CategoryInvoicesPage() {
  return <CategoryInvoicesClient />;
}
