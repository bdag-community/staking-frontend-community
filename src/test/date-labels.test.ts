import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { formatUtcDateTime } from "@/lib/utils";

describe("withdrawal and voting date labels", () => {
  it("includes the timezone in the shared formatter", () => {
    const formatted = formatUtcDateTime(Date.UTC(2026, 9, 14, 14, 46));
    expect(formatted).toMatch(/(?:UTC|GMT)/);
  });

  it.each([
    "src/pages/PlatformPages.tsx",
    "src/components/portfolio/UnstakeConfirmationDialog.tsx",
  ])("does not append a duplicate UTC suffix in %s", (path) => {
    const source = readFileSync(resolve(process.cwd(), path), "utf8");
    expect(source).not.toMatch(/formatUtcDateTime\([^\n]*?\}\s*UTC/);
  });
});
