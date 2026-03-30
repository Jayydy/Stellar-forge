import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
]

export const LanguageSwitcher: React.FC = () => {
  const { t } = useTranslation()
  const [lang, setLang] = useLanguage()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLang(e.target.value)
  }

  return (
    <label className="flex items-center gap-1.5 text-sm text-gray-600">
      <span className="sr-only">{t('language.label')}</span>
      <select
        value={lang}
        onChange={handleChange}
        aria-label={t('language.label')}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {LANGUAGES.map(({ code, label }) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}
