import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useWallet } from '@/hooks/use-wallet';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isConnected, isConnecting, isReconnecting } = useWallet();
    const { toast } = useToast();
    const location = useLocation();

    const isInitialLoading = isConnecting || (!isConnected && isReconnecting);

    useEffect(() => {
        if (!isInitialLoading && !isConnected) {
            toast({
                title: "Authentication Required",
                description: "Please connect your wallet to access this section.",
                variant: "destructive",
            });
        }
    }, [isConnected, isInitialLoading, toast]);

    if (isInitialLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-muted-foreground animate-pulse">Checking wallet connection...</p>
            </div>
        );
    }

    if (!isConnected) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};
