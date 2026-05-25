import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock } from 'lucide-react';

interface PermissionProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission: string;
}

export function PermissionProtectedRoute({ children, requiredPermission }: PermissionProtectedRouteProps) {
  const { hasAccess, loading } = useUserPermissions();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess(requiredPermission)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert className="border-destructive">
            <Lock className="h-4 w-4" />
            <AlertDescription className="text-center">
              <div className="space-y-2">
                <p className="font-semibold">Acceso Denegado</p>
                <p className="text-sm text-muted-foreground">
                  No tienes permisos para acceder a esta página. Contacta al administrador del sistema.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}