import type { Meta, StoryObj } from '@storybook/react'
import { ToastContainer } from './ToastContainer'
import { ToastContext } from '../../context/ToastContext'
import type { Toast } from '../../context/ToastContext'

// Provide a mock context so ToastContainer renders without a real provider
const mockToasts = (toasts: Toast[]) => ({
  toasts,
  addToast: () => {},
  removeToast: () => {},
})

const withToasts = (toasts: Toast[]) => ({
  decorators: [
    (Story: React.FC) => (
      <ToastContext.Provider value={mockToasts(toasts)}>
        <Story />
      </ToastContext.Provider>
    ),
  ],
})

const meta: Meta<typeof ToastContainer> = {
  title: 'UI/ToastContainer',
  component: ToastContainer,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
}
export default meta

type Story = StoryObj<typeof ToastContainer>

export const Success: Story = {
  ...withToasts([{ id: 1, message: 'Token deployed successfully', variant: 'success' }]),
}

export const Error: Story = {
  ...withToasts([{ id: 2, message: 'Transaction failed. Please try again.', variant: 'error' }]),
}

export const Warning: Story = {
  ...withToasts([{ id: 3, message: 'You are on mainnet. Proceed carefully.', variant: 'warning' }]),
}

export const Info: Story = {
  ...withToasts([{ id: 4, message: 'Connecting to Freighter…', variant: 'info' }]),
}

export const Multiple: Story = {
  ...withToasts([
    { id: 1, message: 'Token deployed successfully', variant: 'success' },
    { id: 2, message: 'Metadata upload failed', variant: 'error' },
    { id: 3, message: 'Switching to mainnet', variant: 'warning' },
  ]),
}
