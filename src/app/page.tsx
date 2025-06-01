'use client'

import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {  useAuth } from "@clerk/nextjs";

import TypewriterEffectSmoothDemo from "@/components/ui/typewriter-effect-demo-1";
import { DotBackground } from "@/components/ui/dot-background";

export default function Home() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const handleClick = () => {
    if (isSignedIn) {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <DotBackground />
      <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-4 sm:p-8 lg:p-12 xl:p-16 2xl:p-20 pb-12 sm:pb-16 lg:pb-20 gap-8 sm:gap-12 lg:gap-16 font-[family-name:var(--font-geist-sans)]">
        <main className="flex flex-col gap-6 sm:gap-8 lg:gap-10 row-start-2 items-center text-center sm:text-left max-w-4xl mx-auto">
          
        </main>
      </div>
    </div>
  );
}
