"use client";

import Script from "next/script";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api-client";
import type { AuthUser } from "@/types";

declare global {
  interface Window {
    google?: {
      accounts: { id: {
        initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
        renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
      } };
    };
  }
}

export function GoogleSignInButton() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const { setUser } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [working, setWorking] = useState(false);

  const initialize = useCallback(() => {
    if (!clientId || !window.google || !buttonRef.current) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async ({ credential }) => {
        setWorking(true);
        try {
          const result = await api.post<{ user: AuthUser }>("/api/auth/google", { credential });
          setUser(result.user);
          toast.success("Đăng nhập bằng Google thành công");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Đăng nhập Google thất bại");
        } finally { setWorking(false); }
      },
    });
    buttonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: "standard", theme: "outline", size: "large", text: "continue_with",
      shape: "rectangular", locale: "vi", width: 352,
    });
  }, [clientId, setUser]);

  if (!clientId) {
    return <button type="button" disabled className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-400" title="Cần cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID">Đăng nhập bằng Google (chưa cấu hình)</button>;
  }
  return <div className={working ? "pointer-events-none opacity-60" : ""}>
    <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={initialize} />
    <div ref={buttonRef} className="flex min-h-11 w-full justify-center" />
  </div>;
}
