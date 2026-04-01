import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Showing from "./pages/Showing";
import MyTickets from "./pages/MyTickets";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import MovieForm from "./pages/admin/MovieForm";
import ShowingForm from "./pages/admin/ShowingForm";
import StaffPOS from "./pages/admin/StaffPOS";
import TicketScanner from "./pages/admin/TicketScanner";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/showing/:id" element={<Showing />} />
              <Route path="/my-tickets" element={<MyTickets />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/movies/:id" element={<MovieForm />} />
              <Route path="/admin/movies/new" element={<MovieForm />} />
              <Route path="/admin/showings/new" element={<ShowingForm />} />
              <Route path="/admin/showings/:id" element={<ShowingForm />} />
              <Route path="/admin/pos" element={<StaffPOS />} />
              <Route path="/admin/scanner" element={<TicketScanner />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
