import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/layout/NavBar";
import { generateCSSVariables } from "@/lib/theme";
import { SITE_ORIGIN } from "@/lib/site";
// Push
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// Resolves the relative canonical and og:url a page returns, so a shared link is absolute.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: "ExoplanetHub - Discover Worlds Beyond Our Solar System",
  description: "Explore thousands of confirmed exoplanets with detailed data and visualizations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${poppins.variable}`} style={generateCSSVariables('nautilus')}>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
