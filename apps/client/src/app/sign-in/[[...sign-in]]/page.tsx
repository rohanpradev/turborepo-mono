import { SignIn } from "@clerk/nextjs";

const isClerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

export default function Page() {
  if (!isClerkConfigured) {
    return (
      <div className="mt-12 rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
        Authentication is not configured for this environment.
      </div>
    );
  }

  return <SignIn />;
}
