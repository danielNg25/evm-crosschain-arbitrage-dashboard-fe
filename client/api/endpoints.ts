import axiosInstance from "./client";
import {
  Network,
  Path,
  Pool,
  Config,
  Token,
  HealthResponse,
} from "@shared/types";

// Networks API
export const networksApi = {
  getAll: async (): Promise<Network[]> => {
    const response = await axiosInstance.get("/networks");
    return response.data;
  },
  getById: async (chainId: number): Promise<Network> => {
    const response = await axiosInstance.get(`/networks/${chainId}`);
    return response.data;
  },
  create: async (
    data: Omit<Network, "id" | "created_at" | "updated_at">,
  ): Promise<Network> => {
    const response = await axiosInstance.post("/networks", data);
    return response.data;
  },
  update: async (chainId: number, data: Partial<Network>): Promise<Network> => {
    const response = await axiosInstance.put(`/networks/${chainId}`, data);
    return response.data;
  },
  delete: async (chainId: number): Promise<void> => {
    await axiosInstance.delete(`/networks/${chainId}`);
  },
  undelete: async (chainId: number): Promise<Network> => {
    const response = await axiosInstance.post(`/networks/${chainId}/undelete`);
    return response.data;
  },
  hardDelete: async (chainId: number): Promise<void> => {
    await axiosInstance.delete(`/networks/${chainId}/hard`);
  },
  updateFactories: async (
    chainId: number,
    data: {
      v2_factory_to_fee?: Record<string, number>;
      aero_factory_addresses?: string[];
    },
  ): Promise<Network> => {
    const response = await axiosInstance.put(
      `/networks/${chainId}/factories`,
      data,
    );
    return response.data;
  },
};

// Paths API
export const pathsApi = {
  getAll: async (): Promise<Path[]> => {
    const response = await axiosInstance.get("/paths");
    return response.data;
  },
  getById: async (id: string): Promise<Path> => {
    const response = await axiosInstance.get(`/paths/${id}`);
    return response.data;
  },
  getByAnchorToken: async (anchorToken: string): Promise<Path[]> => {
    const response = await axiosInstance.get(
      `/paths/anchor-token/${anchorToken}`,
    );
    return response.data;
  },
  getByChainId: async (chainId: number): Promise<Path[]> => {
    const response = await axiosInstance.get(`/paths/chain/${chainId}`);
    return response.data;
  },
  create: async (
    data: Omit<Path, "id" | "created_at" | "updated_at">,
  ): Promise<Path> => {
    const response = await axiosInstance.post("/paths", data);
    return response.data;
  },
  update: async (id: string, data: Partial<Path>): Promise<Path> => {
    const response = await axiosInstance.put(`/paths/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/paths/${id}`);
  },
  undelete: async (id: string): Promise<Path> => {
    const response = await axiosInstance.post(`/paths/${id}/undelete`);
    return response.data;
  },
  hardDelete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/paths/${id}/hard`);
  },
};

// Pools API
export const poolsApi = {
  getAll: async (): Promise<Pool[]> => {
    const response = await axiosInstance.get("/pools");
    return response.data;
  },
  getByNetworkId: async (networkId: number): Promise<Pool[]> => {
    const response = await axiosInstance.get(`/pools/network/${networkId}`);
    return response.data;
  },
  getCountByNetworkId: async (networkId: number): Promise<number> => {
    const response = await axiosInstance.get(
      `/pools/network/${networkId}/count`,
    );
    return response.data.count || 0;
  },
  getByAddress: async (networkId: number, address: string): Promise<Pool[]> => {
    const response = await axiosInstance.get(
      `/pools/network/${networkId}/address/${address}`,
    );
    return response.data;
  },
  create: async (
    data: Omit<Pool, "id" | "created_at" | "updated_at">,
  ): Promise<Pool> => {
    const response = await axiosInstance.post("/pools", data);
    return response.data;
  },
  update: async (id: string, data: Partial<Pool>): Promise<Pool> => {
    const response = await axiosInstance.put(`/pools/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/pools/${id}`);
  },
  hardDelete: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/pools/${id}/hard`);
  },
};

// Config API
export const configApi = {
  get: async (): Promise<Config> => {
    const response = await axiosInstance.get("/config");
    return response.data;
  },
  update: async (
    data: Omit<Config, "id" | "created_at" | "updated_at">,
  ): Promise<Config> => {
    const response = await axiosInstance.put("/config", data);
    return response.data;
  },
};

// Health Check API
export const healthApi = {
  check: async (): Promise<HealthResponse> => {
    const response = await axiosInstance.get("/health");
    return response.data;
  },
};

// Tokens API
export const tokensApi = {
  getAll: async (): Promise<Token[]> => {
    const response = await axiosInstance.get("/tokens");
    return response.data;
  },
  getByNetworkId: async (networkId: number): Promise<Token[]> => {
    const response = await axiosInstance.get(`/tokens/network/${networkId}`);
    return response.data;
  },
  getByAddress: async (networkId: number, address: string): Promise<Token> => {
    const response = await axiosInstance.get(
      `/tokens/network/${networkId}/address/${address}`,
    );
    return response.data;
  },
  getCountByNetworkId: async (networkId: number): Promise<number> => {
    const response = await axiosInstance.get(
      `/tokens/network/${networkId}/count`,
    );
    return response.data.count || 0;
  },
  delete: async (networkId: number, address: string): Promise<void> => {
    await axiosInstance.delete(
      `/tokens/network/${networkId}/address/${address}`,
    );
  },
};
