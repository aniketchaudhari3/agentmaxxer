import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AddProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string, path: string) => void
}

export function AddProjectDialog({ open, onOpenChange, onSubmit }: AddProjectDialogProps) {
  const [name, setName] = useState("")
  const [path, setPath] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !path.trim()) return
    onSubmit(name.trim(), path.trim())
    setName("")
    setPath("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Project</DialogTitle>
          <DialogDescription>
            Add a project to organize your sessions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Project name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Project path</label>
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/path/to/project"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !path.trim()}>
              Add
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
