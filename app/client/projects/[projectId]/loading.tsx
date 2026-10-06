import { ProjectSkeleton } from "@/components/client/ClientSkeletons";

/* Shown inside the persistent portal frame while this route renders on the server. */
export default function ProjectLoading() {
  return <ProjectSkeleton />;
}
