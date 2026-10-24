// Upload limits, shared by the browser (checked before sending) and the server (checked again).
// Files travel in one server action, so together they must stay under its body limit in next.config.ts.
export const MAX_PDF_BYTES = 5 * 1024 * 1024
export const MAX_ZIP_BYTES = 10 * 1024 * 1024
export const MAX_FILES = 2

export const isZip = (file: { name: string; type: string }) => /\.zip$/i.test(file.name) || file.type.includes("zip")

// Why this file can't be uploaded, or null when it can.
export function uploadProblem(file: { name: string; type: string; size: number }): string | null {
  if (isZip(file)) return file.size > MAX_ZIP_BYTES ? `${file.name} is over 10 MB. Request LinkedIn's smaller "fast file" export, or upload your profile PDF instead.` : null
  if (file.type && file.type !== "application/pdf") return `${file.name} isn't a PDF or ZIP.`
  return file.size > MAX_PDF_BYTES ? `${file.name} is over 5 MB.` : null
}
