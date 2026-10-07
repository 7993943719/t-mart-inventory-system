import "./globals.css";

export const metadata = {
  title: "T MART - Business Management Platform",
  description: "T MART Supermarket ERP & Business Management SaaS",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
