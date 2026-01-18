import React, { useState } from "react";
import { NavLayout } from "@/components/layout/NavLayout";
import { useApi, useMutation } from "@/hooks/useApi";

import { useApiKey } from "@/hooks/useApiKey";
import { configApi } from "@/api/endpoints";
import { Config } from "@shared/types";
import { formatDate, formatUSD } from "@/utils/formatters";
import { AlertCircle, Save, X, Key, Eye, EyeOff } from "lucide-react";
import { showToast, getErrorMessage } from "@/utils/toast";
import { AxiosError } from "axios";

export default function ConfigPage() {
  const {
    data: config,
    loading,
    error,
    refetch,
  } = useApi(() => configApi.get(), true);

  const { apiKey, setApiKey, hasApiKey } = useApiKey();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(apiKey);

  const [formData, setFormData] = useState<
    Omit<Config, "id" | "created_at" | "updated_at">
  >({
    max_amount_usd: config?.max_amount_usd || 10000,
    recheck_interval: config?.recheck_interval || 5000,
  });

  const updateMutation = useMutation(
    (data: Omit<Config, "id" | "created_at" | "updated_at">) =>
      configApi.update(data),
  );

  // Update formData when config is loaded
  React.useEffect(() => {
    if (config) {
      setFormData({
        max_amount_usd: config.max_amount_usd,
        recheck_interval: config.recheck_interval,
      });
    }
  }, [config]);

  // Update API key input when apiKey changes
  React.useEffect(() => {
    setApiKeyInput(apiKey);
  }, [apiKey]);

  const handleApiKeySave = () => {
    setApiKey(apiKeyInput);
    setIsEditingApiKey(false);
    // No need to reload - axios interceptor reads from localStorage on each request
  };

  const handleApiKeyCancel = () => {
    setApiKeyInput(apiKey);
    setIsEditingApiKey(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Normalize comma to dot for decimal inputs
    let normalizedValue = value;
    if (name === "max_amount_usd") {
      normalizedValue = value.replace(/,/g, ".");
    }

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "max_amount_usd" || name === "recheck_interval"
          ? Number(normalizedValue)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutate(formData);
      setIsEditing(false);
      refetch();
      showToast.success("Configuration updated successfully");
    } catch (err) {
      console.error("Failed to update config:", err);
      const error = err as AxiosError;
      const message = getErrorMessage(error);
      showToast.error(`Failed to update configuration: ${message}`);
    }
  };

  return (
    <NavLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Configuration</h1>
          <p className="text-slate-600 mt-2">
            Manage global arbitrage bot settings
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600" size={20} />
            <div>
              <p className="font-medium text-red-900">
                Failed to load configuration
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
              <p className="text-slate-600">Loading configuration...</p>
            </div>
          </div>
        )}

        {/* Config Card */}
        {!loading && config && (
          <div className="space-y-6">
            {/* Info Section */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Configuration Info
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-600">Created At</p>
                  <p className="text-slate-900 font-medium mt-1">
                    {formatDate(config.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Last Updated</p>
                  <p className="text-slate-900 font-medium mt-1">
                    {formatDate(config.updated_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Edit Form */}
            {!isEditing ? (
              // View Mode
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Trading Settings
                  </h2>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit Settings
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="border-l-4 border-blue-500 pl-6">
                    <p className="text-sm text-slate-600 uppercase tracking-wide">
                      Max Trade Amount
                    </p>
                    <p className="text-4xl font-bold text-slate-900 mt-2">
                      {formatUSD(config.max_amount_usd)}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Maximum USD amount per transaction
                    </p>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-6">
                    <p className="text-sm text-slate-600 uppercase tracking-wide">
                      Recheck Interval
                    </p>
                    <p className="text-4xl font-bold text-slate-900 mt-2">
                      {config.recheck_interval}ms
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Time between checking for new opportunities
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Edit Mode
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Edit Trading Settings
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Max Trade Amount (USD)
                  </label>
                  <input
                    type="number"
                    name="max_amount_usd"
                    value={formData.max_amount_usd}
                    onChange={handleChange}
                    step="0.01"
                    inputMode="decimal"
                    lang="en"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Set the maximum amount in USD for a single trade
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Recheck Interval (milliseconds)
                  </label>
                  <input
                    type="number"
                    name="recheck_interval"
                    value={formData.recheck_interval}
                    onChange={handleChange}
                    step="100"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    How often (in ms) to check for new arbitrage opportunities
                  </p>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.loading}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save size={18} />
                    {updateMutation.loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {/* API Key Configuration */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Key size={20} className="text-slate-600" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    API Key Configuration
                  </h3>
                </div>
                {!isEditingApiKey && (
                  <button
                    onClick={() => setIsEditingApiKey(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    {hasApiKey ? "Change API Key" : "Set API Key"}
                  </button>
                )}
              </div>

              {!isEditingApiKey ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">
                      API Key Status
                    </p>
                    <div className="flex items-center gap-2">
                      {hasApiKey ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-green-700 font-medium">
                            API Key is configured
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                          <span className="text-sm text-amber-700 font-medium">
                            API Key not set - mutations will fail
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {hasApiKey && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">
                        Current API Key
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type={showApiKey ? "text" : "password"}
                          value={apiKey}
                          readOnly
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono"
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                          title={showApiKey ? "Hide" : "Show"}
                        >
                          {showApiKey ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      API Key
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="Enter your API key"
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                        title={showApiKey ? "Hide" : "Show"}
                      >
                        {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Required for POST, PUT, DELETE requests. Stored in browser
                      localStorage.
                    </p>
                  </div>
                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={handleApiKeyCancel}
                      className="px-6 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApiKeySave}
                      disabled={!apiKeyInput.trim()}
                      className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={18} />
                      Save API Key
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* API Information */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                API Information
              </h3>
              <div className="space-y-2 text-xs text-slate-600 font-mono">
                <p>
                  <span className="font-semibold">Base URL:</span>{" "}
                  {import.meta.env.VITE_API_BASE_URL ||
                    "http://localhost:8081/api/v1"}
                </p>
                <p>
                  <span className="font-semibold">Config Endpoint:</span>{" "}
                  GET/PUT /config
                </p>
                <p>
                  <span className="font-semibold">Authentication:</span>{" "}
                  X-API-Key header for mutations
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </NavLayout>
  );
}
