import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "StudyOS — Personal Productivity & Study System",
  description: "Strict study & break timer, automated backlog reallocation, available-time capacity planner, and approved study workspace.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StudyOS",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#030712",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Anti-flash theme initialization script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('studyos_theme');
                  var theme = saved ? saved : 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen theme-bg theme-text-primary flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300 transition-colors duration-200">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
