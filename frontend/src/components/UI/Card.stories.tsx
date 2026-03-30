import type { Meta, StoryObj } from '@storybook/react'
import { Card } from './Card'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
}
export default meta

type Story = StoryObj<typeof Card>

export const WithTitle: Story = {
  args: {
    title: 'Token Details',
    children: <p className="text-gray-600 text-sm">Card body content goes here.</p>,
  },
}

export const WithoutTitle: Story = {
  args: {
    children: <p className="text-gray-600 text-sm">A card with no title, just content.</p>,
  },
}

export const WithH2Heading: Story = {
  args: {
    title: 'Section Heading',
    headingLevel: 2,
    children: <p className="text-gray-600 text-sm">Uses an h2 for the title.</p>,
  },
}

export const WithRichContent: Story = {
  args: {
    title: 'My Token',
    children: (
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">Symbol</dt>
          <dd className="font-medium">MTK</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Supply</dt>
          <dd className="font-medium">1,000,000</dd>
        </div>
      </dl>
    ),
  },
}
