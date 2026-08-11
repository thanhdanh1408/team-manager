"use client";

import { AppShell } from "@/components/layout/AppShell";

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell requiredRole="member">{children}</AppShell>;
}
