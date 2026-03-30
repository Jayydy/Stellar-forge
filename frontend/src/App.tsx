import React, { useEffect } from 'react'
import { ToastContainer, Button, Spinner } from './components/UI'
import './App.css'
import { useTranslation } from 'react-i18next'
import { useDarkMode } from './hooks/useDarkMode'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { trackEvent, trackPageView } from './services/analytics'
import { AnalyticsOptOut } from './components/AnalyticsOptOut'
import { WalletProvider } from './context/WalletContext'
import { ToastProvider, useToast } from './context/ToastContext'
import { NetworkProvider } from './context/NetworkContext'
import { StellarProvider } from './context/StellarContext'
import { NetworkSwitcher } from './components/NetworkSwitcher'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { FundbotButton } from './components/FundbotButton'
import { useWallet } from './hooks/useWallet'
import { truncateAddress, formatXLM } from './utils/formatting'
import { NavBar } from './components/NavBar'
import { Home } from './components/Home'
import { CreateToken } from './components/CreateToken'
import { MintForm } from './components/MintForm'
import { BurnForm } from './components/BurnForm'
import { Dashboard } from './components/Dashboard'
import { TokenDetail } from './components/TokenDetail'
import { TokenExplorer } from './components/TokenExplorer'
import { FAQ } from './components/FAQ'
import { AdminPanel } from './components/AdminPanel'
import { useFactoryState } from './hooks/useFactoryState'
import { isFactoryConfigured } from './config/env'
import ErrorBoundary from './components/ErrorBoundary'
import { TosProvider } from './context/TosContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { useState } from 'react'

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { wallet } = useWallet()
  if (!wallet.isConnected) return <Navigate to="/" replace />
  return children
}

function AppContent() {
  const { wallet, connect, disconnect, isConnecting, error, isInstalled } = useWallet()
  const { addToast } = useToast()
  const { t } = useTranslation()
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const { state: factoryState } = useFactoryState()
  const location = useLocation()

  const isAdmin = !!wallet.address && !!factoryState?.admin && wallet.address === factoryState.admin

  const { theme, toggleTheme } = useTheme()

  // Track page views on route changes
  useEffect(() => {
    trackPageView(location.pathname)
  }, [location.pathname])

  const handleGetStarted = () => addToast(t('home.welcomeToast'), 'info')

  const handleConnect = async () => {
    try {
      await connect()
      if (!error) {
        addToast(t('wallet.connected'), 'success')
        trackEvent('wallet_connected')
      }
    } catch {
      addToast(t('wallet.connectFailed'), 'error')
    }
  }

  const handleDisconnect = () => {
    disconnect()
    addToast(t('wallet.disconnected'), 'info')
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
      >
        {t('app.skipToMain')}
      </a>

<div className="min-h-screen bg-gray-100 dark:bg-slate-900">
  <header className="bg-white/80 shadow-lg backdrop-blur-sm dark:bg-slate-800/95 dark:shadow-slate-900/50 dark:border-b dark:border-slate-700" role="banner">
          <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">{t('app.title')}</h1>
                  <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">{t('app.subtitle')}</p>
                </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <button
                  onClick={toggleTheme}
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                >
                  {theme === 'dark' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  )}
                </button>
                <div className="hidden sm:block">
                  <LanguageSwitcher />
                </div>
                <div className="hidden sm:block">
                  <NetworkSwitcher />
                </div>

                {wallet.isConnected ? (
                  <>
                    <div className="hidden sm:block">
                      <FundbotButton />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="hidden md:block text-right">
                        <div
                          className="text-sm font-medium text-gray-900 dark:text-gray-100"
                          title={wallet.address ?? undefined}
                        >
                          {wallet.address && truncateAddress(wallet.address)}
                        </div>
                      </div>
                      <Button onClick={handleDisconnect} variant="secondary" size="sm" className="shrink-0">
                        <span className="hidden sm:inline">{t('wallet.disconnect')}</span>
                        <span className="sm:hidden">Disconnect</span>
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button onClick={handleConnect} disabled={isConnecting} size="sm" className="shrink-0">
                    {isConnecting ? (
                      <span className="flex items-center gap-2">
                        <Spinner size="sm" />
                        <span className="hidden sm:inline">{t('wallet.connecting')}</span>
                      </span>
                    ) : (
                      <span className="hidden sm:inline">{t('wallet.connect')}</span>
                    )}
                    {!isConnecting && <span className="sm:hidden">Connect</span>}
                  </Button>
                )}
              </div>
              </div>

              {/* Mobile-only info row */}
              <div className="flex flex-col gap-2 sm:hidden">
                {wallet.isConnected && wallet.address && (
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span className="truncate flex-1 mr-2" title={wallet.address}>
                      {truncateAddress(wallet.address)}
                    </span>
                    {wallet.balance && <span className="shrink-0">{formatXLM(wallet.balance)}</span>}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <LanguageSwitcher />
                  <NetworkSwitcher />
                  {wallet.isConnected && <FundbotButton />}
                  {!isInstalled && (
                    <a
                      href="https://www.freighter.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 underline min-h-[44px] flex items-center"
                    >
                      {t('wallet.installFreighter')}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <NavBar onHelpClick={() => setShowOnboarding(true)} isAdmin={isAdmin} />
          </div>
        </header>
        {showOnboarding && null /* OnboardingModal placeholder */}

        {!isFactoryConfigured() && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-300 dark:border-yellow-700 p-4" role="alert">
            <div className="max-w-7xl mx-auto text-yellow-800 dark:text-yellow-300 text-sm font-medium">
              ⚠️ Factory contract not configured. Please set{' '}
              <code className="font-mono bg-yellow-100 dark:bg-yellow-900 px-1 rounded">VITE_FACTORY_CONTRACT_ID</code>{' '}
              in your <code className="font-mono bg-yellow-100 dark:bg-yellow-900 px-1 rounded">.env</code> file.
            </div>
          </div>
        )}

        <div id="main-content" className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
            {error && (
              <div
                className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-300 px-3 sm:px-4 py-3 rounded-lg text-sm"
                role="alert"
              >
                <p className="font-medium">{t('errors.title')}</p>
                <p className="text-xs sm:text-sm mt-1">{error}</p>
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm">
              <Routes>
                <Route
                  path="/"
                  element={
                    <ErrorBoundary>
                      <Home onGetStarted={handleGetStarted} />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/create"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <CreateToken />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mint"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <MintForm />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/burn"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <BurnForm />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tokens"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <Dashboard />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tokens/:address"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <TokenDetail />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/explorer"
                  element={
                    <ErrorBoundary>
                      <TokenExplorer />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <AdminPanel />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
        </div>

          <ToastContainer />
        </div>
      </>
    )
  }

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <NetworkProvider>
            <StellarProvider>
              <WalletProvider>
                <ToastProvider>
                  <TosProvider>
                    <AppContent />
                  </TosProvider>
                </ToastProvider>
              </WalletProvider>
            </StellarProvider>
          </NetworkProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
