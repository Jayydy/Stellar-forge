import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
}
export default meta

type Story = StoryObj<typeof Input>

export const Default: Story = { args: { label: 'Token Name', placeholder: 'e.g. My Token' } }
export const WithValue: Story = { args: { label: 'Symbol', value: 'MTK', readOnly: true } }
export const Required: Story = { args: { label: 'Symbol', placeholder: 'MTK', required: true } }
export const WithError: Story = { args: { label: 'Symbol', value: 'toolong', error: 'Symbol must be 3–5 characters' } }
export const Disabled: Story = { args: { label: 'Contract ID', value: 'CABC…', disabled: true } }
export const NoLabel: Story = { args: { placeholder: 'Search tokens…' } }
