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
import NotFound from "./pages/NotFound";

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
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/reset-password" element={<ResetPassword />} />
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
