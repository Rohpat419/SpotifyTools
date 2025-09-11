import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://your-backend.onrender.com"

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const userData = await response.json()
    return NextResponse.json(userData)
  } catch (error) {
    console.error("Error checking authentication:", error)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
}
