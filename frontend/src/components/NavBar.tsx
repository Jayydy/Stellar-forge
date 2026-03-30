import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

interface NavBarProps {
  onHelpClick?: () => void
  isAdmin?: boolean
}

export const NavBar: React.FC<NavBarProps> = ({ onHelpClick, isAdmin = false }) => {
  const { t } = useTranslation()

  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3 sm:px-4 py-2 sm:py-3 rounded-md text-xs sm:text-sm font-medium min-h-[44px] flex items-center justify-center dark:text-gray-300 ${
      isActive ? 'bg-blue-600 text-white dark:bg-blue-500' : 'text-gray-700 hover:bg-gray-200 dark:text-white dark:hover:bg-slate-700'
    }`

  return (
    <nav aria-label={t('nav.ariaLabel')} className="mt-3 sm:mt-4 mb-3 sm:mb-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-3 sm:p-4">
      <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start">
        <NavLink to="/" className={getLinkClass} end>
          {t('nav.home')}
        </NavLink>
        <NavLink to="/create" className={getLinkClass}>
          {t('nav.create')}
        </NavLink>
        <NavLink to="/mint" className={getLinkClass}>
          {t('nav.mint')}
        </NavLink>
        <NavLink to="/burn" className={getLinkClass}>
          {t('nav.burn')}
        </NavLink>
        <NavLink to="/tokens" className={getLinkClass}>
          {t('nav.tokens')}
        </NavLink>
        <NavLink to="/explorer" className={getLinkClass}>
          {t('nav.explorer', 'Explorer')}
        </NavLink>
        {isAdmin && (
          <NavLink
            to="/admin"
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
            onClick={onHelpClick}
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
