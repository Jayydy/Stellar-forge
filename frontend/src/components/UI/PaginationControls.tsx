import React from 'react'

interface PaginationControlsProps {
  page: number
  totalPages: number
  totalCount: number
  pageSize: number
  onPrev: () => void
  onNext: () => void
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPrev,
  onNext,
}) => {
  const start = Math.min((page - 1) * pageSize + 1, totalCount)
  const end = Math.min(page * pageSize, totalCount)

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
      <span>
        {totalCount === 0
          ? 'No tokens found'
          : `Showing ${start}–${end} of ${totalCount} token${totalCount !== 1 ? 's' : ''}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          aria-label="Previous page"
          className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
        >
          Previous
        </button>
        <span className="px-2">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  )
}
