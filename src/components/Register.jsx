import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Register({ onPageChange }) {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const existingUsers = JSON.parse(localStorage.getItem('users') || '[]')
    if (existingUsers.find(u => u.email === email)) {
      alert('Este email já está cadastrado!')
      return
    }

    const user = { name, email, password }
    register(user)
    
    // Salvar email temporariamente para o reconhecimento facial
    localStorage.setItem('registeringEmail', email)
    
    onPageChange('face-recognition')
  }

  return (
    <div id="register-page" className="page active">
      <div className="login-layout">
        <div className="login-left register-left">
          <div className="login-content">
            <div className="login-header">
              <div className="login-logo">
                <img src="/assets/Design sem nome.jpg" alt="FrizBank Logo" className="login-logo-img" />
                <span>FrizBank</span>
              </div>
              <button className="back-btn-login" onClick={() => onPageChange('landing')}>
                ← Voltar
              </button>
            </div>
            
            <div className="login-main">
              <h1 className="login-title">Crie sua conta</h1>
              <p className="login-subtitle">Comece sua jornada no mundo das criptomoedas.</p>
              
              <form className="login-form" onSubmit={handleSubmit}>
                <div className="form-group-login">
                  <label htmlFor="register-name">Nome completo</label>
                  <input
                    type="text"
                    id="register-name"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group-login">
                  <label htmlFor="register-email">Email</label>
                  <input
                    type="email"
                    id="register-email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group-login">
                  <label htmlFor="register-password">Senha</label>
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="register-password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="eye-icon">👁️</span>
                    </button>
                  </div>
                </div>
                
                <button type="submit" className="btn-login-primary">Criar conta</button>
              </form>
              
              <p className="login-register">
                Já tem uma conta? <a href="#" onClick={(e) => { e.preventDefault(); onPageChange('login'); }}>Entre aqui</a>
              </p>
            </div>
            
            <div className="login-footer">
              <p>Copyright © 2025 FrizBank Enterprises LTD.</p>
            </div>
          </div>
        </div>
        
        <div className="login-right register-right">
          <div className="preview-content">
            <h2 className="preview-title">Bem-vindo ao FrizBank!</h2>
            <p className="preview-subtitle">Abra sua conta, conquiste o mundo das criptomoedas e acompanhe tudo com segurança facial e tecnologia de verdade.</p>
            <div className="dashboard-preview">
              <div className="preview-widget">
                <div className="widget-header">
                  <span className="widget-title">Seus Dados, Sua Proteção</span>
                </div>
                <div className="widget-value">🔐</div>
                <div className="widget-description">Acesso biométrico com Face ID</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

