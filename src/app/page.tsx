'use client'

import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignInButton, useAuth } from "@clerk/nextjs";

export default function Home() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const handleClick = () => {
    if (isSignedIn) {
      router.push("/dashboard");
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <h1 className="text-8xl font-bold">Idea Bird 🕊️</h1>
        {isSignedIn ? (
          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded-md mx-auto" 
            onClick={handleClick}
          >
            Generate Engaging Tweets
          </button>
        ) : (
          <SignInButton mode="modal">
            <button className="bg-blue-500 text-white px-4 py-2 rounded-md mx-auto">
              Sign in to Generate Tweets
            </button>
          </SignInButton>
        )}
      </main>
    </div>
  );
}
