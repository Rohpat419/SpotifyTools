"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, X } from "lucide-react"

interface ErrorNotificationProps {
  show: boolean
  onClose: () => void
}

export function ErrorNotification({ show, onClose }: ErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
    }
  }, [show])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Allow animation to complete
  }

  if (!isVisible) return null

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${show ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}
    >
      <Alert variant="destructive" className="max-w-md shadow-lg">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Do you have authorization? Please check your Spotify connection.</span>
          <Button variant="ghost" size="sm" onClick={handleClose} className="ml-2 h-auto p-1 hover:bg-destructive/20">
            <X className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}
