import { cn } from "@/lib/utils";

interface ConfirmingOverlayProps {
  active: boolean;
  contained?: boolean;
  className?: string;
}

export const ConfirmingOverlay = ({
  active,
  contained = false,
  className,
}: ConfirmingOverlayProps) => {
  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        contained
          ? "tx-confirming-overlay-contained"
          : "tx-confirming-overlay",
        className,
      )}
    />
  );
};
