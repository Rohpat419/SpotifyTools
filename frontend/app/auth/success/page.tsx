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
  const [isVerifying, setIsVerifying] = useState(true)
  const [authStatus, setAuthStatus] = useState<"success" | "error" | null>(null)
  const [userInfo, setUserInfo] = useState<any>(null)

  useEffect(() => {
    const ok = searchParams.get("ok")
    const error = searchParams.get("error")

    if (error) {
      setAuthStatus("error")
      setIsVerifying(false)
      return
    }

    if (ok === "1") {
      // Verify authentication by calling /api/me
      verifyAuth()
    } else {
      setAuthStatus("error")
      setIsVerifying(false)
    }
  }, [searchParams])

  const verifyAuth = async () => {
    try {
      const response = await fetch("/api/me")
      if (response.ok) {
        const userData = await response.json()
        setUserInfo(userData)
        setAuthStatus("success")
      } else {
        setAuthStatus("error")
      }
    } catch (err) {
      setAuthStatus("error")
    } finally {
      setIsVerifying(false)
    }
  }

  if (isVerifying) {
    return (
      <PageLayout title="Verifying Authentication" description="Please wait while we verify your Spotify connection...">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1DB954] mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">Verifying your connection...</h3>
                <p className="text-muted-foreground">This should only take a moment</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    )
  }

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
              <CardDescription>
                {userInfo?.display_name && `Hi ${userInfo.display_name}! `}
                Your Spotify account has been successfully connected.
              </CardDescription>
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
                  onClick={() => (window.location.href = "/api/auth/login")}
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
