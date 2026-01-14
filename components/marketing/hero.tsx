import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Code, FileText, Zap } from "lucide-react"

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950/20 dark:via-background dark:to-purple-950/20" />
      
      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-sm font-medium mb-8">
            <Zap className="h-4 w-4" />
            Auto-generate professional resumes in seconds
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Turn Your{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              GitHub & LinkedIn
            </span>{" "}
            Into a{" "}
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Winning Resume
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Connect your accounts, generate professional PDF resumes instantly, and get insights
            to improve your developer profile.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/dashboard">
                Start Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8">
              <Link href="#features">Learn More</Link>
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-card border">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/50">
                <Code className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">GitHub Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically pull all your repositories, languages, and contributions
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-card border">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/50">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Professional PDFs</h3>
                <p className="text-sm text-muted-foreground">
                  Generate ATS-friendly resumes with multiple beautiful templates
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-card border">
              <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-950/50">
                <Zap className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Smart Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Get a reality check score and personalized recommendations
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
