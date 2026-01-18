import { createPublicClient, http, Address, defineChain } from "viem";
import { Network } from "@shared/types";

// ERC20 Token ABI (name, symbol)
const ERC20_ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Cache for token info to avoid repeated RPC calls
const tokenInfoCache = new Map<
  string,
  { name: string; symbol: string } | null
>();

/**
 * Fetch token name and symbol using RPC calls
 * Returns token name and symbol, or null if not found
 */
export async function fetchTokenInfo(
  tokenAddress: string,
  network: Network,
): Promise<{ name: string; symbol: string } | null> {
  try {
    if (
      !tokenAddress ||
      !tokenAddress.startsWith("0x") ||
      tokenAddress.length !== 42
    ) {
      return null;
    }

    // Check cache first
    const cacheKey = `${network.chain_id}-${tokenAddress.toLowerCase()}`;
    if (tokenInfoCache.has(cacheKey)) {
      return tokenInfoCache.get(cacheKey) || null;
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

    const tokenAddr = tokenAddress.toLowerCase() as Address;

    // Fetch token name and symbol
    const [name, symbol] = await Promise.all([
      client.readContract({
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: "name",
      } as any),
      client.readContract({
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: "symbol",
      } as any),
    ]);

    const info = {
      name: name as string,
      symbol: symbol as string,
    };

    // Cache the result
    tokenInfoCache.set(cacheKey, info);

    return info;
  } catch (error) {
    console.error("Error fetching token info:", error);
    // Cache null to avoid repeated failed calls
    const cacheKey = `${network.chain_id}-${tokenAddress.toLowerCase()}`;
    tokenInfoCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Fetch multiple token info using multicall for better performance
 * Returns a map of cacheKey -> tokenInfo
 */
export async function fetchTokenInfoBatch(
  tokens: Array<{ address: string; chainId: number }>,
  networks: Network[],
): Promise<Record<string, { name: string; symbol: string } | null>> {
  const result: Record<string, { name: string; symbol: string } | null> = {};

  // Group tokens by chain ID
  const tokensByChain = new Map<
    number,
    Array<{ address: string; index: number }>
  >();
  tokens.forEach((token, index) => {
    if (!tokensByChain.has(token.chainId)) {
      tokensByChain.set(token.chainId, []);
    }
    tokensByChain.get(token.chainId)!.push({ address: token.address, index });
  });

  // Fetch tokens for each chain using multicall
  const fetchPromises = Array.from(tokensByChain.entries()).map(
    async ([chainId, chainTokens]) => {
      const network = networks.find((n) => n.chain_id === chainId);
      if (!network) return;

      const rpcUrl = network.rpcs?.[0];
      if (!rpcUrl) return;

      // Get multicall address (use default if not set)
      const multicallAddress =
        (network.multicall_address as `0x${string}`) ||
        ("0xcA11bde05977b3631167028862bE2a173976CA11" as `0x${string}`);

      try {
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

        const client = createPublicClient({
          chain: customChain,
          transport: http(rpcUrl),
        });

        // Prepare multicall requests
        const calls = chainTokens.flatMap((token) => {
          const tokenAddr = token.address.toLowerCase() as Address;
          return [
            {
              address: tokenAddr,
              abi: ERC20_ABI,
              functionName: "name" as const,
            },
            {
              address: tokenAddr,
              abi: ERC20_ABI,
              functionName: "symbol" as const,
            },
          ];
        });

        // Execute multicall
        const results = await (client.multicall as any)({
          contracts: calls,
          multicallAddress,
        });

        // Process results
        for (let i = 0; i < chainTokens.length; i++) {
          const token = chainTokens[i];
          const nameResult = results[i * 2];
          const symbolResult = results[i * 2 + 1];

          const cacheKey = `${chainId}-${token.address.toLowerCase()}`;

          if (
            nameResult.status === "success" &&
            symbolResult.status === "success"
          ) {
            const info = {
              name: nameResult.result as string,
              symbol: symbolResult.result as string,
            };
            result[cacheKey] = info;
            // Update cache
            tokenInfoCache.set(cacheKey, info);
          } else {
            result[cacheKey] = null;
            tokenInfoCache.set(cacheKey, null);
          }
        }
      } catch (error) {
        console.error(
          `Error fetching token info batch for chain ${chainId}:`,
          error,
        );
        // Mark all tokens for this chain as failed
        chainTokens.forEach((token) => {
          const cacheKey = `${chainId}-${token.address.toLowerCase()}`;
          result[cacheKey] = null;
          tokenInfoCache.set(cacheKey, null);
        });
      }
    },
  );

  await Promise.all(fetchPromises);
  return result;
}

/**
 * Format token address with name/symbol in brackets
 */
export function formatTokenAddress(
  address: string,
  tokenInfo: { name: string; symbol: string } | null,
): string {
  if (!address) return "";
  if (tokenInfo) {
    return `${address} (${tokenInfo.symbol})`;
  }
  return address;
}
