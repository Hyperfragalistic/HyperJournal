"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/useAppStore";
import { shortenAddress } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Layers,
  Brain,
  Settings,
  LogOut,
  Wifi,
  WifiOff,
  Activity,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/journal", icon: BookOpen, label: "Journal" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/playbooks", icon: Layers, label: "Playbooks" },
  { href: "/coach", icon: Brain, label: "AI Coach", highlight: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { profile, reset } = useAppStore();

  async function handleSignOut() {
    await supabase.auth.signOut();
    reset();
    router.push("/login");
  }

  return (
    <aside className="flex flex-col w-64 h-screen fixed left-0 top-0 bg-hl-bg-card border-r border-hl-border z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-hl-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-hl flex items-center justify-center flex-shrink-0">
          <span className="text-hl-bg font-bold text-sm">HJ</span>
        </div>
        <div>
          <span className="font-bold text-base hl-gradient-text leading-tight block">
            HyperJournal
          </span>
          <span className="text-[10px] text-hl-text-dim uppercase tracking-wider">
            Hyperliquid Journal
          </span>
        </div>
      </div>

      {/* Wallet Status */}
      {profile?.hl_address ? (
        <div className="mx-4 mt-4 px-3 py-2.5 rounded-lg bg-hl-primary/5 border border-hl-primary/20 flex items-center gap-2">
          <Wifi className="w-3.5 h-3.5 text-hl-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-hl-text-dim uppercase tracking-wider">Connected</p>
            <p className="text-xs text-hl-primary font-mono truncate">
              {shortenAddress(profile.hl_address)}
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-4 mt-4 px-3 py-2.5 rounded-lg bg-hl-yellow/5 border border-hl-yellow/20 flex items-center gap-2">
          <WifiOff className="w-3.5 h-3.5 text-hl-yellow flex-shrink-0" />
          <div>
            <p className="text-xs text-hl-yellow">No wallet connected</p>
            <Link href="/settings" className="text-[10px] text-hl-text-muted hover:text-hl-primary transition-colors">
              Connect wallet →
            </Link>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-hl-primary/10 text-hl-primary border border-hl-primary/20"
                  : "text-hl-text-muted hover:bg-hl-bg-hover hover:text-hl-text",
                item.highlight && !isActive && "hover:text-hl-primary"
              )}
            >
              <item.icon
                className={cn(
                  "w-4.5 h-4.5 flex-shrink-0 transition-colors",
                  isActive
                    ? "text-hl-primary"
                    : "text-hl-text-dim group-hover:text-hl-text-muted"
                )}
                style={{ width: 18, height: 18 }}
              />
              {item.label}
              {item.highlight && (
                <span className="ml-auto text-[10px] bg-hl-primary/20 text-hl-primary px-1.5 py-0.5 rounded font-medium">
                  AI
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-1 border-t border-hl-border pt-4">
        {/* Live indicator */}
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-hl-text-muted">
          <Activity className="w-3.5 h-3.5 text-hl-primary" style={{ width: 14, height: 14 }} />
          <span>Live Hyperliquid data</span>
          <span className="ml-auto w-2 h-2 rounded-full bg-hl-green animate-pulse" />
        </div>

        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
            pathname === "/settings"
              ? "bg-hl-primary/10 text-hl-primary"
              : "text-hl-text-muted hover:bg-hl-bg-hover hover:text-hl-text"
          )}
        >
          <Settings style={{ width: 18, height: 18 }} className="flex-shrink-0" />
          Settings
        </Link>

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-hl-primary/20 border border-hl-primary/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-hl-primary">
              {profile?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-hl-text truncate">
              {profile?.display_name ?? "Trader"}
            </p>
            <p className="text-[10px] text-hl-text-dim truncate">{profile?.email ?? ""}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-hl-text-dim hover:text-hl-red transition-colors"
            title="Sign out"
          >
            <LogOut style={{ width: 15, height: 15 }} />
          </button>
        </div>
      </div>
    </aside>
  );
}
