const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const KEY = `bdag:staking-withdrawal-return:${BASE}`;
const MAX_AGE_MS = 5 * 60_000;

function withdrawalRoute(pathname: string) {
  return pathname.startsWith(`${BASE}/`) &&
    /^\/(?:portfolio|rewards|legacy|stake|pools?\/0x[0-9a-f]{40})\/?$/i.test(pathname.slice(BASE.length));
}

export function rememberStakingReturnRoute() {
  const { pathname, search, hash } = window.location;
  if (!withdrawalRoute(pathname)) return () => {};
  const entry = JSON.stringify({ path: pathname + search + hash, expires: Date.now() + MAX_AGE_MS });
  try {
    // A mobile wallet can reopen the same origin in a new tab.
    window.localStorage.setItem(KEY, entry);
  } catch {
    return () => {};
  }
  return () => {
    try {
      if (window.localStorage.getItem(KEY) === entry) window.localStorage.removeItem(KEY);
    } catch {
      // Storage can be disabled in a wallet browser.
    }
  };
}

export function restoreStakingReturnRoute() {
  try {
    const entry = window.localStorage.getItem(KEY);
    if (!entry) return;
    window.localStorage.removeItem(KEY);

    const { origin, pathname, search, hash } = window.location;
    if ((pathname !== BASE && pathname !== `${BASE}/`) || search || hash) return;
    const { path, expires } = JSON.parse(entry);
    if (typeof path !== "string" || !Number.isFinite(expires) || expires <= Date.now()) return;
    const destination = new URL(path, origin);
    if (destination.origin === origin && withdrawalRoute(destination.pathname)) {
      window.history.replaceState(window.history.state, "", destination.pathname + destination.search + destination.hash);
    }
  } catch {
    // The current URL still works if storage or history is unavailable.
  }
}
