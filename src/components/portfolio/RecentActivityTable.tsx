import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { CopyButton } from "@/components/ui/copy-button";
import {
  formatNumber,
  formatCompactNumber,
  truncatedHash,
  formatTimeAgo,
} from "@/lib/utils";
import { ENV } from "@/config/env";
import {ExplorerLink} from "@/components/ui/explorer-link";
import { cn } from "@/lib/utils";

import { Transaction } from "@/utils/interface";

interface RecentActivityTableProps {
  history: Transaction[];
  isLoadingHistory: boolean;
  isInitialLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export const RecentActivityTable: React.FC<RecentActivityTableProps> = ({
  history,
  isLoadingHistory,
  isInitialLoading,
  hasMore,
  onLoadMore,
}) => {
  return (
    <Card className="glass-card border-primary/20 mt-8">
      <CardHeader>
        <CardTitle className="text-xl">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-2">
        {isInitialLoading ? (
          <div className="space-y-4 py-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 w-full bg-secondary/30 rounded animate-pulse"
              />
            ))}
          </div>
        ) : history.length > 0 ? (
          <div
            className={cn(
              "overflow-x-auto custom-scrollbar -mx-6 px-6 relative",
              history.length > 10 && "max-h-[600px] overflow-y-auto",
            )}
          >
            <table className="w-full text-sm min-w-[720px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-[#0a0e1a]/80 backdrop-blur-md">
                <tr className="text-muted-foreground">
                  <th className="text-left py-4 px-2 font-medium border-b border-border/50">
                    Txn Hash
                  </th>
                  <th className="text-left py-4 px-2 font-medium border-b border-border/50">
                    Type
                  </th>
                  <th className="text-left py-4 px-2 font-medium border-b border-border/50">
                    Amount
                  </th>
                  <th className="text-left py-4 px-2 font-medium border-b border-border/50">
                    Wallet Balance
                  </th>
                  <th className="text-left py-4 px-2 font-medium border-b border-border/50">
                    Status
                  </th>
                  <th className="text-left py-4 px-2 font-medium border-b border-border/50">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {history.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-secondary/20 transition-colors group"
                  >
                    <td className="py-4 px-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <SimpleTooltip content={tx.txHash}>
                          <ExplorerLink
                            path={`tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-primary transition-colors cursor-help border-b border-dotted border-muted-foreground/50 whitespace-nowrap"
                          >
                            {truncatedHash(tx.txHash)}
                            <ExternalLink className="w-3 h-3 opacity-50" />
                          </ExplorerLink>
                        </SimpleTooltip>
                        <CopyButton
                          value={tx.txHash}
                          className="opacity-0 lg:group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    </td>
                    <td className="py-4 px-2 capitalize">{!ENV.LEGACY_ONLY && tx.eventType === "StakeClaimed" ? "Withdrawal claimed" : !ENV.LEGACY_ONLY && tx.eventType === "Unstaked" ? "Unstake requested" : tx.eventType}</td>
                    <td className="py-4 px-2 font-medium">
                      <SimpleTooltip
                        content={`${formatNumber(tx.amount, 2)} BDAG`}
                      >
                        <span className="cursor-help border-b border-dotted border-muted-foreground/50">
                          {formatCompactNumber(tx.amount)} BDAG
                        </span>
                      </SimpleTooltip>
                    </td>
                    <td className="py-4 px-2 font-medium">
                      {tx.balanceAfter !== undefined &&
                      tx.balanceAfter !== null ? (
                        <SimpleTooltip
                          content={`${formatNumber(tx.balanceAfter, 2)} BDAG wallet balance after this transaction`}
                        >
                          <span className="cursor-help border-b border-dotted border-muted-foreground/50 whitespace-nowrap">
                            {formatCompactNumber(tx.balanceAfter)} BDAG
                          </span>
                        </SimpleTooltip>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-4 px-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-success/20 text-success">
                        Completed
                      </span>
                    </td>
                    <td className="py-4 px-2 text-muted-foreground">
                      <SimpleTooltip
                        content={new Date(tx.timestamp).toLocaleString(
                          undefined,
                          {
                            dateStyle: "full",
                            timeStyle: "medium",
                          },
                        )}
                      >
                        <span className="cursor-help border-b border-dotted border-muted-foreground/50 whitespace-nowrap">
                          {formatTimeAgo(tx.timestamp)}
                        </span>
                      </SimpleTooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No recent activity found.
          </div>
        )}

        <div className="mt-8 flex justify-center border-t border-border/50 pt-6 min-h-[60px]">
          {hasMore ? (
            <Button
              variant="outline"
              onClick={onLoadMore}
              disabled={isLoadingHistory}
              className="min-w-[140px] h-11 relative overflow-hidden transition-all active:scale-95"
            >
              <div className="flex items-center justify-center gap-2">
                {isLoadingHistory ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span className="animate-pulse">Loading...</span>
                  </>
                ) : (
                  "Load More"
                )}
              </div>
            </Button>
          ) : (
            null
          )}
        </div>
      </CardContent>
    </Card>
  );
};
