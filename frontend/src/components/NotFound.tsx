import { Link } from 'react-router-dom'
import { Button } from './UI/Button'

export const NotFound: React.FC = () => {
  return (
    <div className="text-center py-20 space-y-4">
      <div className="text-6xl font-bold text-gray-300 dark:text-gray-600">404</div>
      <h1 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">Page Not Found</h1>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/">
        <Button variant="primary" size="sm">
          Back to Home
        </Button>
      </Link>
    </div>
  )
}
