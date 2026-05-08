
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FleetRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/fleet"); }, [router]);
  return null;
}
