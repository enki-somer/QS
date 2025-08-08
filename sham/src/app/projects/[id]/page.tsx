import ProjectDetailClient from "./ProjectDetailClient";

// Required for static export with dynamic routes
export async function generateStaticParams() {
  try {
    // Fetch all projects from the API to generate static params
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

    // Return array of { id: string } objects for each project
    return projects.map((project: any) => ({
      id: project.id,
    }));
  } catch (error) {
    console.warn("Error fetching projects for static generation:", error);
    // Return empty array as fallback - pages will be generated on-demand
    return [];
  }
}

export default function ProjectDetailPage() {
  return <ProjectDetailClient />;
}
