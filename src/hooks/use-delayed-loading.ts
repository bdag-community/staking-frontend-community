import { useEffect, useState } from "react";

export const useDelayedLoading = (isLoading: boolean, delayMs = 4000) => {
  const [isDelayed, setIsDelayed] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsDelayed(false);
      return;
    }

    const timer = window.setTimeout(() => setIsDelayed(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, isLoading]);

  return isDelayed;
};
