import type {Metadata} from 'next';
import { Inter, Cormorant_Garamond, Outfit } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/hooks/useAuth';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
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
      { url: 'https://dpceyubrwftpxuddlzmc.supabase.co/storage/v1/object/public/assets/IA%20Biblia%20em%20Cristo.png' },
    ],
    apple: [
      { url: 'https://dpceyubrwftpxuddlzmc.supabase.co/storage/v1/object/public/assets/IA%20Biblia%20em%20Cristo.png', sizes: '192x192', type: 'image/png' },
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
    images: [
      {
        url: 'https://dpceyubrwftpxuddlzmc.supabase.co/storage/v1/object/public/assets/IA%20Biblia%20em%20Cristo.png',
        width: 1200,
        height: 630,
        alt: 'IA Bíblia',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IA Bíblia - Estudo Bíblico',
    description: 'Bíblia Online de Estudo Bíblico com Inteligência Artificial. A Bíblia explica a Bíblia.',
    images: ['https://dpceyubrwftpxuddlzmc.supabase.co/storage/v1/object/public/assets/IA%20Biblia%20em%20Cristo.png'],
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
                        
                        // Check for updates every hour
                        setInterval(() => {
                          registration.update();
                        }, 1000 * 60 * 60);

                        registration.onupdatefound = () => {
                          const installingWorker = registration.installing;
                          if (installingWorker) {
                            installingWorker.onstatechange = () => {
                              if (installingWorker.state === 'installed') {
                                if (navigator.serviceWorker.controller) {
                                  console.log('New version available, forcing reload...');
                                  window.location.reload();
                                }
                              }
                            };
                          }
                        };
                      }, function(err) {
                        console.log('ServiceWorker registration failed: ', err);
                      });
                    });
                  }

                  // Handle Next.js chunk load errors (404s for old builds)
                  window.addEventListener('error', function(e) {
                    const msg = e.message || '';
                    const isChunkError = msg.includes('Loading chunk') || msg.includes('Loading CSS chunk') || msg.includes('ChunkLoadError');
                    
                    // Also check for failed script/link tags in _next/static
                    const target = e.target;
                    const isAssetError = target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK') && 
                                        (target.src || target.href || '').includes('_next/static');

                    if (isChunkError || isAssetError) {
                      console.warn('Asset load error detected, forcing reload...', msg);
                      // Avoid infinite reload loops
                      const lastReload = sessionStorage.getItem('last_chunk_reload');
                      const now = Date.now();
                      if (!lastReload || now - parseInt(lastReload) > 5000) {
                        sessionStorage.setItem('last_chunk_reload', now.toString());
                        window.location.reload();
                      }
                    }
                  }, true);

                  window.addEventListener('unhandledrejection', function(e) {
                    const reason = e.reason || {};
                    if (reason.name === 'ChunkLoadError' || (reason.message && reason.message.includes('Loading chunk'))) {
                      console.warn('Unhandled ChunkLoadError detected, forcing reload...');
                      const lastReload = sessionStorage.getItem('last_chunk_reload');
                      const now = Date.now();
                      if (!lastReload || now - parseInt(lastReload) > 5000) {
                        sessionStorage.setItem('last_chunk_reload', now.toString());
                        window.location.reload();
                      }
                    }
                  });

                  // Check for Next.js generic error page on a timer
                  setInterval(function() {
                    if (document.body && document.body.innerText && document.body.innerText.includes('Application error: a client-side exception has occurred')) {
                      console.warn('Next.js generic error detected, forcing reload...');
                      window.location.reload();
                    }
                  }, 2000);
                `,
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
