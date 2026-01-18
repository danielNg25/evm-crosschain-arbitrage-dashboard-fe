import React, { useState, useEffect } from "react";
import { Pool, Network } from "@shared/types";
import { X, AlertCircle } from "lucide-react";
import { networksApi } from "@/api/endpoints";
import { isAddress } from "viem";

interface PoolFormProps {
  pool?: Pool;
  onSubmit: (
    data: Omit<Pool, "id" | "created_at" | "updated_at">,
  ) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export const PoolForm: React.FC<PoolFormProps> = ({
  pool,
  onSubmit,
  onClose,
  isLoading,
}) => {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [loadingNetworks, setLoadingNetworks] = useState(true);
  const [formData, setFormData] = useState<
    Omit<Pool, "id" | "created_at" | "updated_at">
  >({
    network_id: pool?.network_id || 1,
    address: pool?.address || "",
    deleted_at: pool?.deleted_at,
  });
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNetworks = async () => {
      try {
        const data = await networksApi.getAll();
        setNetworks(data);
      } catch (err) {
        console.error("Failed to fetch networks:", err);
      } finally {
        setLoadingNetworks(false);
      }
    };
    fetchNetworks();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "network_id" ? Number(value) : value,
    }));

    // Validate address field
    if (name === "address") {
      if (value.trim() === "") {
        setAddressError(null);
      } else if (!isAddress(value.trim())) {
        setAddressError("Invalid Ethereum address format");
      } else {
        setAddressError(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate address before submitting
    if (formData.address.trim() && !isAddress(formData.address.trim())) {
      setAddressError("Invalid Ethereum address format");
      return;
    }

    await onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {pool ? "Edit Pool" : "Create Pool"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Network
            </label>
            <select
              name="network_id"
              value={formData.network_id}
              onChange={handleChange}
              disabled={loadingNetworks}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
              required
            >
              {loadingNetworks ? (
                <option>Loading networks...</option>
              ) : (
                <>
                  <option value="">Select a network</option>
                  {networks.map((network) => (
                    <option key={network.chain_id} value={network.chain_id}>
                      {network.name} (Chain {network.chain_id})
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Pool Address
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="0x..."
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono ${
                addressError ? "border-red-300 bg-red-50" : "border-slate-300"
              }`}
              required
            />
            {addressError && (
              <div className="mt-1 flex items-start gap-2 text-sm text-red-600">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{addressError}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || loadingNetworks}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Pool"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
