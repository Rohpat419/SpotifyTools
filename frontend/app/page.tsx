import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, Filter, BarChart3, ArrowRight, ListMusic } from "lucide-react"
import Link from "next/link"
import { PageLayout } from "@/components/page-layout"

export default function HomePage() {
  const features = [
    {
      title: "Duplicate Manager",
      description: "Find and remove duplicate tracks from your playlists in one step.",
      icon: Copy,
      href: "/duplicates",
      color: "bg-chart-1",
      badge: "Cleanup",
    },
    {
      title: "Explicit Content Filter",
      description: "Scan and filter explicit content using metadata or lyrics analysis.",
      icon: Filter,
      href: "/explicit-filter",
      color: "bg-chart-3",
      badge: "Content",
    },
    {
      title: "Top Tracks & Artists",
      description: "Discover your listening patterns with analytics across different time periods.",
      icon: BarChart3,
      href: "/top-tracks",
      color: "bg-chart-4",
      badge: "Analytics",
    },
    {
      title: "Playlist Builder",
      description: "Build custom playlists from your Liked Songs with filters and search.",
      icon: ListMusic,
      href: "/playlist-builder",
      color: "bg-chart-5",
      badge: "Builder",
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
                "I wish Spotify had this"
              </Badge>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance">
                SpotifyTools
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty leading-relaxed">
                Spotify user experience enhancement suite featuring duplicate detection, content filtering, and comprehensive analytics for an extended Spotify experience.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="text-base font-medium" asChild>
                  <Link href="#features">
                    Explore Features
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="text-base font-medium bg-transparent" asChild>
                  <Link href="/duplicates">Get Started</Link>
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
                Toolset designed for extending the native functionality of Spotify.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
              {features.map((feature, index) => {
                const IconComponent = feature.icon
                return (
                  <Link key={index} href={feature.href} className="block">
                    <Card className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20 cursor-pointer h-full">
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
                        <div className="flex items-center font-medium text-primary group-hover:text-primary/80 transition-colors">
                          Learn more
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
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
                Built with React, TypeScript, and Next.js for Extended Spotify Functionality.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </PageLayout>
  )
}
