import { Button } from './UI'
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNetwork, type Network } from '../context/NetworkContext'

const BADGE_COLORS: Record<Network, string> = {
  testnet: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  mainnet: 'bg-green-100 text-green-800 border-green-300',
}

export const NetworkSwitcher: React.FC = () => {
  const { t } = useTranslation()
  const { network, switchNetwork } = useNetwork()
  const [open, setOpen] = useState(false)
  const [pendingNetwork, setPendingNetwork] = useState<Network | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (pendingNetwork === 'mainnet') {
      confirmBtnRef.current?.focus()
    }
  }, [pendingNetwork])

  const handleSelect = (n: Network) => {
    setOpen(false)
    if (n === network) return
    if (n === 'mainnet') setPendingNetwork(n)
    else switchNetwork(n)
  }

  const confirmSwitch = () => {
    if (pendingNetwork) switchNetwork(pendingNetwork)
    setPendingNetwork(null)
  }

  const networkLabel = (n: Network) => t(`networkSwitcher.${n}`)

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t('networkSwitcher.ariaLabel', { network: networkLabel(network) })}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer select-none transition-colors ${BADGE_COLORS[network]}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${network === 'mainnet' ? 'bg-green-500' : 'bg-yellow-500'}`}
            aria-hidden="true"
          />
          {network === 'testnet' && <span className="inline-block">🧪</span>}
          {networkLabel(network)}
          <svg
            className="h-3 w-3 opacity-60"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {open && (
          <ul
            role="listbox"
            aria-label={t('networkSwitcher.selectNetwork')}
            className="absolute right-0 mt-1 w-36 rounded-md border border-gray-200 bg-white shadow-lg z-50 py-1"
          >
            {(['testnet', 'mainnet'] as Network[]).map((n) => (
              <li key={n} role="option" aria-selected={n === network} className="px-1">
                <button
                  type="button"
                  onClick={() => handleSelect(n)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-gray-50 ${n === network ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${n === 'mainnet' ? 'bg-green-500' : 'bg-yellow-500'}`}
                    aria-hidden="true"
                  />
                  {networkLabel(n)}
                  {n === network && (
                    <svg
                      className="ml-auto h-4 w-4 text-blue-600"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pendingNetwork === 'mainnet' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mainnet-warning-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 rounded-full bg-red-100 p-2" aria-hidden="true">
                <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <div>
                <h2 id="mainnet-warning-title" className="text-sm font-semibold text-gray-900">
                  {t('networkSwitcher.switchToMainnet')}
                </h2>
                <p className="mt-1 text-sm text-gray-600">{t('networkSwitcher.switchWarning')}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setPendingNetwork(null)}>
                {t('networkSwitcher.cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                ref={confirmBtnRef}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                onClick={confirmSwitch}
              >
                {t('networkSwitcher.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
