import React from 'react'

interface SkeletonProps {
  className?: string
  count?: number
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className} ${i > 0 ? 'mt-2' : ''}`}
          aria-hidden="true"
        />
      ))}
    </>
  )
}

export const SkeletonCard: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm space-y-4">
    <Skeleton className="h-6 w-1/3" />
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  </div>
)

export const SkeletonTokenCard: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-1/4" />
    </div>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-2/3" />
  </div>
)
