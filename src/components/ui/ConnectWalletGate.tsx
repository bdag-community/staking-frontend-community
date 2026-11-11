import React from 'react';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/use-wallet';

interface ConnectWalletGateProps {
    description?: string;
}

export const ConnectWalletGate: React.FC<ConnectWalletGateProps> = ({
    description = 'Connect your wallet to continue',
}) => {
    const { open } = useWallet();

    return (
        <div className="container py-16">
            <div className="text-center max-w-md mx-auto">
                <Wallet className="w-16 h-16 mx-auto mb-6 text-muted-foreground" />
                <h1 className="font-display text-2xl font-bold mb-4">
                    Connect Your Wallet
                </h1>
                <p className="text-muted-foreground mb-6">{description}</p>
                <Button onClick={() => open()} variant="glow" size="lg">
                    Connect Wallet
                </Button>
            </div>
        </div>
    );
};
