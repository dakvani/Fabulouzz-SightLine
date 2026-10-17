import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeStyleProvider } from "@/contexts/ThemeStyleContext";
import { ProjectDataProvider } from "@/contexts/ProjectDataContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Welcome from "./pages/Welcome";
import AuthCallback from "./pages/AuthCallback";
import AuthError from "./pages/AuthError";
import NotFound from "./pages/NotFound";
import { AuthLinkInterceptor } from "./components/AuthLinkInterceptor";

const queryClient = new QueryClient();

const App = () => (
  <ThemeStyleProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ProjectDataProvider>
          <BrandingProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthLinkInterceptor />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/invite" element={<Onboarding />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/auth/error" element={<AuthError />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </BrandingProvider>
        </ProjectDataProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeStyleProvider>
);

export default App;
