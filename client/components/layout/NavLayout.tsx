import React, { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Network,
  GitBranch,
  Droplet,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLayoutProps {
  children: React.ReactNode;
}

export const NavLayout: React.FC<NavLayoutProps> = React.memo(
  ({ children }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    // Memoize navItems to prevent recreation on every render
    const navItems = useMemo(
      () => [
        { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { path: "/networks", label: "Networks", icon: Network },
        { path: "/paths", label: "Paths", icon: GitBranch },
        { path: "/pools", label: "Pools", icon: Droplet },
        { path: "/config", label: "Config", icon: Settings },
      ],
      [],
    );

    const isActive = (path: string) => location.pathname === path;

    return (
      <div className="flex flex-col h-screen bg-slate-50">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-slate-200 shadow-sm relative z-[60]">
          <div className="px-4 sm:px-6 lg:px-8 relative z-[60]">
            <div className="flex items-center justify-between h-16">
              {/* Logo and Brand */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center font-bold text-slate-900">
                  ⚡
                </div>
                <span className="font-bold text-lg text-slate-900">
                  ArbiBot
                </span>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium",
                        active
                          ? "bg-blue-600 text-white"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                      )}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-700 relative z-[70]"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <nav className="md:hidden bg-white border-t border-slate-200 shadow-lg relative">
              <div className="px-4 py-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 mb-1",
                        active
                          ? "bg-blue-600 text-white"
                          : "text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      <Icon size={20} />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    );
  },
);
NavLayout.displayName = "NavLayout";
