import React from 'react';
import { LucideIcon } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subValue?: string;
  tooltip?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  subValue,
  tooltip,
  trend,
}) => {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between gap-3">
        <div className="stat-icon">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="data-label truncate">{label}</span>
            {tooltip && <InfoTooltip content={tooltip} />}
          </div>
          <p className="data-value mt-1 truncate">{value}</p>
          {subValue && (
            <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
          )}
          {trend && (
            <p
              className={`text-xs mt-1 ${trend.isPositive ? 'text-success' : 'text-destructive'
                }`}
            >
              {trend.isPositive ? '+' : ''}
              {trend.value}% this epoch
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
