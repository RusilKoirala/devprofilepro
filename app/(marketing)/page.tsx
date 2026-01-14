import { Hero } from "@/components/marketing/hero"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  Github, 
  Linkedin, 
  FileText, 
  BarChart3, 
  Zap,
  CheckCircle2,
  ArrowRight
} from "lucide-react"

export default function LandingPage() {
  const features = [
    {
      icon: Github,
      title: "GitHub Integration",
      description:
        "Connect your GitHub account and automatically fetch all your repositories, programming languages, contribution graphs, and project statistics.",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-950/50",
    },
    {
      icon: Linkedin,
      title: "LinkedIn Connection",
      description:
        "Sync your LinkedIn profile to include work experience, education, skills, and professional background in your resume.",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-950/50",
    },
    {
      icon: FileText,
      title: "Professional PDFs",
      description:
        "Generate beautiful, ATS-friendly resumes with multiple template options. Download instantly as PDF.",
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-100 dark:bg-pink-950/50",
    },
    {
      icon: BarChart3,
      title: "GitHub Reality Check",
      description:
        "Get a comprehensive score (1-100) based on your GitHub activity, project quality, and receive personalized recommendations.",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-950/50",
    },
  ]

  const benefits = [
    "Unlimited resume generations (Pro)",
    "Multiple professional templates",
    "ATS-optimized format",
    "Real-time GitHub & LinkedIn sync",
    "Comprehensive developer profile analysis",
    "Export to PDF instantly",
  ]

  return (
    <div>
      {/* Hero Section */}
      <Hero />

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to create the perfect resume
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect your accounts, generate professional resumes, and get insights to improve your profile.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="border-2">
                <CardHeader>
                  <div className={`inline-flex p-3 rounded-lg ${feature.bgColor} w-fit mb-4`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Why choose DevProfile Pro?
              </h2>
              <p className="text-xl text-muted-foreground">
                Everything you need to showcase your developer skills professionally
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex p-3 rounded-full bg-blue-100 dark:bg-blue-950/50 mb-6">
              <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to create your professional resume?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of developers who have transformed their profiles into winning resumes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8">
                <Link href="/dashboard">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8">
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
