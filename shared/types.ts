// Network Interface
export interface Network {
  id?: string; // MongoDB ObjectId as string
  chain_id: number;
  name: string;
  rpcs: string[];
  websocket_urls?: string[];
  block_explorer?: string;
  wrap_native: string;
  min_profit_usd: number;
  v2_factory_to_fee?: Record<string, number>;
  aero_factory_addresses?: string[];
  multicall_address?: string;
  max_blocks_per_batch: number;
  wait_time_fetch: number;
  created_at: number;
  updated_at: number;
  deleted_at?: number;
  deleted?: boolean; // Indicates if network is soft-deleted
}

// Pool Direction for Paths
export interface PoolDirection {
  pool: string; // Address as string
  token_in: string;
  token_out: string;
}

// Pool Path is an array of PoolDirections
export type PoolPath = PoolDirection[];

// Single Chain Paths with Anchor Token
export interface SingleChainPathsWithAnchorToken {
  paths: PoolPath[];
  chain_id: number;
  anchor_token: string; // Address as string
}

// Path Interface
export interface Path {
  id?: string;
  paths: SingleChainPathsWithAnchorToken[];
  created_at: number;
  updated_at: number;
  deleted_at?: number;
  deleted?: boolean; // Indicates if path is soft-deleted
}

// Pool Interface
export interface Pool {
  id?: string;
  network_id: number;
  address: string;
  created_at: number;
  updated_at: number;
  deleted_at?: number;
}

// Config Interface
export interface Config {
  id?: string;
  max_amount_usd: number;
  recheck_interval: number;
  created_at: number;
  updated_at: number;
}

// Token Interface
export interface Token {
  id?: string;
  network_id: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  created_at: number;
  updated_at: number;
  deleted_at?: number;
}

// Health Check Response
export interface HealthResponse {
  status: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
