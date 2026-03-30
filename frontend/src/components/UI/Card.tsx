import React from 'react'

interface CardProps {
  title?: string
  /** Heading level for the card title. Defaults to 3. */
  headingLevel?: 2 | 3 | 4
  children: React.ReactNode
  className?: string
}

export const Card: React.FC<CardProps> = ({
  title,
  headingLevel = 3,
  children,
  className = '',
}) => {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4'

  return (
    <div className={`bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg ${className}`}>
      {title && (
        <div className="px-3 py-4 sm:px-4 sm:py-5 md:p-6 border-b border-gray-200 dark:border-gray-700">
          <Heading className="text-base sm:text-lg leading-6 font-medium text-gray-900 dark:text-white">
            {title}
          </Heading>
        </div>
      )}
      <div className="px-3 py-4 sm:px-4 sm:py-5 md:p-6">{children}</div>
    </div>
  )
}
