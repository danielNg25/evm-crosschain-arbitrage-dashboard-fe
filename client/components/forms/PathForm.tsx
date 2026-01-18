import React, { useState, useEffect, useRef } from "react";
import {
  Path,
  SingleChainPathsWithAnchorToken,
  PoolPath,
  PoolDirection,
} from "@shared/types";
import {
  X,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useApi, useMutation } from "@/hooks/useApi";
import { networksApi } from "@/api/endpoints";
import { fetchPoolTokens } from "@/utils/poolTokens";
import { fetchTokenInfo } from "@/utils/tokenInfo";
import { NetworkForm } from "@/components/forms/NetworkForm";
import { Network } from "@shared/types";
import { showToast, getErrorMessage } from "@/utils/toast";
import { AxiosError } from "axios";
import { isAddress } from "viem";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PathFormProps {
  path?: Path;
  onSubmit: (
    data: Omit<Path, "id" | "created_at" | "updated_at">,
  ) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export const PathForm: React.FC<PathFormProps> = ({
  path,
  onSubmit,
  onClose,
  isLoading,
}) => {
  // Load networks to get RPC and multicall info
  const { data: networks, refetch: refetchNetworks } = useApi(
    () => networksApi.getAll(),
    true,
  );

  // State for showing NetworkForm modal
  const [showNetworkForm, setShowNetworkForm] = useState(false);
  const [networkFormChainIndex, setNetworkFormChainIndex] = useState<
    number | null
  >(null);

  // Mutation for creating network
  const createNetworkMutation = useMutation(
    (data: Omit<Network, "id" | "created_at" | "updated_at">) =>
      networksApi.create(data),
  );

  // Handler to open NetworkForm for a specific chain index
  const handleOpenNetworkForm = (chainIndex: number) => {
    setNetworkFormChainIndex(chainIndex);
    setShowNetworkForm(true);
  };

  // Handler to create network and auto-select it
  const handleCreateNetwork = async (
    data: Omit<Network, "id" | "created_at" | "updated_at">,
  ) => {
    try {
      await createNetworkMutation.mutate(data);
      await refetchNetworks();
      setShowNetworkForm(false);

      // Auto-select the newly created network
      if (networkFormChainIndex !== null) {
        handleChainIdChange(networkFormChainIndex, data.chain_id);
      }
      setNetworkFormChainIndex(null);
      showToast.success("Network created successfully");
    } catch (err) {
      console.error("Failed to create network:", err);
      const error = err as AxiosError;
      const message = getErrorMessage(error);
      showToast.error(`Failed to create network: ${message}`);
    }
  };

  const [formData, setFormData] = useState<
    Omit<Path, "id" | "created_at" | "updated_at">
  >({
    paths: path?.paths || [
      {
        chain_id: 0, // 0 means not selected - user must choose
        anchor_token: "",
        paths: [],
      },
    ],
    deleted_at: path?.deleted_at,
  });

  // Track loading state for each pool direction
  const [loadingPools, setLoadingPools] = useState<Record<string, boolean>>({});

  // Track validation errors for each direction
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Track chain-level errors (e.g., network not selected)
  const [chainErrors, setChainErrors] = useState<Record<number, string>>({});

  // Track address validation errors
  const [addressValidationErrors, setAddressValidationErrors] = useState<
    Record<string, string>
  >({});

  // Track token info (name, symbol) for each token address
  const [tokenInfoMap, setTokenInfoMap] = useState<
    Record<string, { name: string; symbol: string } | null>
  >({});

  // Track which tokens are currently being fetched to avoid duplicate requests
  const fetchingTokensRef = useRef<Set<string>>(new Set());

  // Ref to track current tokenInfoMap for use in useEffect
  const tokenInfoMapRef = useRef(tokenInfoMap);

  // Update ref whenever tokenInfoMap changes
  useEffect(() => {
    tokenInfoMapRef.current = tokenInfoMap;
  }, [tokenInfoMap]);

  // Ref to track current formData for use in validateTokenFlow
  const formDataRef = useRef(formData);

  // Update ref whenever formData changes
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const handleChainIdChange = (index: number, value: number) => {
    setFormData((prev) => ({
      ...prev,
      paths: prev.paths.map((p, i) =>
        i === index ? { ...p, chain_id: value } : p,
      ),
    }));

    // Clear chain error when network is selected
    if (value && value > 0) {
      setChainErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[index];
        return newErrors;
      });
    }
  };

  const handleAnchorTokenChange = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      paths: prev.paths.map((p, i) =>
        i === index ? { ...p, anchor_token: value } : p,
      ),
    }));

    // Validate address
    const errorKey = `anchor-${index}`;
    if (value.trim() === "") {
      setAddressValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    } else if (!isAddress(value.trim())) {
      setAddressValidationErrors((prev) => ({
        ...prev,
        [errorKey]: "Invalid Ethereum address format",
      }));
    } else {
      setAddressValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }

    // Clear chain error when anchor token is set (if it was the anchor token error)
    if (value && value.trim() !== "") {
      setChainErrors((prev) => {
        const error = prev[index];
        // Only clear if it's the anchor token error
        if (error && error.includes("anchor token")) {
          const newErrors = { ...prev };
          delete newErrors[index];
          return newErrors;
        }
        return prev;
      });
    }

    // Fetch token info for anchor token if valid address
    if (value && isAddress(value.trim())) {
      const chainId = formData.paths[index]?.chain_id;
      if (chainId) {
        const network = networks?.find((n) => n.chain_id === chainId);
        if (network) {
          const anchorTokenKey = `${chainId}-${value.toLowerCase()}`;
          // Check if already cached or being fetched
          if (
            !tokenInfoMapRef.current[anchorTokenKey] &&
            !fetchingTokensRef.current.has(anchorTokenKey)
          ) {
            fetchingTokensRef.current.add(anchorTokenKey);
            fetchTokenInfo(value, network)
              .then((info) => {
                if (info) {
                  setTokenInfoMap((prev) => ({
                    ...prev,
                    [anchorTokenKey]: info,
                  }));
                }
                fetchingTokensRef.current.delete(anchorTokenKey);
              })
              .catch((err) => {
                console.error("Failed to fetch anchor token info:", err);
                fetchingTokensRef.current.delete(anchorTokenKey);
              });
          }
        }
      }
    }

    // Validate first direction of all pool paths when anchor token changes
    setTimeout(() => {
      formData.paths[index]?.paths.forEach((poolPath, poolIndex) => {
        if (poolPath.length > 0) {
          validateTokenFlow(index, poolIndex, 0);
        }
      });
    }, 0);
  };

  const handleAddChainPath = () => {
    setFormData((prev) => ({
      ...prev,
      paths: [
        ...prev.paths,
        {
          chain_id: 0, // 0 means not selected - user must choose
          anchor_token: "",
          paths: [],
        },
      ],
    }));
  };

  const handleRemoveChainPath = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      paths: prev.paths.filter((_, i) => i !== index),
    }));
  };

  // Pool Path handlers
  const handleAddPoolPath = (chainIndex: number) => {
    const chainPath = formData.paths[chainIndex];

    // Check if network (chain_id) is selected
    if (!chainPath.chain_id || chainPath.chain_id === 0) {
      setChainErrors((prev) => ({
        ...prev,
        [chainIndex]:
          "Please select a network (Chain ID) first before adding a pool.",
      }));
      return;
    }

    // Check if anchor token is set
    if (!chainPath.anchor_token || chainPath.anchor_token.trim() === "") {
      setChainErrors((prev) => ({
        ...prev,
        [chainIndex]: "Please set an anchor token first before adding a pool.",
      }));
      return;
    }

    // Clear error if both network and anchor token are set
    setChainErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[chainIndex];
      return newErrors;
    });

    setFormData((prev) => ({
      ...prev,
      paths: prev.paths.map((p, i) =>
        i === chainIndex
          ? {
              ...p,
              paths: [
                ...p.paths,
                [{ pool: "", token_in: "", token_out: "" }], // Add one default direction
              ],
            }
          : p,
      ),
    }));
  };

  const handleRemovePoolPath = (chainIndex: number, poolIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      paths: prev.paths.map((p, i) =>
        i === chainIndex
          ? { ...p, paths: p.paths.filter((_, pi) => pi !== poolIndex) }
          : p,
      ),
    }));
  };

  // Pool Direction handlers
  const handleAddPoolDirection = (chainIndex: number, poolIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      paths: prev.paths.map((p, i) =>
        i === chainIndex
          ? {
              ...p,
              paths: p.paths.map((pp, pi) =>
                pi === poolIndex
                  ? [...pp, { pool: "", token_in: "", token_out: "" }]
                  : pp,
              ),
            }
          : p,
      ),
    }));
  };

  // Validate token flow consistency
  const validateTokenFlow = (
    chainIndex: number,
    poolIndex: number,
    directionIndex: number,
  ) => {
    // Use ref to get the latest formData to avoid stale closure issues
    const currentFormData = formDataRef.current;
    const chainPath = currentFormData.paths[chainIndex];
    if (!chainPath) return;

    const poolPath = chainPath.paths[poolIndex];
    if (!poolPath || !poolPath[directionIndex]) return;

    const direction = poolPath[directionIndex];
    const errorKey = `${chainIndex}-${poolIndex}-${directionIndex}`;
    let error = "";

    // Only validate if tokens are set
    if (!direction.token_in || !direction.token_out) {
      setValidationErrors((prev) => ({ ...prev, [errorKey]: "" }));
      return;
    }

    // Check if this is the first direction in the pool path
    if (directionIndex === 0) {
      // First direction: token_in should equal anchor_token
      const anchorToken = chainPath.anchor_token?.toLowerCase();
      const tokenIn = direction.token_in?.toLowerCase();

      if (anchorToken && tokenIn && anchorToken !== tokenIn) {
        error = `Token In must match Anchor Token (${chainPath.anchor_token})`;
      }
    } else {
      // Subsequent directions: token_in should equal previous direction's token_out
      const prevDirection = poolPath[directionIndex - 1];
      const prevTokenOut = prevDirection?.token_out?.toLowerCase();
      const currentTokenIn = direction.token_in?.toLowerCase();

      if (prevTokenOut && currentTokenIn && prevTokenOut !== currentTokenIn) {
        error = `Token In must match previous Token Out (${prevDirection.token_out})`;
      }
    }

    setValidationErrors((prev) => ({
      ...prev,
      [errorKey]: error,
    }));
  };

  // Auto-fetch pool tokens when pool address is entered (immediately)
  const handlePoolAddressChange = async (
    chainIndex: number,
    poolIndex: number,
    directionIndex: number,
    poolAddress: string,
  ) => {
    // Validate address
    const addressErrorKey = `pool-${chainIndex}-${poolIndex}-${directionIndex}`;
    if (poolAddress.trim() === "") {
      setAddressValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[addressErrorKey];
        return newErrors;
      });
    } else if (!isAddress(poolAddress.trim())) {
      setAddressValidationErrors((prev) => ({
        ...prev,
        [addressErrorKey]: "Invalid Ethereum address format",
      }));
      // Update pool address but don't fetch
      handlePoolDirectionChange(
        chainIndex,
        poolIndex,
        directionIndex,
        "pool",
        poolAddress,
      );
      return;
    } else {
      setAddressValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[addressErrorKey];
        return newErrors;
      });
    }

    // Update pool address immediately
    handlePoolDirectionChange(
      chainIndex,
      poolIndex,
      directionIndex,
      "pool",
      poolAddress,
    );

    // Clear validation error
    const errorKey = `${chainIndex}-${poolIndex}-${directionIndex}`;
    setValidationErrors((prev) => ({ ...prev, [errorKey]: "" }));

    // Validate pool address format (legacy check, but isAddress is more reliable)
    if (
      !poolAddress ||
      !poolAddress.startsWith("0x") ||
      poolAddress.length !== 42
    ) {
      // Clear tokens if address is invalid
      if (poolAddress.length < 42) {
        handlePoolDirectionChange(
          chainIndex,
          poolIndex,
          directionIndex,
          "token_in",
          "",
        );
        handlePoolDirectionChange(
          chainIndex,
          poolIndex,
          directionIndex,
          "token_out",
          "",
        );
      }
      return;
    }

    // Get chain ID for this chain path
    const chainId = formData.paths[chainIndex]?.chain_id;
    if (!chainId) return;

    // Find network for this chain ID
    const network = networks?.find((n) => n.chain_id === chainId);
    if (!network) {
      console.error(`Network not found for chain ID ${chainId}`);
      setValidationErrors((prev) => ({
        ...prev,
        [errorKey]: `Network not found for chain ID ${chainId}`,
      }));
      return;
    }

    // Create loading key
    setLoadingPools((prev) => ({ ...prev, [errorKey]: true }));

    try {
      // Fetch pool tokens using RPC
      const tokens = await fetchPoolTokens(poolAddress, network);

      if (tokens) {
        // Determine which token should be token_in and token_out
        // For first direction: token_in should be anchor_token
        // For subsequent: token_in should be previous token_out
        const chainPath = formData.paths[chainIndex];
        const poolPath = chainPath?.paths[poolIndex] || [];

        let tokenIn = tokens.token0;
        let tokenOut = tokens.token1;

        if (directionIndex === 0) {
          // First direction: check which token matches anchor_token
          const anchorToken = chainPath?.anchor_token?.toLowerCase();
          if (anchorToken) {
            if (tokens.token1.toLowerCase() === anchorToken) {
              tokenIn = tokens.token1;
              tokenOut = tokens.token0;
            } else if (tokens.token0.toLowerCase() !== anchorToken) {
              // Neither token matches - will show validation error
              tokenIn = tokens.token0;
              tokenOut = tokens.token1;
            }
          }
        } else {
          // Subsequent direction: check which token matches previous token_out
          const prevDirection = poolPath[directionIndex - 1];
          const prevTokenOut = prevDirection?.token_out?.toLowerCase();
          if (prevTokenOut) {
            if (tokens.token1.toLowerCase() === prevTokenOut) {
              tokenIn = tokens.token1;
              tokenOut = tokens.token0;
            } else if (tokens.token0.toLowerCase() !== prevTokenOut) {
              // Neither token matches - will show validation error
              tokenIn = tokens.token0;
              tokenOut = tokens.token1;
            }
          }
        }

        // Update token_in and token_out
        setFormData((prev) => ({
          ...prev,
          paths: prev.paths.map((p, i) =>
            i === chainIndex
              ? {
                  ...p,
                  paths: p.paths.map((pp, pi) =>
                    pi === poolIndex
                      ? pp.map((d, di) =>
                          di === directionIndex
                            ? {
                                ...d,
                                pool: poolAddress,
                                token_in: tokenIn,
                                token_out: tokenOut,
                              }
                            : d,
                        )
                      : pp,
                  ),
                }
              : p,
          ),
        }));

        // Fetch token info for both tokens immediately
        if (network) {
          const tokenInKey = `${chainId}-${tokenIn.toLowerCase()}`;
          const tokenOutKey = `${chainId}-${tokenOut.toLowerCase()}`;

          // Check if already cached or being fetched
          const shouldFetchIn =
            !tokenInfoMap[tokenInKey] &&
            !fetchingTokensRef.current.has(tokenInKey);
          const shouldFetchOut =
            !tokenInfoMap[tokenOutKey] &&
            !fetchingTokensRef.current.has(tokenOutKey);

          if (shouldFetchIn) {
            fetchingTokensRef.current.add(tokenInKey);
            fetchTokenInfo(tokenIn, network)
              .then((info) => {
                setTokenInfoMap((prev) => ({
                  ...prev,
                  [tokenInKey]: info,
                }));
                fetchingTokensRef.current.delete(tokenInKey);
              })
              .catch((err) => {
                console.error("Failed to fetch token info for tokenIn:", err);
                fetchingTokensRef.current.delete(tokenInKey);
              });
          }

          if (shouldFetchOut) {
            fetchingTokensRef.current.add(tokenOutKey);
            fetchTokenInfo(tokenOut, network)
              .then((info) => {
                setTokenInfoMap((prev) => ({
                  ...prev,
                  [tokenOutKey]: info,
                }));
                fetchingTokensRef.current.delete(tokenOutKey);
              })
              .catch((err) => {
                console.error("Failed to fetch token info for tokenOut:", err);
                fetchingTokensRef.current.delete(tokenOutKey);
              });
          }
        }

        // Validate after updating - use a small delay to ensure state is updated
        setTimeout(() => {
          validateTokenFlow(chainIndex, poolIndex, directionIndex);
          // Also validate next direction if it exists
          const currentFormData = formDataRef.current;
          const currentChainPath = currentFormData.paths[chainIndex];
          const currentPoolPath = currentChainPath?.paths[poolIndex] || [];
          if (currentPoolPath[directionIndex + 1]) {
            validateTokenFlow(chainIndex, poolIndex, directionIndex + 1);
          }
          // Also validate previous directions if this is not the first direction
          if (directionIndex > 0) {
            for (let i = 0; i < directionIndex; i++) {
              validateTokenFlow(chainIndex, poolIndex, i);
            }
          }
        }, 100);
      }
    } catch (error) {
      console.error("Failed to fetch pool tokens:", error);
      setValidationErrors((prev) => ({
        ...prev,
        [errorKey]:
          error instanceof Error
            ? error.message
            : "Failed to fetch pool tokens",
      }));
      // Clear tokens on error
      handlePoolDirectionChange(
        chainIndex,
        poolIndex,
        directionIndex,
        "token_in",
        "",
      );
      handlePoolDirectionChange(
        chainIndex,
        poolIndex,
        directionIndex,
        "token_out",
        "",
      );
    } finally {
      setLoadingPools((prev) => ({ ...prev, [errorKey]: false }));
    }
  };

  // Validate all directions when anchor token or any direction changes
  useEffect(() => {
    formData.paths.forEach((chainPath, chainIndex) => {
      chainPath.paths.forEach((poolPath, poolIndex) => {
        poolPath.forEach((_, directionIndex) => {
          validateTokenFlow(chainIndex, poolIndex, directionIndex);
        });
      });
    });

    // Reset verification state when form data changes
    setIsVerified(false);
  }, [formData.paths]);

  // Fetch token info for all tokens in formData whenever it changes
  useEffect(() => {
    if (!networks) return;

    formData.paths.forEach((chainPath) => {
      const network = networks.find((n) => n.chain_id === chainPath.chain_id);
      if (!network) return;

      // Fetch anchor token info
      if (
        chainPath.anchor_token &&
        chainPath.anchor_token.startsWith("0x") &&
        chainPath.anchor_token.length === 42
      ) {
        const anchorTokenKey = `${chainPath.chain_id}-${chainPath.anchor_token.toLowerCase()}`;
        // Check if already cached or being fetched (use ref for current value)
        if (
          !tokenInfoMapRef.current[anchorTokenKey] &&
          !fetchingTokensRef.current.has(anchorTokenKey)
        ) {
          fetchingTokensRef.current.add(anchorTokenKey);
          fetchTokenInfo(chainPath.anchor_token, network)
            .then((info) => {
              if (info) {
                setTokenInfoMap((prev) => ({
                  ...prev,
                  [anchorTokenKey]: info,
                }));
              }
              fetchingTokensRef.current.delete(anchorTokenKey);
            })
            .catch((err) => {
              console.error(
                `Failed to fetch anchor token info for ${chainPath.anchor_token}:`,
                err,
              );
              fetchingTokensRef.current.delete(anchorTokenKey);
            });
        }
      }

      chainPath.paths.forEach((poolPath) => {
        poolPath.forEach((direction) => {
          if (direction.token_in) {
            const tokenInKey = `${chainPath.chain_id}-${direction.token_in.toLowerCase()}`;
            // Check if already cached or being fetched (use ref for current value)
            if (
              !tokenInfoMapRef.current[tokenInKey] &&
              !fetchingTokensRef.current.has(tokenInKey)
            ) {
              fetchingTokensRef.current.add(tokenInKey);
              fetchTokenInfo(direction.token_in, network)
                .then((info) => {
                  if (info) {
                    setTokenInfoMap((prev) => ({
                      ...prev,
                      [tokenInKey]: info,
                    }));
                  }
                  fetchingTokensRef.current.delete(tokenInKey);
                })
                .catch((err) => {
                  console.error(
                    `Failed to fetch token info for ${direction.token_in}:`,
                    err,
                  );
                  fetchingTokensRef.current.delete(tokenInKey);
                });
            }
          }
          if (direction.token_out) {
            const tokenOutKey = `${chainPath.chain_id}-${direction.token_out.toLowerCase()}`;
            // Check if already cached or being fetched (use ref for current value)
            if (
              !tokenInfoMapRef.current[tokenOutKey] &&
              !fetchingTokensRef.current.has(tokenOutKey)
            ) {
              fetchingTokensRef.current.add(tokenOutKey);
              fetchTokenInfo(direction.token_out, network)
                .then((info) => {
                  if (info) {
                    setTokenInfoMap((prev) => ({
                      ...prev,
                      [tokenOutKey]: info,
                    }));
                  }
                  fetchingTokensRef.current.delete(tokenOutKey);
                })
                .catch((err) => {
                  console.error(
                    `Failed to fetch token info for ${direction.token_out}:`,
                    err,
                  );
                  fetchingTokensRef.current.delete(tokenOutKey);
                });
            }
          }
        });
      });
    });
    // Note: tokenInfoMap is intentionally not in deps to avoid infinite loops
    // We check it inside the effect to see current state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.paths, networks]);

  const handleRemovePoolDirection = (
    chainIndex: number,
    poolIndex: number,
    directionIndex: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      paths: prev.paths.map((p, i) =>
        i === chainIndex
          ? {
              ...p,
              paths: p.paths.map((pp, pi) =>
                pi === poolIndex
                  ? pp.filter((_, di) => di !== directionIndex)
                  : pp,
              ),
            }
          : p,
      ),
    }));
  };

  const handlePoolDirectionChange = (
    chainIndex: number,
    poolIndex: number,
    directionIndex: number,
    field: keyof PoolDirection,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      paths: prev.paths.map((p, i) =>
        i === chainIndex
          ? {
              ...p,
              paths: p.paths.map((pp, pi) =>
                pi === poolIndex
                  ? pp.map((d, di) =>
                      di === directionIndex ? { ...d, [field]: value } : d,
                    )
                  : pp,
              ),
            }
          : p,
      ),
    }));
  };

  // Track verifying state for each chain path
  const [verifyingChainPath, setVerifyingChainPath] = useState<number | null>(
    null,
  );

  // Track if all tokens have been verified
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Track verification errors
  const [verificationErrors, setVerificationErrors] = useState<
    Record<string, string>
  >({});

  // Verify button handler - manually fetch all token info for a chain path
  const handleVerifyChainPath = async (chainIndex: number) => {
    console.log("Verify button clicked for chain path:", chainIndex);
    const chainPath = formData.paths[chainIndex];
    if (!chainPath) {
      console.error("Chain path not found at index:", chainIndex);
      return;
    }

    const network = networks?.find((n) => n.chain_id === chainPath.chain_id);
    if (!network) {
      console.error(`Network not found for chain ID ${chainPath.chain_id}`);
      alert(
        `Network not found for chain ID ${chainPath.chain_id}. Please make sure the network is configured.`,
      );
      return;
    }

    // Clear previous errors for this chain before starting verification
    setVerificationErrors((prev) => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith(`chain-${chainIndex}-`)) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });

    setVerifyingChainPath(chainIndex);
    const promises: Promise<void>[] = [];

    // Fetch anchor token info
    if (
      chainPath.anchor_token &&
      chainPath.anchor_token.startsWith("0x") &&
      chainPath.anchor_token.length === 42
    ) {
      const anchorTokenKey = `${chainPath.chain_id}-${chainPath.anchor_token.toLowerCase()}`;
      console.log("Fetching anchor token info:", chainPath.anchor_token);
      // Force fetch even if already cached (user clicked verify)
      fetchingTokensRef.current.delete(anchorTokenKey); // Remove from fetching set if present
      fetchingTokensRef.current.add(anchorTokenKey);
      promises.push(
        fetchTokenInfo(chainPath.anchor_token, network)
          .then((info) => {
            console.log("Anchor token info fetched:", info);
            if (info) {
              setTokenInfoMap((prev) => ({
                ...prev,
                [anchorTokenKey]: info,
              }));
            }
            fetchingTokensRef.current.delete(anchorTokenKey);
          })
          .catch((err) => {
            console.error("Failed to fetch anchor token info:", err);
            const errorMessage =
              err instanceof Error
                ? err.message
                : "Failed to fetch anchor token info";
            setVerificationErrors((prev) => ({
              ...prev,
              [`chain-${chainIndex}-anchor`]: `Anchor token ${chainPath.anchor_token}: ${errorMessage}`,
            }));
            fetchingTokensRef.current.delete(anchorTokenKey);
          }),
      );
    } else {
      console.log("Anchor token not valid:", chainPath.anchor_token);
    }

    // Fetch all pool token info and pool tokens if needed
    chainPath.paths.forEach((poolPath, poolIndex) => {
      poolPath.forEach((direction, dirIndex) => {
        // If pool address exists but tokens haven't been fetched yet, fetch them
        if (
          direction.pool &&
          direction.pool.startsWith("0x") &&
          direction.pool.length === 42 &&
          (!direction.token_in || !direction.token_out)
        ) {
          console.log(
            `Fetching pool tokens for pool ${poolIndex}, direction ${dirIndex}:`,
            direction.pool,
          );
          const poolKey = `${chainIndex}-${poolIndex}-${dirIndex}`;
          setLoadingPools((prev) => ({ ...prev, [poolKey]: true }));

          promises.push(
            fetchPoolTokens(direction.pool, network)
              .then((tokens) => {
                if (!tokens) {
                  throw new Error(
                    "Failed to fetch pool tokens - no tokens returned",
                  );
                }
                if (tokens) {
                  // Determine which token should be token_in and token_out
                  let tokenIn = tokens.token0;
                  let tokenOut = tokens.token1;

                  if (dirIndex === 0) {
                    // First direction: check which token matches anchor_token
                    const anchorToken = chainPath?.anchor_token?.toLowerCase();
                    if (anchorToken) {
                      if (tokens.token1.toLowerCase() === anchorToken) {
                        tokenIn = tokens.token1;
                        tokenOut = tokens.token0;
                      } else if (tokens.token0.toLowerCase() !== anchorToken) {
                        tokenIn = tokens.token0;
                        tokenOut = tokens.token1;
                      }
                    }
                  } else {
                    // Subsequent direction: check which token matches previous token_out
                    const prevDirection = poolPath[dirIndex - 1];
                    const prevTokenOut =
                      prevDirection?.token_out?.toLowerCase();
                    if (prevTokenOut) {
                      if (tokens.token1.toLowerCase() === prevTokenOut) {
                        tokenIn = tokens.token1;
                        tokenOut = tokens.token0;
                      } else if (tokens.token0.toLowerCase() !== prevTokenOut) {
                        tokenIn = tokens.token0;
                        tokenOut = tokens.token1;
                      }
                    }
                  }

                  // Update token_in and token_out using functional update to ensure latest state
                  setFormData((prev) => {
                    const updated = {
                      ...prev,
                      paths: prev.paths.map((p, i) =>
                        i === chainIndex
                          ? {
                              ...p,
                              paths: p.paths.map((pp, pi) =>
                                pi === poolIndex
                                  ? pp.map((d, di) =>
                                      di === dirIndex
                                        ? {
                                            ...d,
                                            pool: direction.pool,
                                            token_in: tokenIn,
                                            token_out: tokenOut,
                                          }
                                        : d,
                                    )
                                  : pp,
                              ),
                            }
                          : p,
                      ),
                    };
                    console.log("Updated formData with tokens:", {
                      chainIndex,
                      poolIndex,
                      dirIndex,
                      tokenIn,
                      tokenOut,
                    });
                    return updated;
                  });

                  // Also fetch token info for the tokens (add to promises to await)
                  const tokenInKey = `${chainPath.chain_id}-${tokenIn.toLowerCase()}`;
                  const tokenOutKey = `${chainPath.chain_id}-${tokenOut.toLowerCase()}`;

                  if (!fetchingTokensRef.current.has(tokenInKey)) {
                    fetchingTokensRef.current.add(tokenInKey);
                    promises.push(
                      fetchTokenInfo(tokenIn, network)
                        .then((info) => {
                          if (info) {
                            setTokenInfoMap((prev) => ({
                              ...prev,
                              [tokenInKey]: info,
                            }));
                          }
                          fetchingTokensRef.current.delete(tokenInKey);
                        })
                        .catch((err) => {
                          console.error("Failed to fetch token_in info:", err);
                          const errorMessage =
                            err instanceof Error
                              ? err.message
                              : "Failed to fetch token info";
                          setVerificationErrors((prev) => ({
                            ...prev,
                            [`chain-${chainIndex}-pool-${poolIndex}-dir-${dirIndex}-tokenIn`]: `Token In: ${errorMessage}`,
                          }));
                          fetchingTokensRef.current.delete(tokenInKey);
                        }),
                    );
                  }

                  if (!fetchingTokensRef.current.has(tokenOutKey)) {
                    fetchingTokensRef.current.add(tokenOutKey);
                    promises.push(
                      fetchTokenInfo(tokenOut, network)
                        .then((info) => {
                          if (info) {
                            setTokenInfoMap((prev) => ({
                              ...prev,
                              [tokenOutKey]: info,
                            }));
                          }
                          fetchingTokensRef.current.delete(tokenOutKey);
                        })
                        .catch((err) => {
                          console.error("Failed to fetch token_out info:", err);
                          const errorMessage =
                            err instanceof Error
                              ? err.message
                              : "Failed to fetch token info";
                          setVerificationErrors((prev) => ({
                            ...prev,
                            [`chain-${chainIndex}-pool-${poolIndex}-dir-${dirIndex}-tokenOut`]: `Token Out: ${errorMessage}`,
                          }));
                          fetchingTokensRef.current.delete(tokenOutKey);
                        }),
                    );
                  }
                }
                setLoadingPools((prev) => ({ ...prev, [poolKey]: false }));
              })
              .catch((err) => {
                console.error("Failed to fetch pool tokens:", err);
                let errorMessage = "Failed to fetch pool tokens";
                if (err instanceof Error) {
                  errorMessage = err.message;
                  // Make error messages more user-friendly
                  if (
                    errorMessage.includes("execution reverted") ||
                    errorMessage.includes("revert")
                  ) {
                    errorMessage = `Check the pool address and chain id`;
                  } else if (
                    errorMessage.includes("network") ||
                    errorMessage.includes("RPC")
                  ) {
                    errorMessage = `RPC error: ${errorMessage}`;
                  } else {
                    errorMessage = `Pool fetch error: ${errorMessage}`;
                  }
                }
                setVerificationErrors((prev) => ({
                  ...prev,
                  [`chain-${chainIndex}-pool-${poolIndex}-dir-${dirIndex}`]: `Pool ${direction.pool}: ${errorMessage}`,
                }));
                setLoadingPools((prev) => ({ ...prev, [poolKey]: false }));
              }),
          );
        }

        // Fetch token info for existing tokens
        if (direction.token_in) {
          const tokenInKey = `${chainPath.chain_id}-${direction.token_in.toLowerCase()}`;
          console.log(
            `Fetching token_in info for pool ${poolIndex}, direction ${dirIndex}:`,
            direction.token_in,
          );
          // Force fetch even if already cached
          fetchingTokensRef.current.delete(tokenInKey);
          fetchingTokensRef.current.add(tokenInKey);
          promises.push(
            fetchTokenInfo(direction.token_in, network)
              .then((info) => {
                console.log("Token_in info fetched:", info);
                if (info) {
                  setTokenInfoMap((prev) => ({
                    ...prev,
                    [tokenInKey]: info,
                  }));
                }
                fetchingTokensRef.current.delete(tokenInKey);
              })
              .catch((err) => {
                console.error("Failed to fetch token_in info:", err);
                const errorMessage =
                  err instanceof Error
                    ? err.message
                    : "Failed to fetch token info";
                setVerificationErrors((prev) => ({
                  ...prev,
                  [`chain-${chainIndex}-pool-${poolIndex}-dir-${dirIndex}-tokenIn`]: `Token In ${direction.token_in}: ${errorMessage}`,
                }));
                fetchingTokensRef.current.delete(tokenInKey);
              }),
          );
        }
        if (direction.token_out) {
          const tokenOutKey = `${chainPath.chain_id}-${direction.token_out.toLowerCase()}`;
          console.log(
            `Fetching token_out info for pool ${poolIndex}, direction ${dirIndex}:`,
            direction.token_out,
          );
          // Force fetch even if already cached
          fetchingTokensRef.current.delete(tokenOutKey);
          fetchingTokensRef.current.add(tokenOutKey);
          promises.push(
            fetchTokenInfo(direction.token_out, network)
              .then((info) => {
                console.log("Token_out info fetched:", info);
                if (info) {
                  setTokenInfoMap((prev) => ({
                    ...prev,
                    [tokenOutKey]: info,
                  }));
                }
                fetchingTokensRef.current.delete(tokenOutKey);
              })
              .catch((err) => {
                console.error("Failed to fetch token_out info:", err);
                const errorMessage =
                  err instanceof Error
                    ? err.message
                    : "Failed to fetch token info";
                setVerificationErrors((prev) => ({
                  ...prev,
                  [`chain-${chainIndex}-pool-${poolIndex}-dir-${dirIndex}-tokenOut`]: `Token Out ${direction.token_out}: ${errorMessage}`,
                }));
                fetchingTokensRef.current.delete(tokenOutKey);
              }),
          );
        }
      });
    });

    console.log(
      `Starting to fetch ${promises.length} requests (pool tokens + token info)`,
    );
    try {
      const results = await Promise.allSettled(promises);
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        console.warn(`${failed.length} requests failed:`, failed);
      }
      console.log("All requests completed");

      // Wait a bit for React state updates to propagate
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Force a re-check of formData to ensure tokens are set
      console.log(
        "Verification complete. Current formData:",
        formData.paths[chainIndex],
      );
    } catch (err) {
      console.error("Error during verification:", err);
      setVerificationErrors((prev) => ({
        ...prev,
        [`chain-${chainIndex}-general`]:
          err instanceof Error
            ? err.message
            : "Unknown error during verification",
      }));
    } finally {
      setVerifyingChainPath(null);
    }
  };

  // Verify all chain paths before saving
  const handleVerifyAll = async () => {
    setIsVerifying(true);
    setIsVerified(false);

    try {
      const allPromises: Promise<void>[] = [];

      // Verify all chain paths
      for (let i = 0; i < formData.paths.length; i++) {
        allPromises.push(handleVerifyChainPath(i));
      }

      await Promise.all(allPromises);

      // Wait a bit for state updates to propagate
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if all required tokens have info (use current state)
      let allTokensHaveInfo = true;
      const missingTokens: string[] = [];

      formData.paths.forEach((chainPath) => {
        // Check anchor token
        if (
          chainPath.anchor_token &&
          chainPath.anchor_token.startsWith("0x") &&
          chainPath.anchor_token.length === 42
        ) {
          const anchorKey = `${chainPath.chain_id}-${chainPath.anchor_token.toLowerCase()}`;
          if (!tokenInfoMapRef.current[anchorKey]) {
            allTokensHaveInfo = false;
            missingTokens.push(`Anchor token: ${chainPath.anchor_token}`);
          }
        }

        // Check all pool tokens
        chainPath.paths.forEach((poolPath, poolIndex) => {
          poolPath.forEach((direction, dirIndex) => {
            if (direction.token_in) {
              const tokenInKey = `${chainPath.chain_id}-${direction.token_in.toLowerCase()}`;
              if (!tokenInfoMapRef.current[tokenInKey]) {
                allTokensHaveInfo = false;
                missingTokens.push(
                  `Pool ${poolIndex + 1}, Direction ${dirIndex + 1} - Token In: ${direction.token_in}`,
                );
              }
            }
            if (direction.token_out) {
              const tokenOutKey = `${chainPath.chain_id}-${direction.token_out.toLowerCase()}`;
              if (!tokenInfoMapRef.current[tokenOutKey]) {
                allTokensHaveInfo = false;
                missingTokens.push(
                  `Pool ${poolIndex + 1}, Direction ${dirIndex + 1} - Token Out: ${direction.token_out}`,
                );
              }
            }
          });
        });
      });

      if (allTokensHaveInfo) {
        setIsVerified(true);
        console.log("All tokens verified successfully!");
      } else {
        console.error("Missing token info:", missingTokens);
        alert(
          `Some tokens could not be verified:\n${missingTokens.slice(0, 5).join("\n")}${missingTokens.length > 5 ? "\n..." : ""}\n\nPlease check your addresses and network configuration.`,
        );
      }
    } catch (error) {
      console.error("Error during verification:", error);
      alert("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous chain errors and address validation errors
    setChainErrors({});
    const addressErrors: Record<string, string> = {};

    // Validate all addresses
    formData.paths.forEach((chainPath, chainIndex) => {
      // Validate anchor token
      if (chainPath.anchor_token && chainPath.anchor_token.trim() !== "") {
        if (!isAddress(chainPath.anchor_token.trim())) {
          addressErrors[`anchor-${chainIndex}`] =
            "Invalid Ethereum address format";
        }
      }

      // Validate pool addresses and token addresses
      chainPath.paths.forEach((poolPath, poolIndex) => {
        poolPath.forEach((direction, dirIndex) => {
          // Validate pool address
          if (direction.pool && direction.pool.trim() !== "") {
            if (!isAddress(direction.pool.trim())) {
              addressErrors[`pool-${chainIndex}-${poolIndex}-${dirIndex}`] =
                "Invalid Ethereum address format";
            }
          }

          // Validate token_in
          if (direction.token_in && direction.token_in.trim() !== "") {
            if (!isAddress(direction.token_in.trim())) {
              addressErrors[`token_in-${chainIndex}-${poolIndex}-${dirIndex}`] =
                "Invalid Ethereum address format";
            }
          }

          // Validate token_out
          if (direction.token_out && direction.token_out.trim() !== "") {
            if (!isAddress(direction.token_out.trim())) {
              addressErrors[
                `token_out-${chainIndex}-${poolIndex}-${dirIndex}`
              ] = "Invalid Ethereum address format";
            }
          }
        });
      });
    });

    if (Object.keys(addressErrors).length > 0) {
      setAddressValidationErrors(addressErrors);
      return;
    }

    // Validate that no chain path has chain_id = 0
    const newChainErrors: Record<number, string> = {};
    formData.paths.forEach((path, index) => {
      if (!path.chain_id || path.chain_id === 0) {
        newChainErrors[index] =
          "Please select a network (Chain ID) before saving.";
      }
    });

    // Validate that no chain path has 0 pools
    formData.paths.forEach((path, index) => {
      if (!path.paths || path.paths.length === 0) {
        newChainErrors[index] =
          (newChainErrors[index] ? newChainErrors[index] + " " : "") +
          "Please add at least one pool before saving.";
      }
    });

    if (Object.keys(newChainErrors).length > 0) {
      setChainErrors(newChainErrors);
      return;
    }

    // If not verified yet, verify first
    if (!isVerified) {
      await handleVerifyAll();
      // After verification, if successful, the button will change to "Save Path"
      // User needs to click again to actually save
      return;
    }

    // If verified, proceed with saving
    await onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 bg-white">
          <h2 className="text-xl font-bold text-slate-900">
            {path ? "Edit Path" : "Create Path"}
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
          {/* Paths */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Chain Paths
              </h3>
              <button
                type="button"
                onClick={handleAddChainPath}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                + Add Chain
              </button>
            </div>

            {formData.paths.map((chainPath, index) => (
              <div
                key={index}
                className="p-4 border border-slate-200 rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      Chain Path #{index + 1}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        console.log("Verify button clicked, index:", index);
                        handleVerifyChainPath(index);
                      }}
                      disabled={verifyingChainPath === index}
                      className="text-xs px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Verify and fetch token info"
                    >
                      <RefreshCw
                        size={12}
                        className={
                          verifyingChainPath === index ? "animate-spin" : ""
                        }
                      />
                      {verifyingChainPath === index ? "Verifying..." : "Verify"}
                    </button>
                    {formData.paths.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChainPath(index)}
                        className="text-xs px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Show verification errors for this chain */}
                {Object.keys(verificationErrors).some((key) =>
                  key.startsWith(`chain-${index}-`),
                ) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle
                        size={16}
                        className="text-red-600 mt-0.5 flex-shrink-0"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-900 mb-1">
                          Verification Errors:
                        </p>
                        <ul className="space-y-1 text-xs text-red-800">
                          {Object.entries(verificationErrors)
                            .filter(([key]) =>
                              key.startsWith(`chain-${index}-`),
                            )
                            .map(([key, error]) => (
                              <li key={key} className="font-mono break-all">
                                {error}
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Chain ID
                    </label>
                    <Select
                      value={
                        chainPath.chain_id && chainPath.chain_id > 0
                          ? chainPath.chain_id.toString()
                          : undefined
                      }
                      onValueChange={(value) => {
                        if (value === "__add_network__") {
                          handleOpenNetworkForm(index);
                        } else {
                          handleChainIdChange(index, Number(value));
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a chain" />
                      </SelectTrigger>
                      <SelectContent>
                        {networks?.map((network) => (
                          <SelectItem
                            key={network.chain_id}
                            value={network.chain_id.toString()}
                          >
                            {network.name} ({network.chain_id})
                          </SelectItem>
                        ))}
                        <SelectItem
                          value="__add_network__"
                          className="text-blue-600 font-medium"
                        >
                          <div className="flex items-center gap-2">
                            <Plus size={14} />
                            Add New Network
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Anchor Token
                      {chainPath.anchor_token &&
                        tokenInfoMap[
                          `${chainPath.chain_id}-${chainPath.anchor_token.toLowerCase()}`
                        ] && (
                          <span className="text-slate-500 ml-2 font-normal">
                            (
                            {
                              tokenInfoMap[
                                `${chainPath.chain_id}-${chainPath.anchor_token.toLowerCase()}`
                              ]?.symbol
                            }
                            )
                          </span>
                        )}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={chainPath.anchor_token || ""}
                        onChange={(e) => {
                          // Extract just the address part (remove symbol if present)
                          const addressOnly = e.target.value.split(" (")[0];
                          handleAnchorTokenChange(index, addressOnly);
                        }}
                        placeholder="0x..."
                        className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono ${
                          addressValidationErrors[`anchor-${index}`]
                            ? "border-red-300 bg-red-50"
                            : "border-slate-300"
                        }`}
                        required
                      />
                      {addressValidationErrors[`anchor-${index}`] && (
                        <div className="mt-1 flex items-start gap-2 text-xs text-red-600">
                          <AlertCircle
                            size={14}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <span>
                            {addressValidationErrors[`anchor-${index}`]}
                          </span>
                        </div>
                      )}
                      {chainPath.anchor_token &&
                        tokenInfoMap[
                          `${chainPath.chain_id}-${chainPath.anchor_token.toLowerCase()}`
                        ] && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <CheckCircle2
                              size={16}
                              className="text-green-600"
                            />
                          </div>
                        )}
                    </div>
                  </div>
                </div>

                {/* Pool Paths */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-700">
                      Pools
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddPoolPath(index)}
                      className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add Pool
                    </button>
                  </div>

                  {/* Show chain-level error (e.g., network not selected) */}
                  {chainErrors[index] && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-2">
                      <AlertCircle
                        size={14}
                        className="text-amber-600 mt-0.5 flex-shrink-0"
                      />
                      <p className="text-xs text-amber-800">
                        {chainErrors[index]}
                      </p>
                    </div>
                  )}

                  {chainPath.paths.length === 0 ? (
                    <div className="bg-slate-50 p-4 rounded border border-slate-200 text-center text-sm text-slate-500">
                      No pool paths configured. Click "Add Pool" to add one.
                    </div>
                  ) : (
                    chainPath.paths.map((poolPath, poolIndex) => (
                      <div
                        key={poolIndex}
                        className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-900">
                            Pool #{poolIndex + 1}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemovePoolPath(index, poolIndex)
                            }
                            className="text-xs px-3 py-1 text-red-600 hover:bg-red-50 rounded flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        </div>

                        {/* Pool Directions */}
                        <div className="space-y-2">
                          {poolPath.map((direction, dirIndex) => (
                            <div
                              key={dirIndex}
                              className="bg-white p-3 rounded border border-slate-200"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-slate-600">
                                  Hop #{dirIndex + 1}
                                </p>
                                {poolPath.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemovePoolDirection(
                                        index,
                                        poolIndex,
                                        dirIndex,
                                      )
                                    }
                                    className="text-xs text-red-600 hover:text-red-700"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Pool Address Field */}
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Pool Address
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={direction.pool}
                                      onChange={(e) =>
                                        handlePoolAddressChange(
                                          index,
                                          poolIndex,
                                          dirIndex,
                                          e.target.value,
                                        )
                                      }
                                      placeholder="0x..."
                                      className={`w-full px-2 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent font-mono pr-8 ${
                                        validationErrors[
                                          `${index}-${poolIndex}-${dirIndex}`
                                        ] ||
                                        addressValidationErrors[
                                          `pool-${index}-${poolIndex}-${dirIndex}`
                                        ]
                                          ? "border-red-300 bg-red-50"
                                          : "border-slate-300"
                                      }`}
                                    />
                                    {addressValidationErrors[
                                      `pool-${index}-${poolIndex}-${dirIndex}`
                                    ] && (
                                      <div className="mt-1 flex items-start gap-1 text-xs text-red-600">
                                        <AlertCircle
                                          size={12}
                                          className="mt-0.5 flex-shrink-0"
                                        />
                                        <span>
                                          {
                                            addressValidationErrors[
                                              `pool-${index}-${poolIndex}-${dirIndex}`
                                            ]
                                          }
                                        </span>
                                      </div>
                                    )}
                                    {loadingPools[
                                      `${index}-${poolIndex}-${dirIndex}`
                                    ] && (
                                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        <Loader2
                                          size={14}
                                          className="animate-spin text-blue-600"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Token In Field - Only show after pool address is entered */}
                                {direction.pool &&
                                  direction.pool.startsWith("0x") &&
                                  direction.pool.length === 42 && (
                                    <div>
                                      <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Token In
                                        {(() => {
                                          // Only show symbol if token address is valid AND token info has been fetched
                                          const isValidAddress =
                                            direction.token_in &&
                                            direction.token_in.startsWith(
                                              "0x",
                                            ) &&
                                            direction.token_in.length === 42;
                                          if (!isValidAddress) return null;

                                          const chainId =
                                            formData.paths[index]?.chain_id;
                                          const tokenKey = chainId
                                            ? `${chainId}-${direction.token_in?.toLowerCase()}`
                                            : null;
                                          const tokenInfo = tokenKey
                                            ? tokenInfoMap[tokenKey]
                                            : null;
                                          return tokenInfo ? (
                                            <span className="text-slate-500 ml-1 font-normal">
                                              ({tokenInfo.symbol})
                                            </span>
                                          ) : null;
                                        })()}
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={direction.token_in || ""}
                                          readOnly
                                          placeholder="Will be fetched automatically..."
                                          className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent font-mono bg-slate-50 text-slate-700"
                                        />
                                        {direction.token_in && (
                                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                            <CheckCircle2
                                              size={14}
                                              className="text-green-600"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                {/* Token Out Field - Only show after pool address is entered */}
                                {direction.pool &&
                                  direction.pool.startsWith("0x") &&
                                  direction.pool.length === 42 && (
                                    <div>
                                      <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Token Out
                                        {(() => {
                                          // Only show symbol if token address is valid AND token info has been fetched
                                          const isValidAddress =
                                            direction.token_out &&
                                            direction.token_out.startsWith(
                                              "0x",
                                            ) &&
                                            direction.token_out.length === 42;
                                          if (!isValidAddress) return null;

                                          const chainId =
                                            formData.paths[index]?.chain_id;
                                          const tokenKey = chainId
                                            ? `${chainId}-${direction.token_out?.toLowerCase()}`
                                            : null;
                                          const tokenInfo = tokenKey
                                            ? tokenInfoMap[tokenKey]
                                            : null;
                                          return tokenInfo ? (
                                            <span className="text-slate-500 ml-1 font-normal">
                                              ({tokenInfo.symbol})
                                            </span>
                                          ) : null;
                                        })()}
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={direction.token_out || ""}
                                          readOnly
                                          placeholder="Will be fetched automatically..."
                                          className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent font-mono bg-slate-50 text-slate-700"
                                        />
                                        {direction.token_out && (
                                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                            <CheckCircle2
                                              size={14}
                                              className="text-green-600"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>

                              {/* Show validation error/warning */}
                              {validationErrors[
                                `${index}-${poolIndex}-${dirIndex}`
                              ] && (
                                <div className="bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-2">
                                  <AlertCircle
                                    size={14}
                                    className="text-amber-600 mt-0.5 flex-shrink-0"
                                  />
                                  <p className="text-xs text-amber-800">
                                    {
                                      validationErrors[
                                        `${index}-${poolIndex}-${dirIndex}`
                                      ]
                                    }
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() =>
                              handleAddPoolDirection(index, poolIndex)
                            }
                            className="w-full text-xs px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200 flex items-center justify-center gap-1"
                          >
                            <Plus size={14} />
                            Add Multi Hop
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
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
              disabled={isLoading || isVerifying}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Verifying...
                </>
              ) : isVerified ? (
                isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Path"
                )
              ) : (
                <>
                  <RefreshCw size={16} />
                  Verify
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* NetworkForm Modal */}
      {showNetworkForm && (
        <NetworkForm
          onSubmit={handleCreateNetwork}
          onClose={() => {
            setShowNetworkForm(false);
            setNetworkFormChainIndex(null);
          }}
          isLoading={createNetworkMutation.loading}
        />
      )}
    </div>
  );
};
