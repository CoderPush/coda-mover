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
      <body className={`flex flex-col max-h-screen ${inter.className}`}>
        <header className='p-4'>
          <h1 className='mb-1'>{metadata.title as string}</h1>
          <p className='text-zinc-600 pb-0'>{metadata.description!}</p>
        </header>
        <main className='px-4 flex flex-col overflow-hidden'>
          {children}
        </main>
      </body>
    </html>
  )
}
