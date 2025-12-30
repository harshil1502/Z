/**
 * WebSocket hook for real-time updates.
 * Manages connection, reconnection, and message handling.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../store'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/api/v1/ws'

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface WebSocketMessage {
  type: string
  channel?: string
  data?: unknown
  symbol?: string
  timestamp?: string
}

interface UseWebSocketOptions {
  autoConnect?: boolean
  reconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [status, setStatus] = useState<WebSocketStatus>('disconnected')
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)

  const queryClient = useQueryClient()
  const { isLiveUpdates } = useAppStore()

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    // Add auth token if available
    const token = localStorage.getItem('access_token')
    const url = token ? `${WS_URL}?token=${token}` : WS_URL

    setStatus('connecting')
    const ws = new WebSocket(url)

    ws.onopen = () => {
      console.log('WebSocket connected')
      setStatus('connected')
      reconnectAttempts.current = 0
    }

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason)
      setStatus('disconnected')
      wsRef.current = null

      // Attempt reconnection
      if (reconnect && reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++
        console.log(`Reconnecting... Attempt ${reconnectAttempts.current}`)

        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, reconnectInterval * reconnectAttempts.current)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setStatus('error')
    }

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        setLastMessage(message)
        handleMessage(message)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    wsRef.current = ws
  }, [reconnect, reconnectInterval, maxReconnectAttempts])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setStatus('disconnected')
  }, [])

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, cannot send message')
    }
  }, [])

  const subscribe = useCallback((channel: string) => {
    send({ type: 'subscribe', channel })
  }, [send])

  const unsubscribe = useCallback((channel: string) => {
    send({ type: 'unsubscribe', channel })
  }, [send])

  // Handle incoming messages and update React Query cache
  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (!isLiveUpdates) return

    switch (message.type) {
      case 'flow_update':
        // Invalidate options flow queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['optionsFlow'] })
        break

      case 'unusual_alert':
        // Invalidate unusual activity queries
        queryClient.invalidateQueries({ queryKey: ['unusualActivity'] })
        break

      case 'market_status':
        // Update market status cache
        queryClient.setQueryData(['marketStatus'], message.data)
        break

      case 'index_update':
        // Update indices cache
        queryClient.setQueryData(['indices'], message.data)
        break

      case 'oi_update':
        // Invalidate options chain queries
        if (message.symbol) {
          queryClient.invalidateQueries({
            queryKey: ['optionsChain', message.symbol]
          })
        }
        break

      case 'subscribed':
        console.log(`Subscribed to channel: ${message.channel}`)
        break

      case 'unsubscribed':
        console.log(`Unsubscribed from channel: ${message.channel}`)
        break

      case 'error':
        console.error('WebSocket error message:', message.data)
        break

      default:
        console.log('Unknown message type:', message.type)
    }
  }, [queryClient, isLiveUpdates])

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && isLiveUpdates) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, isLiveUpdates, connect, disconnect])

  // Reconnect when live updates are toggled
  useEffect(() => {
    if (isLiveUpdates && status === 'disconnected') {
      connect()
    } else if (!isLiveUpdates && status === 'connected') {
      disconnect()
    }
  }, [isLiveUpdates, status, connect, disconnect])

  return {
    status,
    lastMessage,
    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe,
    isConnected: status === 'connected',
  }
}

export default useWebSocket
