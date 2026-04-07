"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Filter, BarChart3, Menu, Music, Home, ListMusic, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

const navigationItems = [
  {
    title: "Home",
    href: "/",
    icon: Home,
    description: "Welcome to SpotifyTools",
  },
  {
    title: "Duplicates",
    href: "/duplicates",
    icon: Copy,
    description: "Find and remove duplicate tracks",
    badge: "Cleanup",
  },
  {
    title: "Explicit Filter",
    href: "/explicit-filter",
    icon: Filter,
    description: "Filter explicit content",
    badge: "Content",
  },
  {
    title: "Top Tracks & Artists",
    href: "/top-tracks",
    icon: BarChart3,
    description: "View listening analytics",
    badge: "Analytics",
  },
  {
    title: "Playlist Builder",
    href: "/playlist-builder",
    icon: ListMusic,
    description: "Build playlists from Liked Songs",
    badge: "Builder",
  },
]

export function Navigation() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <span className="font-heading text-xl font-bold text-foreground">SpotifyTools</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const IconComponent = item.icon
              const isActive = pathname === item.href

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "flex items-center space-x-2 h-9 px-3 transition-all",
                      isActive
                        ? "bg-muted text-foreground font-medium border-l-2 border-l-primary"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.title}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="hidden xl:inline text-xs ml-1">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              )
            })}
          </nav>

          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm" className="px-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <div className="flex items-center space-x-2 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Music className="h-5 w-5 text-primary" />
                </div>
                <span className="font-heading text-xl font-bold">SpotifyTools</span>
              </div>

              <nav className="space-y-2">
                {navigationItems.map((item) => {
                  const IconComponent = item.icon
                  const isActive = pathname === item.href

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg transition-colors",
                        isActive
                          ? "bg-muted text-foreground border-l-4 border-l-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                      )}
                    >
                      <IconComponent className="h-5 w-5" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{item.title}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      </div>
                    </Link>
                  )
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
