import { currentUser } from "@clerk/nextjs/server";
import Navbar from "@/components/Navbar";

export const adminViewerFallback = {
  avatarUrl: null,
  displayName: "Admin Operator",
  email: null,
};

const getAdminViewer = async () => {
  const viewer = await currentUser().catch(() => null);
  const displayName =
    [viewer?.firstName, viewer?.lastName].filter(Boolean).join(" ").trim() ||
    viewer?.username ||
    viewer?.primaryEmailAddress?.emailAddress ||
    adminViewerFallback.displayName;

  return {
    avatarUrl: viewer?.imageUrl ?? null,
    displayName,
    email: viewer?.primaryEmailAddress?.emailAddress ?? null,
  };
};

export default async function AdminNavbar() {
  const viewer = await getAdminViewer();

  return <Navbar viewer={viewer} />;
}
