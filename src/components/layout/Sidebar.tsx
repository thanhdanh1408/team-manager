"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Activity,
  LogOut,
  Menu,
  X,
  ClipboardList,
  UserCircle,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/members", label: "Thành viên", icon: Users },
  { href: "/admin/tasks", label: "Công việc", icon: CheckSquare },
  { href: "/admin/chat", label: "Team Chat", icon: MessageSquare },
  { href: "/admin/activity", label: "Nhật ký", icon: Activity },
  { href: "/admin/profile", label: "Hồ sơ", icon: UserCircle },
];

const memberLinks = [
  { href: "/member", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/member/tasks", label: "Công việc của tôi", icon: ClipboardList },
  { href: "/member/chat", label: "Team Chat", icon: MessageSquare },
  { href: "/member/profile", label: "Hồ sơ", icon: UserCircle },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const links = user.role === "admin" ? adminLinks : memberLinks;

  // Function (not a component / shared element) so each call creates a fresh tree
  const renderNav = () => (
    <>
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
            <CheckSquare size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Team Manager</p>
            <p className="text-xs text-slate-500">
              {user.role === "admin" ? "Quản trị viên" : "Thành viên"}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map((link) => {
          const active =
            pathname === link.href ||
            (link.href !== "/admin" &&
              link.href !== "/member" &&
              pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <link.icon size={18} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-3 py-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <Avatar name={user.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user.name}
            </p>
            <p className="text-xs text-slate-500 truncate">{user.position}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
        >
          <LogOut size={18} />
          Đăng xuất
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Mở menu"
        className="fixed top-4 left-4 z-40 rounded-lg bg-white border border-slate-200 p-2 shadow-sm lg:hidden cursor-pointer"
      >
        <Menu size={20} className="text-slate-700" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-slate-200 transition-transform lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Đóng menu"
          className="absolute top-4 right-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
        >
          <X size={18} />
        </button>
        {renderNav()}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-slate-200">
        {renderNav()}
      </aside>
    </>
  );
}
