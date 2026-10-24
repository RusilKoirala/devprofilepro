import assert from "node:assert/strict"
import { test } from "node:test"
import { strToU8, zipSync } from "fflate"
import { ingestLinkedInZip, parseCsv, renderSection } from "./linkedin-zip.ts"

test("CSV parsing handles quotes, commas and newlines inside cells", () => {
  assert.deepEqual(parseCsv('a,b\r\n"x, y","line 1\nline ""2"""\n'), [["a", "b"], ["x, y", 'line 1\nline "2"']])
})

test("sections drop private columns and empty cells", () => {
  const text = renderSection("Profile", "First Name,Last Name,Birth Date,Headline\nRusil,Koirala,Jan 1 2000,\n")
  assert.equal(text, "## Profile\nFirst Name: Rusil\nLast Name: Koirala")
  assert.equal(renderSection("Skills", "Name\nTypeScript\nPostgreSQL\n"), "## Skills\nTypeScript, PostgreSQL")
})

test("only career files are read from the export", async () => {
  const zip = zipSync({
    "Basic_LinkedInDataExport/Positions.csv": strToU8("Company Name,Title,Description,Location,Started On,Finished On\nAcme,Software Intern,Built the billing page,Remote,Jun 2025,Aug 2025\n"),
    "Basic_LinkedInDataExport/messages.csv": strToU8("FROM,CONTENT\nsomeone,private\n"),
  })
  const src = await ingestLinkedInZip(new File([new Uint8Array(zip)], "export.zip"))
  assert.equal(src.kind, "linkedin_pdf")
  assert.match(src.raw_text, /Title: Software Intern\nDescription: Built the billing page/)
  assert.doesNotMatch(src.raw_text, /private/)
  await assert.rejects(ingestLinkedInZip(new File([new Uint8Array(zipSync({ "messages.csv": strToU8("a\nb") }))], "x.zip")), /doesn't look like a LinkedIn/)
})
