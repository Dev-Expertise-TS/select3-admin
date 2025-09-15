'use client'

import React from 'react'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  Loader2, 
  Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DataTableColumn {
  key: string
  label: string
  width?: string
  render?: (value: unknown, row: unknown) => React.ReactNode
}

interface DataTableAction {
  label: string
  icon: React.ReactNode
  onClick: (row: unknown) => void
  variant?: 'default' | 'outline' | 'destructive'
  className?: string
}

interface DataTableProps {
  title: string
  subtitle?: string
  data: unknown[]
  columns: DataTableColumn[]
  actions?: DataTableAction[]
  loading?: boolean
  emptyState?: {
    icon?: React.ReactNode
    title: string
    description: string
    actionLabel?: string
    onAction?: () => void
  }
  onAdd?: () => void
  addButtonLabel?: string
  addButtonIcon?: React.ReactNode
  addButtonClassName?: string
}

export function DataTable({
  title,
  subtitle,
  data,
  columns,
  actions = [],
  loading = false,
  emptyState,
  onAdd,
  addButtonLabel = '새 항목 추가',
  addButtonIcon = <Plus className="h-4 w-4" />,
  addButtonClassName = 'bg-purple-600 hover:bg-purple-700'
}: DataTableProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          {onAdd && (
            <Button 
              onClick={onAdd}
              className={addButtonClassName}
            >
              {addButtonIcon}
              <span className="ml-2">{addButtonLabel}</span>
            </Button>
          )}
        </div>
      </div>

      {/* 로딩 상태 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">로딩 중...</span>
        </div>
      ) : data.length === 0 ? (
        /* 빈 상태 */
        <div className="text-center py-12">
          {emptyState?.icon || <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />}
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {emptyState?.title || '항목이 없습니다'}
          </h3>
          <p className="text-gray-600 mb-4">
            {emptyState?.description || '새 항목을 추가해보세요.'}
          </p>
          {(emptyState?.onAction || onAdd) && (
            <Button 
              onClick={emptyState?.onAction || onAdd}
              className={addButtonClassName}
            >
              {addButtonIcon}
              <span className="ml-2">{emptyState?.actionLabel || addButtonLabel}</span>
            </Button>
          )}
        </div>
      ) : (
        /* 데이터 테이블 */
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th 
                    key={column.key}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: column.width }}
                  >
                    {column.label}
                  </th>
                ))}
                {actions.length > 0 && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row, index) => {
                const rowData = row as Record<string, unknown>
                const rowId = typeof rowData.id === 'string' || typeof rowData.id === 'number' ? rowData.id : index
                return (
                  <tr key={rowId} className="hover:bg-gray-50">
                    {columns.map((column) => (
                      <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {column.render ? column.render(rowData[column.key], rowData) : String(rowData[column.key] ?? '')}
                      </td>
                    ))}
                    {actions.length > 0 && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex gap-2">
                          {actions.map((action, actionIndex) => (
                            <Button
                              key={actionIndex}
                              size="sm"
                              variant={action.variant || 'outline'}
                              onClick={() => action.onClick(rowData)}
                              className={action.className}
                            >
                              {action.icon}
                            </Button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// 특화된 컴포넌트들
export function FeatureSlotTable({
  title,
  subtitle,
  data,
  loading = false,
  onAdd,
  onEdit,
  onDelete,
  onUpsert,
  showUpsert = false
}: {
  title: string
  subtitle?: string
  data: unknown[]
  loading?: boolean
  onAdd?: () => void
  onEdit?: (row: unknown) => void
  onDelete?: (row: unknown) => void
  onUpsert?: (row: unknown) => void
  showUpsert?: boolean
}) {
  const columns: DataTableColumn[] = [
    {
      key: 'id',
      label: 'ID',
      width: '80px'
    },
    {
      key: 'sabre_id',
      label: 'Sabre ID',
      width: '120px',
      render: (value) => (
        <span className="font-mono text-blue-600">{String(value ?? '')}</span>
      )
    },
    {
      key: 'select_hotels',
      label: '호텔명',
      render: (value) => {
        const hotelData = value as Record<string, unknown> | null
        return (
          <span className="text-gray-900">
            {hotelData?.property_name_ko ? String(hotelData.property_name_ko) : '호텔 정보 없음'}
          </span>
        )
      }
    },
    {
      key: 'slot_key',
      label: 'Slot Key',
      width: '120px'
    },
    {
      key: 'created_at',
      label: '생성일',
      width: '120px',
      render: (value) => {
        const dateValue = typeof value === 'string' || typeof value === 'number' ? value : new Date().toISOString()
        return (
          <span className="text-gray-500">
            {new Date(dateValue).toLocaleDateString('ko-KR')}
          </span>
        )
      }
    }
  ]

  const actions: DataTableAction[] = []
  
  if (onEdit) {
    actions.push({
      label: '편집',
      icon: <Edit className="h-3 w-3" />,
      onClick: onEdit,
      variant: 'outline'
    })
  }
  
  if (showUpsert && onUpsert) {
    actions.push({
      label: '저장',
      icon: <Save className="h-3 w-3" />,
      onClick: onUpsert,
      variant: 'outline',
      className: 'bg-green-600 hover:bg-green-700 text-white'
    })
  }
  
  if (onDelete) {
    actions.push({
      label: '삭제',
      icon: <Trash2 className="h-3 w-3" />,
      onClick: onDelete,
      variant: 'outline',
      className: 'text-red-600 hover:text-red-700 hover:bg-red-50'
    })
  }

  return (
    <DataTable
      title={title}
      subtitle={subtitle}
      data={data}
      columns={columns}
      actions={actions}
      loading={loading}
      onAdd={onAdd}
      addButtonLabel="새 항목 추가"
      addButtonIcon={<Plus className="h-4 w-4" />}
      addButtonClassName="bg-purple-600 hover:bg-purple-700"
      emptyState={{
        icon: <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />,
        title: '항목이 없습니다',
        description: '새 항목을 추가해보세요.',
        actionLabel: '새 항목 추가',
        onAction: onAdd
      }}
    />
  )
}
