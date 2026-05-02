import { ProjectIcon } from "./ProjectIcon"
import type { Project } from "@/types"

interface ProjectListProps {
  projects: Project[]
  activeProjectId: string | null
  onSelect: (id: string) => void
}

export function ProjectList({ projects, activeProjectId, onSelect }: ProjectListProps) {
  return (
    <>
      {projects.map((p) => (
        <ProjectIcon
          key={p.id}
          name={p.name}
          active={p.id === activeProjectId}
          onClick={() => onSelect(p.id)}
        />
      ))}
    </>
  )
}
