import React, { useState, useCallback, useEffect } from "react";
import { NavLayout } from "@/components/layout/NavLayout";
import { PoolForm } from "@/components/forms/PoolForm";
import { useApi, useMutation } from "@/hooks/useApi";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { poolsApi, networksApi } from "@/api/endpoints";
import { Pool, Network } from "@shared/types";
import { formatDate, truncateAddress } from "@/utils/formatters";
import { showToast, getErrorMessage } from "@/utils/toast";
import { AxiosError } from "axios";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function Pools() {
  const {
    data: pools,
    loading,
    error,
    refetch,
  } = useApi(() => poolsApi.getAll(), true);

  const { data: networks } = useApi(() => networksApi.getAll(), true);

  const [showForm, setShowForm] = useState(false);
  const [editingPool, setEditingPool] = useState<Pool | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search
  const [selectedNetworkId, setSelectedNetworkId] = useState<number | null>(
    null,
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const createMutation = useMutation(
    (data: Omit<Pool, "id" | "created_at" | "updated_at">) =>
      poolsApi.create(data),
  );

  const updateMutation = useMutation(
    (data: { id: string; pool: Partial<Pool> }) =>
      poolsApi.update(data.id, data.pool),
  );

  const deleteMutation = useMutation((id: string) => poolsApi.delete(id));

  const handleCreateOrUpdate = useCallback(
    async (data: Omit<Pool, "id" | "created_at" | "updated_at">) => {
      try {
        if (editingPool?.id) {
          await updateMutation.mutate({
            id: editingPool.id,
            pool: data,
          });
        } else {
          await createMutation.mutate(data);
        }
        setShowForm(false);
        setEditingPool(undefined);
        refetch();
        showToast.success(
          editingPool?.id ? "Pool updated successfully" : "Pool created successfully",
        );
      } catch (err) {
        console.error("Failed to save pool:", err);
        const error = err as AxiosError;
        const message = getErrorMessage(error);
        showToast.error(`Failed to save pool: ${message}`);
      }
    },
    [editingPool, createMutation, updateMutation, refetch],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutate(id);
        setDeleteConfirmId(null);
        refetch();
        showToast.success("Pool deleted successfully");
      } catch (err) {
        console.error("Failed to delete pool:", err);
        const error = err as AxiosError;
        const message = getErrorMessage(error);
        showToast.error(`Failed to delete pool: ${message}`);
      }
    },
    [deleteMutation, refetch],
  );

  const getNetworkName = (networkId: number) => {
    return (
      networks?.find((n) => n.chain_id === networkId)?.name ||
      `Chain ${networkId}`
    );
  };

  // Memoize filtered pools to prevent recalculation on every render
  // Use debounced search term to reduce filtering operations
  const filteredPools = React.useMemo(
    () =>
      pools?.filter((pool) => {
        const matchesSearch = pool.address
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase());
        const matchesNetwork =
          selectedNetworkId === null || pool.network_id === selectedNetworkId;
        return matchesSearch && matchesNetwork;
      }) || [],
    [pools, debouncedSearchTerm, selectedNetworkId],
  );

  // Add pagination to prevent rendering too many items at once
  const {
    currentItems: paginatedPools,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
  } = usePagination(filteredPools, { itemsPerPage: 20 });

  // Memoize poolsByNetwork calculation
  const poolsByNetwork = React.useMemo(
    () =>
      pools?.reduce(
        (acc, pool) => {
          acc[pool.network_id] = (acc[pool.network_id] || 0) + 1;
          return acc;
        },
        {} as Record<number, number>,
      ) || {},
    [pools],
  );

  return (
    <NavLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Pools</h1>
            <p className="text-slate-600 mt-2">
              Manage liquidity pools across networks
            </p>
          </div>
          <button
            onClick={() => {
              setEditingPool(undefined);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Pool
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by pool address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={selectedNetworkId || ""}
            onChange={(e) =>
              setSelectedNetworkId(
                e.target.value ? Number(e.target.value) : null,
              )
            }
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Networks</option>
            {networks?.map((network) => (
              <option key={network.chain_id} value={network.chain_id}>
                {network.name} ({poolsByNetwork[network.chain_id] || 0} pools)
              </option>
            ))}
          </select>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600" size={20} />
            <div>
              <p className="font-medium text-red-900">Failed to load pools</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg border border-slate-200 p-8">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <p className="text-slate-600">Loading pools...</p>
            </div>
          </div>
        )}

        {/* Pools Table */}
        {!loading && filteredPools && filteredPools.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold text-slate-900 text-sm">
                      Network
                    </th>
                    <th className="text-left px-6 py-3 font-semibold text-slate-900 text-sm">
                      Pool Address
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
                  {paginatedPools.map((pool) => (
                    <tr key={pool.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-sm font-medium">
                          {getNetworkName(pool.network_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-slate-700">
                          {truncateAddress(pool.address, 8)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(pool.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingPool(pool);
                              setShowForm(true);
                            }}
                            className="p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(pool.id || null)}
                            className="p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing {(currentPage - 1) * 20 + 1} to{" "}
                  {Math.min(currentPage * 20, filteredPools.length)} of{" "}
                  {filteredPools.length} pools
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
        {!loading && filteredPools && filteredPools.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <p className="text-slate-600">
              {pools?.length === 0
                ? "No pools configured yet"
                : "No results found"}
            </p>
            {pools?.length === 0 && (
              <button
                onClick={() => {
                  setEditingPool(undefined);
                  setShowForm(true);
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create your first pool
              </button>
            )}
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteConfirmId !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Delete Pool?
              </h3>
              <p className="text-slate-600 mb-6">
                This action cannot be undone. Are you sure you want to delete
                this pool?
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

        {/* Form Modal */}
        {showForm && (
          <PoolForm
            pool={editingPool}
            onSubmit={handleCreateOrUpdate}
            onClose={() => {
              setShowForm(false);
              setEditingPool(undefined);
            }}
            isLoading={createMutation.loading || updateMutation.loading}
          />
        )}
      </div>
    </NavLayout>
  );
}
