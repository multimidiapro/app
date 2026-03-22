import type {Metadata} from 'next';
import { Inter, Cormorant_Garamond, Outfit } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/hooks/useAuth';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-serif',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-outfit',
});

export const viewport = {
  themeColor: '#0ea5e9',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'IA Bíblia - Estudo Bíblico',
  description: 'Bíblia Online de Estudo Bíblico com Inteligência Artificial. A Bíblia explica a Bíblia.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: 'https://picsum.photos/seed/bible-icon-192/192/192', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'IA Bíblia',
  },
  openGraph: {
    title: 'IA Bíblia - Estudo Bíblico',
    description: 'Bíblia Online de Estudo Bíblico com Inteligência Artificial. A Bíblia explica a Bíblia.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'IA Bíblia',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IA Bíblia - Estudo Bíblico',
    description: 'Bíblia Online de Estudo Bíblico com Inteligência Artificial. A Bíblia explica a Bíblia.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${cormorant.variable} ${outfit.variable}`}>
      <body className="font-sans bg-background text-foreground antialiased min-h-screen transition-colors duration-300" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {/* Futuristic Aura Background */}
            <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-400/10 dark:bg-cyan-500/10 rounded-full blur-[120px] opacity-50 animate-pulse-slow"></div>
              <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-[100px] opacity-30"></div>
            </div>
            {children}
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  if ('serviceWorker' in navigator) {
                    window.addEventListener('load', function() {
                      navigator.serviceWorker.register('/sw.js').then(function(registration) {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                      }, function(err) {
                        console.log('ServiceWorker registration failed: ', err);
                      });
                    });
                  }

                  // Handle Next.js chunk load errors (404s for old builds)
                  window.addEventListener('error', function(e) {
                    if (e.message && (e.message.includes('Loading chunk') || e.message.includes('Loading CSS chunk'))) {
                      console.warn('Chunk load error detected, forcing reload...', e.message);
                      window.location.reload();
                    }
                  }, true);
                `,
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
