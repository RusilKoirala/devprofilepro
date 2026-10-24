"use client"

import { ThemeProvider as NextThemes } from "next-themes"

// Dark only for now. The light tokens stay in app/globals.css; to bring light back, drop
// forcedTheme and set defaultTheme="system" enableSystem.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" forcedTheme="dark" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemes>
  )
}
