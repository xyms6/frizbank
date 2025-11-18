import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useCrypto } from '../hooks/useCrypto'
import { API_BASE_URL } from '../config/api'
import { requestLocationAndGetCurrency, getExchangeRate, formatCurrency } from '../utils/geolocation'

export default function Dashboard({ onPageChange, currentUser }) {
  const { logout } = useAuth()
  const [view, setView] = useState('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState(currentUser || null)
  const [account, setAccount] = useState(null)
  const [saldo, setSaldo] = useState('0.00')
  const [extrato, setExtrato] = useState([])
  const [loadingConta, setLoadingConta] = useState(true)
  const [contaId, setContaId] = useState(null)
  const [showAddSaldo, setShowAddSaldo] = useState(false)
  const [addSaldoValor, setAddSaldoValor] = useState('')
  const [addSaldoMetodo, setAddSaldoMetodo] = useState('pix')
  const [addSaldoLoading, setAddSaldoLoading] = useState(false)
  const [addSaldoMsg, setAddSaldoMsg] = useState('')
  const [showEnviar, setShowEnviar] = useState(false)
  const [envioValor, setEnvioValor] = useState('')
  const [envioDestino, setEnvioDestino] = useState('')
  const [envioLoading, setEnvioLoading] = useState(false)
  const [envioMsg, setEnvioMsg] = useState('')
  const [isUpdatingSenha, setIsUpdatingSenha] = useState(false)
  const [novaSenha, setNovaSenha] = useState('')
  const [loadingUser, setLoadingUser] = useState(false)
  const [currency, setCurrency] = useState('USD')
  const [exchangeRate, setExchangeRate] = useState(1)
  const [locationRequested, setLocationRequested] = useState(false)
  const { cryptoData, loading: cryptoLoading } = useCrypto(currency)

  // Buscar conta real do usuário ao carregar
  useEffect(() => {
    if (user && user.id) {
      setLoadingConta(true)
      // Buscar conta do usuário pelo endpoint específico
      fetch(`${API_BASE_URL}/contas/usuario/${user.id}`)
        .then(res => {
          if (!res.ok) throw new Error('Erro ao buscar conta')
          return res.json()
        })
        .then(data => {
          setAccount(data)
          setContaId(data.id)
          setSaldo(data.saldo)
          setExtrato(data.extrato ? data.extrato.split(';').filter(Boolean) : [])
        })
        .catch(error => {
          console.error('Erro ao buscar conta:', error)
          // Se falhar, tentar criar conta
          fetch(`${API_BASE_URL}/contas`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({saldo: '0.00', ganhos: '0.00', extrato: ''})
          })
          .then(res => res.json())
          .then(data => {
            setAccount(data)
            setContaId(data.id)
            setSaldo(data.saldo)
            setExtrato([])
          })
          .catch(err => console.error('Erro ao criar conta:', err))
        })
        .finally(() => setLoadingConta(false))
    }
  }, [user])

  useEffect(() => {
    if (currentUser) setUser(currentUser)
  }, [currentUser])

  // ... localização/geolocalização/crípto ... igual
  useEffect(() => {
    if (!locationRequested) {
      setLocationRequested(true)
      requestLocationAndGetCurrency()
        .then((detectedCurrency) => {
          setCurrency(detectedCurrency)
          getExchangeRate('USD', detectedCurrency).then(rate => setExchangeRate(rate))
        })
        .catch((error) => {
          setCurrency('USD')
          setExchangeRate(1)
        })
    }
  }, [locationRequested])
  useEffect(() => {
    if (currency !== 'USD') getExchangeRate('USD', currency).then(rate => setExchangeRate(rate))
    else setExchangeRate(1)
  }, [currency])

  const handleLogout = () => { logout(); onPageChange('landing') }

  // ADICIONAR SALDO
  function handleAddSaldoSubmit(e) {
    e.preventDefault()
    if (!addSaldoValor || parseFloat(addSaldoValor) <= 0) {
      setAddSaldoMsg('Digite um valor válido!')
      return
    }
    if (!contaId) {
      setAddSaldoMsg('Conta não encontrada!')
      return
    }
    setAddSaldoLoading(true)
    setAddSaldoMsg('')
    fetch(`${API_BASE_URL}/contas/adicionar-saldo/${contaId}?valor=${addSaldoValor}`, { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error('Erro ao adicionar saldo')
        return res.json()
      })
      .then((data) => {
        setAddSaldoMsg('✅ Saldo adicionado com sucesso!')
        setSaldo(data.saldo)
        setExtrato(data.extrato ? data.extrato.split(';').filter(Boolean) : [])
        setAccount(data)
        setAddSaldoValor('')
        setTimeout(() => {
          setShowAddSaldo(false)
          setAddSaldoMsg('')
        }, 2000)
      })
      .catch(() => {
        setAddSaldoMsg('❌ Erro ao adicionar saldo. Tente novamente.')
      })
      .finally(() => setAddSaldoLoading(false))
  }

  // ENVIAR
  function handleEnviarSubmit(e) {
    e.preventDefault()
    if (!envioDestino || !envioValor || parseFloat(envioValor) <= 0) {
      setEnvioMsg('Preencha todos os campos com valores válidos!')
      return
    }
    if (!contaId) {
      setEnvioMsg('Conta não encontrada!')
      return
    }
    if (parseFloat(envioValor) > parseFloat(saldo)) {
      setEnvioMsg('❌ Saldo insuficiente!')
      return
    }
    setEnvioLoading(true)
    setEnvioMsg('')
    fetch(`${API_BASE_URL}/contas/enviar/${contaId}?idDestino=${envioDestino}&valor=${envioValor}`, {method: 'POST'})
      .then(res => {
        if (!res.ok) throw new Error('Erro ao enviar valor')
        return res.text()
      })
        .then(() => {
        setEnvioMsg('✅ Valor enviado com sucesso!')
        // Atualiza saldo e extrato
        fetch(`${API_BASE_URL}/contas/${contaId}`)
          .then(r => r.json())
          .then(data => {
            setAccount(data)
            setSaldo(data.saldo)
            setExtrato(data.extrato ? data.extrato.split(';').filter(Boolean) : [])
          })
        setTimeout(() => {
          setShowEnviar(false)
          setEnvioMsg('')
          setEnvioValor('')
          setEnvioDestino('')
        }, 2000)
      })
      .catch((err) => {
        setEnvioMsg('❌ Erro ao enviar. Verifique se a conta destino existe.')
        console.error('Erro:', err)
      })
      .finally(() => setEnvioLoading(false))
  }

  // ALTERAR SENHA
  function handleUpdateSenha() {
    setLoadingUser(true)
    fetch(`${API_BASE_URL}/users/${user.id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ ...user, password: novaSenha })
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(userUp => { setUser(userUp); setNovaSenha(''); setIsUpdatingSenha(false) })
      .finally(() => setLoadingUser(false))
  }


  return (
    <div id="dashboard-page" className="page active">
      <div className="dashboard-layout">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="logo-sidebar">
              <img src="/assets/Logo.jpg" alt="FrizBank" className="sidebar-logo-img" />
              <span>FrizBank</span>
            </div>
            <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>×</button>
          </div>
          <nav className="sidebar-nav">
            <a href="#" className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={e => {e.preventDefault();setView('home'); setSidebarOpen(false)}}><span>Home</span></a>
            <a href="#" className={`nav-item ${view === 'account' ? 'active' : ''}`} onClick={e => {e.preventDefault();setView('account'); setSidebarOpen(false)}}><span>Conta</span></a>
          </nav>
          <div className="sidebar-footer">
            <div className="theme-toggle-container">
              <label className="theme-toggle">
                <input type="checkbox" id="dark-mode-toggle"
                  onChange={e => {document.body.classList.toggle('dark-mode', e.target.checked);localStorage.setItem('darkMode', e.target.checked)}}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="theme-label">Modo Escuro</span>
            </div>
            <a href="#" className="nav-item" onClick={e => {e.preventDefault();handleLogout();}}><span>Sair</span></a>
          </div>
        </aside>
        <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}></div>
        <main className="dashboard-main">
          <header className="dashboard-header">
            <button className="hamburger-menu dashboard-menu" onClick={() => setSidebarOpen(true)} aria-label="Menu">
              <span></span>
              <span></span>
              <span></span>
            </button>
            <div className="header-left">
              <h2>Olá, <span>{user?.name || 'Usuário'}</span></h2>
              <p className="welcome-text">Bem-vindo de volta!</p>
            </div>
            <div className="header-right">
              <div className="date-display">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
            </div>
          </header>

          {/* HOME/SALDO */}
          {view === 'home' && (
            <div className="dashboard-content">

              <div className="balance-card">
                <div className="balance-header"><div><h3>Saldo</h3>
                  <p className="balance-date">{new Date().toLocaleDateString('pt-BR', {day:'numeric',month:'short'})}</p>
                  {contaId && (
                    <p style={{fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px'}}>
                      ID da Conta: <strong style={{color: 'var(--primary-color)'}}>{contaId}</strong>
                    </p>
                  )}
                </div>
                </div>
                <div className="balance-content">
                  <div className="balance-left">
                    <div className="balance-amount">R$ {parseFloat(saldo).toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
                    <div className="balance-change">
                      <span className="change-indicator">-</span>
                      <span>0% Comp. última semana</span>
                    </div>
                    <div className="balance-actions">
                      <button className="action-btn add-balance-btn" onClick={()=>setShowAddSaldo(true)}><span>➕</span><span>Adicionar Saldo</span></button>
                      <button className="action-btn send-btn" onClick={()=>setShowEnviar(true)}><span>📤</span><span>Enviar</span></button>
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
                          <img src="/assets/Logo.jpg" alt="FrizBank" className="dashboard-card-logo-img" />
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
                            <div className="dashboard-card-name">{(user?.name || 'USUÁRIO').toUpperCase()}</div>
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

              {/* Modal Adicionar Saldo */}
              {showAddSaldo && (
                <div className="modal" style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}>
                  <div className="modal-content">
                    <div className="modal-header">
                      <h3>Adicionar Saldo</h3>
                      <button 
                        className="modal-close" 
                        onClick={() => {setShowAddSaldo(false); setAddSaldoValor(''); setAddSaldoMsg('')}}
                      >&times;</button>
                    </div>
                    <div className="modal-body">
                      <form onSubmit={handleAddSaldoSubmit}>
                        <div className="form-group">
                          <label>
                            Valor em <span>{currency}</span>
                          </label>
                          <input 
                            type="number" 
                            placeholder="0.00" 
                            step="0.01" 
                            min="0.01"
                            value={addSaldoValor}
                            onChange={e => setAddSaldoValor(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>
                            Método de Pagamento
                          </label>
                          <select 
                            value={addSaldoMetodo}
                            onChange={e => setAddSaldoMetodo(e.target.value)}
                          >
                            <option value="pix">PIX</option>
                            <option value="card">Cartão de Crédito</option>
                            <option value="bank">Transferência Bancária</option>
                          </select>
                        </div>
                        {addSaldoMsg && (
                          <div style={{
                            padding: '12px',
                            marginBottom: '16px',
                            borderRadius: '8px',
                            background: addSaldoMsg.includes('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: addSaldoMsg.includes('✅') ? 'var(--success)' : 'var(--error)',
                            fontSize: '14px'
                          }}>
                            {addSaldoMsg}
                          </div>
                        )}
                        <button 
                          type="submit" 
                          className="btn-primary btn-full"
                          disabled={addSaldoLoading}
                          style={{
                            opacity: addSaldoLoading ? 0.6 : 1,
                            cursor: addSaldoLoading ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {addSaldoLoading ? 'Processando...' : 'Adicionar'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Enviar */}
              {showEnviar && (
                <div className="modal" style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}>
                  <div className="modal-content">
                    <div className="modal-header">
                      <h3>Enviar</h3>
                      <button 
                        className="modal-close" 
                        onClick={() => {setShowEnviar(false); setEnvioValor(''); setEnvioDestino(''); setEnvioMsg('')}}
                      >&times;</button>
                    </div>
                    <div className="modal-body">
                      <form onSubmit={handleEnviarSubmit}>
                        <div className="form-group">
                          <label>
                            ID da Conta de Destino
                          </label>
                          <input 
                            type="number" 
                            placeholder="Digite o ID da conta destino (ex: 1, 2, 3...)" 
                            min="1"
                            step="1"
                            value={envioDestino}
                            onChange={e => setEnvioDestino(e.target.value)}
                            required
                          />
                          <div style={{marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)'}}>
                            Seu ID: <strong>{contaId || 'Carregando...'}</strong>
                          </div>
                        </div>
                        <div className="form-group">
                          <label>
                            Valor
                          </label>
                          <input 
                            type="number" 
                            placeholder="0.00" 
                            step="0.01" 
                            min="0.01"
                            value={envioValor}
                            onChange={e => setEnvioValor(e.target.value)}
                            required
                          />
                          {parseFloat(envioValor) > 0 && (
                            <div style={{marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)'}}>
                              Saldo disponível: R$ {parseFloat(saldo).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                            </div>
                          )}
                        </div>
                        {envioMsg && (
                          <div style={{
                            padding: '12px',
                            marginBottom: '16px',
                            borderRadius: '8px',
                            background: envioMsg.includes('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: envioMsg.includes('✅') ? 'var(--success)' : 'var(--error)',
                            fontSize: '14px'
                          }}>
                            {envioMsg}
                          </div>
                        )}
                        <button 
                          type="submit" 
                          className="btn-primary btn-full"
                          disabled={envioLoading}
                          style={{
                            opacity: envioLoading ? 0.6 : 1,
                            cursor: envioLoading ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {envioLoading ? 'Processando...' : 'Enviar'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* Criptomoedas */}
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
                      // Antes: const price = crypto.current_price * exchangeRate
                      // Agora:
                      const price = crypto.current_price
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

          {/* CONTA */}
          {view === 'account' && (
            <div className="dashboard-content">
              <div className="account-header-card">
                <div className="account-avatar-large">
                  <span>{(user?.name || 'U').charAt(0).toUpperCase()}</span>
                </div>
                <div className="account-info">
                  <h1>{user?.name || 'Usuário'}</h1>
                  <p>{user?.email || ''}</p>
                  <div className="account-stats">
                    <div className="account-stat">
                      <span className="stat-label">Saldo Total</span>
                      <span className="stat-value">R$ {parseFloat(saldo).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="account-stat">
                      <span className="stat-label">Ganhos Totais</span>
                      <span className="stat-value">R$ {account?.ganhos ? parseFloat(account.ganhos).toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '0,00'}</span>
                    </div>
                    <div className="account-stat">
                      <span className="stat-label">Criptomoedas</span>
                      <span className="stat-value">{cryptoData.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="account-sections">
                {/* Informações Pessoais */}
                <div className="account-section">
                  <h3><span className="section-icon">👤</span> Informações Pessoais</h3>
                  <div className="account-form">
                    <div className="form-group-account">
                      <label>Nome completo</label>
                      <input type="text" value={user?.name || ''} readOnly />
                    </div>
                    <div className="form-group-account">
                      <label>Email</label>
                      <input type="email" value={user?.email || ''} readOnly />
                    </div>
                    <div className="form-group-account">
                      <label>Moeda</label>
                      <span>{currency}</span>
                    </div>
                  </div>
                </div>

                {/* Segurança */}
                <div className="account-section">
                  <h3><span className="section-icon">🔒</span> Segurança</h3>
                  <div className="security-options">
                    <div className="security-item">
                      <div>
                        <h4>Alterar Senha</h4>
                        <p>Atualize sua senha de acesso</p>
                      </div>
                      <button className="btn-security" onClick={()=>setIsUpdatingSenha(true)}>Alterar</button>
                    </div>
                  </div>
                  {/* Modal/Form de alterar senha */}
                  {isUpdatingSenha && (
                    <div className="account-form" style={{marginTop: '20px', padding: '20px', background: 'var(--surface)', borderRadius: '8px'}}>
                      <div className="form-group-account">
                        <label>Nova Senha</label>
                        <input type="password" className="input" placeholder="Digite sua nova senha" value={novaSenha} onChange={e=>setNovaSenha(e.target.value)} />
                      </div>
                      <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                        <button onClick={handleUpdateSenha} className="btn-primary" disabled={loadingUser}>Salvar</button>
                        <button onClick={()=>{setIsUpdatingSenha(false); setNovaSenha('')}} className="btn-secondary">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Histórico de Transações */}
                <div className="account-section">
                  <h3><span className="section-icon">📊</span> Histórico de Transações</h3>
                  <div className="transactions-list">
                    {loadingConta ? (
                      <div style={{padding: '20px', textAlign: 'center'}}>Carregando transações...</div>
                    ) : extrato.length === 0 ? (
                      <div style={{padding: '20px', textAlign: 'center', color: 'var(--text-secondary)'}}>Nenhuma movimentação realizada.</div>
                    ) : (
                      extrato.map((item, idx) => {
                        // Parse do formato: [+100]: Adição de saldo; ou [-50]: Envio para conta 2;
                        const match = item.match(/\[([+-]?[\d.]+)\]:\s*(.+)/)
                        if (!match) return null
                        const [, valor, descricao] = match
                        const isPositive = valor.startsWith('+') || parseFloat(valor) > 0
                        const valorFormatado = parseFloat(valor.replace('+', '')).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})
                        
                        return (
                          <div key={idx} className="transaction-item">
                            <div className="transaction-icon">{isPositive ? '➕' : '📤'}</div>
                            <div className="transaction-details">
                              <div className="transaction-title">{descricao}</div>
                              <div className="transaction-date">Hoje, {new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</div>
                            </div>
                            <div className={`transaction-amount ${isPositive ? 'positive' : 'negative'}`}>
                              {isPositive ? '+' : '-'}R$ {valorFormatado}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

