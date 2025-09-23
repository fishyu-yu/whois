import type { Viewport } from "next"

export default function Manifest() {
  return null
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1021" },
  ],
}