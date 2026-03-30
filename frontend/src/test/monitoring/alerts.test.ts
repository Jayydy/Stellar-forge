import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCaptureException = vi.fn()
const mockSetTag = vi.fn()

vi.mock('../../lib/monitoring/sentry', () => ({
  captureException: mockCaptureException,
  setTag: mockSetTag,
}))

import {
  captureHorizonFailure,
  captureIPFSFailure,
  captureContractFailure,
} from '../../lib/monitoring/alerts'

describe('alerts.ts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('captureHorizonFailure sets correct tag and context', () => {
    captureHorizonFailure('/accounts/X', 503, 1200)
    expect(mockSetTag).toHaveBeenCalledWith('category', 'horizon_api')
    expect(mockCaptureException).toHaveBeenCalledOnce()
    const ctx = mockCaptureException.mock.calls[0]?.[1] as Record<string, unknown>
    expect(ctx).toMatchObject({ endpoint: '/accounts/X', status: 503, responseTime: 1200 })
  })

  it('captureIPFSFailure sets correct tag and context', () => {
    const err = new Error('upload failed')
    captureIPFSFailure('upload', 'Qm123', err)
    expect(mockSetTag).toHaveBeenCalledWith('category', 'ipfs')
    expect(mockCaptureException).toHaveBeenCalledWith(err, { operation: 'upload', cid: 'Qm123' })
  })

  it('captureContractFailure sets correct tag and context', () => {
    const err = new Error('revert')
    captureContractFailure('deployToken', err, '0xabc')
    expect(mockSetTag).toHaveBeenCalledWith('category', 'contract')
    expect(mockCaptureException).toHaveBeenCalledWith(err, { method: 'deployToken', txHash: '0xabc' })
  })
})
