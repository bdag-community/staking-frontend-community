import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useVisibilityStats,
  VisibilityAction,
  VisibilityActionSummary,
  VisibilityRange,
} from "@/hooks/use-visibility-stats";
import { cn } from "@/lib/utils";
import { useWallet } from "@/hooks/use-wallet";
import { ENV } from "@/config/env";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { Link } from "react-router-dom";

const ACTIONS: Array<{ action: VisibilityAction; label: string }> = [
  { action: "stake", label: "Stake" },
  { action: "unstakeRewards", label: "Unstake Rewards" },
  { action: "claimRewards", label: "Claim Rewards" },
  { action: "unstakeStake", label: "Unstake My Stake" },
  { action: "claimUnstakedStake", label: "Claim My Unstaked Stake" },
];

const RANGES: Array<{ value: VisibilityRange; label: string }> = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

const emptyActionSummary = (action: VisibilityAction): VisibilityActionSummary => ({
  action,
  attempts: 0,
  submitted: 0,
  confirmed: 0,
  failed: 0,
  reverted: 0,
  stuck: 0,
  replaced: 0,
  successRate: 0});

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const shortHash = (value?: string | null) => {
  if (!value) return "-";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const getStatusClassName = (status: string) => {
  if (status === "confirmed" || status === "replaced") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  }
  if (status === "failed" || status === "reverted" || status === "stuck") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-700";
};

const StatTile = ({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  detail: string;
}) => (
  <Card className="rounded-md shadow-none">
    <CardContent className="flex items-start gap-3 p-4">
      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold leading-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
    </CardContent>
  </Card>
);

const AdminVisibility: React.FC = () => {
  const { address, isConnected } = useWallet();
  const [range, setRange] = useState<VisibilityRange>("24h");
  const { summary, attempts, health, isLoading, error, refetch } =
    useVisibilityStats(range);

  const actionSummary = useMemo(() => {
    const map = new Map(
      (summary?.actions ?? []).map((item) => [item.action, item]),
    );
    return ACTIONS.map(({ action }) => map.get(action) ?? emptyActionSummary(action));
  }, [summary]);

  const totals = summary?.totals ?? {
    attempts: 0,
    confirmed: 0,
    failed: 0,
    reverted: 0,
    stuck: 0,
    successRate: 0,
  };
  const unresolvedTotal = Object.values(
    health?.unresolvedStatusCounts ?? {},
  ).reduce((total, count) => total + count, 0);
  const authorizedWallets = (ENV.ADMIN_WALLETS ?? "")
    .split(",")
    .map((wallet) => wallet.trim().toLowerCase())
    .filter(Boolean);
  const isAuthorized = Boolean(
    isConnected && address && authorizedWallets.includes(address.toLowerCase()),
  );

  if (!isAuthorized) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        <section className="glass-card p-6 sm:p-8">
          <p className="data-label text-primary">Troubleshooting</p>
          <h1 className="mt-2 text-2xl font-semibold">Authorized wallet required</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This read-only transaction visibility view is limited to the configured operations wallet. Governance-owned settings are managed through DAO controls.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {!isConnected && <ConnectButton />}
            <Button asChild variant="outline-glow"><Link to="/">Back to portfolio</Link></Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">
            Transaction visibility
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border p-1">
            {RANGES.map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={range === item.value ? "secondary" : "ghost"}
                className="h-8 px-3"
                onClick={() => setRange(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </header>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Activity}
          label="Attempts"
          value={totals.attempts}
          detail={`${totals.successRate}% success rate`}
        />
        <StatTile
          icon={CheckCircle2}
          label="Confirmed"
          value={totals.confirmed}
          detail="Confirmed or repaired actions"
        />
        <StatTile
          icon={AlertTriangle}
          label="Failures"
          value={totals.failed + totals.reverted}
          detail={`${totals.stuck} currently stuck`}
        />
        <StatTile
          icon={Clock3}
          label="Indexer Lag"
          value={health?.indexerLag ?? "-"}
          detail={`${unresolvedTotal} tracked pending records`}
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-5">
        {ACTIONS.map(({ action, label }, index) => {
          const stat = actionSummary[index];
          return (
            <Card key={action} className="rounded-md shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">
                    {stat.successRate}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    success
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <span className="text-muted-foreground">Attempts</span>
                  <span className="text-right font-medium">{stat.attempts}</span>
                  <span className="text-muted-foreground">Confirmed</span>
                  <span className="text-right font-medium">
                    {stat.confirmed + stat.replaced}
                  </span>
                  <span className="text-muted-foreground">Failed</span>
                  <span className="text-right font-medium">
                    {stat.failed + stat.reverted}
                  </span>
                  <span className="text-muted-foreground">Stuck</span>
                  <span className="text-right font-medium">{stat.stuck}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card className="rounded-md shadow-none">
          <CardHeader className="p-4">
            <CardTitle className="text-base">Top Errors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            {(summary?.topErrors ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No failures recorded in this range.
              </p>
            ) : (
              summary?.topErrors.map((item) => (
                <div
                  key={`${item.action}-${item.errorCode}-${item.errorMessage}`}
                  className="rounded-md border border-border p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline">{item.action}</Badge>
                    <span className="text-sm font-semibold">{item.count}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{item.errorCode}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">
                    {item.errorMessage}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-md shadow-none">
          <CardHeader className="p-4">
            <CardTitle className="text-base">Recent Attempts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Wallet</TableHead>
                  <TableHead>Tx</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No attempts recorded in this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  attempts.map((attempt) => (
                    <TableRow key={attempt.attemptId}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(attempt.lastStageAt)}
                      </TableCell>
                      <TableCell>{attempt.action}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusClassName(attempt.status)}
                        >
                          {attempt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {shortHash(attempt.stakerAddress)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {shortHash(attempt.txHash)}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">
                        {attempt.finalErrorMessage || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default AdminVisibility;
