import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { DEFAULT_SECTION_PATH } from "@/lib/navigation";
import StrategyPage from "./pages/StrategyPage";
import RoadmapPage from "./pages/RoadmapPage";
import BoardPage from "./pages/BoardPage";
import HypothesesPage from "./pages/HypothesesPage";
import AttachmentsPage from "./pages/AttachmentsPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Get base path from import.meta.env (set by Vite)
// This will be "/product-notebook" for production builds, "/" for development
const basename = import.meta.env.BASE_URL || "/";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={basename}>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to={DEFAULT_SECTION_PATH} replace />} />
              <Route path="strategy" element={<StrategyPage />} />
              <Route path="roadmap" element={<RoadmapPage />} />
              <Route path="hypotheses" element={<HypothesesPage />} />
              <Route path="board" element={<BoardPage />} />
              <Route path="attachments" element={<AttachmentsPage />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
