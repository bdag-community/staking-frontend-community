import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, ChevronRight } from 'lucide-react';
import { Pool } from '@/utils/interface';

import { Button } from './button';

interface PoolCardProps {
  pool: Pool;
  onStake: (pool: Pool) => void;
  variant?: 'default' | 'featured';
}

export const PoolCard: React.FC<PoolCardProps> = ({
  pool,
  onStake,
  variant = 'default',
}) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/pool/${pool.id}`);
  };

  const handleStakeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStake(pool);
  };

  return (
    <div
      className={`pool-card group ${variant === 'featured' ? 'min-w-[320px]' : ''
        }`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-foreground truncate">
              {pool.name}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">{pool.address}</p>
        </div>
        <div className="status-badge-success">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          Active
        </div>
      </div>

      {/* Key Stats */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Hash Power</p>
            <p className="text-sm font-medium">{pool.hashPower}</p>
          </div>
        </div>
      </div>

      {/* Commission */}
      <div className="flex items-center justify-between py-3 border-t border-border/50 mb-4">
        <span className="text-sm text-muted-foreground">Commission</span>
        <span className="text-sm font-medium text-warning">{pool.commission}%</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleStakeClick}
          className="flex-1 btn-primary-glow text-primary-foreground font-medium"
        >
          Stake Now
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};
