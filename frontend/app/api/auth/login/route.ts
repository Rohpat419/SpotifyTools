import { type NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://your-backend.onrender.com"

export async function GET(request: NextRequest) {
  try {
    return NextResponse.redirect(`${API_BASE_URL}/api/auth/login`)
  } catch (error) {
    console.error("Error redirecting to backend auth:", error)
    return NextResponse.json({ error: "Failed to initiate authentication" }, { status: 500 })
  }
}
