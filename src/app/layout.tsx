import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HR Work Manager — Employee Portal',
  description: 'Professional HR employee work tracking, break management, leave requests, and reporting system.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-bg-base text-text-primary antialiased`}>
        {children}
      </body>
    </html>
  )
}
