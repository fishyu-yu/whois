// theme provider setup
import "./globals.css"
import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { I18nProvider } from "@/lib/i18n"

export const metadata: Metadata = {
  title: "Whois Lookup",
  description: "Fast, modern Whois lookup for domains, IPs, ASN, CIDR with caching and history.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", type: "image/svg+xml" },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0B1021" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <I18nProvider defaultLang="zh">
            {children}
            <Toaster richColors closeButton position="top-right" />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
