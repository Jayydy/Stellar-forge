// Environment variable validation

interface EnvVar {
  key: string
  value: string | undefined
  description: string
  required: boolean
}

const ENV_VARS: EnvVar[] = [
  {
    key: 'VITE_NETWORK',
    value: import.meta.env.VITE_NETWORK,
    description: 'Stellar network (testnet or mainnet)',
    required: false,
  },
  {
    key: 'VITE_FACTORY_CONTRACT_ID',
    value: import.meta.env.VITE_FACTORY_CONTRACT_ID,
    description: 'Soroban token-factory contract address',
    required: true,
  },
  {
    key: 'VITE_IPFS_API_KEY',
    value: import.meta.env.VITE_IPFS_API_KEY,
    description: 'Pinata IPFS API key',
    required: true,
  },
  {
    key: 'VITE_IPFS_API_SECRET',
    value: import.meta.env.VITE_IPFS_API_SECRET,
    description: 'Pinata IPFS API secret',
    required: true,
  },
] as const

export interface EnvValidationResult {
  valid: boolean
  missing: Array<{ key: string; description: string }>
}

export function validateEnv(): EnvValidationResult {
  const missing = ENV_VARS.filter((v) => v.required && (!v.value || v.value.trim() === '')).map(
    (v) => ({ key: v.key, description: v.description }),
  )

  return { valid: missing.length === 0, missing }
}

export function assertEnv(): void {
  const { valid, missing } = validateEnv()
  if (!valid) {
    const missingList = missing.map((m) => `  • ${m.key} — ${m.description}`).join('\n')
    throw new Error(
      `Missing required environment variables:\n\n${missingList}\n\nCopy frontend/.env.example to frontend/.env and fill in the values.`,
    )
  }
}
