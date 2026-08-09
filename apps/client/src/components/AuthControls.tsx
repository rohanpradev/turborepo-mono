"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import ProfileButton from "@/components/ProfileButton";
import { Button } from "@/components/ui/button";

export default function AuthControls() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div
        aria-hidden="true"
        className="h-9 w-20 animate-pulse rounded-md bg-muted"
      />
    );
  }

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <Button type="button" variant="outline" size="sm">
          Sign in
        </Button>
      </SignInButton>
    );
  }

  return <ProfileButton />;
}
