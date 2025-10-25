import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "ODL Tools",
  description: "Portail d'outils internes ODL Group",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
