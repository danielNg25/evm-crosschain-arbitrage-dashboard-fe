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
 * Tries multiple RPC endpoints if one fails
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

    // Get all available RPC URLs
    const rpcUrls = network.rpcs || [];
    if (rpcUrls.length === 0) {
      throw new Error(`No RPC URL found for network ${network.chain_id}`);
    }

    const poolAddr = poolAddress.toLowerCase() as Address;
    let lastError: Error | null = null;

    // Try each RPC endpoint until one works
    for (const rpcUrl of rpcUrls) {
      try {
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

        // Create public client with timeout
        const client = createPublicClient({
          chain: customChain,
          transport: http(rpcUrl, {
            timeout: 10000, // 10 second timeout
          }),
        });

        // First, verify the contract has code (is a contract)
        const code = await client.getBytecode({ address: poolAddr });
        if (!code || code === "0x") {
          throw new Error(
            `Address ${poolAddress} is not a contract on chain ${network.chain_id}`,
          );
        }

        // Get multicall address (use default if not set)
        const multicallAddress =
          (network.multicall_address as `0x${string}`) ||
          ("0xcA11bde05977b3631167028862bE2a173976CA11" as `0x${string}`);

        // Try multicall first for better performance
        try {
          const multicallResults = await (client.multicall as any)({
            contracts: [
              {
                address: poolAddr,
                abi: POOL_ABI,
                functionName: "token0" as const,
              },
              {
                address: poolAddr,
                abi: POOL_ABI,
                functionName: "token1" as const,
              },
            ],
            multicallAddress,
          });

          const token0Result = multicallResults[0];
          const token1Result = multicallResults[1];

          if (
            token0Result.status === "success" &&
            token1Result.status === "success" &&
            token0Result.result &&
            token1Result.result
          ) {
            return {
              token0: (token0Result.result as string).toLowerCase(),
              token1: (token1Result.result as string).toLowerCase(),
            };
          } else {
            // Multicall succeeded but returned invalid data, fall through to individual calls
            throw new Error("Multicall returned invalid results");
          }
        } catch (multicallError) {
          // Multicall failed, fall back to individual contract calls
          console.warn(
            `Multicall failed for ${poolAddress}, falling back to individual calls:`,
            multicallError,
          );

          // Fetch tokens sequentially to avoid rate limiting issues
          const token0 = await client.readContract({
            address: poolAddr,
            abi: POOL_ABI,
            functionName: "token0",
            authorizationList: undefined,
          });

          const token1 = await client.readContract({
            address: poolAddr,
            abi: POOL_ABI,
            functionName: "token1",
            authorizationList: undefined,
          });

          // Validate that we got valid addresses
          if (!token0 || !token1) {
            throw new Error(
              `Contract ${poolAddress} returned invalid token addresses`,
            );
          }

          return {
            token0: (token0 as string).toLowerCase(),
            token1: (token1 as string).toLowerCase(),
          };
        }
      } catch (error) {
        // Store the error and try next RPC
        lastError = error as Error;
        console.warn(
          `Failed to fetch pool tokens from RPC ${rpcUrl}:`,
          error,
        );
        continue;
      }
    }

    // If all RPCs failed, throw the last error with more context
    throw new Error(
      `Failed to fetch pool tokens from all RPC endpoints for ${poolAddress} on chain ${network.chain_id}. Last error: ${lastError?.message || "Unknown error"}`,
    );
  } catch (error) {
    console.error("Error fetching pool tokens:", error);
    throw error;
  }
}
