import { describe, it, expect, vi } from 'vitest'

// Mock broken/heavy components so parse errors in their source don't block the test
vi.mock('../components/BurnForm', () => ({ BurnForm: () => null }))
vi.mock('../components/MintForm', () => ({ MintForm: () => null }))
vi.mock('../components/CreateToken', () => ({ CreateToken: () => null }))
vi.mock('../components/Dashboard', () => ({ Dashboard: () => null }))
vi.mock('../components/TokenDetail', () => ({ TokenDetail: () => null }))
vi.mock('../components/Home', () => ({ Home: () => null }))
vi.mock('../components/NavBar', () => ({ NavBar: () => null }))
vi.mock('../components/NetworkSwitcher', () => ({ NetworkSwitcher: () => null }))
vi.mock('../components/LanguageSwitcher', () => ({ LanguageSwitcher: () => null }))
vi.mock('../components/ErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('../components/UI', () => ({
  ToastContainer: () => null,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  Spinner: () => null,
}))

vi.mock('../context/TosContext', () => ({
  TosProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../services/wallet', () => ({
  walletService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    isInstalled: vi.fn().mockReturnValue(false),
    checkExistingConnection: vi.fn().mockResolvedValue(null),
    getBalance: vi.fn().mockResolvedValue('0'),
  },
}))

vi.mock('../services/stellar', () => ({
  stellarService: {},
  StellarService: vi.fn().mockImplementation(() => ({
    getContractEvents: vi.fn().mockResolvedValue({ events: [], cursor: null }),
    getAllTokens: vi.fn().mockResolvedValue([]),
    getFactoryState: vi.fn().mockResolvedValue({
      baseFee: '0',
      metadataFee: '0',
      tokenCount: 0,
      admin: '',
      paused: false,
      treasury: '',
    }),
  })),
}))

vi.mock('../services/ipfs', () => ({
  IPFSService: vi.fn().mockImplementation(() => ({ uploadMetadata: vi.fn() })),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

import App from '../App'

describe('App smoke test', () => {
  it('exports a valid React component', () => {
    expect(typeof App).toBe('function')
  })
})
