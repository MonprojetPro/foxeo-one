// build: 2026-04-29
import type { Metadata } from 'next'
import { Poppins, Inter } from 'next/font/google'
import { QueryProvider, ThemeProvider, RealtimeProvider } from '@monprojetpro/supabase'
import { cookies } from 'next/headers'
import {
  Toaster,
  OfflineBanner,
  BrowserWarning,
  LocaleProvider,
  MODE_TOGGLE_COOKIE,
} from '@monprojetpro/ui'
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Classe de thème posée dès le SERVEUR, d'après l'intention de mode stockée dans le
  // cookie du toggle Lab/One. Sans ça, la page s'affichait d'abord en violet (Lab) puis
  // ThemeClassSetter corrigeait après hydratation — flash visible à chaque navigation.
  //
  // Le cookie n'exprime qu'une intention : le clamp aux modes réellement autorisés est
  // fait par le layout (dashboard), qui rectifie la classe si besoin (cas rare d'un
  // cookie 'one' resté chez un client redevenu Lab uniquement).
  const cookieStore = await cookies()
  const dashboardTheme =
    cookieStore.get(MODE_TOGGLE_COOKIE)?.value === 'one' ? 'theme-one' : 'theme-lab'

  return (
    <html
      lang="fr"
      className={`dark ${dashboardTheme} ${poppins.variable} ${inter.variable}`}
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
