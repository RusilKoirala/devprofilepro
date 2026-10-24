import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server"
import { isAppEnabled, PUBLIC_PATHS } from "@/lib/access"

// Everything is private except the landing and pricing pages, auth pages, the waitlist API and the
// Dodo webhook (it checks its own signature).
const isPublic = createRouteMatcher(["/", "/pricing", "/privacy", "/terms", "/ats-checker", "/sign-in(.*)", "/sign-up(.*)", "/api/ats-check", "/api/waitlist", "/api/webhooks/dodo", "/api/webhooks/clerk"])

const clerk = clerkMiddleware(
  async (auth, request) => {
    if (!isPublic(request)) await auth.protect()
  },
  // Send signed-out visitors to our own pages, not Clerk's hosted ones.
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" }
)

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  // Public sample files the landing page links to (public/samples).
  if (request.nextUrl.pathname.startsWith("/samples/")) return NextResponse.next()
  // Early access lock: nothing but the landing page, pricing and waitlist until APP_ENABLED=true.
  if (!isAppEnabled()) {
    if (PUBLIC_PATHS.has(request.nextUrl.pathname)) return NextResponse.next()
    return new NextResponse("Not found", { status: 404 })
  }
  // Without Clerk keys the landing page must keep working; only the app is unavailable.
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    if (isPublic(request) && !request.nextUrl.pathname.startsWith("/sign-")) return NextResponse.next()
    return new NextResponse("Sign-in isn't configured yet. Set the Clerk keys in .env.local.", { status: 503 })
  }
  return clerk(request, event)
}

export const config = {
  matcher: [
    // Skip Next internals and static files unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
