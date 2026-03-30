import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IPFSService } from '../services/ipfs'
import { IPFSConfigError, IPFSUploadError } from '../services/ipfs-errors'

// Keep error classes stable across vi.resetModules() calls
vi.mock('../services/ipfs-errors', () => {
  class IPFSConfigError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'IPFSConfigError'
    }
  }
  class IPFSUploadError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'IPFSUploadError'
    }
  }
  return { IPFSConfigError, IPFSUploadError }
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(name = 'token.png', type = 'image/png', size = 1024): File {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

/** Minimal XHR mock that lets tests control status + responseText */
function mockXHR(status: number, responseText: string, triggerError = false) {
  const listeners: Record<string, EventListener> = {}
  const uploadListeners: Record<string, EventListener> = {}

  const xhrMock = {
    open: vi.fn(),
    send: vi.fn().mockImplementation(() => {
      // Simulate async completion
      Promise.resolve().then(() => {
        if (triggerError) {
          listeners['error']?.({} as Event)
        } else {
          // Fire upload progress then load
          uploadListeners['progress']?.({
            lengthComputable: true,
            loaded: 512,
            total: 1024,
          } as unknown as Event)
          listeners['load']?.({} as Event)
        }
      })
    }),
    setRequestHeader: vi.fn(),
    upload: {
      addEventListener: vi.fn((event: string, cb: EventListener) => {
        uploadListeners[event] = cb
      }),
    },
    addEventListener: vi.fn((event: string, cb: EventListener) => {
      listeners[event] = cb
    }),
    status,
    responseText,
  }

  vi.stubGlobal(
    'XMLHttpRequest',
    vi.fn().mockImplementation(function () {
      return xhrMock
    }),
  )
  return xhrMock
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('IPFSService', () => {
  let service: IPFSService

  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
    service = new IPFSService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── Config validation ──────────────────────────────────────────────────────

  describe('uploadMetadata — config validation', () => {
    it('throws IPFSConfigError when API key is missing', async () => {
      vi.stubEnv('VITE_IPFS_API_KEY', '')
      vi.stubEnv('VITE_IPFS_API_SECRET', '')
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()

      await expect(fresh.uploadMetadata(makeFile(), 'desc', 'Token')).rejects.toBeInstanceOf(
        IPFSConfigError,
      )
    })

    it('throws IPFSConfigError with a descriptive message', async () => {
      vi.stubEnv('VITE_IPFS_API_KEY', '')
      vi.stubEnv('VITE_IPFS_API_SECRET', '')
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()

      await expect(fresh.uploadMetadata(makeFile(), 'desc', 'Token')).rejects.toThrow(
        'VITE_IPFS_API_KEY',
      )
    })
  })

  // ── Image validation ───────────────────────────────────────────────────────

  describe('uploadMetadata — image validation', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_IPFS_API_KEY', 'test-key')
      vi.stubEnv('VITE_IPFS_API_SECRET', 'test-secret')
    })

    it('throws IPFSUploadError for unsupported file type', async () => {
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()
      const webp = makeFile('img.webp', 'image/webp')

      await expect(fresh.uploadMetadata(webp, 'desc', 'Token')).rejects.toBeInstanceOf(
        IPFSUploadError,
      )
    })

    it('throws IPFSUploadError for file exceeding 5MB', async () => {
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()
      const big = makeFile('big.png', 'image/png', 6 * 1024 * 1024)

      await expect(fresh.uploadMetadata(big, 'desc', 'Token')).rejects.toBeInstanceOf(
        IPFSUploadError,
      )
    })

    it('error message includes the file size when too large', async () => {
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()
      const big = makeFile('big.png', 'image/png', 6 * 1024 * 1024)

      await expect(fresh.uploadMetadata(big, 'desc', 'Token')).rejects.toThrow('5MB limit')
    })

    it('accepts JPEG files', async () => {
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()
      mockXHR(200, JSON.stringify({ IpfsHash: 'QmImageCID' }))
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ IpfsHash: 'QmMetaCID' }),
        }),
      )

      const result = await fresh.uploadMetadata(makeFile('img.jpg', 'image/jpeg'), 'desc', 'Token')
      expect(result).toBe('ipfs://QmMetaCID')
    })

    it('accepts GIF files', async () => {
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()
      mockXHR(200, JSON.stringify({ IpfsHash: 'QmImageCID' }))
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ IpfsHash: 'QmMetaCID' }),
        }),
      )

      const result = await fresh.uploadMetadata(makeFile('img.gif', 'image/gif'), 'desc', 'Token')
      expect(result).toBe('ipfs://QmMetaCID')
    })
  })

  // ── Successful upload flow ─────────────────────────────────────────────────

  describe('uploadMetadata — happy path', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_IPFS_API_KEY', 'test-key')
      vi.stubEnv('VITE_IPFS_API_SECRET', 'test-secret')
    })

    it('returns an ipfs:// URI on success', async () => {
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()
      mockXHR(200, JSON.stringify({ IpfsHash: 'QmImageCID123' }))
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ IpfsHash: 'QmMetaCID456' }),
        }),
      )

      const uri = await fresh.uploadMetadata(makeFile(), 'A token', 'MyToken')
      expect(uri).toBe('ipfs://QmMetaCID456')
    })

    it('calls onProgress from 0 to 100', async () => {
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()
      mockXHR(200, JSON.stringify({ IpfsHash: 'QmImg' }))
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ IpfsHash: 'QmMeta' }),
        }),
      )

      const progress: number[] = []
      await fresh.uploadMetadata(makeFile(), 'desc', 'Token', (p) => progress.push(p))

      expect(progress[0]).toBe(0)
      expect(progress[progress.length - 1]).toBe(100)
    })

    it('constructs metadata JSON with name, description, and image CID', async () => {
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()
      mockXHR(200, JSON.stringify({ IpfsHash: 'QmImg' }))

      let capturedBody: Record<string, unknown> = {}
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(async (_url: string, opts: RequestInit) => {
          capturedBody = JSON.parse(opts.body as string) as Record<string, unknown>
          return { ok: true, status: 200, json: async () => ({ IpfsHash: 'QmMeta' }) }
        }),
      )

      await fresh.uploadMetadata(makeFile(), 'My description', 'CoolToken')

      const content = capturedBody.pinataContent as Record<string, unknown>
      expect(content.name).toBe('CoolToken')
      expect(content.description).toBe('My description')
      expect(content.image).toBe('ipfs://QmImg')
    })
  })

  // ── Upload error handling ──────────────────────────────────────────────────

  describe('uploadMetadata — error handling', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_IPFS_API_KEY', 'test-key')
      vi.stubEnv('VITE_IPFS_API_SECRET', 'test-secret')
    })

    it('throws IPFSUploadError on XHR 401 (auth failure)', async () => {
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()
      mockXHR(401, 'Unauthorized')

      await expect(fresh.uploadMetadata(makeFile(), 'desc', 'Token')).rejects.toBeInstanceOf(
        IPFSUploadError,
      )
    })

    it('throws IPFSUploadError on XHR non-200 status', async () => {
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()
      mockXHR(500, 'Internal Server Error')

      await expect(fresh.uploadMetadata(makeFile(), 'desc', 'Token')).rejects.toBeInstanceOf(
        IPFSUploadError,
      )
    })

    it('throws IPFSUploadError on XHR network error', async () => {
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()
      mockXHR(0, '', true) // triggerError = true

      await expect(fresh.uploadMetadata(makeFile(), 'desc', 'Token')).rejects.toBeInstanceOf(
        IPFSUploadError,
      )
    })

    it('throws IPFSUploadError when Pinata returns malformed JSON for image', async () => {
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()
      mockXHR(200, 'not-json')

      await expect(fresh.uploadMetadata(makeFile(), 'desc', 'Token')).rejects.toBeInstanceOf(
        IPFSUploadError,
      )
    })

    it('throws IPFSUploadError when image response is missing IpfsHash', async () => {
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()
      mockXHR(200, JSON.stringify({ something: 'else' }))

      await expect(fresh.uploadMetadata(makeFile(), 'desc', 'Token')).rejects.toBeInstanceOf(
        IPFSUploadError,
      )
    })

    it('throws IPFSUploadError on fetch network error for JSON upload', async () => {
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()
      mockXHR(200, JSON.stringify({ IpfsHash: 'QmImg' }))
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

      await expect(fresh.uploadMetadata(makeFile(), 'desc', 'Token')).rejects.toBeInstanceOf(
        IPFSUploadError,
      )
    })

    it('throws IPFSUploadError on 401 from JSON upload', async () => {
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()
      mockXHR(200, JSON.stringify({ IpfsHash: 'QmImg' }))
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => ({}),
        }),
      )

      await expect(fresh.uploadMetadata(makeFile(), 'desc', 'Token')).rejects.toThrow(
        'authentication failed',
      )
    })

    it('throws IPFSUploadError on non-ok fetch response for JSON upload', async () => {
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()
      mockXHR(200, JSON.stringify({ IpfsHash: 'QmImg' }))
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          json: async () => ({}),
        }),
      )

      await expect(fresh.uploadMetadata(makeFile(), 'desc', 'Token')).rejects.toBeInstanceOf(
        IPFSUploadError,
      )
    })

    it('throws IPFSUploadError when JSON upload response is missing IpfsHash', async () => {
      vi.resetModules()
      const { IPFSService: Fresh } = await import('../services/ipfs')
      const fresh = new Fresh()
      mockXHR(200, JSON.stringify({ IpfsHash: 'QmImg' }))
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ noHash: true }),
        }),
      )

      await expect(fresh.uploadMetadata(makeFile(), 'desc', 'Token')).rejects.toBeInstanceOf(
        IPFSUploadError,
      )
    })
  })

  // ── getMetadata ────────────────────────────────────────────────────────────

  describe('getMetadata', () => {
    it('fetches and returns parsed metadata JSON', async () => {
      const meta = { name: 'MyToken', description: 'A token', image: 'ipfs://QmImg' }
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => meta,
        }),
      )

      const result = await service.getMetadata('ipfs://QmSomeCID')
      expect(result).toEqual(meta)
    })

    it('constructs the correct gateway URL from the CID', async () => {
      let calledUrl = ''
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(async (url: string) => {
          calledUrl = url
          return { ok: true, status: 200, json: async () => ({}) }
        }),
      )

      await service.getMetadata('ipfs://QmTestCID')
      expect(calledUrl).toContain('QmTestCID')
      expect(calledUrl).toContain('gateway.pinata.cloud')
    })

    it('throws IPFSUploadError for non-ipfs:// URI', async () => {
      await expect(service.getMetadata('https://example.com/meta.json')).rejects.toBeInstanceOf(
        IPFSUploadError,
      )
    })

    it('throws IPFSUploadError on network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

      await expect(service.getMetadata('ipfs://QmCID')).rejects.toBeInstanceOf(IPFSUploadError)
    })

    it('throws IPFSUploadError on non-ok HTTP response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          json: async () => ({}),
        }),
      )

      await expect(service.getMetadata('ipfs://QmCID')).rejects.toBeInstanceOf(IPFSUploadError)
    })

    it('throws IPFSUploadError when response is not valid JSON', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => {
            throw new SyntaxError('Unexpected token')
          },
        }),
      )

      await expect(service.getMetadata('ipfs://QmCID')).rejects.toBeInstanceOf(IPFSUploadError)
    })
  })

  // ── Error class identity ───────────────────────────────────────────────────

  describe('error classes', () => {
    it('IPFSConfigError has correct name', () => {
      const err = new IPFSConfigError('test')
      expect(err.name).toBe('IPFSConfigError')
      expect(err).toBeInstanceOf(Error)
    })

    it('IPFSUploadError has correct name', () => {
      const err = new IPFSUploadError('test')
      expect(err.name).toBe('IPFSUploadError')
      expect(err).toBeInstanceOf(Error)
    })
  })
})
