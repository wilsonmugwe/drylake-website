import type { Metadata } from "next";

import SystemScreen from "@/components/system/SystemScreen";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "Page not found | Drylake" },
  robots: PRIVATE_ROBOTS,
};

export default function NotFound() {
  return (
    <SystemScreen
      code="404"
      title="Page not found."
      description="The page you are looking for does not exist, or it may have moved."
    />
  );
}
