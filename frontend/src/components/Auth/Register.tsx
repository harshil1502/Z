/**
 * Registration page component.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store'
import api from '../../services/api'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { TrendingUp, Mail, Lock, User, Eye, EyeOff, AlertCircle, Check } from 'lucide-react'
import clsx from 'clsx'

const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p: string) => /\d/.test(p) },
]

export default function Register() {
  const navigate = useNavigate()
  const { setUser } = useAppStore()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acceptTerms, setAcceptTerms] = useState(false)

  const passwordStrength = PASSWORD_REQUIREMENTS.filter((req) => req.test(password)).length
  const passwordsMatch = password === confirmPassword && password.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!passwordsMatch) {
      setError('Passwords do not match')
      return
    }

    if (passwordStrength < 3) {
      setError('Password does not meet requirements')
      return
    }

    if (!acceptTerms) {
      setError('Please accept the terms and conditions')
      return
    }

    setIsLoading(true)

    try {
      await api.register(email, password, fullName)
      await api.login(email, password)
      const user = await api.getCurrentUser()
      setUser(user)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-gray-900 to-gray-900" />

      {/* Register Card */}
      <Card className="relative w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 bg-primary-600/20 rounded-xl">
            <TrendingUp className="h-8 w-8 text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Z</h1>
            <p className="text-sm text-gray-400">Financial Intel</p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-white">Create your account</h2>
          <p className="text-gray-400 mt-1">Start tracking options flow today</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800/50 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
              Full name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
                className="input w-full pl-12"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input w-full pl-12"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input w-full pl-12 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Password Strength */}
            {password.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={clsx(
                        'h-1 flex-1 rounded-full transition-colors',
                        passwordStrength >= level
                          ? passwordStrength >= 3
                            ? 'bg-green-500'
                            : passwordStrength >= 2
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                          : 'bg-gray-700'
                      )}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {PASSWORD_REQUIREMENTS.map((req) => (
                    <div
                      key={req.id}
                      className={clsx(
                        'flex items-center gap-1.5 text-xs',
                        req.test(password) ? 'text-green-400' : 'text-gray-500'
                      )}
                    >
                      <Check className="h-3 w-3" />
                      {req.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={clsx(
                  'input w-full pl-12',
                  confirmPassword.length > 0 && (passwordsMatch ? 'border-green-500' : 'border-red-500')
                )}
              />
              {confirmPassword.length > 0 && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2">
                  {passwordsMatch ? (
                    <Check className="h-5 w-5 text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-400">
              I agree to the{' '}
              <a href="#" className="text-primary-400 hover:text-primary-300">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-primary-400 hover:text-primary-300">
                Privacy Policy
              </a>
            </span>
          </label>

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
            disabled={!acceptTerms || !passwordsMatch || passwordStrength < 3}
          >
            Create account
          </Button>
        </form>

        {/* Sign In Link */}
        <p className="mt-8 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
            Sign in
          </Link>
        </p>

        {/* Free Tier Info */}
        <div className="mt-6 p-4 bg-primary-900/20 border border-primary-800/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">Free Tier</span>
            <Badge variant="info" size="sm">Forever Free</Badge>
          </div>
          <ul className="text-xs text-gray-400 space-y-1">
            <li className="flex items-center gap-2">
              <Check className="h-3 w-3 text-green-400" />
              Real-time options flow data
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-3 w-3 text-green-400" />
              Basic unusual activity alerts
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-3 w-3 text-green-400" />
              PCR and GEX analytics
            </li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
