import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Central de Marketing · Charme do Detalhe',
  description: 'Painel interno de criação e padronização de imagens de marketing',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={GeistSans.className}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
