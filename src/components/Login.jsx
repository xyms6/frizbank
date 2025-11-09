import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login({ onPageChange }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const users = JSON.parse(localStorage.getItem('users') || '[]')
    const user = users.find(u => u.email === email && u.password === password)

    if (!user) {
      alert('Email ou senha incorretos!')
      return
    }

    const savedDescriptors = localStorage.getItem(`faceDescriptors_${email}`)
    if (!savedDescriptors) {
      alert('Você precisa cadastrar seu rosto primeiro!')
      onPageChange('register')
      return
    }

    login(user)
    onPageChange('face-recognition')
  }

  return (
    <div id="login-page" className="page active">
      <div className="login-layout">
        <div className="login-left">
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
              <h1 className="login-title">Bem-vindo de volta!</h1>
              <p className="login-subtitle">Digite seu email e senha para acessar sua conta.</p>
              
              <form className="login-form" onSubmit={handleSubmit}>
                <div className="form-group-login">
                  <label htmlFor="login-email">Email</label>
                  <input
                    type="email"
                    id="login-email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group-login">
                  <label htmlFor="login-password">Senha</label>
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="login-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                
                <div className="login-options">
                  <label className="remember-me">
                    <input type="checkbox" id="remember-me" />
                    <span>Lembrar-me</span>
                  </label>
                  <a href="#" className="forgot-password" onClick={(e) => { e.preventDefault(); alert('Funcionalidade em desenvolvimento'); }}>
                    Esqueceu sua senha?
                  </a>
                </div>
                
                <button type="submit" className="btn-login-primary">Entrar</button>
              </form>
              
              <p className="login-register">
                Não tem uma conta? <a href="#" onClick={(e) => { e.preventDefault(); onPageChange('register'); }}>Cadastre-se agora</a>
              </p>
            </div>
            
            <div className="login-footer">
              <p>Copyright © 2025 FrizBank Enterprises LTD.</p>
            </div>
          </div>
        </div>
        
        <div className="login-right">
          <div className="preview-content">
            <h2 className="preview-title">Gerencie suas criptomoedas com facilidade.</h2>
            <p className="preview-subtitle">Entre para acessar seu dashboard e gerenciar sua carteira digital.</p>
            
            <div className="dashboard-preview">
              <div className="preview-widget">
                <div className="widget-header">
                  <span className="widget-title">Saldo Total</span>
                </div>
                <div className="widget-value">R$ 189.374</div>
                <div className="widget-change positive">+12.5%</div>
              </div>
              
              <div className="preview-widget">
                <div className="widget-header">
                  <span className="widget-title">Ganhos</span>
                </div>
                <div className="widget-value">R$ 25.684</div>
                <div className="widget-change positive">+8.2%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

