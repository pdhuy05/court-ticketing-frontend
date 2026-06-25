"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function StaffPage() {
  const router = useRouter();

  useEffect(() => {
    const token = sessionStorage.getItem("staffToken");
    if (token) {
      const staffData = sessionStorage.getItem("staffToken");
      if (staffData) {
        const [, counterId] = staffData.split(":");
        if (counterId) {
          router.push(`/staff/${counterId}`);
          return;
        }
      }
    }
    router.push("/staff/login");
  }, [router]);

  return <div>Đang chuyển hướng...</div>;
}
