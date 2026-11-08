import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  BookOpen,
  Bot,
  Image,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Plus,
  Send,
  Settings2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { AuthPanel } from "./AuthPanel";

const navigation = [
  { label: "Vue d’ensemble", path: "/", icon: LayoutDashboard },
  { label: "Campagnes", path: "/campaigns", icon: Send },
  { label: "Abonnés", path: "/subscribers", icon: Users },
  { label: "Segments", path: "/segments", icon: BarChart3 },
  { label: "Modèles", path: "/templates", icon: BookOpen },
  { label: "Médias", path: "/media", icon: Image },
  { label: "Expédition", path: "/sending", icon: Mail },
  { label: "Automatisations", path: "/automations", icon: Bot },
  { label: "Paramètres", path: "/settings", icon: Settings2 },
];

function isActive(location: string, path: string) {
  return path === "/" ? location === "/" : location.startsWith(path);
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAccessScreen, setShowAccessScreen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowAccessScreen(true), 900);
    return () => window.clearTimeout(timeout);
  }, []);

  if (loading && !showAccessScreen) {
    return (
      <div className="min-h-screen bg-[#f8f7f6] grid place-items-center text-[#6d6764]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#ed7664] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#f8f7f6] p-6 grid place-items-center">
        <AuthPanel />
      </main>
    );
  }

  const navigationItems =
    user.role === "admin"
      ? [
          ...navigation,
          { label: "Administration", path: "/admin", icon: Settings2 },
        ]
      : navigation;
  const closeAndNavigate = (path: string) => {
    setLocation(path);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f7f6] text-[#282422]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col bg-[#282422] px-4 py-5 text-white lg:flex">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-3 px-2 text-left"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#ed7664] shadow-[0_8px_24px_rgba(237,118,100,.3)]">
            <Mail className="h-[18px] w-[18px]" />
          </span>
          <span>
            <strong className="block text-[15px] tracking-[-.02em]">
              MailCraft
            </strong>
            <small className="block pt-0.5 text-[10px] uppercase tracking-[.16em] text-white/45">
              email studio
            </small>
          </span>
        </button>
        <Button
          onClick={() => setLocation("/campaigns/new")}
          className="mt-9 h-10 w-full justify-start gap-2 bg-[#ed7664] px-3 text-sm text-white hover:bg-[#db6959]"
        >
          <Plus className="h-4 w-4" />
          Nouvelle campagne
        </Button>
        <nav className="mt-7 space-y-1" aria-label="Navigation principale">
          {navigationItems.map(item => {
            const active = isActive(location, item.path);
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={cn(
                  "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors",
                  active
                    ? "bg-white/[.11] text-white"
                    : "text-white/60 hover:bg-white/[.07] hover:text-white"
                )}
              >
                <item.icon
                  className={cn("h-4 w-4", active && "text-[#ff9889]")}
                />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-white/[.1] pt-4">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f6d0ca] text-xs font-bold text-[#8b3e35]">
              {(user.name || "M").slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-medium">
                {user.name || "Mon espace"}
              </strong>
              <small className="block truncate text-xs text-white/45">
                {user.email || "Compte MailCraft"}
              </small>
            </span>
          </div>
          <button
            onClick={logout}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/55 transition hover:bg-white/[.07] hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#eee9e6] bg-[#f8f7f6]/90 px-4 backdrop-blur lg:ml-[252px] lg:hidden">
        <button
          onClick={() => setMobileOpen(value => !value)}
          className="grid h-9 w-9 place-items-center rounded-xl border border-[#e8e1de] bg-white"
        >
          <Menu className="h-4 w-4" />
        </button>
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#ed7664] text-white">
            <Mail className="h-3.5 w-3.5" />
          </span>
          MailCraft
        </button>
        <button
          onClick={() => setLocation("/campaigns/new")}
          className="grid h-9 w-9 place-items-center rounded-xl bg-[#ed7664] text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#282422]/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <nav
            className="h-full w-[270px] bg-[#282422] px-4 py-6 text-white shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-2 text-sm font-semibold">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#ed7664]">
                <Mail className="h-4 w-4" />
              </span>
              MailCraft
            </div>
            <Button
              onClick={() => closeAndNavigate("/campaigns/new")}
              className="mt-8 h-10 w-full justify-start gap-2 bg-[#ed7664] text-white"
            >
              <Plus className="h-4 w-4" />
              Nouvelle campagne
            </Button>
            <div className="mt-6 space-y-1">
              {navigationItems.map(item => (
                <button
                  key={item.path}
                  onClick={() => closeAndNavigate(item.path)}
                  className={cn(
                    "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm",
                    isActive(location, item.path)
                      ? "bg-white/10"
                      : "text-white/65"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}

      <main className="min-h-screen px-4 py-6 sm:px-7 lg:ml-[252px] lg:px-10 lg:py-9">
        {children}
      </main>
    </div>
  );
}
