import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NetworkSwitcher } from './NetworkSwitcher'

const mockSwitchNetwork = vi.fn()
let mockNetwork = 'testnet'

vi.mock('../context/NetworkContext', () => ({
  useNetwork: () => ({
    network: mockNetwork,
    switchNetwork: mockSwitchNetwork,
    rpcUrl: '',
    horizonUrl: '',
    networkPassphrase: '',
    mismatch: { hasMismatch: false },
  }),
}))

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      const map: Record<string, string> = {
        'networkSwitcher.ariaLabel': `Active network: ${opts?.network ?? ''}`,
        'networkSwitcher.selectNetwork': 'Select network',
        'networkSwitcher.testnet': 'Testnet',
        'networkSwitcher.mainnet': 'Mainnet',
        'networkSwitcher.switchToMainnet': 'Switch to Mainnet?',
        'networkSwitcher.switchWarning': 'You are switching to mainnet. Real funds will be used.',
        'networkSwitcher.confirm': 'Switch to Mainnet',
        'networkSwitcher.cancel': 'Cancel',
      }
      return map[key] ?? key
    },
  }),
}))

describe('NetworkSwitcher confirmation modal', () => {
  beforeEach(() => {
    mockNetwork = 'testnet'
    mockSwitchNetwork.mockReset()
  })

  const openDropdown = () =>
    fireEvent.click(screen.getByRole('button', { name: /active network/i }))

  // Clicks the <button> inside the list item whose accessible name matches `name`
  const clickOption = (name: RegExp) => {
    const listbox = screen.getByRole('listbox')
    fireEvent.click(within(listbox).getByRole('button', { name }))
  }

  it('selecting mainnet opens the confirmation modal', () => {
    render(<NetworkSwitcher />)
    openDropdown()
    clickOption(/mainnet/i)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(mockSwitchNetwork).not.toHaveBeenCalled()
  })

  it('clicking Cancel closes the modal without switching the network', () => {
    render(<NetworkSwitcher />)
    openDropdown()
    clickOption(/mainnet/i)
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockSwitchNetwork).not.toHaveBeenCalled()
  })

  it('clicking confirm switches the network and closes the modal', () => {
    render(<NetworkSwitcher />)
    openDropdown()
    clickOption(/mainnet/i)
    // The confirm button text is "Switch to Mainnet" — matches exactly
    fireEvent.click(screen.getByRole('button', { name: /^switch to mainnet$/i }))
    expect(mockSwitchNetwork).toHaveBeenCalledWith('mainnet')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('selecting testnet switches immediately with no modal', () => {
    mockNetwork = 'mainnet'
    render(<NetworkSwitcher />)
    openDropdown()
    clickOption(/^testnet$/i)
    expect(mockSwitchNetwork).toHaveBeenCalledWith('testnet')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
