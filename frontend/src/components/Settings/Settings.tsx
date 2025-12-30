/**
 * User Settings page component.
 */

import { useState } from 'react'
import { useAppStore } from '../../store'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import {
  User, Mail, Bell, Moon, Sun, Shield, CreditCard, LogOut,
  Check, ChevronRight, Smartphone, Globe, Clock, Eye
} from 'lucide-react'
import clsx from 'clsx'

// Settings Section Component
function SettingsSection({ title, description, children }: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card padding="none">
      <div className="px-6 py-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {description && (
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        )}
      </div>
      <div className="p-6">{children}</div>
    </Card>
  )
}

// Settings Row Component
function SettingsRow({ icon: Icon, label, description, action, onClick }: {
  icon: React.ElementType
  label: string
  description?: string
  action?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between py-4 border-b border-gray-700/50 last:border-0',
        onClick && 'cursor-pointer hover:bg-gray-700/20 -mx-6 px-6'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="p-2 bg-gray-700/50 rounded-lg">
          <Icon size={20} className="text-gray-400" />
        </div>
        <div>
          <div className="font-medium text-white">{label}</div>
          {description && (
            <div className="text-sm text-gray-400">{description}</div>
          )}
        </div>
      </div>
      {action || (onClick && <ChevronRight size={20} className="text-gray-500" />)}
    </div>
  )
}

// Toggle Component
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={clsx(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        enabled ? 'bg-primary-600' : 'bg-gray-600'
      )}
    >
      <span
        className={clsx(
          'inline-block h-4 w-4 rounded-full bg-white transition-transform',
          enabled ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )
}

export default function Settings() {
  const { theme, toggleTheme, user, isLiveUpdates, toggleLiveUpdates } = useAppStore()

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    unusualAlerts: true,
    dailyDigest: false,
  })

  const [preferences, setPreferences] = useState({
    autoRefresh: true,
    soundAlerts: false,
    compactView: false,
  })

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Section */}
      <SettingsSection title="Profile" description="Your personal information">
        <div className="flex items-center gap-6 pb-6 border-b border-gray-700">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              {user?.full_name || 'Demo User'}
            </h3>
            <p className="text-gray-400">{user?.email || 'demo@example.com'}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={user?.subscription_tier === 'free' ? 'default' : 'success'}>
                {user?.subscription_tier || 'Free'} Tier
              </Badge>
              {user?.is_verified && (
                <Badge variant="info">
                  <Check size={12} className="mr-1" />
                  Verified
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <SettingsRow
            icon={User}
            label="Edit Profile"
            description="Update your name and profile picture"
            onClick={() => {}}
          />
          <SettingsRow
            icon={Mail}
            label="Email Settings"
            description={user?.email || 'demo@example.com'}
            onClick={() => {}}
          />
          <SettingsRow
            icon={Shield}
            label="Security"
            description="Password and two-factor authentication"
            onClick={() => {}}
          />
        </div>
      </SettingsSection>

      {/* Appearance Section */}
      <SettingsSection title="Appearance" description="Customize how Z looks">
        <SettingsRow
          icon={theme === 'dark' ? Moon : Sun}
          label="Dark Mode"
          description="Use dark theme for the interface"
          action={
            <Toggle enabled={theme === 'dark'} onChange={toggleTheme} />
          }
        />
        <SettingsRow
          icon={Eye}
          label="Compact View"
          description="Show more data in less space"
          action={
            <Toggle
              enabled={preferences.compactView}
              onChange={(v) => setPreferences({ ...preferences, compactView: v })}
            />
          }
        />
      </SettingsSection>

      {/* Notifications Section */}
      <SettingsSection title="Notifications" description="Configure how you receive alerts">
        <SettingsRow
          icon={Mail}
          label="Email Notifications"
          description="Receive alerts via email"
          action={
            <Toggle
              enabled={notifications.email}
              onChange={(v) => setNotifications({ ...notifications, email: v })}
            />
          }
        />
        <SettingsRow
          icon={Smartphone}
          label="Push Notifications"
          description="Receive mobile push notifications"
          action={
            <Toggle
              enabled={notifications.push}
              onChange={(v) => setNotifications({ ...notifications, push: v })}
            />
          }
        />
        <SettingsRow
          icon={Bell}
          label="Unusual Activity Alerts"
          description="Get notified about unusual options activity"
          action={
            <Toggle
              enabled={notifications.unusualAlerts}
              onChange={(v) => setNotifications({ ...notifications, unusualAlerts: v })}
            />
          }
        />
        <SettingsRow
          icon={Clock}
          label="Daily Digest"
          description="Receive a daily summary email"
          action={
            <Toggle
              enabled={notifications.dailyDigest}
              onChange={(v) => setNotifications({ ...notifications, dailyDigest: v })}
            />
          }
        />
      </SettingsSection>

      {/* Data & Display Section */}
      <SettingsSection title="Data & Display" description="Configure data refresh and display">
        <SettingsRow
          icon={Globe}
          label="Live Updates"
          description="Real-time data updates via WebSocket"
          action={
            <Toggle enabled={isLiveUpdates} onChange={toggleLiveUpdates} />
          }
        />
        <SettingsRow
          icon={Clock}
          label="Auto Refresh"
          description="Automatically refresh data every minute"
          action={
            <Toggle
              enabled={preferences.autoRefresh}
              onChange={(v) => setPreferences({ ...preferences, autoRefresh: v })}
            />
          }
        />
        <SettingsRow
          icon={Bell}
          label="Sound Alerts"
          description="Play sound for important alerts"
          action={
            <Toggle
              enabled={preferences.soundAlerts}
              onChange={(v) => setPreferences({ ...preferences, soundAlerts: v })}
            />
          }
        />
      </SettingsSection>

      {/* Subscription Section */}
      <SettingsSection title="Subscription" description="Manage your plan">
        <div className="p-4 bg-gradient-to-r from-primary-900/30 to-transparent border border-primary-800/30 rounded-xl mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Free Tier</span>
                <Badge variant="default" size="sm">Current Plan</Badge>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Basic options flow tracking with limited features
              </p>
            </div>
            <Button variant="primary">
              Upgrade to Pro
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-700/30 rounded-lg">
            <div className="text-2xl font-bold text-white">∞</div>
            <div className="text-sm text-gray-400">Flow Data Access</div>
          </div>
          <div className="p-4 bg-gray-700/30 rounded-lg">
            <div className="text-2xl font-bold text-white">3</div>
            <div className="text-sm text-gray-400">Active Alerts</div>
          </div>
          <div className="p-4 bg-gray-700/30 rounded-lg">
            <div className="text-2xl font-bold text-white">7 days</div>
            <div className="text-sm text-gray-400">Historical Data</div>
          </div>
        </div>

        <SettingsRow
          icon={CreditCard}
          label="Billing & Payments"
          description="Manage payment methods and view invoices"
          onClick={() => {}}
        />
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection title="Account" description="Account management options">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-white">Sign out</div>
            <div className="text-sm text-gray-400">Sign out from your account</div>
          </div>
          <Button variant="secondary" leftIcon={<LogOut size={16} />}>
            Sign Out
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-red-400">Delete Account</div>
              <div className="text-sm text-gray-400">
                Permanently delete your account and all data
              </div>
            </div>
            <Button variant="danger">
              Delete Account
            </Button>
          </div>
        </div>
      </SettingsSection>
    </div>
  )
}
