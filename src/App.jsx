import { useState, useEffect } from 'react'
import Landing from './components/Landing'
import Login from './components/Login'
import Register from './components/Register'
import FaceRecognition from './components/FaceRecognition'
import Dashboard from './components/Dashboard'
import { useAuth } from './hooks/useAuth'
import { loadFaceModels } from './utils/faceApi'

function App() {
  const { currentUser } = useAuth()
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
    // Proteção de rotas: dashboard só acessível se estiver logado
    if (newPage === 'dashboard' && !currentUser) {
      setPage('landing')
      return
    }
    
    setPage(newPage)
    // Limpa pendingUser apenas quando sair da face-recognition (não quando entrar)
    if (newPage === 'dashboard' || newPage === 'landing' || newPage === 'login' || newPage === 'register') {
      setPendingUser(null)
    }
  }

  // Proteção: se estiver no dashboard e deslogar, volta para landing
  useEffect(() => {
    if (page === 'dashboard' && !currentUser) {
      setPage('landing')
    }
  }, [currentUser, page])

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
      {page === 'dashboard' && currentUser && (
        <Dashboard 
          onPageChange={handlePageChange}
          currentUser={currentUser}
        />
      )}
    </>
  )
}

export default App

