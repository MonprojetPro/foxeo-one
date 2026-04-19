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
  title: 'MonprojetPro',
  description: 'Votre espace MonprojetPro',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Default to Lab theme — dynamic switch to One via ThemeProvider
  // Client config will determine actual theme (Story 1.5+)
  return (
    <html
      lang="fr"
      className={`dark theme-lab ${poppins.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Client dashboard = dark uniquement. Pas de lecture localStorage theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{localStorage.removeItem('monprojetpro-theme')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider defaultTheme="dark" dashboardTheme="lab">
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
