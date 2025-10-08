'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface TabItem {
  id: string
  label: string
  content: React.ReactNode
}

interface TabsProps {
  items: TabItem[]
  defaultActiveTab?: string
  className?: string
}

export function Tabs({ items, defaultActiveTab, className }: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultActiveTab || items[0]?.id)

  return (
    <div className={cn('w-full', className)}>
      {/* 탭 헤더 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === item.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 콘텐츠 - 모든 탭을 렌더링하되 활성 탭만 표시 */}
      <div className="mt-6">
        {items.map((item) => (
          <div
            key={item.id}
            style={{ display: activeTab === item.id ? 'block' : 'none' }}
          >
            {item.content}
          </div>
        ))}
      </div>
    </div>
  )
}

