import React from 'react';
import { HelpCircle } from 'lucide-react';
import { SimpleTooltip } from '@/components/ui/tooltip';

interface InfoTooltipProps {
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, side = 'top' }) => {
  return (
    <SimpleTooltip
      content={content}
      side={side}
      className="max-w-xs glass-card border-primary/20 px-3 py-2 text-sm z-[1000]"
    >
      <button type="button" aria-label="More information" className="info-tooltip ml-1">
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
    </SimpleTooltip>
  );
};
