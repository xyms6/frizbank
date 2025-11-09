import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useCrypto } from '../hooks/useCrypto'
import { requestLocationAndGetCurrency, getExchangeRate, formatCurrency } from '../utils/geolocation'

export default function Dashboard({ onPageChange, currentUser }) {
  const { logout } = useAuth()
  const [view, setView] = useState('home')
  const [user, setUser] = useState(currentUser || { name: 'Usuário Demo', email: 'demo@frizbank.com' })
  const [currency, setCurrency] = useState('USD')
  const [exchangeRate, setExchangeRate] = useState(1)
  const [locationRequested, setLocationRequested] = useState(false)
  const { cryptoData, loading: cryptoLoading } = useCrypto(currency)

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser)
    }
  }, [currentUser])

  useEffect(() => {
    // Solicitar localização ao carregar
    if (!locationRequested) {
      setLocationRequested(true)
      requestLocationAndGetCurrency()
        .then((detectedCurrency) => {
          setCurrency(detectedCurrency)
          // Atualizar taxa de câmbio
          getExchangeRate('USD', detectedCurrency).then(rate => {
            setExchangeRate(rate)
          })
        })
        .catch((error) => {
          console.error('Erro ao obter localização:', error)
          // Usar USD como padrão
          setCurrency('USD')
          setExchangeRate(1)
        })
    }
  }, [locationRequested])

  useEffect(() => {
    // Atualizar taxa de câmbio quando a moeda mudar
    if (currency !== 'USD') {
      getExchangeRate('USD', currency).then(rate => {
        setExchangeRate(rate)
      })
    } else {
      setExchangeRate(1)
    }
  }, [currency])

  const handleLogout = () => {
    logout()
    onPageChange('landing')
  }

  return (
    <div id="dashboard-page" className="page active">
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="logo-sidebar">
              <img src="/assets/Design sem nome.jpg" alt="FrizBank" className="sidebar-logo-img" />
              <span>FrizBank</span>
            </div>
          </div>
          <nav className="sidebar-nav">
            <a 
              href="#" 
              className={`nav-item ${view === 'home' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); setView('home'); }}
            >
              <span>Home</span>
            </a>
            <a 
              href="#" 
              className={`nav-item ${view === 'account' ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); setView('account'); }}
            >
              <span>Conta</span>
            </a>
          </nav>
          <div className="sidebar-footer">
            <div className="theme-toggle-container">
              <label className="theme-toggle">
                <input 
                  type="checkbox" 
                  id="dark-mode-toggle" 
                  onChange={(e) => {
                    document.body.classList.toggle('dark-mode', e.target.checked)
                    localStorage.setItem('darkMode', e.target.checked)
                  }}
                />
                <span className="toggle-slider">
                  {/* <span className="toggle-icon">🌙</span>
                  <span className="toggle-icon">☀️</span> */}
                </span>
              </label>
              <span className="theme-label">Modo Escuro</span>
            </div>
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
              <span>Sair</span>
            </a>
          </div>
        </aside>

        <main className="dashboard-main">
          <header className="dashboard-header">
            <div className="header-left">
              <h2>Olá, <span>{user.name}</span></h2>
              <p className="welcome-text">Bem-vindo de volta!</p>
            </div>
            <div className="header-right">
              <div className="date-display">
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'short', 
                  day: 'numeric', 
                  month: 'short' 
                })}
              </div>
            </div>
          </header>

          {view === 'home' && (
            <div className="dashboard-content">
              <div className="balance-card">
                <div className="balance-header">
                  <div>
                    <h3>Saldo</h3>
                    <p className="balance-date">
                      {new Date().toLocaleDateString('pt-BR', { 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </p>
                  </div>
                </div>
                <div className="balance-content">
                  <div className="balance-left">
                    <div className="balance-amount">R$ 0,00</div>
                    <div className="balance-change">
                      <span className="change-indicator">-</span>
                      <span>0% Comp. última semana</span>
                    </div>
                    <div className="balance-actions">
                      <button className="action-btn add-balance-btn">
                        <span>➕</span>
                        <span>Adicionar Saldo</span>
                      </button>
                      <button className="action-btn send-btn">
                        <span>📤</span>
                        <span>Enviar</span>
                      </button>
                    </div>
                  </div>
                  <div className="balance-right">
                    <div className="crypto-card-visual">
                      <div className="dashboard-card-glow"></div>
                      <div className="dashboard-card-hologram"></div>
                      <div className="card-tech-grid"></div>
                      <div className="card-circuit-lines"></div>
                      <div className="dashboard-card-content">
                        <div className="dashboard-card-top">
                          <div className="dashboard-card-chip-real">
                            <div className="dashboard-chip-base"></div>
                            <div className="dashboard-chip-lines">
                              <div className="dashboard-chip-line"></div>
                              <div className="dashboard-chip-line"></div>
                              <div className="dashboard-chip-line"></div>
                              <div className="dashboard-chip-line"></div>
                            </div>
                          </div>
                          <div className="dashboard-card-contactless">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                              <path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4-4-1.79-4-4z"/>
                            </svg>
                          </div>
                        </div>
                        <div className="dashboard-card-logo-section">
                          <img src="/assets/Design sem nome.jpg" alt="FrizBank" className="dashboard-card-logo-img" />
                        </div>
                        <div className="dashboard-card-number-section">
                          <div className="dashboard-card-number">
                            <span>4532</span>
                            <span>14**</span>
                            <span>****</span>
                            <span>9894</span>
                          </div>
                        </div>
                        <div className="dashboard-card-footer">
                          <div className="dashboard-card-name-section">
                            <div className="dashboard-card-label">CARDHOLDER</div>
                            <div className="dashboard-card-name">{user.name.toUpperCase()}</div>
                          </div>
                          <div className="dashboard-card-expiry-section">
                            <div className="dashboard-card-label">EXPIRES</div>
                            <div className="dashboard-card-expiry">09/28</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="connected-card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Criptomoedas</h3>
                  <div className="currency-selector-small">
                    <select 
                      value={currency} 
                      onChange={(e) => setCurrency(e.target.value)}
                      style={{
                        background: 'var(--surface)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--surface-light)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="BRL">BRL</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                      <option value="AUD">AUD</option>
                      <option value="JPY">JPY</option>
                    </select>
                  </div>
                </div>
                {cryptoLoading ? (
                  <div className="loading" style={{ textAlign: 'center', padding: '40px' }}>
                    Carregando criptomoedas...
                  </div>
                ) : (
                  <div className="crypto-grid-connected">
                    {cryptoData.map((crypto) => {
                      const price = crypto.current_price * exchangeRate
                      const change = crypto.price_change_percentage_24h
                      const changeClass = change >= 0 ? 'positive' : 'negative'
                      const changeSymbol = change >= 0 ? '↑' : '↓'

                      return (
                        <div key={crypto.id} className="crypto-item-connected">
                          <div className="crypto-icon-connected">
                            <img 
                              src={crypto.image} 
                              alt={crypto.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                objectFit: 'cover'
                              }}
                            />
                          </div>
                          <div className="crypto-name-connected">{crypto.name}</div>
                          <div className="crypto-symbol-connected">{crypto.symbol.toUpperCase()}</div>
                          <div className="crypto-balance-connected">
                            {formatCurrency(price, currency)}
                          </div>
                          <div className={`crypto-change-connected ${changeClass}`}>
                            {changeSymbol} {Math.abs(change).toFixed(2)}%
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {view === 'account' && (
            <div className="dashboard-content">
              <div className="account-header-card">
                <div className="account-avatar-large">
                  <span>{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="account-info">
                  <h1>{user.name}</h1>
                  <p>{user.email}</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

