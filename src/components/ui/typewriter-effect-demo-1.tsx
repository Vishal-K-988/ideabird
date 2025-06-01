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
    <div className="flex flex-col items-center justify-center w-full py-8 sm:py-12 lg:py-16">
      <div className="w-full max-w-[90vw] sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] xl:max-w-[50vw]">
        <TypewriterEffectSmooth words={words} />
      </div>
      {isSignedIn ? (
        <HoverBorderGradient
          containerClassName="w-full sm:w-auto mt-6 sm:mt-8 lg:mt-10"
          className="text-white rounded-lg px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 lg:py-3 text-sm sm:text-base lg:text-lg font-medium"
          onClick={handleClick}
        >
          Generate Engaging Tweets
        </HoverBorderGradient>
      ) : (
        <SignInButton mode="modal">
          <HoverBorderGradient
            containerClassName="w-full sm:w-auto mt-6 sm:mt-8 lg:mt-10"
            className="text-white rounded-lg px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 lg:py-3 text-sm sm:text-base lg:text-lg font-medium"
          >
            Sign in to Generate Tweets
          </HoverBorderGradient>
        </SignInButton>
      )}
    </div>
  );
} 