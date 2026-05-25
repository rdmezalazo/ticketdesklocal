import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PermissionProtectedRoute } from "@/components/PermissionProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Users from "./pages/Users";
import TiTasks from "./pages/TiTasks";
import Tickets from "./pages/Tickets";
import Support from "./pages/Support";
import ChatSupport from "./pages/ChatSupport";
import DataReports from "./pages/DataReports";
import ReportDesigner from "./pages/ReportDesigner";
import Inventario from "./pages/Inventario";
import MaintenancePlan from "./pages/MaintenancePlan";
import EquipmentAssignments from "./pages/EquipmentAssignments";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <DashboardLayout>{children}</DashboardLayout>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <PermissionProtectedRoute requiredPermission="dashboard">
                      <Index />
                    </PermissionProtectedRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/users" 
                element={
                  <ProtectedRoute>
                    <PermissionProtectedRoute requiredPermission="users">
                      <Users />
                    </PermissionProtectedRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/ti-tasks" 
                element={
                  <ProtectedRoute>
                    <PermissionProtectedRoute requiredPermission="ti-tasks">
                      <TiTasks />
                    </PermissionProtectedRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tickets" 
                element={
                  <ProtectedRoute>
                    <PermissionProtectedRoute requiredPermission="tickets">
                      <Tickets />
                    </PermissionProtectedRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/support" 
                element={
                  <ProtectedRoute>
                    <PermissionProtectedRoute requiredPermission="tickets">
                      <Support />
                    </PermissionProtectedRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/chatsupport" 
                element={
                  <ProtectedRoute>
                    <PermissionProtectedRoute requiredPermission="chatsupport">
                      <ChatSupport />
                    </PermissionProtectedRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/datareports" 
                element={
                  <ProtectedRoute>
                    <PermissionProtectedRoute requiredPermission="reports">
                      <DataReports />
                    </PermissionProtectedRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <PermissionProtectedRoute requiredPermission="settings">
                      <Settings />
                    </PermissionProtectedRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/report-designer" 
                element={
                  <ProtectedRoute>
                    <PermissionProtectedRoute requiredPermission="report-designer">
                      <ReportDesigner />
                    </PermissionProtectedRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/inventario" 
                element={
                  <ProtectedRoute>
                    <PermissionProtectedRoute requiredPermission="inventario">
                      <Inventario />
                    </PermissionProtectedRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/maintenance-plan" 
                element={
                  <ProtectedRoute>
                    <PermissionProtectedRoute requiredPermission="maintenance-plan">
                      <MaintenancePlan />
                    </PermissionProtectedRoute>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/equipment-assignments" 
                element={
                  <ProtectedRoute>
                    <PermissionProtectedRoute requiredPermission="equipment-assignments">
                      <EquipmentAssignments />
                    </PermissionProtectedRoute>
                  </ProtectedRoute>
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
