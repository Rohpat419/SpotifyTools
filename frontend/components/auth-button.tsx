"use client"

import { Button } from "@/components/ui/button"
import { API_BASE_URL } from "@/lib/api"

export function AuthButton() {
  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/api/auth/login`
  }

  return (
    <Button onClick={handleLogin} className="bg-green-600 hover:bg-green-700 text-white">
      Connect Spotify Account
    </Button>
  )
}
