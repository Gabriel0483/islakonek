
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FaresRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/fares"); }, [router]);
  return null;
}
