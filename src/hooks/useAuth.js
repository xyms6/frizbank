import { useState, useEffect } from 'react'

const subscribers = new Set()
let currentAuthUser = null

function notifySubscribers(user) {
  subscribers.forEach((callback) => {
    try {
      callback(user)
    } catch (error) {
      console.error('Erro ao notificar assinante de auth:', error)
    }
  })
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(currentAuthUser)

  useEffect(() => {
    const handler = (user) => setCurrentUser(user)
    subscribers.add(handler)

    return () => {
      subscribers.delete(handler)
    }
  }, [])

  const checkAuth = () => {
    setCurrentUser(currentAuthUser)
    return currentAuthUser
  }

  const login = (user) => {
    currentAuthUser = user
    setCurrentUser(user)
    notifySubscribers(user)
  }

  const logout = () => {
    currentAuthUser = null
    setCurrentUser(null)
    notifySubscribers(null)
  }

  const register = (user) => {
    currentAuthUser = user
    setCurrentUser(user)
    notifySubscribers(user)
  }

  return {
    currentUser,
    checkAuth,
    login,
    logout,
    register
  }
}
