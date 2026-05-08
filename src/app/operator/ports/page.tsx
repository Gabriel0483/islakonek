
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PortsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/ports"); }, [router]);
  return null;
}
