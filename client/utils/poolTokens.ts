import { createPublicClient, http, Address, defineChain } from "viem";
import { Network } from "@shared/types";

// Shared Pool ABI (works for both V2 and V3)
const POOL_ABI = [
  {
    inputs: [],
    name: "token0",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Fetch pool tokens using RPC calls
 * Returns token0 and token1 addresses
 */
export async function fetchPoolTokens(
  poolAddress: string,
  network: Network,
): Promise<{ token0: string; token1: string } | null> {
  try {
    if (
      !poolAddress ||
      !poolAddress.startsWith("0x") ||
      poolAddress.length !== 42
    ) {
      return null;
    }

    // Get RPC URL (use first available RPC)
    const rpcUrl = network.rpcs?.[0];
    if (!rpcUrl) {
      throw new Error(`No RPC URL found for network ${network.chain_id}`);
    }

    // Create custom chain definition
    const customChain = defineChain({
      id: network.chain_id,
      name: network.name,
      nativeCurrency: {
        name: "ETH",
        symbol: "ETH",
        decimals: 18,
      },
      rpcUrls: {
        default: {
          http: [rpcUrl],
        },
      },
    });

    // Create public client
    const client = createPublicClient({
      chain: customChain,
      transport: http(rpcUrl),
    });

    const poolAddr = poolAddress.toLowerCase() as Address;

    // Fetch tokens (works for both V2 and V3 pools)
    const [token0, token1] = await Promise.all([
      client.readContract({
        address: poolAddr,
        abi: POOL_ABI,
        functionName: "token0",
      }),
      client.readContract({
        address: poolAddr,
        abi: POOL_ABI,
        functionName: "token1",
      }),
    ]);

    return {
      token0: (token0 as string).toLowerCase(),
      token1: (token1 as string).toLowerCase(),
    };
  } catch (error) {
    console.error("Error fetching pool tokens:", error);
    throw error;
  }
}
