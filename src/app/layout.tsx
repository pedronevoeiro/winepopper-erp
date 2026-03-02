import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Winepopper ERP',
  description: 'Sistema de gestao empresarial Winepopper',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className + " antialiased"}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
