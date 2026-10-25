// Job-post keyword match: which of the post's skills and tools appear in the resume.
// Pure code. Terms come from a list of common developer skills plus anything the post repeats.

const KNOWN = [
  "JavaScript", "TypeScript", "Python", "Java", "Go", "Rust", "C++", "C#", "C", "Ruby", "PHP", "Kotlin", "Swift", "Scala", "SQL", "Bash", "Dart",
  "React", "Next.js", "Vue", "Angular", "Svelte", "Node.js", "Express", "NestJS", "Django", "Flask", "FastAPI", "Spring", "Spring Boot", "Rails", ".NET", "Laravel",
  "React Native", "Flutter", "iOS", "Android", "HTML", "CSS", "Tailwind", "Redux", "GraphQL", "REST", "gRPC", "WebSockets",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "DynamoDB", "Elasticsearch", "Kafka", "RabbitMQ", "Supabase", "Firebase", "Prisma",
  "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "Linux", "Nginx", "Vercel", "Serverless", "Lambda",
  "CI/CD", "GitHub Actions", "Jenkins", "Git", "Jest", "Vitest", "Playwright", "Cypress", "Testing", "Unit testing",
  "Microservices", "System design", "Distributed systems", "APIs", "Agile", "Scrum", "Code review", "Observability", "Monitoring",
  "Machine learning", "PyTorch", "TensorFlow", "pandas", "NumPy", "LLM", "OpenAI", "Data pipelines", "ETL", "Spark", "Airflow",
  "Figma", "Accessibility", "Performance", "Security", "OAuth", "Stripe",
]

// Other names for the same thing, so "Postgres" in a resume counts for "PostgreSQL" in a post.
const ALIASES: Record<string, string[]> = {
  Go: ["Golang"],
  JavaScript: ["JS", "ES6"],
  PostgreSQL: ["Postgres", "psql"],
  "Node.js": ["Node", "NodeJS"],
  "Next.js": ["NextJS"],
  React: ["React.js", "ReactJS"],
  Vue: ["Vue.js", "VueJS"],
  Express: ["Express.js"],
  Kubernetes: ["K8s"],
  MongoDB: ["Mongo"],
  Tailwind: ["Tailwind CSS", "TailwindCSS"],
  AWS: ["Amazon Web Services"],
  GCP: ["Google Cloud"],
  "CI/CD": ["CI", "Continuous integration"],
  "Machine learning": ["ML"],
  REST: ["RESTful"],
  APIs: ["API"],
  ".NET": ["dotnet"],
  "Unit testing": ["Unit tests"],
}

// "Go" is also an ordinary word, so it counts only where it reads as the language: in a list of
// tools, or next to words like "services" or "developer". Case-sensitive, never "go to".
const GO_CONTEXT = /(?:(?:^|[,/(|•·]\s*|\band\s+|\bor\s+|\bin\s+|\bwith\s+|\busing\s+)Go\b(?!\s*(?:-|to\b|ahead|live|beyond|further|getter))|\bGo(?=\s*[,/)|]|\s+(?:and|or)\s|\s+(?:language|lang|developer|engineer|services?|microservices|backend|code|programming|modules|routines)\b))/m

export function hasTerm(text: string, term: string): boolean {
  if (term === "Go") return mentions(text, "Golang") || GO_CONTEXT.test(text)
  return [term, ...(ALIASES[term] ?? [])].some((t) => mentions(text, t))
}

// The known skills and tools a piece of text names, e.g. a job requirement.
export function knownTermsIn(text: string): string[] {
  return KNOWN.filter((k) => hasTerm(text, k))
}

// Where each known term first appears in the text, in reading order. A term inside a longer one
// ("CI" in "CI/CD", "Testing" in "Unit testing") is left out.
export function termSpans(text: string): { term: string; start: number; end: number }[] {
  const spans = knownTermsIn(text).flatMap((term) => {
    const patterns = term === "Go"
      ? [/\bGo\b|\b[Gg]olang\b/]
      : [term, ...(ALIASES[term] ?? [])].flatMap((t) => (/[a-z]s$/i.test(t) && t.length > 3 ? [t, t.slice(0, -1)] : [t])).map((t) => new RegExp(`(?<![A-Za-z0-9+#.])${escape(t)}(?![A-Za-z0-9+#])`, "i"))
    const found = patterns.map((p) => p.exec(text)).filter((m): m is RegExpExecArray => !!m)
    if (!found.length) return []
    const first = found.reduce((a, b) => (b.index < a.index || (b.index === a.index && b[0].length > a[0].length) ? b : a))
    return [{ term, start: first.index, end: first.index + first[0].length }]
  })
  spans.sort((a, b) => a.start - b.start || b.end - a.end)
  return spans.filter((s, i) => !spans.some((o, j) => j !== i && o.start <= s.start && o.end >= s.end && (o.end - o.start > s.end - s.start || j < i)))
}

// Words that look like skills when capitalised but aren't.
const STOP = new Set(["The", "We", "You", "Our", "This", "Your", "Experience", "About", "Team", "Role", "Requirements", "Responsibilities", "Bonus", "Nice", "Strong", "Benefits", "Apply", "Remote", "Senior", "Junior", "Engineer", "Developer", "Software", "Years", "Ability", "Plus", "Must", "Work", "Working", "Job", "Company", "What", "Who", "How", "And", "Or", "If", "In", "On", "At", "For", "With", "To", "Of", "A", "An", "Is", "Are", "Will", "Be", "As", "It", "Us", "All", "New", "Help", "Build", "Building"])

function escape(term: string) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// Whole-term match that also works for "C++", "Node.js" and ".NET".
export function mentions(text: string, term: string): boolean {
  const forms = /[a-z]s$/i.test(term) && term.length > 3 ? [term, term.slice(0, -1)] : [term]
  return forms.some((t) => new RegExp(`(^|[^A-Za-z0-9+#.])${escape(t)}(?![A-Za-z0-9+#])`, "i").test(text))
}

export interface KeywordMatch {
  found: string[]
  missing: string[]
  percent: number
}

export function matchKeywords(jobPost: string, resume: string, max = 30): KeywordMatch | null {
  const post = jobPost.trim()
  if (post.length < 80) return null
  const known = KNOWN.filter((k) => hasTerm(post, k))
  const knownForms = new Set(known.flatMap((k) => [k, ...(ALIASES[k] ?? [])].map((t) => t.toLowerCase())))
  // Capitalised words or acronyms the post uses at least twice (e.g. "Snowflake", "dbt").
  const counts = new Map<string, number>()
  for (const w of post.match(/\b[A-Z][A-Za-z0-9+#.]{1,20}\b/g) ?? []) if (!STOP.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1)
  const repeated = [...counts].filter(([w, n]) => n >= 2 && !knownForms.has(w.toLowerCase()) && w !== "Go").map(([w]) => w)
  const terms = [...new Set([...known, ...repeated])].slice(0, max)
  if (!terms.length) return null
  const found = terms.filter((t) => hasTerm(resume, t))
  return { found, missing: terms.filter((t) => !found.includes(t)), percent: Math.round((found.length / terms.length) * 100) }
}
