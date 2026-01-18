import React, { useState, useCallback, useEffect } from "react";
import { NavLayout } from "@/components/layout/NavLayout";
import { PathForm } from "@/components/forms/PathForm";
import { useApi, useMutation } from "@/hooks/useApi";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { pathsApi, networksApi } from "@/api/endpoints";
import { Path } from "@shared/types";
import { formatDate, truncateAddress } from "@/utils/formatters";
import { fetchTokenInfo, fetchTokenInfoBatch } from "@/utils/tokenInfo";
import { showToast, getErrorMessage } from "@/utils/toast";
import { AxiosError } from "axios";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  RotateCcw,
} from "lucide-react";

export default function Paths() {
  const {
    data: paths,
    loading,
    error,
    refetch,
  } = useApi(() => pathsApi.getAll(), true);

  // Load networks for token info fetching
  const { data: networks } = useApi(() => networksApi.getAll(), true);

  const [showForm, setShowForm] = useState(false);
  const [editingPath, setEditingPath] = useState<Path | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [hardDeleteConfirmId, setHardDeleteConfirmId] = useState<string | null>(null);

  // Track token info (name, symbol) for each token address
  const [tokenInfoMap, setTokenInfoMap] = useState<
    Record<string, { name: string; symbol: string } | null>
  >({});

  // Fetch anchor token info for all paths using multicall
  useEffect(() => {
    if (!paths || !networks || paths.length === 0) return;

    const fetchAnchorTokens = async () => {
      // Collect all anchor tokens from all paths
      const anchorTokens: Array<{ address: string; chainId: number }> = [];
      const seen = new Set<string>();

      paths.forEach((path) => {
        path.paths.forEach((chainPath) => {
          if (chainPath.anchor_token) {
            const cacheKey = `${chainPath.chain_id}-${chainPath.anchor_token.toLowerCase()}`;
            // Skip if already cached or already in batch
            if (!tokenInfoMap[cacheKey] && !seen.has(cacheKey)) {
              anchorTokens.push({
                address: chainPath.anchor_token,
                chainId: chainPath.chain_id,
              });
              seen.add(cacheKey);
            }
          }
        });
      });

      if (anchorTokens.length === 0) return;

      // Fetch all anchor tokens using multicall
      const results = await fetchTokenInfoBatch(anchorTokens, networks);
      setTokenInfoMap((prev) => ({ ...prev, ...results }));
    };

    fetchAnchorTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths, networks]);

  // Fetch token info for all tokens in expanded paths using multicall
  useEffect(() => {
    if (!paths || !networks || !expandedId) return;

    const path = paths.find((p) => p.id === expandedId);
    if (!path) return;

    const fetchAllTokenInfos = async () => {
      const tokens: Array<{ address: string; chainId: number }> = [];
      const seen = new Set<string>();

      path.paths.forEach((chainPath) => {
        chainPath.paths.forEach((poolPath) => {
          poolPath.forEach((direction) => {
            if (direction.token_in) {
              const cacheKey = `${chainPath.chain_id}-${direction.token_in.toLowerCase()}`;
              if (!tokenInfoMap[cacheKey] && !seen.has(cacheKey)) {
                tokens.push({
                  address: direction.token_in,
                  chainId: chainPath.chain_id,
                });
                seen.add(cacheKey);
              }
            }
            if (direction.token_out) {
              const cacheKey = `${chainPath.chain_id}-${direction.token_out.toLowerCase()}`;
              if (!tokenInfoMap[cacheKey] && !seen.has(cacheKey)) {
                tokens.push({
                  address: direction.token_out,
                  chainId: chainPath.chain_id,
                });
                seen.add(cacheKey);
              }
            }
          });
        });
      });

      if (tokens.length === 0) return;

      // Fetch all tokens using multicall
      const results = await fetchTokenInfoBatch(tokens, networks);
      setTokenInfoMap((prev) => ({ ...prev, ...results }));
    };

    fetchAllTokenInfos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedId, paths, networks]);

  const createMutation = useMutation(
    (data: Omit<Path, "id" | "created_at" | "updated_at">) =>
      pathsApi.create(data),
  );

  const updateMutation = useMutation(
    (data: { id: string; path: Partial<Path> }) =>
      pathsApi.update(data.id, data.path),
  );

  const deleteMutation = useMutation((id: string) => pathsApi.delete(id));

  const undeleteMutation = useMutation((id: string) =>
    pathsApi.undelete(id),
  );

  const hardDeleteMutation = useMutation((id: string) =>
    pathsApi.hardDelete(id),
  );

  const handleCreateOrUpdate = useCallback(
    async (data: Omit<Path, "id" | "created_at" | "updated_at">) => {
      try {
        if (editingPath?.id) {
          await updateMutation.mutate({
            id: editingPath.id,
            path: data,
          });
        } else {
          await createMutation.mutate(data);
        }
        setShowForm(false);
        setEditingPath(undefined);
        refetch();
        showToast.success(
          editingPath?.id
            ? "Path updated successfully"
            : "Path created successfully",
        );
      } catch (err) {
        console.error("Failed to save path:", err);
        const error = err as AxiosError;
        const message = getErrorMessage(error);
        showToast.error(`Failed to save path: ${message}`);
      }
    },
    [editingPath, createMutation, updateMutation, refetch],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutate(id);
        setDeleteConfirmId(null);
        refetch();
        showToast.success("Path deleted successfully");
      } catch (err) {
        console.error("Failed to delete path:", err);
        const error = err as AxiosError;
        const message = getErrorMessage(error);
        showToast.error(`Failed to delete path: ${message}`);
      }
    },
    [deleteMutation, refetch],
  );

  const handleUndelete = useCallback(
    async (id: string) => {
      try {
        await undeleteMutation.mutate(id);
        refetch();
        showToast.success("Path restored successfully");
      } catch (err) {
        console.error("Failed to restore path:", err);
        const error = err as AxiosError;
        const message = getErrorMessage(error);
        showToast.error(`Failed to restore path: ${message}`);
      }
    },
    [undeleteMutation, refetch],
  );

  const handleHardDelete = useCallback(
    async (id: string) => {
      try {
        await hardDeleteMutation.mutate(id);
        setHardDeleteConfirmId(null);
        refetch();
        showToast.success("Path permanently deleted");
      } catch (err) {
        console.error("Failed to permanently delete path:", err);
        const error = err as AxiosError;
        const message = getErrorMessage(error);
        showToast.error(`Failed to permanently delete path: ${message}`);
      }
    },
    [hardDeleteMutation, refetch],
  );

  // Helper function to determine if a path is deleted
  const isPathDeleted = React.useCallback((path: Path): boolean => {
    return path.deleted === true || (path.deleted_at !== undefined && path.deleted_at !== null);
  }, []);

  // Copy address to clipboard
  const copyToClipboard = useCallback(async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      showToast.success("Address copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
      showToast.error("Failed to copy address");
    }
  }, []);

  // Memoize filtered paths to prevent recalculation on every render
  // Use debounced search term to reduce filtering operations
  // Sort paths so deleted ones appear at the bottom
  const filteredPaths = React.useMemo(
    () => {
      const filtered =
        paths?.filter((path) => {
    const matchesSearch =
      path.paths.some((p) =>
              p.anchor_token
                .toLowerCase()
                .includes(debouncedSearchTerm.toLowerCase()),
      ) ||
            path.paths.some((p) =>
              p.chain_id.toString().includes(debouncedSearchTerm),
            );
    return matchesSearch;
        }) || [];

      // Sort: active paths first, deleted paths last
      return filtered.sort((a, b) => {
        const aDeleted = a.deleted === true || (a.deleted_at !== undefined && a.deleted_at !== null);
        const bDeleted = b.deleted === true || (b.deleted_at !== undefined && b.deleted_at !== null);
        if (aDeleted === bDeleted) {
          // If both have same status, maintain original order (by created_at descending)
          return (b.created_at || 0) - (a.created_at || 0);
        }
        // Deleted paths go to the end
        return aDeleted ? 1 : -1;
      });
    },
    [paths, debouncedSearchTerm],
  );

  // Add pagination to prevent rendering too many items at once
  const {
    currentItems: paginatedPaths,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
  } = usePagination(filteredPaths, { itemsPerPage: 20 });

  return (
    <NavLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Paths</h1>
            <p className="text-slate-600 mt-2">
              Manage arbitrage paths and routing configurations
            </p>
          </div>
          <button
            onClick={() => {
              setEditingPath(undefined);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Path
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by anchor token or chain ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600" size={20} />
            <div>
              <p className="font-medium text-red-900">Failed to load paths</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <p className="text-slate-600">Loading paths...</p>
            </div>
          </div>
        )}

        {/* Paths Table */}
        {!loading && filteredPaths && filteredPaths.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold text-slate-900 text-sm">
                      Anchor Token
                    </th>
                    <th className="text-left px-6 py-3 font-semibold text-slate-900 text-sm">
                      Token Name
                    </th>
                    <th className="text-left px-6 py-3 font-semibold text-slate-900 text-sm">
                      Token Symbol
                    </th>
                    <th className="text-center px-6 py-3 font-semibold text-slate-900 text-sm">
                      Chains
                    </th>
                    <th className="text-center px-6 py-3 font-semibold text-slate-900 text-sm">
                      Paths
                    </th>
                    <th className="text-center px-6 py-3 font-semibold text-slate-900 text-sm">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 font-semibold text-slate-900 text-sm">
                      Created
                    </th>
                    <th className="text-center px-6 py-3 font-semibold text-slate-900 text-sm">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedPaths.map((path) => (
                    <React.Fragment key={path.id}>
                      <tr
                        className={`hover:bg-slate-50 ${
                          isPathDeleted(path) ? "bg-red-50 opacity-75" : ""
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                setExpandedId(
                                  expandedId === path.id
                                    ? null
                                    : path.id || null,
                                )
                              }
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <ChevronDown
                                size={18}
                                style={{
                                  transform:
                                    expandedId === path.id
                                      ? "rotate(180deg)"
                                      : "rotate(0deg)",
                                  transition: "transform 0.2s",
                                }}
                              />
                            </button>
                            <div className="space-y-1">
                              {path.paths.map((p, i) => {
                                const cacheKey = `${p.chain_id}-${p.anchor_token.toLowerCase()}`;
                                const tokenInfo = tokenInfoMap[cacheKey];
                                return (
                                  <div
                                    key={i}
                                    className="flex items-center gap-2 group"
                                  >
                                    <p
                                      className={`text-sm font-mono cursor-pointer hover:text-blue-600 transition-colors ${
                                        isPathDeleted(path)
                                          ? "text-red-700 line-through"
                                          : "text-slate-700"
                                      }`}
                                      onClick={() =>
                                        copyToClipboard(p.anchor_token)
                                      }
                                      title="Click to copy full address"
                                    >
                                      {truncateAddress(p.anchor_token, 6)}
                                    </p>
                                    <span
                                      onClick={() =>
                                        copyToClipboard(p.anchor_token)
                                      }
                                      title="Copy address"
                                    >
                                      <Copy
                                        size={14}
                                        className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-blue-600"
                                      />
                            </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {path.paths.map((p, i) => {
                              const cacheKey = `${p.chain_id}-${p.anchor_token.toLowerCase()}`;
                              const tokenInfo = tokenInfoMap[cacheKey];
                              return (
                                <p key={i} className="text-sm text-slate-700">
                                  {tokenInfo?.name || "-"}
                                </p>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {path.paths.map((p, i) => {
                              const cacheKey = `${p.chain_id}-${p.anchor_token.toLowerCase()}`;
                              const tokenInfo = tokenInfoMap[cacheKey];
                              return (
                                <p key={i} className="text-sm text-slate-700">
                                  {tokenInfo?.symbol || "-"}
                                </p>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="space-y-1">
                            {path.paths.map((p, i) => {
                              const network = networks?.find(
                                (n) => n.chain_id === p.chain_id,
                              );
                              return (
                                <div key={i} className="text-xs">
                                  {network ? (
                                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                      {network.name} ({p.chain_id})
                                    </span>
                                  ) : (
                                    <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 rounded">
                                      Chain {p.chain_id}
                          </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-700">
                          {path.paths.reduce(
                            (acc, p) => acc + p.paths.length,
                            0,
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isPathDeleted(path) ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                              Deleted
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDate(path.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {!isPathDeleted(path) && (
                            <button
                              onClick={() => {
                                setEditingPath(path);
                                setShowForm(true);
                              }}
                              className="p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            )}
                            {isPathDeleted(path) ? (
                              <>
                                <button
                                  onClick={() => handleUndelete(path.id!)}
                                  disabled={undeleteMutation.loading}
                                  className="p-2 text-slate-600 hover:bg-green-50 hover:text-green-600 rounded-lg transition-colors disabled:opacity-50"
                                  title="Restore"
                                >
                                  <RotateCcw size={18} />
                                </button>
                                <button
                                  onClick={() =>
                                    setHardDeleteConfirmId(path.id || null)
                                  }
                                  disabled={hardDeleteMutation.loading}
                                  className="p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors disabled:opacity-50"
                                  title="Permanently Delete"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </>
                            ) : (
                            <button
                                onClick={() =>
                                  setDeleteConfirmId(path.id || null)
                                }
                              className="p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details */}
                      {expandedId === path.id && (
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="space-y-4">
                              {path.paths.map((chainPath, chainIndex) => (
                                <div
                                  key={chainIndex}
                                  className="border-l-2 border-slate-300 pl-4"
                                >
                                  <p className="text-sm font-semibold text-slate-900 mb-2">
                                    {(() => {
                                      const network = networks?.find(
                                        (n) =>
                                          n.chain_id === chainPath.chain_id,
                                      );
                                      return network
                                        ? `${network.name} (${chainPath.chain_id})`
                                        : `Chain ${chainPath.chain_id}`;
                                    })()}{" "}
                                    • {chainPath.paths.length} path
                                    {chainPath.paths.length !== 1 ? "s" : ""}
                                  </p>
                                  <div className="space-y-2">
                                    {chainPath.paths.map(
                                      (poolPath, poolIndex) => (
                                        <div
                                        key={poolIndex}
                                          className="bg-white px-3 py-2 rounded border border-slate-200"
                                        >
                                          <p className="text-xs font-semibold text-slate-600 mb-1">
                                            Path #{poolIndex + 1}:
                                          </p>
                                          <div className="flex flex-wrap items-center gap-1 text-xs text-slate-700 font-mono">
                                            {poolPath.map(
                                              (direction, dirIndex) => {
                                                // Check if previous direction's token_out matches current token_in
                                                const prevDirection =
                                                  dirIndex > 0
                                                    ? poolPath[dirIndex - 1]
                                                    : null;
                                                const isSameToken =
                                                  prevDirection &&
                                                  prevDirection.token_out?.toLowerCase() ===
                                                    direction.token_in?.toLowerCase();

                                                return (
                                                  <React.Fragment
                                                    key={dirIndex}
                                                  >
                                                    {dirIndex > 0 && (
                                                      <span className="text-slate-400">
                                                        →
                                                      </span>
                                                    )}
                                                    {/* Only show token_in if it's different from previous token_out */}
                                                    {!isSameToken && (
                                                      <>
                                                        <span
                                                          className="px-2 py-1 bg-slate-50 rounded cursor-pointer hover:bg-slate-100 transition-colors group relative"
                                                          onClick={() =>
                                                            copyToClipboard(
                                                              direction.token_in,
                                                            )
                                                          }
                                                          title="Click to copy full address"
                                                        >
                                                          {truncateAddress(
                                                            direction.token_in,
                                                            4,
                                                          )}
                                                          {tokenInfoMap[
                                                            `${chainPath.chain_id}-${direction.token_in?.toLowerCase()}`
                                                          ] && (
                                                            <span className="text-slate-500 ml-1">
                                                              (
                                                              {
                                                                tokenInfoMap[
                                                                  `${chainPath.chain_id}-${direction.token_in?.toLowerCase()}`
                                                                ]?.symbol
                                                              }
                                                              )
                                                            </span>
                                                          )}
                                                          <Copy
                                                            size={12}
                                                            className="inline-block ml-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                          />
                                                        </span>
                                                        <span className="text-slate-400">
                                                          →
                                                        </span>
                                                      </>
                                                    )}
                                                    <span
                                                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded cursor-pointer hover:bg-blue-100 transition-colors group relative"
                                                      onClick={() =>
                                                        copyToClipboard(
                                                          direction.pool,
                                                        )
                                                      }
                                                      title="Click to copy full address"
                                                    >
                                                      Pool:{" "}
                                                      {truncateAddress(
                                                        direction.pool,
                                                        4,
                                                      )}
                                                      <Copy
                                                        size={12}
                                                        className="inline-block ml-1 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                      />
                                                    </span>
                                                    <span className="text-slate-400">
                                                      →
                                                    </span>
                                                    <span
                                                      className="px-2 py-1 bg-slate-50 rounded cursor-pointer hover:bg-slate-100 transition-colors group relative"
                                                      onClick={() =>
                                                        copyToClipboard(
                                                          direction.token_out,
                                                        )
                                                      }
                                                      title="Click to copy full address"
                                                    >
                                                      {truncateAddress(
                                                        direction.token_out,
                                                        4,
                                                      )}
                                                      {tokenInfoMap[
                                                        `${chainPath.chain_id}-${direction.token_out?.toLowerCase()}`
                                                      ] && (
                                                        <span className="text-slate-500 ml-1">
                                                          (
                                                          {
                                                            tokenInfoMap[
                                                              `${chainPath.chain_id}-${direction.token_out?.toLowerCase()}`
                                                            ]?.symbol
                                                          }
                                                          )
                                                        </span>
                                                      )}
                                                      <Copy
                                                        size={12}
                                                        className="inline-block ml-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                      />
                                                    </span>
                                                  </React.Fragment>
                                                );
                                              },
                                            )}
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing {(currentPage - 1) * 20 + 1} to{" "}
                  {Math.min(currentPage * 20, filteredPaths.length)} of{" "}
                  {filteredPaths.length} paths
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredPaths && filteredPaths.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <p className="text-slate-600">
              {paths?.length === 0
                ? "No paths configured yet"
                : "No results found"}
            </p>
            {paths?.length === 0 && (
              <button
                onClick={() => {
                  setEditingPath(undefined);
                  setShowForm(true);
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create your first path
              </button>
            )}
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteConfirmId !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Delete Path?
              </h3>
              <p className="text-slate-600 mb-6">
                This will soft-delete the path. You can restore it later.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  disabled={deleteMutation.loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hard Delete Confirmation */}
        {hardDeleteConfirmId !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-xl max-w-md">
              <h3 className="text-lg font-bold text-red-900 mb-4">
                Permanently Delete Path?
              </h3>
              <p className="text-slate-600 mb-2">
                This action <strong>cannot be undone</strong>. The path will be permanently removed from the database.
              </p>
              <p className="text-sm text-red-600 mb-6">
                This is a destructive operation. Make sure you want to permanently delete this path.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setHardDeleteConfirmId(null)}
                  className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleHardDelete(hardDeleteConfirmId!)}
                  disabled={hardDeleteMutation.loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {hardDeleteMutation.loading ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <PathForm
            path={editingPath}
            onSubmit={handleCreateOrUpdate}
            onClose={() => {
              setShowForm(false);
              setEditingPath(undefined);
            }}
            isLoading={createMutation.loading || updateMutation.loading}
          />
        )}
      </div>
    </NavLayout>
  );
}
