export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Backend redirects directly to /auth/success after handling the callback
    const { searchParams } = request.nextUrl
    const error = searchParams.get("error")
    const ok = searchParams.get("ok")

    if (error) {
      return NextResponse.redirect(`${request.nextUrl.origin}/auth/success?error=${error}`)
    }

    if (ok) {
      return NextResponse.redirect(`${request.nextUrl.origin}/auth/success?ok=1`)
    }

    // If no params, redirect to auth success with error
    return NextResponse.redirect(`${request.nextUrl.origin}/auth/success?error=invalid_callback`)
  } catch (error) {
    console.error("Error in auth callback:", error)
    return NextResponse.redirect(`${request.nextUrl.origin}/auth/success?error=callback_error`)
  }
}
