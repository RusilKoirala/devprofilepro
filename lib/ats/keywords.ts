// Job-post keyword match: which of the post's skills and tools appear in the resume.
// Pure code. Terms come from a list of common developer skills plus anything the post repeats.

const KNOWN = [
  "JavaScript", "TypeScript", "Python", "Java", "Go", "Golang", "Rust", "C++", "C#", "C", "Ruby", "PHP", "Kotlin", "Swift", "Scala", "SQL", "Bash", "Dart",
  "React", "Next.js", "Vue", "Angular", "Svelte", "Node.js", "Express", "NestJS", "Django", "Flask", "FastAPI", "Spring", "Spring Boot", "Rails", ".NET", "Laravel",
  "React Native", "Flutter", "iOS", "Android", "HTML", "CSS", "Tailwind", "Redux", "GraphQL", "REST", "gRPC", "WebSockets",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "DynamoDB", "Elasticsearch", "Kafka", "RabbitMQ", "Supabase", "Firebase", "Prisma",
  "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "Linux", "Nginx", "Vercel", "Serverless", "Lambda",
  "CI/CD", "GitHub Actions", "Jenkins", "Git", "Jest", "Vitest", "Playwright", "Cypress", "Testing", "Unit testing",
  "Microservices", "System design", "Distributed systems", "APIs", "Agile", "Scrum", "Code review", "Observability", "Monitoring",
  "Machine learning", "PyTorch", "TensorFlow", "pandas", "NumPy", "LLM", "OpenAI", "Data pipelines", "ETL", "Spark", "Airflow",
  "Figma", "Accessibility", "Performance", "Security", "OAuth", "Stripe",
]

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
  const known = KNOWN.filter((k) => mentions(post, k))
  // Capitalised words or acronyms the post uses at least twice (e.g. "Snowflake", "dbt").
  const counts = new Map<string, number>()
  for (const w of post.match(/\b[A-Z][A-Za-z0-9+#.]{1,20}\b/g) ?? []) if (!STOP.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1)
  const repeated = [...counts].filter(([w, n]) => n >= 2 && !known.some((k) => k.toLowerCase() === w.toLowerCase())).map(([w]) => w)
  // "Go" alone is too ambiguous unless the post also says Golang.
  const terms = [...new Set([...known, ...repeated])].filter((t) => t !== "Go" || mentions(post, "Golang")).slice(0, max)
  if (!terms.length) return null
  const found = terms.filter((t) => mentions(resume, t))
  return { found, missing: terms.filter((t) => !found.includes(t)), percent: Math.round((found.length / terms.length) * 100) }
}
