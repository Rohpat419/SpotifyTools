import type React from "react"
import { Navigation } from "@/components/navigation"

interface PageLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export function PageLayout({ children, title, description, className = "" }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className={`container mx-auto px-4 py-8 ${className}`}>
        {(title || description) && (
          <div className="mb-8">
            {title && (
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-2 text-balance">{title}</h1>
            )}
            {description && (
              <p className="text-lg text-muted-foreground max-w-2xl text-pretty leading-relaxed">{description}</p>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
