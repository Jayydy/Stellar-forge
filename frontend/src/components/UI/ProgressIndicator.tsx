import React from 'react'

export interface ProgressStep {
  label: string
  status: 'pending' | 'in-progress' | 'completed' | 'error'
}

interface ProgressIndicatorProps {
  steps: ProgressStep[]
  currentStep?: number
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ steps, currentStep = 0 }) => {
  const getStepIcon = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return '✓'
      case 'error':
        return '✕'
      case 'in-progress':
        return '⟳'
      default:
        return '○'
    }
  }

  const getStepColor = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white'
      case 'error':
        return 'bg-red-500 text-white'
      case 'in-progress':
        return 'bg-blue-500 text-white animate-pulse'
      default:
        return 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-3">
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${getStepColor(step.status)}`}
            aria-current={step.status === 'in-progress' ? 'step' : undefined}
          >
            {getStepIcon(step.status)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{step.label}</p>
            {step.status === 'in-progress' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Processing…</p>
            )}
            {step.status === 'error' && (
              <p className="text-xs text-red-600 dark:text-red-400">Failed</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
