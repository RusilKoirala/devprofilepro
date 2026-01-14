// User types
export interface User {
  id: string
  email: string
  created_at: string
  subscription_tier: "free" | "pro"
}

// Profile types
export interface GitHubData {
  username: string
  repositories: Repository[]
  languages: string[]
  contributions: ContributionData
  stars: number
  forks: number
  recent_commits: Commit[]
}

export interface LinkedInData {
  firstName: string
  lastName: string
  headline: string
  experience: WorkExperience[]
  education: Education[]
  skills: string[]
}

export interface Repository {
  id: number
  name: string
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  updated_at: string
  html_url: string
}

export interface ContributionData {
  total_contributions: number
  weeks: ContributionWeek[]
}

export interface ContributionWeek {
  week: string
  days: number[]
}

export interface Commit {
  sha: string
  message: string
  date: string
  repository: string
}

export interface WorkExperience {
  title: string
  company: string
  startDate: string
  endDate: string | null
  description: string | null
}

export interface Education {
  school: string
  degree: string
  fieldOfStudy: string | null
  startDate: string
  endDate: string | null
}

// Resume types
export interface Resume {
  id: string
  user_id: string
  template_id: string
  pdf_url: string | null
  created_at: string
}

export interface ResumeTemplate {
  id: string
  name: string
  description: string
}

// Subscription types
export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  plan: "free" | "pro"
  status: "active" | "canceled" | "past_due"
  current_period_end: string | null
}
