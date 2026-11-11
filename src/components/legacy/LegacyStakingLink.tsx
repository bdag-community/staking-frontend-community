import { ENV } from "@/config/env";
export const LegacyStakingLink = () => <a href={ENV.LEGACY_URL} className="inline-flex min-h-11 items-center justify-center rounded-full border border-primary/30 px-6 py-2 text-sm font-medium text-primary hover:bg-primary/10">Legacy Staking</a>;
