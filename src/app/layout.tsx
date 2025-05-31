import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Idea Bird",
  description: "Generate engaging tweets for your business/ personal brand",


};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
    <html lang="en">
      <link rel="icon" type="image/png" sizes="32x32" href="https://www.dictionary.com/e/wp-content/uploads/2018/10/dove-of-peace.png" />

      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="flex justify-between items-center p-4 sm:p-6 lg:p-8 gap-2 sm:gap-4 h-16 sm:h-20">
          <div className="flex items-center">
            <Link href="/" className="text-xl sm:text-2xl font-semibold font-serif ">Idea Bird</Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 rounded-md bg-blue-500 text-white font-serif hover:bg-blue-600 transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 rounded-md border border-blue-500 text-blue-500 hover:bg-blue-500 font-mono hover:text-white transition-colors">
                  Sign Up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </header>
        {children}
      </body>
    </html>
  </ClerkProvider>

  );
}