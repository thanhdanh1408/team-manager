"use client";

import { AppShell } from "@/components/layout/AppShell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell requiredRole="admin">{children}</AppShell>;
}
