import React, { useState, useEffect } from "react";
import { Network } from "@shared/types";
import { X, AlertCircle, Plus, Trash2 } from "lucide-react";
import { isAddress } from "viem";

// Default multicall3 address (same across all EVM chains)
const DEFAULT_MULTICALL_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

interface NetworkFormProps {
  network?: Network;
  onSubmit: (
    data: Omit<Network, "id" | "created_at" | "updated_at">,
  ) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export const NetworkForm: React.FC<NetworkFormProps> = ({
  network,
  onSubmit,
  onClose,
  isLoading,
}) => {
  const [formData, setFormData] = useState<
    Omit<Network, "id" | "created_at" | "updated_at">
  >({
    chain_id: network?.chain_id || 0,
    name: network?.name || "",
    rpcs: network?.rpcs || [""],
    websocket_urls: network?.websocket_urls || [""],
    block_explorer: network?.block_explorer || "",
    wrap_native: network?.wrap_native || "",
    min_profit_usd: network?.min_profit_usd || 100,
    v2_factory_to_fee: network?.v2_factory_to_fee || {},
    aero_factory_addresses: network?.aero_factory_addresses || [],
    multicall_address: network?.multicall_address || DEFAULT_MULTICALL_ADDRESS,
    max_blocks_per_batch: network?.max_blocks_per_batch || 100,
    wait_time_fetch: network?.wait_time_fetch || 1000,
    deleted_at: network?.deleted_at,
  });

  const [addressErrors, setAddressErrors] = useState<{
    wrap_native?: string;
    multicall_address?: string;
    aero_factory_addresses?: Record<number, string>;
    v2_factory_to_fee?: Record<number, string>;
  }>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    // Normalize comma to dot for decimal inputs
    let normalizedValue = value;
    if (name === "min_profit_usd") {
      normalizedValue = value.replace(/,/g, ".");
    }

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "min_profit_usd" ||
        name === "max_blocks_per_batch" ||
        name === "wait_time_fetch"
          ? Number(normalizedValue)
          : normalizedValue,
    }));

    // Validate address fields
    if (name === "wrap_native" || name === "multicall_address") {
      if (value.trim() === "") {
        setAddressErrors((prev) => ({ ...prev, [name]: undefined }));
      } else if (!isAddress(value.trim())) {
        setAddressErrors((prev) => ({
          ...prev,
          [name]: "Invalid Ethereum address format",
        }));
      } else {
        setAddressErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    }
  };

  const handleChainIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (value === "") {
      setFormData((prev) => ({ ...prev, chain_id: 0 }));
    } else {
      // Only allow numeric input
      if (value.match(/^\d+$/)) {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          setFormData((prev) => ({ ...prev, chain_id: numValue }));
        }
      }
    }
  };

  const handleArrayChange = (
    field: "rpcs" | "websocket_urls" | "aero_factory_addresses",
    index: number,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));

    // Validate aero_factory_addresses
    if (field === "aero_factory_addresses") {
      if (value.trim() === "") {
        setAddressErrors((prev) => ({
          ...prev,
          aero_factory_addresses: {
            ...prev.aero_factory_addresses,
            [index]: undefined,
          },
        }));
      } else if (!isAddress(value.trim())) {
        setAddressErrors((prev) => ({
          ...prev,
          aero_factory_addresses: {
            ...prev.aero_factory_addresses,
            [index]: "Invalid Ethereum address format",
          },
        }));
      } else {
        setAddressErrors((prev) => ({
          ...prev,
          aero_factory_addresses: {
            ...prev.aero_factory_addresses,
            [index]: undefined,
          },
        }));
      }
    }
  };

  const handleAddArrayItem = (
    field: "rpcs" | "websocket_urls" | "aero_factory_addresses",
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const handleRemoveArrayItem = (
    field: "rpcs" | "websocket_urls" | "aero_factory_addresses",
    index: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleV2FactoryChange = (
    index: number,
    field: "address" | "fee",
    value: string,
  ) => {
    setFormData((prev) => {
      const entries = Object.entries(prev.v2_factory_to_fee || {});
      if (field === "address") {
        // Update address, preserve fee
        const newEntries = [...entries];
        if (newEntries[index]) {
          newEntries[index] = [value, newEntries[index][1]];
        } else {
          newEntries[index] = [value, 3000];
        }
        return {
          ...prev,
          v2_factory_to_fee: Object.fromEntries(
            newEntries.filter(([addr]) => addr.trim() !== ""),
          ),
        };
      } else {
        // Update fee
        const numValue = value === "" ? 0 : Number(value);
        if (isNaN(numValue)) return prev;
        const newEntries = [...entries];
        if (newEntries[index]) {
          newEntries[index] = [newEntries[index][0], numValue];
        }
        return {
          ...prev,
          v2_factory_to_fee: Object.fromEntries(
            newEntries.filter(([addr]) => addr.trim() !== ""),
          ),
        };
      }
    });

    // Validate address
    if (field === "address") {
      if (value.trim() === "") {
        setAddressErrors((prev) => ({
          ...prev,
          v2_factory_to_fee: {
            ...prev.v2_factory_to_fee,
            [index]: undefined,
          },
        }));
      } else if (!isAddress(value.trim())) {
        setAddressErrors((prev) => ({
          ...prev,
          v2_factory_to_fee: {
            ...prev.v2_factory_to_fee,
            [index]: "Invalid Ethereum address format",
          },
        }));
      } else {
        setAddressErrors((prev) => ({
          ...prev,
          v2_factory_to_fee: {
            ...prev.v2_factory_to_fee,
            [index]: undefined,
          },
        }));
      }
    }
  };

  const handleAddV2Factory = () => {
    setFormData((prev) => ({
      ...prev,
      v2_factory_to_fee: {
        ...prev.v2_factory_to_fee,
        "": 3000,
      },
    }));
  };

  const handleRemoveV2Factory = (address: string) => {
    setFormData((prev) => {
      const newFactoryToFee = { ...prev.v2_factory_to_fee };
      delete newFactoryToFee[address];
      return {
        ...prev,
        v2_factory_to_fee: newFactoryToFee,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all address fields before submitting
    const errors: typeof addressErrors = {};

    if (
      formData.wrap_native.trim() &&
      !isAddress(formData.wrap_native.trim())
    ) {
      errors.wrap_native = "Invalid Ethereum address format";
    }

    if (
      formData.multicall_address.trim() &&
      !isAddress(formData.multicall_address.trim())
    ) {
      errors.multicall_address = "Invalid Ethereum address format";
    }

    const aeroErrors: Record<number, string> = {};
    formData.aero_factory_addresses.forEach((addr, index) => {
      if (addr.trim() && !isAddress(addr.trim())) {
        aeroErrors[index] = "Invalid Ethereum address format";
      }
    });
    if (Object.keys(aeroErrors).length > 0) {
      errors.aero_factory_addresses = aeroErrors;
    }

    const v2FactoryErrors: Record<number, string> = {};
    Object.entries(formData.v2_factory_to_fee || {}).forEach(([addr], index) => {
      if (addr.trim() && !isAddress(addr.trim())) {
        v2FactoryErrors[index] = "Invalid Ethereum address format";
      }
    });
    if (Object.keys(v2FactoryErrors).length > 0) {
      errors.v2_factory_to_fee = v2FactoryErrors;
    }

    if (Object.keys(errors).length > 0) {
      setAddressErrors(errors);
      return;
    }

    await onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 bg-white">
          <h2 className="text-xl font-bold text-slate-900">
            {network ? "Edit Network" : "Create Network"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Chain ID
                </label>
                <input
                  type="text"
                  name="chain_id"
                  value={
                    formData.chain_id && formData.chain_id > 0
                      ? formData.chain_id.toString()
                      : ""
                  }
                  onChange={handleChainIdChange}
                  placeholder="Enter chain ID"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Network Name (From Geckoterminal url)
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Ethereum"
                  required
                />
              </div>
            </div>
          </div>

          {/* RPCs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-900">
                RPC URLs
              </label>
              <button
                type="button"
                onClick={() => handleAddArrayItem("rpcs")}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                + Add RPC
              </button>
            </div>
            <div className="space-y-2">
              {formData.rpcs.map((rpc, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={rpc}
                    onChange={(e) =>
                      handleArrayChange("rpcs", index, e.target.value)
                    }
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://..."
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveArrayItem("rpcs", index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Min Profit & Other Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Min Profit (USD)
              </label>
              <input
                type="number"
                name="min_profit_usd"
                value={formData.min_profit_usd}
                onChange={handleChange}
                step="0.01"
                inputMode="decimal"
                lang="en"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Wrap Native Token
              </label>
              <input
                type="text"
                name="wrap_native"
                value={formData.wrap_native}
                onChange={handleChange}
                placeholder="0x..."
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono ${
                  addressErrors.wrap_native
                    ? "border-red-300 bg-red-50"
                    : "border-slate-300"
                }`}
                required
              />
              {addressErrors.wrap_native && (
                <div className="mt-1 flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{addressErrors.wrap_native}</span>
                </div>
              )}
            </div>
          </div>

          {/* Block Explorer & Multicall */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Block Explorer URL
              </label>
              <input
                type="text"
                name="block_explorer"
                value={formData.block_explorer}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Multicall Address
              </label>
              <input
                type="text"
                name="multicall_address"
                value={formData.multicall_address}
                onChange={handleChange}
                placeholder="0x..."
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono ${
                  addressErrors.multicall_address
                    ? "border-red-300 bg-red-50"
                    : "border-slate-300"
                }`}
              />
              {addressErrors.multicall_address && (
                <div className="mt-1 flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{addressErrors.multicall_address}</span>
                </div>
              )}
            </div>
          </div>

          {/* V2 Factory to Fee */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-900">
                V2 Factory to Fee (1,000,000 = 100% | 3000 = 0.3%)
              </label>
              <button
                type="button"
                onClick={handleAddV2Factory}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
              >
                <Plus size={14} />
                Add Factory
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(formData.v2_factory_to_fee || {}).map(
                ([address, fee], index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={address}
                        onChange={(e) =>
                          handleV2FactoryChange(index, "address", e.target.value)
                        }
                        placeholder="Factory address (0x...)"
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono ${
                          addressErrors.v2_factory_to_fee?.[index]
                            ? "border-red-300 bg-red-50"
                            : "border-slate-300"
                        }`}
                      />
                      {addressErrors.v2_factory_to_fee?.[index] && (
                        <div className="mt-1 flex items-start gap-2 text-sm text-red-600">
                          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                          <span>{addressErrors.v2_factory_to_fee[index]}</span>
                        </div>
                      )}
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        value={fee}
                        onChange={(e) =>
                          handleV2FactoryChange(index, "fee", e.target.value)
                        }
                        placeholder="Fee"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveV2Factory(address)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center"
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ),
              )}
              {(!formData.v2_factory_to_fee ||
                Object.keys(formData.v2_factory_to_fee).length === 0) && (
                <p className="text-sm text-slate-500 italic">
                  No V2 factories configured. Click "Add Factory" to add one.
                </p>
              )}
            </div>
          </div>

          {/* Aero Factory Addresses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-900">
                Aero Factory Addresses
              </label>
              <button
                type="button"
                onClick={() => handleAddArrayItem("aero_factory_addresses")}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
              >
                <Plus size={14} />
                Add Address
              </button>
            </div>
            <div className="space-y-2">
              {formData.aero_factory_addresses.map((address, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) =>
                      handleArrayChange(
                        "aero_factory_addresses",
                        index,
                        e.target.value,
                      )
                    }
                    className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono ${
                      addressErrors.aero_factory_addresses?.[index]
                        ? "border-red-300 bg-red-50"
                        : "border-slate-300"
                    }`}
                    placeholder="0x..."
                  />
                  {addressErrors.aero_factory_addresses?.[index] && (
                    <div className="absolute mt-10 flex items-start gap-2 text-sm text-red-600">
                      <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                      <span>{addressErrors.aero_factory_addresses[index]}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveArrayItem("aero_factory_addresses", index)
                    }
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center"
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {formData.aero_factory_addresses.length === 0 && (
                <p className="text-sm text-slate-500 italic">
                  No Aero factory addresses configured. Click "Add Address" to add one.
                </p>
              )}
            </div>
          </div>

          {/* Batch Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Max Blocks Per Batch (Recommended: 100)
              </label>
              <input
                type="number"
                name="max_blocks_per_batch"
                value={formData.max_blocks_per_batch}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fetch Blocks Interval (ms) (Min: 2000ms)
              </label>
              <input
                type="number"
                name="wait_time_fetch"
                value={formData.wait_time_fetch}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
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
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Network"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
