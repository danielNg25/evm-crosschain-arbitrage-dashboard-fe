import React, { useState, useCallback } from "react";
import { NavLayout } from "@/components/layout/NavLayout";
import { NetworkForm } from "@/components/forms/NetworkForm";
import { useApi, useMutation } from "@/hooks/useApi";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { networksApi } from "@/api/endpoints";
import { Network } from "@shared/types";
import { formatDate, formatUSD, truncateAddress } from "@/utils/formatters";
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
  RotateCcw,
} from "lucide-react";

export default function Networks() {
  const {
    data: networks,
    loading,
    error,
    refetch,
  } = useApi(() => networksApi.getAll(), true);

  const [showForm, setShowForm] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<Network | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [hardDeleteConfirmId, setHardDeleteConfirmId] = useState<number | null>(null);

  const createMutation = useMutation(
    (data: Omit<Network, "id" | "created_at" | "updated_at">) =>
      networksApi.create(data),
  );

  const updateMutation = useMutation(
    (data: { chainId: number; network: Partial<Network> }) =>
      networksApi.update(data.chainId, data.network),
  );

  const deleteMutation = useMutation((chainId: number) =>
    networksApi.delete(chainId),
  );

  const undeleteMutation = useMutation((chainId: number) =>
    networksApi.undelete(chainId),
  );

  const hardDeleteMutation = useMutation((chainId: number) =>
    networksApi.hardDelete(chainId),
  );

  const handleCreateOrUpdate = useCallback(
    async (data: Omit<Network, "id" | "created_at" | "updated_at">) => {
      try {
        if (editingNetwork) {
          await updateMutation.mutate({
            chainId: editingNetwork.chain_id,
            network: data,
          });
        } else {
          await createMutation.mutate(data);
        }
        setShowForm(false);
        setEditingNetwork(undefined);
        refetch();
        showToast.success(
          editingNetwork ? "Network updated successfully" : "Network created successfully",
        );
      } catch (err) {
        console.error("Failed to save network:", err);
        const error = err as AxiosError;
        const message = getErrorMessage(error);
        showToast.error(`Failed to save network: ${message}`);
      }
    },
    [editingNetwork, createMutation, updateMutation, refetch],
  );

  const handleDelete = useCallback(
    async (chainId: number) => {
      try {
        await deleteMutation.mutate(chainId);
        setDeleteConfirmId(null);
        refetch();
        showToast.success("Network deleted successfully");
      } catch (err) {
        console.error("Failed to delete network:", err);
        const error = err as AxiosError;
        const message = getErrorMessage(error);
        showToast.error(`Failed to delete network: ${message}`);
      }
    },
    [deleteMutation, refetch],
  );

  const handleUndelete = useCallback(
    async (chainId: number) => {
      try {
        await undeleteMutation.mutate(chainId);
        refetch();
        showToast.success("Network restored successfully");
      } catch (err) {
        console.error("Failed to restore network:", err);
        const error = err as AxiosError;
        const message = getErrorMessage(error);
        showToast.error(`Failed to restore network: ${message}`);
      }
    },
    [undeleteMutation, refetch],
  );

  const handleHardDelete = useCallback(
    async (chainId: number) => {
      try {
        await hardDeleteMutation.mutate(chainId);
        setHardDeleteConfirmId(null);
        refetch();
        showToast.success("Network permanently deleted");
      } catch (err) {
        console.error("Failed to permanently delete network:", err);
        const error = err as AxiosError;
        const message = getErrorMessage(error);
        showToast.error(`Failed to permanently delete network: ${message}`);
      }
    },
    [hardDeleteMutation, refetch],
  );

  // Helper function to determine if a network is deleted
  const isNetworkDeleted = React.useCallback((network: Network): boolean => {
    return network.deleted === true || (network.deleted_at !== undefined && network.deleted_at !== null);
  }, []);

  // Memoize filtered networks to prevent recalculation on every render
  // Use debounced search term to reduce filtering operations
  // Sort networks so deleted ones appear at the bottom
  const filteredNetworks = React.useMemo(
    () => {
      const filtered =
        networks?.filter(
          (network) =>
            network.name
              .toLowerCase()
              .includes(debouncedSearchTerm.toLowerCase()) ||
            network.chain_id.toString().includes(debouncedSearchTerm),
        ) || [];
      
      // Sort: active networks first, deleted networks last
      return filtered.sort((a, b) => {
        const aDeleted = a.deleted === true || (a.deleted_at !== undefined && a.deleted_at !== null);
        const bDeleted = b.deleted === true || (b.deleted_at !== undefined && b.deleted_at !== null);
        if (aDeleted === bDeleted) {
          // If both have same status, maintain original order (by chain_id)
          return a.chain_id - b.chain_id;
        }
        // Deleted networks go to the end
        return aDeleted ? 1 : -1;
      });
    },
    [networks, debouncedSearchTerm],
  );

  // Add pagination to prevent rendering too many items at once
  const {
    currentItems: paginatedNetworks,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
  } = usePagination(filteredNetworks, { itemsPerPage: 20 });

  return (
    <NavLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Networks</h1>
            <p className="text-slate-600 mt-2">
              Manage blockchain networks for your arbitrage bot
            </p>
          </div>
          <button
            onClick={() => {
              setEditingNetwork(undefined);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Network
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name or chain ID..."
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
              <p className="font-medium text-red-900">
                Failed to load networks
              </p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <p className="text-slate-600">Loading networks...</p>
            </div>
          </div>
        )}

        {/* Networks Table */}
        {!loading && filteredNetworks && filteredNetworks.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold text-slate-900 text-sm">
                      Name
                    </th>
                    <th className="text-center px-6 py-3 font-semibold text-slate-900 text-sm">
                      Chain ID
                    </th>
                    <th className="text-center px-6 py-3 font-semibold text-slate-900 text-sm">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 font-semibold text-slate-900 text-sm">
                      Min Profit
                    </th>
                    <th className="text-right px-6 py-3 font-semibold text-slate-900 text-sm">
                      Fetch Blocks Interval
                    </th>
                    <th className="text-center px-6 py-3 font-semibold text-slate-900 text-sm">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedNetworks.map((network, index) => (
                    <React.Fragment key={network.chain_id}>
                      <tr
                        className={`hover:bg-slate-50 ${
                          isNetworkDeleted(network) ? "bg-red-50 opacity-75" : ""
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                setExpandedId(
                                  expandedId === network.chain_id
                                    ? null
                                    : network.chain_id,
                                )
                              }
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <ChevronDown
                                size={18}
                                style={{
                                  transform:
                                    expandedId === network.chain_id
                                      ? "rotate(180deg)"
                                      : "rotate(0deg)",
                                  transition: "transform 0.2s",
                                }}
                              />
                            </button>
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-medium ${
                                  isNetworkDeleted(network)
                                    ? "text-red-700 line-through"
                                    : "text-slate-900"
                                }`}
                              >
                                {network.name}
                              </span>
                              {isNetworkDeleted(network) && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                                  Deleted
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-700 font-mono text-sm">
                          {network.chain_id}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isNetworkDeleted(network) ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                              Deleted
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-700">
                          {formatUSD(network.min_profit_usd)}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-700">
                          {network.wait_time_fetch} ms
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {!isNetworkDeleted(network) && (
                              <button
                                onClick={() => {
                                  setEditingNetwork(network);
                                  setShowForm(true);
                                }}
                                className="p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={18} />
                              </button>
                            )}
                            {isNetworkDeleted(network) ? (
                              <>
                                <button
                                  onClick={() => handleUndelete(network.chain_id)}
                                  disabled={undeleteMutation.loading}
                                  className="p-2 text-slate-600 hover:bg-green-50 hover:text-green-600 rounded-lg transition-colors disabled:opacity-50"
                                  title="Restore"
                                >
                                  <RotateCcw size={18} />
                                </button>
                                <button
                                  onClick={() =>
                                    setHardDeleteConfirmId(network.chain_id)
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
                                  setDeleteConfirmId(network.chain_id)
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
                      {expandedId === network.chain_id && (
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="space-y-4">
                              {/* Basic Information */}
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-3">
                                  Basic Information
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                  <div>
                                    <p className="text-xs font-medium text-slate-600">
                                      Chain ID
                                    </p>
                                    <p className="text-sm text-slate-900 font-mono">
                                      {network.chain_id}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-slate-600">
                                      Network Name
                                    </p>
                                    <p className="text-sm text-slate-900">
                                      {network.name}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-slate-600">
                                      Min Profit (USD)
                                    </p>
                                    <p className="text-sm text-slate-900">
                                      {formatUSD(network.min_profit_usd)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-slate-600">
                                      Max Blocks Per Batch
                                    </p>
                                    <p className="text-sm text-slate-900">
                                      {network.max_blocks_per_batch}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-slate-600">
                                      Fetch Blocks Interval
                                    </p>
                                    <p className="text-sm text-slate-900">
                                      {network.wait_time_fetch} ms
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-slate-600">
                                      Block Explorer
                                    </p>
                                    <p className="text-sm text-slate-900 font-mono truncate">
                                      {network.block_explorer || "N/A"}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Addresses */}
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-3">
                                  Addresses
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                  <div>
                                    <p className="text-xs font-medium text-slate-600">
                                      Wrap Native
                                    </p>
                                    <p className="text-sm text-slate-900 font-mono">
                                      {truncateAddress(network.wrap_native)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-slate-600">
                                      Multicall Address
                                    </p>
                                    <p className="text-sm text-slate-900 font-mono">
                                      {network.multicall_address
                                        ? truncateAddress(
                                            network.multicall_address,
                                          )
                                        : "N/A"}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* RPCs */}
                              <div>
                                <p className="text-xs font-medium text-slate-600 mb-2">
                                  RPCs ({network.rpcs.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {network.rpcs.map((rpc, i) => (
                                    <span
                                      key={i}
                                      className="text-xs bg-white px-2 py-1 rounded border border-slate-200 font-mono text-slate-700 truncate max-w-xs"
                                      title={rpc}
                                    >
                                      {rpc}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* WebSocket URLs */}
                              {network.websocket_urls && network.websocket_urls.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-slate-600 mb-2">
                                    WebSocket URLs ({network.websocket_urls.length})
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {network.websocket_urls.map((url, i) => (
                                      <span
                                        key={i}
                                        className="text-xs bg-white px-2 py-1 rounded border border-slate-200 font-mono text-slate-700 truncate max-w-xs"
                                        title={url}
                                      >
                                        {url}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* V2 Factory to Fee */}
                              {network.v2_factory_to_fee &&
                                Object.keys(network.v2_factory_to_fee).length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-slate-600 mb-2">
                                      V2 Factory to Fee (
                                      {Object.keys(network.v2_factory_to_fee).length}{" "}
                                      factories)
                                    </p>
                                    <div className="space-y-2">
                                      {Object.entries(network.v2_factory_to_fee).map(
                                        ([address, fee]) => (
                                          <div
                                            key={address}
                                            className="flex items-center gap-3 bg-white px-3 py-2 rounded border border-slate-200"
                                          >
                                            <p className="text-xs text-slate-900 font-mono flex-1">
                                              {truncateAddress(address)}
                                            </p>
                                            <p className="text-xs text-slate-700">
                                              Fee: {fee}
                                            </p>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* Aero Factory Addresses */}
                              {network.aero_factory_addresses &&
                                network.aero_factory_addresses.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-slate-600 mb-2">
                                      Aero Factory Addresses (
                                      {network.aero_factory_addresses.length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {network.aero_factory_addresses.map(
                                        (address, i) => (
                                          <span
                                            key={i}
                                            className="text-xs bg-white px-2 py-1 rounded border border-slate-200 font-mono text-slate-700"
                                            title={address}
                                          >
                                            {truncateAddress(address)}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
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
                  {Math.min(currentPage * 20, filteredNetworks.length)} of{" "}
                  {filteredNetworks.length} networks
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
        {!loading && filteredNetworks && filteredNetworks.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <p className="text-slate-600">
              {networks?.length === 0
                ? "No networks configured yet"
                : "No results found"}
            </p>
            {networks?.length === 0 && (
              <button
                onClick={() => {
                  setEditingNetwork(undefined);
                  setShowForm(true);
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create your first network
              </button>
            )}
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteConfirmId !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Delete Network?
              </h3>
              <p className="text-slate-600 mb-6">
                This will soft-delete the network. You can restore it later.
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
                Permanently Delete Network?
              </h3>
              <p className="text-slate-600 mb-2">
                This action <strong>cannot be undone</strong>. The network will be permanently removed from the database.
              </p>
              <p className="text-sm text-red-600 mb-6">
                This is a destructive operation. Make sure you want to permanently delete this network.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setHardDeleteConfirmId(null)}
                  className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleHardDelete(hardDeleteConfirmId)}
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
          <NetworkForm
            network={editingNetwork}
            onSubmit={handleCreateOrUpdate}
            onClose={() => {
              setShowForm(false);
              setEditingNetwork(undefined);
            }}
            isLoading={createMutation.loading || updateMutation.loading}
          />
        )}
      </div>
    </NavLayout>
  );
}
