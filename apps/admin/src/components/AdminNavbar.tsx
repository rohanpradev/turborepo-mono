import { currentUser } from "@clerk/nextjs/server";
import { navigation } from "next/cache";
import Navbar from "@/components/Navbar";

const adminViewerFallback = {
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
  await navigation();
  const viewer = await getAdminViewer();

  return <Navbar viewer={viewer} />;
}
