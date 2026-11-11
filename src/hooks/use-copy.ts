import { useState, useCallback } from "react";

export function useCopy(timeout = 1000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    (text: string) => {
      if (!text) return false;

      navigator.clipboard.writeText(text);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, timeout);

      return true;
    },
    [timeout],
  );

  return { copied, copy };
}
