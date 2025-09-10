import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Filter, BarChart3, Trash2, ArrowRight } from "lucide-react"
import Link from "next/link"
import { PageLayout } from "@/components/page-layout"

export default function HomePage() {
  const features = [
    {
      title: "Duplicate Checker",
      description: "Identify and analyze duplicate tracks in your playlists with detailed grouping and export options.",
      icon: CheckCircle,
      href: "/duplicate-checker",
      color: "bg-chart-1",
      badge: "Analysis",
    },
    {
      title: "Duplicate Deletion",
      description: "Remove duplicate tracks from your playlists with smart confirmation and detailed summaries.",
      icon: Trash2,
      href: "/duplicate-deletion",
      color: "bg-chart-2",
      badge: "Cleanup",
    },
    {
      title: "Explicit Content Filter",
      description: "Scan and filter explicit content using metadata or lyrics analysis with flexible actions.",
      icon: Filter,
      href: "/explicit-filter",
      color: "bg-chart-3",
      badge: "Content",
    },
    {
      title: "Top Tracks & Artists",
      description: "Discover your listening patterns with detailed analytics across different time periods.",
      icon: BarChart3,
      href: "/top-tracks",
      color: "bg-chart-4",
      badge: "Analytics",
    },
  ]

  return (
    <PageLayout>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-background via-muted/30 to-background">
          <div className="container mx-auto px-4 py-16 sm:py-24">
            <div className="text-center max-w-4xl mx-auto">
              <Badge variant="secondary" className="mb-4 text-sm font-medium">
                Professional Playlist Management
              </Badge>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance">
                SpotifyTools
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty leading-relaxed">
                Advanced Spotify playlist management suite featuring duplicate detection, content filtering, and
                comprehensive analytics for professional music curation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="text-base font-medium" asChild>
                  <Link href="#features">
                    Explore Features
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="text-base font-medium bg-transparent" asChild>
                  <Link href="/duplicate-checker">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">Powerful Features</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
                Comprehensive tools designed for professional playlist management and music curation workflows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
              {features.map((feature, index) => {
                const IconComponent = feature.icon
                return (
                  <Card
                    key={index}
                    className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20"
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className={`p-3 rounded-lg ${feature.color}/10 group-hover:${feature.color}/20 transition-colors`}
                        >
                          <IconComponent className={`h-6 w-6 text-${feature.color.replace("bg-", "")}`} />
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {feature.badge}
                        </Badge>
                      </div>
                      <CardTitle className="font-heading text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-muted-foreground mb-4 leading-relaxed">
                        {feature.description}
                      </CardDescription>
                      <Button
                        variant="ghost"
                        className="p-0 h-auto font-medium text-primary hover:text-primary/80"
                        asChild
                      >
                        <Link href={feature.href}>
                          Learn more
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border bg-muted/30">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Built with React, TypeScript, and Next.js for professional playlist management.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </PageLayout>
  )
}
