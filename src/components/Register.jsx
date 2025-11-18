import { useState } from 'react'
import { API_BASE_URL } from '../config/api'
// importar chart.js para exibir o mesmo preview do Login
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend)

export default function Register({ onPageChange, onRegisteredUser }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password || !name) {
      setError('Preencha todos os campos')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres')
      return
    }

    setError('')
    setLoading(true)

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

      if (typeof onRegisteredUser === 'function') {
        onRegisteredUser({ ...createdUser, password })
      }

      onPageChange('face-recognition')
    } catch (apiError) {
      console.error('Erro no cadastro:', apiError)
      setError('Não foi possível criar sua conta. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Mesmo preview estático usado no Login
  const previewLineData = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Vendas',
        data: [12, 22, 31, 40, 52, 65],
        fill: true,
        tension: 0.35,
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderColor: '#6366f1',
        pointRadius: 4,
        pointBackgroundColor: '#6366f1',
        pointBorderWidth: 2
      }
    ]
  }

  const previewLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1'
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 12 } }
      },
      y: {
        grid: { color: 'rgba(100,116,139,0.15)', drawBorder: false },
        ticks: { color: '#64748b', font: { size: 12 } }
      }
    }
  }

  return (
    <div id="register-page" className="page active">
      <div className="login-layout">
        <div className="login-left register-left">
          <div className="login-content">
            <div className="login-header">
              <div className="login-logo">
                <img src="/assets/Logo.jpg" alt="FrizBank Logo" className="login-logo-img" />
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

                {error && <p className="error-message">{error}</p>}
                <button type="submit" className="btn-login-primary" disabled={loading}>
                  {loading ? 'Criando conta...' : 'Criar conta'}
                </button>
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
            <h2 className="preview-title">Bem-Vindo ao FrizBank.</h2>
            <p className="preview-subtitle">Entre para acessar seu dashboard e gerenciar sua carteira digital.</p>

            <div className="dashboard-preview">
              {/* Cards resumidos */}
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

              {/* Gráfico de Linha */}
              <div className="preview-widget chart-widget">
                <div className="widget-header">
                  <span className="widget-title">Visão Geral de Vendas</span>
                </div>
                <div className="preview-chart">
                  <Line data={previewLineData} options={previewLineOptions} />
                </div>
                <div className="widget-description">Crescimento consistente ao longo dos meses</div>
              </div>

              {/* Categorias de Cripto */}
              <div className="preview-widget donut-widget">
                <div className="widget-header">
                  <span className="widget-title">Categorias de Cripto</span>
                </div>
                <div className="preview-donut">
                  <div className="donut-segment bitcoin">
                    <span>Bitcoin</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 700 }}>3.245</span>
                  </div>
                  <div className="donut-segment ethereum">
                    <span>Ethereum</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 700 }}>2.104</span>
                  </div>
                  <div className="donut-segment other">
                    <span>Outras</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 700 }}>899</span>
                  </div>
                </div>
                <div className="donut-total">Total: 6.248 Unidades</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

