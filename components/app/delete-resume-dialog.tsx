"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { deleteResume } from "@/lib/record/actions"

// One confirmation for every place a resume can be deleted (the editor, the Resumes page).
export function DeleteResumeDialog({ resume, open, onOpenChange, onDeleted }: {
  resume: { id: string; title: string; kind: "base" | "tailored" }
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  const [pending, startTransition] = useTransition()

  function remove() {
    startTransition(async () => {
      const res = await deleteResume(resume.id)
      if (!res.ok) return void toast.error(res.error)
      onOpenChange(false)
      toast.success(`Deleted “${resume.title}”. Its downloaded PDFs are still on your Dashboard.`)
      onDeleted()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete “{resume.title}”?</DialogTitle>
          <DialogDescription>
            {resume.kind === "base"
              ? "The base resume is deleted. Your Career Record, your tailored resumes, and every PDF you downloaded stay, and you can build a new base resume from Get started."
              : "This resume and the wording only it uses are deleted. Your Career Record, your other resumes, and every PDF you downloaded from it stay."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" disabled={pending} onClick={remove}>{pending && <Spinner />} Delete resume</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
