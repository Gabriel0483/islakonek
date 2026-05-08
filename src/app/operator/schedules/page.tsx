
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SchedulesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/schedules"); }, [router]);
  return null;
}
