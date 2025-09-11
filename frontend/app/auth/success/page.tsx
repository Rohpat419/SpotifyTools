"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { PageLayout } from "@/components/page-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Music, ArrowLeft, Home } from "lucide-react"

export default function AuthSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [authStatus, setAuthStatus] = useState<"success" | "error" | null>(null)

  useEffect(() => {
    const ok = searchParams.get("ok")
    const error = searchParams.get("error")

    if (error) {
      setAuthStatus("error")
      return
    }

    if (ok === "1") {
      setAuthStatus("success")
    } else {
      setAuthStatus("error")
    }
  }, [searchParams])

  return (
    <PageLayout
      title={authStatus === "success" ? "Successfully Connected!" : "Authentication Failed"}
      description={
        authStatus === "success"
          ? "Your Spotify account has been connected"
          : "There was an issue connecting your account"
      }
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {authStatus === "success" ? (
          <Card className="border-[#1DB954]/20 bg-gradient-to-r from-[#1DB954]/5 to-transparent">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-[#1DB954] rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-[#1DB954]">Welcome to SpotifyTools!</CardTitle>
              <CardDescription>Your Spotify account has been successfully connected.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Music className="h-4 w-4" />
                <AlertDescription>
                  You now have access to all SpotifyTools features including private playlists, playlist creation, track
                  deletion, and your personal listening analytics.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => router.back()} variant="outline" className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
                <Button onClick={() => router.push("/")} className="flex-1 bg-[#1DB954] hover:bg-[#1ed760]">
                  <Home className="mr-2 h-4 w-4" />
                  Explore Features
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-destructive/20">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-destructive rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-destructive">Connection Failed</CardTitle>
              <CardDescription>We couldn't connect your Spotify account. This might be due to:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0" />
                  You declined the authorization request
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0" />A network error occurred
                  during the process
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full flex-shrink-0" />
                  The authorization session expired
                </li>
              </ul>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => router.push("/")} variant="outline" className="flex-1">
                  <Home className="mr-2 h-4 w-4" />
                  Return Home
                </Button>
                <Button
                  onClick={() => (window.location.href = "https://spotify-tools-eozl.onrender.com/api/auth/login")}
                  className="flex-1 bg-[#1DB954] hover:bg-[#1ed760]"
                >
                  <Music className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  )
}
