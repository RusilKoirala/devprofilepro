  export const MAX_PDF_BYTES = 5 * 1024 * 1024    
export const MAX_ZIP_BYTES = 10 * 1024 * 1024
export const MAX_FILES = 2

export const isZip = (file: { name: string; type: string }) => /\.zip$/i.test(file.name) || file.type.includes("zip")

export function uploadProblem(file: { name: string; type: string; size: number }): string | null {
  if (isZip(file)) return file.size > MAX_ZIP_BYTES ? `${file.name} is over 10 MB. Request LinkedIn's smaller "fast file" export, or upload your profile PDF instead.` : null
  if (file.type && file.type !== "application/pdf") return `${file.name} isn't a PDF or ZIP.`
  return file.size > MAX_PDF_BYTES ? `${file.name} is over 5 MB.` : null
}
