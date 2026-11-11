import { afterEach, expect, it } from "vitest";
import { rememberStakingReturnRoute, restoreStakingReturnRoute } from "@/lib/staking-return-route";

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

it("restores the portfolio and its view when a wallet reopens the site at Home", () => {
  window.history.replaceState(null, "", "/portfolio?view=withdrawals#unbonding");
  rememberStakingReturnRoute();
  window.history.replaceState(null, "", "/");

  restoreStakingReturnRoute();

  expect(window.location.pathname + window.location.search + window.location.hash)
    .toBe("/portfolio?view=withdrawals#unbonding");
  window.history.replaceState(null, "", "/");
  restoreStakingReturnRoute();
  expect(window.location.pathname).toBe("/");
});

it("does not override a destination already opened by the wallet", () => {
  window.history.replaceState(null, "", "/legacy");
  rememberStakingReturnRoute();
  window.history.replaceState(null, "", "/rewards");
  restoreStakingReturnRoute();
  expect(window.location.pathname).toBe("/rewards");
});

it("leaves Home alone after the wallet rejects the withdrawal", () => {
  window.history.replaceState(null, "", "/legacy");
  const forget = rememberStakingReturnRoute();
  forget();
  window.history.replaceState(null, "", "/");
  restoreStakingReturnRoute();
  expect(window.location.pathname).toBe("/");
});
