import ProjectDetailClient from "./ProjectDetailClient";

// Note: generateStaticParams removed since we're not using static export
// Dynamic routes will be handled by SSR instead

export default function ProjectDetailPage() {
  return <ProjectDetailClient />;
}
