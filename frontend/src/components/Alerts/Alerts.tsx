/**
 * Alerts management page component.
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button, IconButton } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'
import {
  Bell, Plus, Trash2, Power, PowerOff, Edit2, AlertTriangle,
  TrendingUp, TrendingDown, Activity, Settings, X, Check
} from 'lucide-react'
import clsx from 'clsx'
import type { Alert } from '../../types'

// Alert type icons
const ALERT_TYPE_ICONS: Record<string, React.ElementType> = {
  volume_spike: Activity,
  oi_change: TrendingUp,
  price_move: TrendingDown,
  unusual_activity: AlertTriangle,
}

// Alert Card Component
function AlertCard({ alert, onToggle, onDelete }: {
  alert: Alert
  onToggle: () => void
  onDelete: () => void
}) {
  const Icon = ALERT_TYPE_ICONS[alert.alert_type] || Bell

  return (
    <Card
      className={clsx(
        'transition-all duration-200',
        !alert.is_active && 'opacity-60'
      )}
      padding="none"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={clsx(
              'p-2 rounded-lg',
              alert.is_active ? 'bg-primary-600/20' : 'bg-gray-700'
            )}>
              <Icon size={20} className={alert.is_active ? 'text-primary-400' : 'text-gray-500'} />
            </div>
            <div>
              <h3 className="font-medium text-white">{alert.name}</h3>
              {alert.symbol && (
                <Badge variant="info" size="sm" className="mt-1">
                  {alert.symbol}
                </Badge>
              )}
              <p className="text-sm text-gray-400 mt-1 capitalize">
                {alert.alert_type.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <IconButton
              variant={alert.is_active ? 'primary' : 'ghost'}
              size="sm"
              onClick={onToggle}
            >
              {alert.is_active ? <Power size={16} /> : <PowerOff size={16} />}
            </IconButton>
            <IconButton
              variant="danger"
              size="sm"
              onClick={onDelete}
            >
              <Trash2 size={16} />
            </IconButton>
          </div>
        </div>

        {/* Conditions */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex flex-wrap gap-2">
            {Object.entries(alert.conditions).map(([key, value]) => (
              <Badge key={key} variant="default" size="sm">
                {key}: {String(value)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Notification Channels */}
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
          {alert.notification_channels?.email && (
            <span className="flex items-center gap-1">
              <Check size={12} className="text-green-400" /> Email
            </span>
          )}
          {alert.notification_channels?.telegram && (
            <span className="flex items-center gap-1">
              <Check size={12} className="text-green-400" /> Telegram
            </span>
          )}
          {alert.notification_channels?.push && (
            <span className="flex items-center gap-1">
              <Check size={12} className="text-green-400" /> Push
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>Triggered {alert.trigger_count} times</span>
          {alert.last_triggered_at && (
            <span>Last: {new Date(alert.last_triggered_at).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </Card>
  )
}

// Create Alert Modal
function CreateAlertModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    alert_type: 'volume_spike',
    conditions: {
      threshold: 100,
      direction: 'above',
    },
    notification_channels: {
      email: true,
      telegram: false,
      push: false,
    },
    is_active: true,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createAlert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative w-full max-w-lg animate-scale-in" padding="none">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Create Alert</h2>
          <IconButton variant="ghost" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Alert Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Volume Alert"
              required
              className="input w-full"
            />
          </div>

          {/* Symbol */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Symbol (optional)
            </label>
            <select
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              className="input w-full"
            >
              <option value="">All Symbols</option>
              <option value="NIFTY">NIFTY</option>
              <option value="BANKNIFTY">BANKNIFTY</option>
              <option value="FINNIFTY">FINNIFTY</option>
              <option value="RELIANCE">RELIANCE</option>
              <option value="TCS">TCS</option>
            </select>
          </div>

          {/* Alert Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Alert Type
            </label>
            <select
              value={formData.alert_type}
              onChange={(e) => setFormData({ ...formData, alert_type: e.target.value })}
              className="input w-full"
            >
              <option value="volume_spike">Volume Spike</option>
              <option value="oi_change">OI Change</option>
              <option value="price_move">Price Move</option>
              <option value="unusual_activity">Unusual Activity</option>
            </select>
          </div>

          {/* Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Threshold (%)
            </label>
            <input
              type="number"
              value={formData.conditions.threshold}
              onChange={(e) => setFormData({
                ...formData,
                conditions: { ...formData.conditions, threshold: Number(e.target.value) }
              })}
              min={1}
              max={1000}
              className="input w-full"
            />
          </div>

          {/* Notification Channels */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notify via
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notification_channels.email}
                  onChange={(e) => setFormData({
                    ...formData,
                    notification_channels: {
                      ...formData.notification_channels,
                      email: e.target.checked
                    }
                  })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-primary-600"
                />
                <span className="text-sm text-gray-400">Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notification_channels.telegram}
                  onChange={(e) => setFormData({
                    ...formData,
                    notification_channels: {
                      ...formData.notification_channels,
                      telegram: e.target.checked
                    }
                  })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-primary-600"
                />
                <span className="text-sm text-gray-400">Telegram</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notification_channels.push}
                  onChange={(e) => setFormData({
                    ...formData,
                    notification_channels: {
                      ...formData.notification_channels,
                      push: e.target.checked
                    }
                  })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-primary-600"
                />
                <span className="text-sm text-gray-400">Push</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={createMutation.isPending}
            >
              Create Alert
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

// Main Alerts Component
export default function Alerts() {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.getAlerts(),
  })

  const toggleMutation = useMutation({
    mutationFn: (alertId: number) => api.toggleAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (alertId: number) => api.deleteAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })

  const activeAlerts = alerts?.filter((a) => a.is_active) || []
  const inactiveAlerts = alerts?.filter((a) => !a.is_active) || []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          <p className="text-gray-400 mt-1">
            Manage your options flow alerts and notifications
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={18} />}
          onClick={() => setShowCreateModal(true)}
        >
          Create Alert
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card padding="md" className="text-center">
          <div className="text-2xl font-bold text-white">{alerts?.length || 0}</div>
          <div className="text-sm text-gray-400">Total Alerts</div>
        </Card>
        <Card padding="md" className="text-center">
          <div className="text-2xl font-bold text-green-400">{activeAlerts.length}</div>
          <div className="text-sm text-gray-400">Active</div>
        </Card>
        <Card padding="md" className="text-center">
          <div className="text-2xl font-bold text-gray-500">{inactiveAlerts.length}</div>
          <div className="text-sm text-gray-400">Paused</div>
        </Card>
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} padding="md">
              <div className="flex items-start gap-3">
                <Skeleton variant="rectangular" width={44} height={44} />
                <div className="flex-1">
                  <Skeleton height={20} className="w-1/2 mb-2" />
                  <Skeleton height={16} className="w-1/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : !alerts || alerts.length === 0 ? (
        <EmptyState
          icon={<Bell size={32} />}
          title="No alerts yet"
          description="Create your first alert to get notified about unusual options activity"
          action={{
            label: 'Create Alert',
            onClick: () => setShowCreateModal(true),
          }}
        />
      ) : (
        <div className="space-y-6">
          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Active Alerts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onToggle={() => toggleMutation.mutate(alert.id)}
                    onDelete={() => deleteMutation.mutate(alert.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inactive Alerts */}
          {inactiveAlerts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-400 mb-4">Paused Alerts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inactiveAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onToggle={() => toggleMutation.mutate(alert.id)}
                    onDelete={() => deleteMutation.mutate(alert.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <CreateAlertModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  )
}
