import type { Metadata } from 'next'
import { Poppins, Inter } from 'next/font/google'
import { QueryProvider, ThemeProvider, RealtimeProvider } from '@monprojetpro/supabase'
import { Toaster, OfflineBanner, BrowserWarning, LocaleProvider } from '@monprojetpro/ui'
import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MonprojetPro Hub',
  description: 'Cockpit operateur MonprojetPro',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="fr"
      className={`dark theme-hub ${poppins.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('monprojetpro-theme');if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light')}else if(t==='system'&&window.matchMedia('(prefers-color-scheme:light)').matches){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider defaultTheme="dark" dashboardTheme="hub">
          <LocaleProvider>
            <QueryProvider>
              <RealtimeProvider>
                <BrowserWarning />
                <OfflineBanner />
                {children}
                <Toaster />
              </RealtimeProvider>
            </QueryProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
