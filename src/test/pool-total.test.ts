import { describe, expect, it } from "vitest";
import { totalPoolPrincipal } from "@/lib/pool-total";
describe("all pool totals", () => {
  it("sums without losing wei precision", () => expect(totalPoolPrincipal([{ totalStaked: "10.000000000000000001" }, { totalStaked: "2" }])).toBe("12.000000000000000001"));
  it.each([undefined, "", "not-a-number", "-1", "1.0000000000000000001"])("returns unavailable for invalid pool values %s", totalStaked => expect(totalPoolPrincipal([{ totalStaked: "10" }, { totalStaked }])).toBeNull());
});
