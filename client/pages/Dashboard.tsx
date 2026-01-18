import React, { useEffect, useState, useMemo } from "react";
import { NavLayout } from "@/components/layout/NavLayout";
import { useApi } from "@/hooks/useApi";
import { networksApi, pathsApi, poolsApi, configApi } from "@/api/endpoints";
import { Network, Path, Pool, Config } from "@shared/types";
import { formatUSD, formatNumber } from "@/utils/formatters";
import {
  Activity,
  Network as NetworkIcon,
  GitBranch,
  Droplet,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

// Memoized StatCard to prevent unnecessary re-renders
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  loading?: boolean;
}> = React.memo(({ title, value, icon, subtitle, loading }) => (
  <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <p className="text-3xl font-bold text-slate-900 mt-2">
          {loading ? <span className="animate-pulse">...</span> : value}
        </p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
      <div className="text-slate-400">{icon}</div>
    </div>
  </div>
));
StatCard.displayName = "StatCard";

export default function Dashboard() {
  const { data: networks, loading: networksLoading } = useApi(
    () => networksApi.getAll(),
    true,
  );
  const { data: paths, loading: pathsLoading } = useApi(
    () => pathsApi.getAll(),
    true,
  );
  const { data: pools, loading: poolsLoading } = useApi(
    () => poolsApi.getAll(),
    true,
  );
  const { data: config, loading: configLoading } = useApi(
    () => configApi.get(),
    true,
  );

  const [totalPoolsByNetwork, setTotalPoolsByNetwork] = useState<
    Record<number, number>
  >({});

  // Fetch pool counts for each network in parallel (performance optimization)
  useEffect(() => {
    if (!networks || networks.length === 0) return;

    let isMounted = true; // Track if component is still mounted

    const fetchPoolCounts = async () => {
      try {
        // Use Promise.all for parallel execution instead of sequential
        const countPromises = networks.map(async (network) => {
          try {
            const count = await poolsApi.getCountByNetworkId(network.chain_id);
            return { chainId: network.chain_id, count };
          } catch (err) {
            console.error(
              `Failed to fetch pool count for network ${network.chain_id}:`,
              err,
            );
            return { chainId: network.chain_id, count: 0 };
          }
        });

        const results = await Promise.all(countPromises);

        // Only update state if component is still mounted
        if (!isMounted) return;

        const counts: Record<number, number> = {};
        results.forEach(({ chainId, count }) => {
          counts[chainId] = count;
        });
        setTotalPoolsByNetwork(counts);
      } catch (err) {
        if (isMounted) {
          console.error("Failed to fetch pool counts:", err);
        }
      }
    };

    fetchPoolCounts();

    // Cleanup: prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [networks]);

  // Memoize totalPools calculation
  const totalPools = useMemo(
    () => Object.values(totalPoolsByNetwork).reduce((a, b) => a + b, 0),
    [totalPoolsByNetwork],
  );

  return (
    <NavLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-2">
            Monitor your arbitrage bot networks, paths, and pools
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Networks"
            value={formatNumber(networks?.length || 0)}
            icon={<NetworkIcon size={32} className="text-blue-400" />}
            loading={networksLoading}
            subtitle="Active blockchain networks"
          />
          <StatCard
            title="Total Paths"
            value={formatNumber(paths?.length || 0)}
            icon={<GitBranch size={32} className="text-green-400" />}
            loading={pathsLoading}
            subtitle="Arbitrage paths configured"
          />
          <StatCard
            title="Total Pools"
            value={formatNumber(totalPools)}
            icon={<Droplet size={32} className="text-cyan-400" />}
            loading={poolsLoading}
            subtitle="Liquidity pools tracked"
          />
          <StatCard
            title="Max Trade Amount"
            value={config ? formatUSD(config.max_amount_usd) : "-"}
            icon={<TrendingUp size={32} className="text-purple-400" />}
            loading={configLoading}
            subtitle="Per transaction limit"
          />
        </div>

        {/* Network Breakdown */}
        {networks && networks.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Activity size={20} className="text-blue-500" />
                Network Summary
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold text-slate-900 text-sm">
                      Chain
                    </th>
                    <th className="text-left px-6 py-3 font-semibold text-slate-900 text-sm">
                      Network Name
                    </th>
                    <th className="text-right px-6 py-3 font-semibold text-slate-900 text-sm">
                      Min Profit
                    </th>
                    <th className="text-right px-6 py-3 font-semibold text-slate-900 text-sm">
                      Pools
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {networks.map((network) => (
                    <tr key={network.chain_id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-mono text-slate-700">
                        {network.chain_id}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {network.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-slate-700">
                        {formatUSD(network.min_profit_usd)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-slate-700 font-medium">
                        {totalPoolsByNetwork[network.chain_id] || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Configuration Summary */}
        {config && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-500" />
              Configuration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-600">Max Trade Amount</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {formatUSD(config.max_amount_usd)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Recheck Interval</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {config.recheck_interval}ms
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </NavLayout>
  );
}
