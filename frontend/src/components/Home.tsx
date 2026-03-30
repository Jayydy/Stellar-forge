import { Button } from './UI'
import { useTranslation } from 'react-i18next'

type HomeProps = {
  onGetStarted: () => void
}

export const Home: React.FC<HomeProps> = ({ onGetStarted }) => {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <div className="border-4 border-dashed border-gray-200 rounded-lg p-6 sm:p-8 text-center">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">
          {t('home.welcome')}
        </h2>
        <p className="text-gray-600 mb-6 sm:mb-8">{t('home.description')}</p>
        <Button onClick={onGetStarted} className="w-full sm:w-auto">
          {t('home.getStarted')}
        </Button>
      </div>
      <p className="text-sm text-gray-500">{t('home.navHint')}</p>
    </div>
  )
}
