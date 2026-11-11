export const ENV = {
  LEGACY_AVAILABLE: import.meta.env.NEXT_PUBLIC_LEGACY_AVAILABLE !== "false",
  IS_TESTNET: ["8008", "1043", "106043"].includes(import.meta.env.NEXT_PUBLIC_METAMASK_CHAIN_ID),
  LEGACY_ONLY: import.meta.env.NEXT_PUBLIC_LEGACY_ONLY === "true",
  LEGACY_REHEARSAL: import.meta.env.NEXT_PUBLIC_LEGACY_REHEARSAL === "true",
  LEGACY_URL: import.meta.env.NEXT_PUBLIC_LEGACY_URL || "/legacy",
  CURRENT_URL: import.meta.env.NEXT_PUBLIC_CURRENT_URL || "/portfolio",
  NETWORK_LABEL: import.meta.env.NEXT_PUBLIC_NETWORK_LABEL || import.meta.env.NEXT_PUBLIC_CHAIN_NAME,
  REOWN_PROJECT_ID: import.meta.env.NEXT_PUBLIC_REOWN_PROJECT_ID,
  STAKING_API_URL: import.meta.env.NEXT_PUBLIC_STAKING_API_URL,
  ADMIN_WALLETS: import.meta.env.NEXT_PUBLIC_ADMIN_WALLETS,
  CHAIN: {
    NAME: import.meta.env.NEXT_PUBLIC_CHAIN_NAME,
    RPC_URL: import.meta.env.NEXT_PUBLIC_RPC_URL,
    ID: import.meta.env.NEXT_PUBLIC_METAMASK_CHAIN_ID,
    EXPECTED_GENESIS_HASH: (import.meta.env.NEXT_PUBLIC_EXPECTED_GENESIS_HASH || "") as `0x${string}`,
    CURRENCY_NAME: import.meta.env.NEXT_PUBLIC_CURRNCY_NAME,
    CURRENCY_SYMBOL: import.meta.env.NEXT_PUBLIC_CURRNCY_SYMBOL,
    BLOCK_EXPLORER_URL: import.meta.env.NEXT_PUBLIC_BLOCK_EXPLORE_URL,
    STAKING_CONTRACT_ADDRESS: import.meta.env
      .NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS as `0x${string}`,
    STAKING_V1_ADDRESS: (import.meta.env.NEXT_PUBLIC_STAKING_V1_ADDRESS ||
      import.meta.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS) as `0x${string}`,
    STAKING_V2_ADDRESS: (import.meta.env.NEXT_PUBLIC_STAKING_V2_ADDRESS ||
      import.meta.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS) as `0x${string}`,
    CREDENTIAL_ADDRESS: import.meta.env.NEXT_PUBLIC_CREDENTIAL_ADDRESS as
      `0x${string}` | undefined,
    MINING_CREDENTIAL_ADDRESS: (import.meta.env.NEXT_PUBLIC_MINING_CREDENTIAL_ADDRESS ||
      import.meta.env.NEXT_PUBLIC_CREDENTIAL_ADDRESS) as `0x${string}` | undefined,
    STAKING_CREDENTIAL_ADDRESS: (import.meta.env.NEXT_PUBLIC_STAKING_CREDENTIAL_ADDRESS ||
      import.meta.env.NEXT_PUBLIC_CREDENTIAL_ADDRESS) as `0x${string}` | undefined,
    READER_ADDRESS: import.meta.env.NEXT_PUBLIC_READER_ADDRESS as
      `0x${string}` | undefined,
    // Selected by the verified release manifest, never by a failed RPC probe.
    EPOCH_CLOCK_INTERFACE: import.meta.env.NEXT_PUBLIC_EPOCH_CLOCK_INTERFACE || "2",
    EPOCH_READER_CODE_HASH: import.meta.env.NEXT_PUBLIC_EPOCH_READER_CODE_HASH as `0x${string}` | undefined,
  },

  FOOTER: {
    X1_MINER_URL: import.meta.env
      .NEXT_PUBLIC_FOOTER_PRODUCT_BLOCKDAG_X1_MINER_URL,
    DAPPS_URL: import.meta.env.NEXT_PUBLIC_FOOTER_PRODUCT_BLOCKDAG_DAPPS_URL,
    IDE_URL: import.meta.env.NEXT_PUBLIC_FOOTER_PRODUCT_BLOCKDAG_IDE_URL,
    IDE_PRO_URL: import.meta.env
      .NEXT_PUBLIC_FOOTER_PRODUCT_BLOCKDAG_IDE_PRO_URL,
    TERMS_URL: import.meta.env.NEXT_PUBLIC_FOOTER_INFO_TERMS_OF_SERVICE_URL,
    PRIVACY_URL: import.meta.env.NEXT_PUBLIC_FOOTER_INFO_PRIVACY_POLICY_URL,
    GITHUB_URL: import.meta.env.NEXT_PUBLIC_FOOTER_RESOURCE_GITHUB_URL,
    SUPPORT_URL: import.meta.env.NEXT_PUBLIC_FOOTER_RESOURCE_SUPPORT_URL,
  },
} as const;

// V1 and V2 may point to the same retained proxy after upgrade. Keeping both
// explicit lets the indexer and UI describe the history boundary without
// implying a token migration to a replacement contract.
export const STAKING_CONTRACTS = [
  { version: "1", address: ENV.CHAIN.STAKING_V1_ADDRESS },
  { version: "2", address: ENV.CHAIN.STAKING_V2_ADDRESS },
] as const;
