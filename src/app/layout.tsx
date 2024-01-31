import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import '@/config/styles/tailwind.scss'

const inter = Inter({ subsets: ['latin', 'vietnamese'] })

export const metadata: Metadata = {
  title: 'Coda Mover',
  description: 'Coda contents migration made simple',
}

export default function RootLayout ({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body className={`flex flex-col md:flex-row max-h-screen min-h-screen ${inter.className}`}>
        <header className='p-4'>
          <h1 className='mb-1'>{metadata.title as string}</h1>
          <p className='text-zinc-600 pb-0'>{metadata.description!}</p>
        </header>
        <main className='flex flex-col overflow-hidden grow md:pt-4'>
          {children}
        </main>
      </body>
    </html>
  )
}
