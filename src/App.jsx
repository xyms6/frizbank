import { useState, useEffect } from 'react'
import Landing from './components/Landing'
import Login from './components/Login'
import Register from './components/Register'
import FaceRecognition from './components/FaceRecognition'
import Dashboard from './components/Dashboard'
import { useAuth } from './hooks/useAuth'
import { loadFaceModels } from './utils/faceApi'

function App() {
  const { currentUser, checkAuth } = useAuth()
  const [page, setPage] = useState('landing')
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [pendingUser, setPendingUser] = useState(null)

  useEffect(() => {
    // Carregar modelos em background
    loadFaceModels()
      .then(() => setModelsLoaded(true))
      .catch(error => console.error('Erro ao carregar modelos:', error))
    
    // Sempre começar na landing, não redirecionar automaticamente
  }, [])

  const handleRegisteredUser = (userData) => {
    setPendingUser(userData)
  }

  const handleLoginUser = (userData) => {
    // Quando faz login, também salva como pendingUser para o face-recognition
    setPendingUser(userData)
  }

  const handlePageChange = (newPage) => {
    // Se está tentando ir para dashboard, verificar se tem usuário logado
    if (newPage === 'dashboard') {
      // Verificar se tem usuário logado (pode ter sido atualizado recentemente)
      const user = checkAuth()
      if (!user && !currentUser) {
        // Se não tem usuário, redirecionar para landing
        setPage('landing')
        return
      }
      // Se tem usuário, permitir ir para dashboard
      setPage('dashboard')
      // Limpar pendingUser ao entrar no dashboard
      setPendingUser(null)
      return
    }
    
    setPage(newPage)
    // Limpa pendingUser apenas quando sair da face-recognition (não quando entrar)
    if (newPage === 'landing' || newPage === 'login' || newPage === 'register') {
      setPendingUser(null)
    }
  }

  // Proteção: se estiver no dashboard e deslogar, volta para landing
  useEffect(() => {
    if (page === 'dashboard') {
      const user = currentUser || checkAuth()
      if (!user) {
        setPage('landing')
      }
    }
  }, [currentUser, page, checkAuth])

  return (
    <>
      {page === 'landing' && <Landing onPageChange={handlePageChange} />}
      {page === 'login' && <Login onPageChange={handlePageChange} onLoginUser={handleLoginUser} />}
      {page === 'register' && (
        <Register 
          onPageChange={handlePageChange}
          onRegisteredUser={handleRegisteredUser}
        />
      )}
      {page === 'face-recognition' && (
        <FaceRecognition 
          onPageChange={handlePageChange} 
          modelsLoaded={modelsLoaded}
          pendingUser={pendingUser}
        />
      )}
      {page === 'dashboard' && (() => {
        // Verificar se tem usuário logado (pode estar no estado ou no checkAuth)
        const user = currentUser || checkAuth()
        return user ? (
          <Dashboard 
            onPageChange={handlePageChange}
            currentUser={user}
          />
        ) : null
      })()}
    </>
  )
}

export default App

