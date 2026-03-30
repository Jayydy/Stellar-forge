import { describe, it, expect, vi, beforeEach } from 'vitest'

// Helper to re-import env module with specific env vars
async function loadEnv(vars: Record<string, string>) {
  vi.stubEnv('VITE_FACTORY_CONTRACT_ID', vars.VITE_FACTORY_CONTRACT_ID ?? '')
  vi.stubEnv('VITE_IPFS_API_KEY', vars.VITE_IPFS_API_KEY ?? '')
  vi.stubEnv('VITE_IPFS_API_SECRET', vars.VITE_IPFS_API_SECRET ?? '')
  // Force re-evaluation by resetting module registry
  vi.resetModules()
  return import('../config/env')
}

describe('env config', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('isFactoryConfigured returns false when VITE_FACTORY_CONTRACT_ID is empty', async () => {
    const { isFactoryConfigured } = await loadEnv({ VITE_FACTORY_CONTRACT_ID: '' })
    expect(isFactoryConfigured()).toBe(false)
  })

  it('isFactoryConfigured returns true when VITE_FACTORY_CONTRACT_ID is set', async () => {
    const { isFactoryConfigured } = await loadEnv({ VITE_FACTORY_CONTRACT_ID: 'CABC123' })
    expect(isFactoryConfigured()).toBe(true)
  })

  it('isIpfsConfigured returns false when both keys are empty', async () => {
    const { isIpfsConfigured } = await loadEnv({})
    expect(isIpfsConfigured()).toBe(false)
  })

  it('isIpfsConfigured returns false when only one key is set', async () => {
    const { isIpfsConfigured } = await loadEnv({ VITE_IPFS_API_KEY: 'key' })
    expect(isIpfsConfigured()).toBe(false)
  })

  it('isIpfsConfigured returns true when both keys are set', async () => {
    const { isIpfsConfigured } = await loadEnv({
      VITE_IPFS_API_KEY: 'key',
      VITE_IPFS_API_SECRET: 'secret',
    })
    expect(isIpfsConfigured()).toBe(true)
  })
})
