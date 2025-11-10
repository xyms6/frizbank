import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config/api'

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
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/user`)
        if (response.ok) {
          const user = await response.json()
          setCurrentUser(user)
          notifySubscribers(user)
        }
      } catch (error) {
        console.error('Erro ao buscar usuário:', error)
      }
    }

    fetchUser()

    const handler = (user) => setCurrentUser(user)
    subscribers.add(handler)

    return () => {
      subscribers.delete(handler)
    }
  }, [])

  const checkAuth = async () => {
    const response = await fetch(`${API_BASE_URL}/user`)
    if (response.ok) {
      const user = await response.json()
      setCurrentUser(user)
      notifySubscribers(user)
      return user
    }
    return null
  }

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) {
        throw new Error('Email ou senha incorretos!')
      }

      const user = await response.json()
      currentAuthUser = user
      setCurrentUser(user)
      notifySubscribers(user)
      return user
    } catch (error) {
      console.error('Erro no login:', error)
      throw error
    }
  }

  const logout = () => {
    currentAuthUser = null
    setCurrentUser(null)
    notifySubscribers(null)
  }

  const register = async (name, email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      })

      if (!response.ok) {
        const errorMessage = await response.text()
        throw new Error(errorMessage || 'Erro ao criar conta')
      }

      const createdUser = await response.json()
      currentAuthUser = createdUser
      setCurrentUser(createdUser)
      notifySubscribers(createdUser)
      return createdUser
    } catch (error) {
      console.error('Erro no cadastro:', error)
      throw error
    }
  }

  return {
    currentUser,
    checkAuth,
    login,
    logout,
    register
  }
}
