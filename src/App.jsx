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
    
    // Verificar autenticação
    const user = checkAuth()
    if (user) {
      setPage('dashboard')
    }
  }, [])

  const handleRegisteredUser = (userData) => {
    setPendingUser(userData)
  }

  const handlePageChange = (newPage) => {
    setPage(newPage)
    if (newPage !== 'face-recognition') {
      setPendingUser(null) // Limpa após cadastro biométrico
    }
  }

  return (
    <>
      {page === 'landing' && <Landing onPageChange={handlePageChange} />}
      {page === 'login' && <Login onPageChange={handlePageChange} />}
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
      {page === 'dashboard' && (
        <Dashboard 
          onPageChange={handlePageChange}
          currentUser={currentUser}
        />
      )}
    </>
  )
}

export default App

