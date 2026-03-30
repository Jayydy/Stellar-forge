import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { MainnetConfirmationModal } from './MainnetConfirmationModal'

const baseToken = {
  name: 'My Token',
  symbol: 'MTK',
  decimals: 7,
  initialSupply: '1000000',
}

const meta: Meta<typeof MainnetConfirmationModal> = {
  title: 'UI/MainnetConfirmationModal',
  component: MainnetConfirmationModal,
  tags: ['autodocs'],
  args: {
    isOpen: true,
    onClose: fn(),
    onConfirm: fn(),
    tokenParams: baseToken,
  },
  parameters: { layout: 'fullscreen' },
}
export default meta

type Story = StoryObj<typeof MainnetConfirmationModal>

export const Open: Story = {}

export const WithMetadata: Story = {
  args: {
    tokenParams: {
      ...baseToken,
      metadata: {
        description: 'A community token for the StellarForge ecosystem.',
        image: new File([], 'logo.png', { type: 'image/png' }),
      },
    },
  },
}

export const Closed: Story = { args: { isOpen: false } }
