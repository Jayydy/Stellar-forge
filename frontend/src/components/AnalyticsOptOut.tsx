import { useAnalytics } from '../hooks/useAnalytics'

/**
 * A small toggle that lets users opt out of analytics tracking.
 * Renders nothing when analytics is not configured.
 */
export const AnalyticsOptOut: React.FC = () => {
  const { optedOut, toggleOptOut } = useAnalytics()

  if (!import.meta.env.VITE_PLAUSIBLE_DOMAIN) return null

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={optedOut}
          onChange={toggleOptOut}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          aria-label="Opt out of analytics"
        />
        Opt out of analytics
      </label>
    </div>
  )
}
