"use client"

import { Button } from "@/components/ui/button"

export function AuthButton() {
  const handleLogin = () => {
    window.location.href = "https://spotify-tools-eozl.onrender.com/api/auth/login"
  }

  return (
    <Button onClick={handleLogin} className="bg-green-600 hover:bg-green-700 text-white">
      Connect Spotify Account
    </Button>
  )
}
