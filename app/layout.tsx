import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudySathi — Plan. Focus. Grow.",
  description:
    "A smart student time-management app. Plan. Focus. Grow. Track study time, tasks, streaks, and focus sessions.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full flex flex-col md:flex-row bg-background text-foreground font-sans antialiased">
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-screen overflow-hidden pb-16 md:pb-0">
          {children}
        </main>
      </body>
    </html>
  );
}
