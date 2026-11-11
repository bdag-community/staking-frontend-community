import { ENV } from "@/config/env";
import React from "react";
import { Link } from "react-router-dom";

export const Footer: React.FC = () => <footer className="mx-auto mt-16 flex w-full max-w-[1440px] flex-col gap-4 border-t border-border/70 py-8 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] text-xs leading-5 text-muted-foreground md:pl-[max(2rem,env(safe-area-inset-left))] md:pr-[max(2rem,env(safe-area-inset-right))] sm:flex-row sm:items-center sm:justify-between"><p>BDAG Staking · read the contract before signing.</p><nav className="flex flex-wrap gap-x-5 gap-y-2">{ENV.LEGACY_ONLY ? <a href={ENV.CURRENT_URL} className="hover:text-primary">Back to portfolio</a> : <><a href={ENV.LEGACY_URL} className="hover:text-primary">Legacy Staking</a><Link to="/register-pool" className="hover:text-primary">Register a pool</Link></>}</nav></footer>;
