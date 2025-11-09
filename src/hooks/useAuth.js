import { useState, useEffect } from 'react'

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(null)

  const checkAuth = () => {
    const user = localStorage.getItem('currentUser')
    if (user) {
      const parsedUser = JSON.parse(user)
      setCurrentUser(parsedUser)
      return parsedUser
    }
    return null
  }

  const login = (user) => {
    localStorage.setItem('currentUser', JSON.stringify(user))
    setCurrentUser(user)
  }

  const logout = () => {
    localStorage.removeItem('currentUser')
    setCurrentUser(null)
  }

  const register = (user) => {
    const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
    existingUsers.push(user)
    localStorage.setItem('users', JSON.stringify(existingUsers))
  }

  useEffect(() => {
    checkAuth()
  }, [])

  return {
    currentUser,
    checkAuth,
    login,
    logout,
    register
  }
}

