/**
 * WebSocket Context Provider
 * Provides WebSocket connection state and methods throughout the app.
 */

import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { useWebSocket, WebSocketStatus, WebSocketMessage } from '../hooks/useWebSocket'
import { useAppStore } from '../store'

interface WebSocketContextValue {
  status: WebSocketStatus
  lastMessage: WebSocketMessage | null
  isConnected: boolean
  connect: () => void
  disconnect: () => void
  subscribe: (channel: string) => void
  unsubscribe: (channel: string) => void
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null)

interface WebSocketProviderProps {
  children: ReactNode
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { selectedSymbol } = useAppStore()

  const {
    status,
    lastMessage,
    isConnected,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  } = useWebSocket({
    autoConnect: true,
    reconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  })

  // Subscribe to relevant channels when connected
  useEffect(() => {
    if (isConnected) {
      // Subscribe to market status
      subscribe('market_status')

      // Subscribe to selected symbol's flow updates
      if (selectedSymbol) {
        subscribe(`flow:${selectedSymbol}`)
        subscribe(`unusual:${selectedSymbol}`)
      }
    }

    return () => {
      if (isConnected) {
        unsubscribe('market_status')
        if (selectedSymbol) {
          unsubscribe(`flow:${selectedSymbol}`)
          unsubscribe(`unusual:${selectedSymbol}`)
        }
      }
    }
  }, [isConnected, selectedSymbol, subscribe, unsubscribe])

  // Change subscriptions when selected symbol changes
  useEffect(() => {
    if (isConnected && selectedSymbol) {
      subscribe(`flow:${selectedSymbol}`)
      subscribe(`unusual:${selectedSymbol}`)
    }
  }, [isConnected, selectedSymbol, subscribe])

  const value: WebSocketContextValue = {
    status,
    lastMessage,
    isConnected,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider')
  }
  return context
}

export default WebSocketContext
