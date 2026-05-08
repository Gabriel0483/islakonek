
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RoutesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/routes"); }, [router]);
  return null;
}
