import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocalStorage } from './useLocalStorage'

export function useLanguage() {
  const { i18n } = useTranslation()
  const [lang, setLang] = useLocalStorage<string>('language', i18n.language || 'en')

  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang)
    }
  }, [lang, i18n])

  return [lang, setLang] as const
}
