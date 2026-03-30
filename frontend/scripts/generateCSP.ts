/**
 * Build-time script: generates the CSP string from src/csp/policy.ts and
 * writes it into vercel.json and public/_headers.
 *
 * Usage:
 *   npx tsx scripts/generateCSP.ts          # write mode (run via prebuild)
 *   npx tsx scripts/generateCSP.ts --check  # validate only, exit 1 on drift (CI)
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { CSP_DIRECTIVES, buildCSPString } from '../src/csp/policy.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const CHECK_ONLY = process.argv.includes('--check')

const CSP = buildCSPString(CSP_DIRECTIVES)

// ── vercel.json ───────────────────────────────────────────────────────────────

const vercelPath = resolve(root, 'vercel.json')
const vercel = JSON.parse(readFileSync(vercelPath, 'utf-8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[]
}

const vercelHeader = vercel.headers[0]?.headers.find((h) => h.key === 'Content-Security-Policy')

if (!vercelHeader) {
  console.error('generateCSP: Content-Security-Policy header not found in vercel.json')
  process.exit(1)
}

if (vercelHeader.value !== CSP) {
  if (CHECK_ONLY) {
    console.error('generateCSP: vercel.json CSP is out of sync with policy.ts')
    console.error('  expected:', CSP)
    console.error('  found:   ', vercelHeader.value)
    process.exit(1)
  }
  vercelHeader.value = CSP
  writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + '\n')
  console.log('generateCSP: updated vercel.json')
} else {
  console.log('generateCSP: vercel.json is up to date')
}
// ── public/_headers ───────────────────────────────────────────────────────────

const headersPath = resolve(root, 'public/_headers')
const headersContent = readFileSync(headersPath, 'utf-8')

const cspLineRegex = /^(\s*Content-Security-Policy:\s*)(.+)$/m
const match = headersContent.match(cspLineRegex)

if (!match) {
  console.error('generateCSP: Content-Security-Policy line not found in public/_headers')
  process.exit(1)
}

const existingCSP = match[2]?.trim() ?? ''

if (existingCSP !== CSP) {
  if (CHECK_ONLY) {
    console.error('generateCSP: public/_headers CSP is out of sync with policy.ts')
    console.error('  expected:', CSP)
    console.error('  found:   ', existingCSP)
    process.exit(1)
  }
  const updated = headersContent.replace(cspLineRegex, `$1${CSP}`)
  writeFileSync(headersPath, updated)
  console.log('generateCSP: updated public/_headers')
} else {
  console.log('generateCSP: public/_headers is up to date')
}
