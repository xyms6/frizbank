import { useAuth } from '../hooks/useAuth'

export default function Landing({ onPageChange }) {
  const { login } = useAuth()

  const handleDemo = () => {
    const demoUser = {
      name: 'Usuário Demo',
      email: 'demo@frizbank.com'
    }
    login(demoUser)
    onPageChange('dashboard')
  }

  return (
    <div id="landing-page" className="page active">
      <nav className="navbar landing-navbar">
        <div className="container">
          <div className="logo">
            <img src="/assets/Design sem nome.jpg" alt="FrizBank Logo" className="logo-img" />
            <span className="logo-text">FrizBank</span>
          </div>
          <div className="nav-buttons">
            <button className="btn-secondary" onClick={() => onPageChange('login')}>
              Entrar
            </button>
            <button className="btn-primary" onClick={() => onPageChange('register')}>
              Abra sua Conta
            </button>
            <button className="btn-demo" onClick={handleDemo} title="Acessar Dashboard Demo">
              Demo
            </button>
          </div>
        </div>
      </nav>
      
      <section className="hero hero-modern">
        <div className="hero-background"></div>
        <div className="crypto-waves">
          <div className="wave wave-1"></div>
          <div className="wave wave-2"></div>
          <div className="wave wave-3"></div>
        </div>
        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <span>✨ Nova geração de carteira digital</span>
            </div>
            <h1 className="hero-title-modern">
              O futuro da sua <span className="gradient-text">carteira digital</span> está aqui
            </h1>
            <p className="hero-subtitle-modern">
              Gerencie criptomoedas e moedas tradicionais com segurança facial, ganhos diários e zero taxas escondidas. Tudo em um só lugar, acessível de qualquer lugar do mundo.
            </p>
            <div className="hero-actions">
              <button className="btn-hero-modern btn-primary-hero" onClick={() => onPageChange('register')}>
                <span>Criar conta grátis</span>
                <span className="btn-arrow">→</span>
              </button>
              <button className="btn-hero-modern btn-secondary-hero" onClick={() => onPageChange('login')}>
                Já tenho conta
              </button>
            </div>
            <div className="hero-features-list">
              <div className="feature-item">
                <span className="feature-check">✓</span>
                <span>Carteira global</span>
              </div>
              <div className="feature-item">
                <span className="feature-check">✓</span>
                <span>Sem taxas abusivas</span>
              </div>
              <div className="feature-item">
                <span className="feature-check">✓</span>
                <span>Ganhos diários</span>
              </div>
              <div className="feature-item">
                <span className="feature-check">✓</span>
                <span>Segurança facial</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card-mockup-modern">
              <div className="card-glow"></div>
              <div className="card-hologram"></div>
              <div className="card-content">
                <div className="card-top-section">
                  <div className="card-chip-real">
                    <div className="chip-base"></div>
                    <div className="chip-lines">
                      <div className="chip-line"></div>
                      <div className="chip-line"></div>
                      <div className="chip-line"></div>
                      <div className="chip-line"></div>
                    </div>
                  </div>
                  <div className="card-contactless-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                      <path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4-4-1.79-4-4z"/>
                    </svg>
                  </div>
                </div>
                <div className="card-logo-section">
                  <img src="/assets/Design sem nome.jpg" alt="FrizBank" className="card-logo-img" />
                </div>
                <div className="card-number-section">
                  <div className="card-number-modern">
                    <span>4532</span>
                    <span>14**</span>
                    <span>****</span>
                    <span>8362</span>
                  </div>
                </div>
                <div className="card-footer-modern">
                  <div className="card-name-section">
                    <div className="card-label">CARDHOLDER NAME</div>
                    <div className="card-name-modern">JOHN DOE</div>
                  </div>
                  <div className="card-expiry-section">
                    <div className="card-label">EXPIRES</div>
                    <div className="card-expiry-modern">09/28</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="floating-elements">
              <div className="float-element float-1 crypto-btc">
                <div className="crypto-icon">₿</div>
                <div className="crypto-label">Bitcoin</div>
              </div>
              <div className="float-element float-2 crypto-eth">
                <div className="crypto-icon">Ξ</div>
                <div className="crypto-label">Ethereum</div>
              </div>
              <div className="float-element float-3 crypto-usd">
                <div className="crypto-icon">$</div>
                <div className="crypto-label">USD</div>
              </div>
              <div className="float-element float-4 crypto-sol">
                <div className="crypto-icon">◎</div>
                <div className="crypto-label">Solana</div>
              </div>
              <div className="float-element float-5 crypto-ada">
                <div className="crypto-icon">₳</div>
                <div className="crypto-label">Cardano</div>
              </div>
              <div className="float-element float-6 crypto-dot">
                <div className="crypto-icon">●</div>
                <div className="crypto-label">Polkadot</div>
              </div>
            </div>
            <div className="crypto-particles">
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`particle particle-${i + 1}`}></div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      <section className="benefits-section">
        <div className="section-header">
          <h2 className="section-title">Por que escolher o FrizBank?</h2>
          <p className="section-subtitle">Tudo que você precisa em uma única plataforma</p>
        </div>
        <div className="benefits-background-animated">
          <div className="benefit-wave benefit-wave-1"></div>
          <div className="benefit-wave benefit-wave-2"></div>
          <div className="benefit-wave benefit-wave-3"></div>
        </div>
        <div className="benefits-grid">
          <div className="benefit-card-modern">
            <div className="benefit-organic-shape benefit-organic-shape-1"></div>
            <div className="benefit-icon-wrapper">
              <svg className="benefit-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <div className="benefit-icon-glow"></div>
            </div>
            <h3>Custo zero surpresa</h3>
            <p>Sem taxas escondidas ou surpresas desagradáveis. O que é seu, fica com você. Transparência total em todas as operações.</p>
          </div>
          <div className="benefit-card-modern">
            <div className="benefit-organic-shape benefit-organic-shape-2"></div>
            <div className="benefit-icon-wrapper">
              <svg className="benefit-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <div className="benefit-icon-glow"></div>
            </div>
            <h3>Proteção máxima</h3>
            <p>Segurança facial de última geração, criptografia de ponta e autenticação biométrica. Seus dados estão sempre protegidos.</p>
          </div>
          <div className="benefit-card-modern">
            <div className="benefit-organic-shape benefit-organic-shape-3"></div>
            <div className="benefit-icon-wrapper">
              <svg className="benefit-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <div className="benefit-icon-glow"></div>
            </div>
            <h3>Carteira Global</h3>
            <p>Dólar, real, euro e criptomoedas em um só app. Acesse e gerencie suas finanças de qualquer lugar do mundo.</p>
          </div>
          <div className="benefit-card-modern">
            <div className="benefit-organic-shape benefit-organic-shape-4"></div>
            <div className="benefit-icon-wrapper">
              <svg className="benefit-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              <div className="benefit-icon-glow"></div>
            </div>
            <h3>Ganhe cripto todo dia</h3>
            <p>Seus rendimentos são atualizados diariamente. Acompanhe seus ganhos em tempo real e maximize seus investimentos.</p>
          </div>
        </div>
      </section>
      
      <footer className="footer-modern">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="logo">
                <img src="/assets/Design sem nome.jpg" alt="FrizBank Logo" className="logo-img" />
                <span className="logo-text">FrizBank</span>
              </div>
              <p className="footer-tagline">A carteira digital mais segura do Brasil</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Produto</h4>
                <a href="#">Recursos</a>
                <a href="#">Preços</a>
                <a href="#">Segurança</a>
              </div>
              <div className="footer-column">
                <h4>Empresa</h4>
                <a href="#">Sobre</a>
                <a href="#">Blog</a>
                <a href="#">Carreiras</a>
              </div>
              <div className="footer-column">
                <h4>Suporte</h4>
                <a href="#">Central de Ajuda</a>
                <a href="#">Contato</a>
                <a href="#">Status</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 FrizBank. Todos os direitos reservados.</p>
            <div className="footer-legal">
              <a href="#">Privacidade</a>
              <a href="#">Termos</a>
              <a href="#">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

