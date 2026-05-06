import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, MessageSquarePlus, Trophy, Users, CalendarDays, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminNotifications } from "@/components/AdminNotifications";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/sessions", label: "Sessions", icon: CalendarDays },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/feedback", label: "My feedback", icon: MessageSquarePlus },
    ...(role === "admin" ? [{ to: "/admin", label: "Admin", icon: Users }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 backdrop-blur-xl bg-background/70">
        <div className="container flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-gold flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="font-serif text-lg">BytesAndBeyond</div>
              <div className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Loading knowledge · 2026</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) =>
                cn("px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                   isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50")
              }>
                <n.icon className="w-4 h-4" /> {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {role === "admin" && <span className="hidden sm:inline mono text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">Admin</span>}
            {role === "admin" && <AdminNotifications />}
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/auth"); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="md:hidden border-t border-border/60 overflow-x-auto">
          <div className="flex gap-1 px-3 py-2">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) =>
                cn("px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap flex items-center gap-1.5",
                   isActive ? "bg-secondary text-foreground" : "text-muted-foreground")
              }>
                <n.icon className="w-3.5 h-3.5" /> {n.label}
              </NavLink>
            ))}
          </div>
        </div>
      </header>
      <main className="flex-1 container py-5 sm:py-8">{children}</main>
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground mono">
        BYTESANDBEYOND · {user?.email ? user.email : "guest"} · 2026
      </footer>
    </div>
  );
};
