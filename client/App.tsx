import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";

// Lazy load pages for code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Networks = lazy(() => import("./pages/Networks"));
const Paths = lazy(() => import("./pages/Paths"));
const Pools = lazy(() => import("./pages/Pools"));
const ConfigPage = lazy(() => import("./pages/Config"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Configure React Query with performance optimizations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
      <p className="text-slate-600">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/networks" element={<Networks />} />
            <Route path="/paths" element={<Paths />} />
            <Route path="/pools" element={<Pools />} />
            <Route path="/config" element={<ConfigPage />} />
            {/* Catch-all for unmatched routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
