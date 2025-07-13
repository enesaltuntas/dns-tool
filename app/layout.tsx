import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Comprehensive DNS Testing Tool',
  description: 'Advanced Domain Name System Analysis Suite',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}