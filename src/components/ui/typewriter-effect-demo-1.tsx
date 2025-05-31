"use client";
import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

export default function TypewriterEffectSmoothDemo() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const handleClick = () => {
    if (isSignedIn) {
      router.push("/dashboard");
    }
  };

  const words = [
    {
      text: "Generate",
    },
    {
      text: "engaging",
    },
    {
      text: "tweets",
    },
    {
      text: "with",
    },
    {
      text: "IdeaBird.",
      className: "text-blue-500 dark:text-blue-500",
    },
  ];
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] py-12">
      <TypewriterEffectSmooth words={words} />
      {isSignedIn ? (
        <HoverBorderGradient
          containerClassName="w-full sm:w-auto mt-8"
          className="text-white px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-medium"
          onClick={handleClick}
        >
          Generate Engaging Tweets
        </HoverBorderGradient>
      ) : (
        <SignInButton mode="modal">
          <HoverBorderGradient
            containerClassName="w-full sm:w-auto mt-8"
            className="text-white px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-medium"
          >
            Sign in to Generate Tweets
          </HoverBorderGradient>
        </SignInButton>
      )}
    </div>
  );
} 