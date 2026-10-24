import { displayUrl } from "./build.ts"
import type { ResumeDoc } from "@/lib/resume/schema"

// Plain string template of the same content (Jake's Resume). We never compile it.
export function escapeLatex(s: string): string {
  const escapes: Record<string, string> = {
    "\\": "\\textbackslash{}", "~": "\\textasciitilde{}", "^": "\\textasciicircum{}",
    "–": "--", "—": "--",
  }
  // One pass: escaping braces must not corrupt commands inserted for backslashes.
  return s.replace(/[\\&%$#_{}~^–—]/g, (char) => escapes[char] ?? `\\${char}`)
}

const e = escapeLatex
const href = (url: string, text = displayUrl(url)) => `\\href{${e(url)}}{\\underline{${e(text)}}}`

const PREAMBLE = String.raw`\documentclass[letterpaper,11pt]{article}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage[usenames,dvipsnames]{color}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{tabularx}
\usepackage[T1]{fontenc}
\pdfgentounicode=1
\addtolength{\oddsidemargin}{-0.5in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.5in}
\addtolength{\textheight}{1.0in}
\urlstyle{same}
\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}
\titleformat{\section}{\vspace{-4pt}\scshape\raggedright\large}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]
\newcommand{\resumeItem}[1]{\item\small{{#1 \vspace{-2pt}}}}
\newcommand{\resumeSubheading}[4]{\vspace{-2pt}\item
  \begin{tabular*}{0.97\textwidth}[t]{l@{\extracolsep{\fill}}r}
    \textbf{#1} & #2 \\
    \textit{\small#3} & \textit{\small #4} \\
  \end{tabular*}\vspace{-7pt}}
\newcommand{\resumeProjectHeading}[2]{\item
  \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
    \small#1 & #2 \\
  \end{tabular*}\vspace{-7pt}}
\renewcommand\labelitemii{$\vcenter{\hbox{\tiny$\bullet$}}$}
\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}
`

export function toLatex(doc: ResumeDoc): string {
  const c = doc.contact
  const contact = [
    // Same fields, same order as the PDF's contact line.
    c.phone && e(c.phone),
    c.email && href(`mailto:${c.email}`, c.email),
    c.location && e(c.location),
    c.linkedin && href(c.linkedin),
    c.github && href(c.github),
    c.website && href(c.website),
  ].filter(Boolean).join(" $|$ ")

  const sections = doc.sections.map((s) => {
    if (s.type === "skills") {
      const rows = s.entries.map((en) => `\\textbf{${e(en.title)}}{: ${e(en.subtitle)}}`).join(" \\\\\n     ")
      return `\\section{${s.title}}\n \\begin{itemize}[leftmargin=0.15in, label={}]\n    \\small{\\item{\n     ${rows}\n    }}\n \\end{itemize}`
    }
    const entries = s.entries.map((en) => {
      const bullets = en.bullets.length
        ? `\n      \\resumeItemListStart\n${en.bullets.map((b) => `        \\resumeItem{${e(b.text)}}`).join("\n")}\n      \\resumeItemListEnd`
        : ""
      if (s.type === "project" || s.type === "award") {
        const head = [`\\textbf{${e(en.title)}}`, en.tech.length && `\\emph{${e(en.tech.join(", "))}}`, en.url && href(en.url)].filter(Boolean).join(" $|$ ")
        return `    \\resumeProjectHeading\n      {${head}}{${e(en.dates)}}${bullets}`
      }
      return `    \\resumeSubheading\n      {${e(en.title)}}{${e(en.dates)}}\n      {${e(en.subtitle)}}{${e(en.location)}}${bullets}`
    })
    return `\\section{${s.title}}\n  \\resumeSubHeadingListStart\n${entries.join("\n")}\n  \\resumeSubHeadingListEnd`
  })

  return `${PREAMBLE}
\\begin{document}

\\begin{center}
    \\textbf{\\Huge \\scshape ${e(doc.name)}} \\\\ \\vspace{1pt}
${doc.headline ? `    \\small ${e(doc.headline)} \\\\ \\vspace{1pt}\n` : ""}    \\small ${contact}
\\end{center}

${sections.join("\n\n")}

\\end{document}
`
}

// Overleaf opens a .tex from a data URL via its /docs endpoint (form POST with snip_uri or encoded_snip).
export const OVERLEAF_URL = "https://www.overleaf.com/docs"
