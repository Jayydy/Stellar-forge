import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

interface NavBarProps {
  onHelpClick?: () => void
  isAdmin?: boolean
}

export const NavBar: React.FC<NavBarProps> = ({ onHelpClick, isAdmin = false }) => {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)

  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3 sm:px-4 py-2 sm:py-3 rounded-md text-xs sm:text-sm font-medium min-h-[44px] flex items-center justify-center dark:text-gray-300 ${
      isActive ? 'bg-blue-600 text-white dark:bg-blue-500' : 'text-gray-700 hover:bg-gray-200 dark:text-white dark:hover:bg-slate-700'
    }`

  const closeMenu = () => setMenuOpen(false)

  return (
    <nav aria-label={t('nav.ariaLabel')} className="mt-3 sm:mt-4 mb-3 sm:mb-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 sm:p-4">
      {/* Mobile: hamburger toggle */}
      <div className="flex items-center justify-between sm:hidden">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Navigation</span>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="nav-links"
          className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Links: hidden on mobile unless open, always shown on sm+ */}
      <div
        id="nav-links"
        className={`${menuOpen ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center sm:justify-start mt-2 sm:mt-0`}
      >
        <NavLink to="/" className={getLinkClass} end onClick={closeMenu}>
          {t('nav.home')}
        </NavLink>
        <NavLink to="/create" className={getLinkClass} onClick={closeMenu}>
          {t('nav.create')}
        </NavLink>
        <NavLink to="/mint" className={getLinkClass} onClick={closeMenu}>
          {t('nav.mint')}
        </NavLink>
        <NavLink to="/burn" className={getLinkClass} onClick={closeMenu}>
          {t('nav.burn')}
        </NavLink>
        <NavLink to="/metadata" className={getLinkClass} onClick={closeMenu}>
          {t('nav.metadata', 'Metadata')}
        </NavLink>
        <NavLink to="/tokens" className={getLinkClass} onClick={closeMenu}>
          {t('nav.tokens')}
        </NavLink>
        <NavLink to="/dashboard" className={getLinkClass}>
          {t('nav.dashboard', 'Dashboard')}
        </NavLink>
        <NavLink to="/manage" className={getLinkClass}>
          {t('nav.manage', 'Manage')}
        </NavLink>
        <NavLink to="/explorer" className={getLinkClass}>
          {t('nav.explorer', 'Explorer')}
        </NavLink>
        {isAdmin && (
          <NavLink
            to="/admin"
            onClick={closeMenu}
            className={({ isActive }) =>
              `block px-3 sm:px-4 py-2 sm:py-3 rounded-md text-xs sm:text-sm font-medium min-h-[44px] flex items-center justify-center ${
                isActive
                  ? 'bg-amber-600 text-white dark:bg-amber-500'
                  : 'text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-slate-700'
              }`
            }
          >
            {t('nav.admin')}
          </NavLink>
        )}
        {onHelpClick && (
          <button
            onClick={() => { onHelpClick(); closeMenu() }}
            className="px-3 py-2 rounded-md text-xs sm:text-sm font-medium text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-slate-700 sm:ml-auto min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open tutorial"
          >
            ? <span className="hidden sm:inline ml-1">{t('nav.help')}</span>
          </button>
        )}
      </div>
    </nav>
  )
}
