import "./globals.css";
import { Geist } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import QueryProvider from "@/components/providers/query-provider";

export const metadata: Metadata = {
  title: "SOTE - Sistema de Organización Territorial Estratégica",
  description: "Sistema de Gestión y Organización territorial Estratégica",
  icons: [
    { rel: "icon", url: "/icons/manifest-icon-192.maskable.png" },
    { rel: "apple-touch-icon", url: "/icons/apple-icon-180.png" },
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SOTE",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e40af",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const geistSans = Geist({ display: "swap", subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen flex flex-col ">
        <QueryProvider>
          <div className="flex flex-col flex-1">{children}</div>
        </QueryProvider>

        <ToastContainer
          position="top-right"
          autoClose={10000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </body>
    </html>
  );
}
