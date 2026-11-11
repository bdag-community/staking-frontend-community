import React from "react";
import { Check, Copy } from "lucide-react";
import { useCopy } from "@/hooks/use-copy";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
    value: string;
    text?: string;
    onCopy?: () => void;
    className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
    value,
    text,
    onCopy,
    className,
}) => {
    const { copied, copy } = useCopy();

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (copy(value)) onCopy?.();
    };

    return (
        <button
            type="button"
            aria-label={text ?? "Copy identifier"}
            className={cn("flex items-center gap-2 cursor-pointer", className)}
            onClick={handleCopy}
        >
            {copied ? (
                <Check className="w-4 h-4 text-success" />
            ) : (
                <Copy className="w-4 h-4" />
            )}
            {text !== undefined && (
                <span>{copied ? "Copied!" : text}</span>
            )}
        </button>
    );
};
