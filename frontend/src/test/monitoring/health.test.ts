import { describe, it, expect } from 'vitest'
import healthJson from '../../../public/health.json'

// Static health.json is what BetterUptime pings at /health.json
// The Vite plugin overwrites dist/health.json at build time with live version + timestamp.
describe('public/health.json', () => {
  it('has status ok', () => {
    expect(healthJson.status).toBe('ok')
  })

  it('has a version field', () => {
    expect(typeof healthJson.version).toBe('string')
    expect(healthJson.version.length).toBeGreaterThan(0)
  })
})
