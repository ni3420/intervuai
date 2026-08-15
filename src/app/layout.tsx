import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Metadata } from "next"
import { ThemeProvider } from "@/providers/theme-provider"
import { ClerkProvider } from "@clerk/nextjs"
import { ConvexClientProvider } from "@/providers/ConvexClientProvider"

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Intervu-AI",
  description: "interview preparation platform",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased font-sans">
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="zinc"
          enableSystem={false}
          themes={[
            "zinc",
            "zinc-dark",
            "rose",
            "rose-dark",
            "emerald",
            "emerald-dark",
            "violet",
            "violet-dark",
          ]}
        >
          <ClerkProvider>
            <ConvexClientProvider>
            {children}

            </ConvexClientProvider>
            </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}