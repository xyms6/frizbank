// Estado da aplicação
let currentUser = null;
let faceDescriptors = {};
let modelsLoaded = false;
let userCurrency = 'BRL';
let cryptoData = [];
let userBalance = 0;
let userEarnings = 0;
let earningsHistory = [];
let lastCryptoPrices = {};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    // Carregar modelos em background (não bloquear a inicialização)
    loadFaceModels().catch(error => {
        console.error('Erro ao carregar modelos na inicialização:', error);
    });
    
    setupEventListeners();
    
    // Verificar se há parâmetro na URL para acesso direto ao dashboard
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('demo') === 'true' || urlParams.get('dashboard') === 'true') {
        accessDashboardDemo();
    } else {
        checkAuth();
    }
});

// Aguardar Face API estar disponível
async function waitForFaceAPI() {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (typeof faceapi === 'undefined' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (typeof faceapi === 'undefined') {
        throw new Error('Face API não foi carregado. Verifique sua conexão com a internet.');
    }
    
    return true;
}

// Carregar modelos do Face API
async function loadFaceModels() {
    // Aguardar Face API estar disponível
    try {
        await waitForFaceAPI();
    } catch (error) {
        console.error('Erro ao aguardar Face API:', error);
        modelsLoaded = false;
        return;
    }
    
    // Tentar múltiplos CDNs em ordem de preferência
    const modelPaths = [
        // Opção 1: jsdelivr GitHub (mais confiável)
        'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights',
        // Opção 2: jsdelivr npm
        'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
        // Opção 3: unpkg
        'https://unpkg.com/face-api.js@0.22.2/weights',
        // Opção 4: GitHub raw (pode ter problemas de CORS)
        'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/0.22.2/weights'
    ];
    
    let loaded = false;
    
    for (let i = 0; i < modelPaths.length && !loaded; i++) {
        try {
            console.log(`Tentando carregar modelos de: ${modelPaths[i]}`);
            
            // Carregar modelos em paralelo para ser mais rápido
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(modelPaths[i]),
                faceapi.nets.faceLandmark68Net.loadFromUri(modelPaths[i]),
                faceapi.nets.faceRecognitionNet.loadFromUri(modelPaths[i])
            ]);
            
            modelsLoaded = true;
            loaded = true;
            console.log(`✅ Modelos carregados com sucesso de: ${modelPaths[i]}`);
        } catch (error) {
            console.warn(`Falha ao carregar de ${modelPaths[i]}:`, error.message);
            // Continuar para o próximo CDN
        }
    }
    
    if (!loaded) {
        console.error('❌ Não foi possível carregar modelos de nenhum CDN disponível.');
        modelsLoaded = false;
    }
}

// Configurar event listeners
function setupEventListeners() {
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('login-form').addEventListener('submit', handleLogin);
}

// Verificar autenticação
function checkAuth() {
    const user = localStorage.getItem('currentUser');
    if (user) {
        currentUser = JSON.parse(user);
        const savedDescriptors = localStorage.getItem(`faceDescriptors_${currentUser.email}`);
        if (savedDescriptors) {
            faceDescriptors[currentUser.email] = JSON.parse(savedDescriptors);
        }
        showDashboard();
    }
}

// Navegação entre páginas
function showLanding() {
    hideAllPages();
    document.getElementById('landing-page').classList.add('active');
}

// showLogin está definida mais abaixo com inicialização do preview

function showRegister() {
    hideAllPages();
    document.getElementById('register-page').classList.add('active');
}

function showFaceRecognition(email) {
    hideAllPages();
    document.getElementById('face-recognition-page').classList.add('active');
    document.getElementById('face-status-text').textContent = 'Clique em "Iniciar Reconhecimento" para começar';
    document.getElementById('face-progress-fill').style.width = '0%';
}

let dailyChart = null;
let monthlyChart = null;
let earnChart = null;

// Acessar dashboard em modo demo (sem login)
function accessDashboardDemo() {
    // Criar usuário demo temporário
    currentUser = {
        name: 'Usuário Demo',
        email: 'demo@frizbank.com'
    };
    
    // Não salvar no localStorage para não interferir com login real
    showDashboard();
}

async function showDashboard() {
    hideAllPages();
    const dashboardPage = document.getElementById('dashboard-page');
    if (dashboardPage) {
        dashboardPage.classList.add('active');
    }
    
    // Se não tiver usuário, usar demo
    if (!currentUser) {
        currentUser = {
            name: 'Usuário Demo',
            email: 'demo@frizbank.com'
        };
    }
    
    const userName = currentUser.name;
    const userNameHeader = document.getElementById('user-name-display-header');
    const cardName = document.getElementById('card-name');
    
    if (userNameHeader) userNameHeader.textContent = userName;
    if (cardName) cardName.textContent = userName.toUpperCase();
    
    // Avatar inicial
    const initial = userName.charAt(0).toUpperCase();
    const avatarEl = document.getElementById('user-avatar-initial');
    if (avatarEl) avatarEl.textContent = initial;
    
    // Carregar saldo e ganhos do localStorage
    await loadUserData();
    
    // Atualizar label do modal com a moeda atual
    const currencyLabel = document.getElementById('balance-currency-label');
    if (currencyLabel) {
        currencyLabel.textContent = userCurrency;
    }
    
    // Carregar modo dark
    loadDarkMode();
    
    // Data atual
    updateCurrentDate();
    
    // Inicializar gráficos
    initializeCharts();
    
    // Mostrar home do dashboard
    showDashboardHome();
    
    // Carregar dados
    requestLocationAndLoadCrypto();
    updateBalance();
    updateEarnings();
}

function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
}

// Registrar novo usuário
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    // Verificar se email já existe
    const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
    if (existingUsers.find(u => u.email === email)) {
        alert('Este email já está cadastrado!');
        return;
    }

    // Salvar usuário
    const user = { name, email, password };
    existingUsers.push(user);
    localStorage.setItem('users', JSON.stringify(existingUsers));

    // Ir para reconhecimento facial
    showFaceRecognition(email);
}

// Login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // Verificar credenciais
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        alert('Email ou senha incorretos!');
        return;
    }

    // Verificar se tem descritor facial salvo
    const savedDescriptors = localStorage.getItem(`faceDescriptors_${email}`);
    if (!savedDescriptors) {
        alert('Você precisa cadastrar seu rosto primeiro!');
        showRegister();
        return;
    }

    // Verificar rosto
    currentUser = user;
    showFaceRecognition(email);
}

// Iniciar reconhecimento facial
async function startFaceRecognition() {
    // Se os modelos não foram carregados, tentar carregar novamente
    if (!modelsLoaded) {
        const statusText = document.getElementById('face-status-text');
        if (statusText) {
            statusText.textContent = 'Carregando modelos de reconhecimento facial...';
        }
        
        try {
            await loadFaceModels();
            
            if (!modelsLoaded) {
                alert('Não foi possível carregar os modelos de reconhecimento facial. Verifique sua conexão com a internet e tente novamente.');
                if (statusText) {
                    statusText.textContent = 'Erro ao carregar modelos. Tente recarregar a página.';
                }
                return;
            }
        } catch (error) {
            console.error('Erro ao tentar carregar modelos:', error);
            alert('Erro ao carregar modelos de reconhecimento facial. Verifique sua conexão com a internet e recarregue a página.');
            return;
        }
    }

    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const statusText = document.getElementById('face-status-text');
    const progressFill = document.getElementById('face-progress-fill');
    const startBtn = document.getElementById('start-face-recognition');

    startBtn.disabled = true;
    startBtn.textContent = 'Processando...';

    try {
        // Solicitar acesso à câmera
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        video.srcObject = stream;

        statusText.textContent = 'Posicione seu rosto na frente da câmera...';
        progressFill.style.width = '30%';

        // Aguardar um pouco para o vídeo inicializar
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Determinar se está registrando ou fazendo login
        let email = currentUser?.email;
        if (!email) {
            const registerEmail = document.getElementById('register-email')?.value;
            if (registerEmail) {
                email = registerEmail;
            }
        }
        
        const savedDescriptors = email ? localStorage.getItem(`faceDescriptors_${email}`) : null;
        let isRegistering = !savedDescriptors;
        let attempts = 0;
        const maxAttempts = 50;

        const detectFace = async () => {
            if (attempts >= maxAttempts) {
                statusText.textContent = 'Tempo esgotado. Tente novamente.';
                progressFill.style.width = '0%';
                startBtn.disabled = false;
                startBtn.textContent = 'Tentar Novamente';
                video.srcObject.getTracks().forEach(track => track.stop());
                return;
            }

            attempts++;
            progressFill.style.width = `${30 + (attempts / maxAttempts) * 50}%`;

            const detection = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                const descriptor = detection.descriptor;
                
                if (isRegistering) {
                    // Registrar rosto
                    if (!email) {
                        statusText.textContent = 'Erro: Email não encontrado';
                        startBtn.disabled = false;
                        startBtn.textContent = 'Tentar Novamente';
                        video.srcObject.getTracks().forEach(track => track.stop());
                        return;
                    }
                    
                    faceDescriptors[email] = [descriptor];
                    localStorage.setItem(`faceDescriptors_${email}`, JSON.stringify(faceDescriptors[email]));
                    
                    statusText.textContent = 'Rosto cadastrado com sucesso!';
                    progressFill.style.width = '100%';
                    
                    setTimeout(() => {
                        video.srcObject.getTracks().forEach(track => track.stop());
                        if (currentUser) {
                            showDashboard();
                        } else {
                            // Se estava registrando, fazer login automático
                            const users = JSON.parse(localStorage.getItem('users') || '[]');
                            currentUser = users.find(u => u.email === email);
                            if (currentUser) {
                                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                                showDashboard();
                            } else {
                                alert('Erro ao fazer login automático');
                                showLogin();
                            }
                        }
                    }, 1500);
                } else {
                    // Verificar rosto
                    if (!email || !currentUser) {
                        statusText.textContent = 'Erro: Usuário não encontrado';
                        startBtn.disabled = false;
                        startBtn.textContent = 'Tentar Novamente';
                        video.srcObject.getTracks().forEach(track => track.stop());
                        return;
                    }
                    
                    const savedDescriptors = JSON.parse(localStorage.getItem(`faceDescriptors_${email}`));
                    
                    if (savedDescriptors && savedDescriptors.length > 0) {
                        const faceMatcher = new faceapi.FaceMatcher(savedDescriptors, 0.6);
                        const bestMatch = faceMatcher.findBestMatch(descriptor);
                        
                        if (bestMatch.label === 'person0' && bestMatch.distance < 0.6) {
                            statusText.textContent = 'Rosto reconhecido!';
                            progressFill.style.width = '100%';
                            
                            setTimeout(() => {
                                video.srcObject.getTracks().forEach(track => track.stop());
                                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                                showDashboard();
                            }, 1500);
                        } else {
                            statusText.textContent = 'Rosto não reconhecido. Tente novamente...';
                            setTimeout(detectFace, 500);
                        }
                    } else {
                        statusText.textContent = 'Erro: Descritor facial não encontrado';
                        startBtn.disabled = false;
                        startBtn.textContent = 'Tentar Novamente';
                        video.srcObject.getTracks().forEach(track => track.stop());
                    }
                }
            } else {
                statusText.textContent = 'Nenhum rosto detectado. Posicione-se melhor...';
                setTimeout(detectFace, 500);
            }
        };

        detectFace();
    } catch (error) {
        console.error('Erro ao acessar câmera:', error);
        alert('Erro ao acessar a câmera. Verifique as permissões.');
        startBtn.disabled = false;
        startBtn.textContent = 'Iniciar Reconhecimento';
    }
}

// Solicitar localização e carregar criptomoedas
async function requestLocationAndLoadCrypto() {
    try {
        const position = await new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalização não suportada'));
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        // Obter código do país baseado na localização
        const countryCode = await getCountryFromCoordinates(
            position.coords.latitude,
            position.coords.longitude
        );

        // Determinar moeda baseada no país
        const currencyMap = {
            'BR': 'BRL',
            'US': 'USD',
            'CA': 'CAD',
            'GB': 'GBP',
            'DE': 'EUR',
            'FR': 'EUR',
            'IT': 'EUR',
            'ES': 'EUR',
            'PT': 'EUR',
            'AU': 'AUD',
            'JP': 'JPY',
            'CN': 'CNY',
            'IN': 'INR',
            'MX': 'MXN',
            'AR': 'ARS',
            'CL': 'CLP',
            'CO': 'COP',
        };

        userCurrency = currencyMap[countryCode] || 'USD';
        document.getElementById('currency-select').value = userCurrency;

        loadCryptoData();
    } catch (error) {
        console.error('Erro ao obter localização:', error);
        alert('Não foi possível obter sua localização. Usando USD como padrão.');
        userCurrency = 'USD';
        loadCryptoData();
    }
}

// Obter país a partir de coordenadas
async function getCountryFromCoordinates(lat, lon) {
    try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`);
        const data = await response.json();
        return data.countryCode || 'US';
    } catch (error) {
        console.error('Erro ao obter país:', error);
        return 'US';
    }
}

// Atualizar data atual
function updateCurrentDate() {
    const now = new Date();
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    const dayName = days[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];
    
    document.getElementById('current-date').textContent = `Hoje ${dayName}, ${day} ${month}`;
    document.getElementById('balance-date').textContent = `Hoje, ${day} ${month}`;
    document.getElementById('daily-activity-date').textContent = `Hoje, ${day} ${month}`;
    document.getElementById('monthly-year').textContent = now.getFullYear().toString();
}

// Inicializar gráficos
function initializeCharts() {
    // Gráfico de atividade diária
    const dailyCtx = document.getElementById('daily-chart');
    if (dailyCtx && !dailyChart) {
        dailyChart = new Chart(dailyCtx, {
            type: 'bar',
            data: {
                labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
                datasets: [{
                    label: 'Atividade',
                    data: [120, 190, 300, 250, 200, 450, 350],
                    backgroundColor: '#14b8a6',
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f1f5f9'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });
    }

    // Gráfico de atividade mensal
    const monthlyCtx = document.getElementById('monthly-chart');
    if (monthlyCtx && !monthlyChart) {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        monthlyChart = new Chart(monthlyCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Saldo Total',
                    data: [50, 80, 100, 120, 150, 180, 200, 220, 250, 280, 300, 320],
                    borderColor: '#14b8a6',
                    backgroundColor: 'rgba(20, 184, 166, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f1f5f9'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });
    }

    // Gráfico de ganhos (donut)
    const earnCtx = document.getElementById('earn-chart');
    if (earnCtx && !earnChart) {
        earnChart = new Chart(earnCtx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#14b8a6', '#f1f5f9'],
                    borderWidth: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

// Carregar dados do usuário
async function loadUserData() {
    const email = currentUser?.email || 'demo@frizbank.com';
    const savedBalance = localStorage.getItem(`balance_${email}`);
    const savedEarnings = localStorage.getItem(`earnings_${email}`);
    const savedHistory = localStorage.getItem(`earningsHistory_${email}`);
    
    // Saldo é armazenado em USD (moeda base)
    // Converter para a moeda do usuário ao carregar
    const balanceInUSD = savedBalance ? parseFloat(savedBalance) : 0;
    const exchangeRate = await getExchangeRate('USD', userCurrency);
    userBalance = balanceInUSD * exchangeRate;
    
    const earningsInUSD = savedEarnings ? parseFloat(savedEarnings) : 0;
    userEarnings = earningsInUSD * exchangeRate;
    
    earningsHistory = savedHistory ? JSON.parse(savedHistory) : [];
    
    // Inicializar histórico de preços se não existir
    if (!lastCryptoPrices || Object.keys(lastCryptoPrices).length === 0) {
        const savedPrices = localStorage.getItem(`lastCryptoPrices_${email}`);
        lastCryptoPrices = savedPrices ? JSON.parse(savedPrices) : {};
    }
}

// Salvar dados do usuário
async function saveUserData() {
    const email = currentUser?.email || 'demo@frizbank.com';
    
    // Converter saldo e ganhos para USD antes de salvar
    const exchangeRate = await getExchangeRate('USD', userCurrency);
    const balanceInUSD = userBalance / exchangeRate;
    const earningsInUSD = userEarnings / exchangeRate;
    
    localStorage.setItem(`balance_${email}`, balanceInUSD.toString());
    localStorage.setItem(`earnings_${email}`, earningsInUSD.toString());
    localStorage.setItem(`earningsHistory_${email}`, JSON.stringify(earningsHistory));
    localStorage.setItem(`lastCryptoPrices_${email}`, JSON.stringify(lastCryptoPrices));
}

// Atualizar saldo
async function updateBalance() {
    try {
        const balanceEl = document.getElementById('total-balance');
        if (balanceEl) {
            balanceEl.textContent = formatCurrency(userBalance, userCurrency);
        }
        
        // Calcular mudança baseada no histórico
        if (earningsHistory.length > 1) {
            const lastWeek = earningsHistory.slice(-7);
            const previousWeek = earningsHistory.slice(-14, -7);
            
            if (previousWeek.length > 0) {
                const lastWeekAvg = lastWeek.reduce((a, b) => a + b, 0) / lastWeek.length;
                const previousWeekAvg = previousWeek.reduce((a, b) => a + b, 0) / previousWeek.length;
                
                if (previousWeekAvg > 0) {
                    const change = ((lastWeekAvg - previousWeekAvg) / previousWeekAvg) * 100;
                    const changeEl = document.getElementById('balance-change');
                    if (changeEl) {
                        changeEl.innerHTML = `
                            <span class="change-indicator" style="color: ${change < 0 ? '#ef4444' : '#10b981'}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span>
                            <span>Comp. última semana</span>
                        `;
                    }
                }
            }
        }
    } catch (error) {
        console.error('Erro ao atualizar saldo:', error);
    }
}

// Atualizar ganhos baseado no mercado
async function updateEarnings() {
    if (!cryptoData || cryptoData.length === 0) return;
    
    try {
        const exchangeRate = await getExchangeRate('USD', userCurrency);
        let totalEarnings = 0;
        let totalReturn = 0;
        
        // Calcular ganhos baseado na variação das criptomoedas
        // Converter saldo do usuário para USD para calcular ganhos
        const userBalanceInUSD = userBalance / exchangeRate;
        
        cryptoData.forEach(crypto => {
            const cryptoId = crypto.id;
            const currentPrice = crypto.current_price;
            
            // Se temos preço anterior, calcular ganho
            if (lastCryptoPrices[cryptoId]) {
                const previousPrice = lastCryptoPrices[cryptoId];
                const priceDiff = ((currentPrice - previousPrice) / previousPrice) * 100;
                
                // Assumir que o usuário tem uma porcentagem do saldo investida em cada cripto
                const investmentPercentage = 1 / cryptoData.length; // Distribuição igual
                const investedAmountInUSD = userBalanceInUSD * investmentPercentage;
                const earningsInUSD = (investedAmountInUSD * priceDiff) / 100;
                
                totalEarnings += earningsInUSD;
            }
            
            // Atualizar preço atual
            lastCryptoPrices[cryptoId] = currentPrice;
        });
        
        // Adicionar ganhos ao total acumulado (convertendo para moeda do usuário)
        if (totalEarnings !== 0) {
            const earningsInUserCurrency = totalEarnings * exchangeRate;
            userEarnings += earningsInUserCurrency;
            earningsHistory.push({
                date: new Date().toISOString(),
                amount: earningsInUserCurrency
            });
            
            // Manter apenas últimos 30 dias
            if (earningsHistory.length > 30) {
                earningsHistory = earningsHistory.slice(-30);
            }
        }
        
        // Calcular rendimento percentual
        if (userBalance > 0) {
            totalReturn = (userEarnings / userBalance) * 100;
        }
        
        // Atualizar UI
        const earningsEl = document.getElementById('total-earnings');
        if (earningsEl) {
            earningsEl.textContent = formatCurrency(userEarnings, userCurrency);
        }
        
        const earnValueEl = document.getElementById('earn-value');
        if (earnValueEl) {
            earnValueEl.textContent = `+${totalReturn.toFixed(2)}%`;
        }
        
        // Atualizar gráfico de donut
        if (earnChart) {
            const percentage = Math.min(Math.abs(totalReturn), 100);
            earnChart.data.datasets[0].data = [percentage, 100 - percentage];
            earnChart.update();
        }
        
        // Calcular mudança vs período anterior
        if (earningsHistory.length > 7) {
            const last7Days = earningsHistory.slice(-7);
            const previous7Days = earningsHistory.slice(-14, -7);
            
            if (previous7Days.length > 0) {
                const last7Total = last7Days.reduce((a, b) => a + b.amount, 0);
                const previous7Total = previous7Days.reduce((a, b) => a + b.amount, 0);
                
                if (previous7Total > 0) {
                    const change = ((last7Total - previous7Total) / previous7Total) * 100;
                    const changeEl = document.getElementById('earnings-change');
                    if (changeEl) {
                        changeEl.innerHTML = `
                            <span class="change-indicator positive">+${change.toFixed(2)}%</span>
                            <span>vs. período anterior</span>
                        `;
                    }
                }
            }
        }
        
        // Salvar dados
        await saveUserData();
    } catch (error) {
        console.error('Erro ao atualizar ganhos:', error);
    }
}

// Carregar dados de criptomoedas
async function loadCryptoData() {
    const loadingEl = document.getElementById('loading-crypto');
    const cryptoListEl = document.getElementById('crypto-list');
    
    if (!loadingEl || !cryptoListEl) return;
    
    loadingEl.style.display = 'block';
    cryptoListEl.innerHTML = '';

    try {
        // API CoinGecko para criptomoedas
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=8&page=1&sparkline=false');
        const data = await response.json();

        cryptoData = data;

        // Obter taxa de câmbio
        const exchangeRate = await getExchangeRate('USD', userCurrency);

        // Renderizar criptomoedas no formato conectado
        cryptoListEl.innerHTML = data.map(crypto => {
            const price = crypto.current_price * exchangeRate;
            const change = crypto.price_change_percentage_24h;
            const changeClass = change >= 0 ? 'positive' : 'negative';
            const changeSymbol = change >= 0 ? '↑' : '↓';

            return `
                <div class="crypto-item-connected" onclick="showCryptoDetail('${crypto.id}')" style="cursor: pointer;">
                    <div class="crypto-icon-connected">
                        <img src="${crypto.image}" alt="${crypto.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
                    </div>
                    <div class="crypto-name-connected">${crypto.name}</div>
                    <div class="crypto-symbol-connected">${crypto.symbol}</div>
                    <div class="crypto-balance-connected">${formatCurrency(price, userCurrency)}</div>
                    <div class="crypto-change-connected ${changeClass}">
                        ${changeSymbol} ${Math.abs(change).toFixed(2)}%
                    </div>
                </div>
            `;
        }).join('');

        loadingEl.style.display = 'none';
        
        // Atualizar saldo e ganhos após carregar criptos
        updateBalance();
        updateEarnings();
        
        // Atualizar ganhos periodicamente (a cada 30 segundos)
        if (!window.earningsInterval) {
            window.earningsInterval = setInterval(() => {
                updateEarnings();
            }, 30000);
        }
    } catch (error) {
        console.error('Erro ao carregar criptomoedas:', error);
        if (loadingEl) {
            loadingEl.textContent = 'Erro ao carregar dados. Tente novamente mais tarde.';
        }
    }
}

// Obter taxa de câmbio
async function getExchangeRate(from, to) {
    if (from === to) return 1;
    
    try {
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
        const data = await response.json();
        return data.rates[to] || 1;
    } catch (error) {
        console.error('Erro ao obter taxa de câmbio:', error);
        return 1;
    }
}

// Atualizar moeda
async function updateCurrency() {
    const newCurrency = document.getElementById('currency-select').value;
    
    // Converter saldo e ganhos da moeda antiga para a nova
    if (userCurrency !== newCurrency) {
        const oldRate = await getExchangeRate('USD', userCurrency);
        const newRate = await getExchangeRate('USD', newCurrency);
        
        // Converter de moeda antiga para USD, depois para nova moeda
        const balanceInUSD = userBalance / oldRate;
        const earningsInUSD = userEarnings / oldRate;
        
        userBalance = balanceInUSD * newRate;
        userEarnings = earningsInUSD * newRate;
        
        userCurrency = newCurrency;
        
        // Salvar dados atualizados
        await saveUserData();
    }
    
    // Atualizar label do modal
    const currencyLabel = document.getElementById('balance-currency-label');
    if (currencyLabel) {
        currencyLabel.textContent = userCurrency;
    }
    
    loadCryptoData();
    updateBalance();
    updateEarnings();
}

// Navegação do dashboard
function showDashboardView(view, event) {
    // Atualizar navegação ativa
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    if (event && event.target) {
        event.target.closest('.nav-item')?.classList.add('active');
    }
    // Mostrar conteúdo apropriado
    if (view === 'home') {
        showDashboardHome();
    } else if (view === 'cards') {
        const dashboardContent = document.getElementById('dashboard-home-content');
        const cardsContent = document.getElementById('cards-content');
        if (dashboardContent) dashboardContent.style.display = 'none';
        if (cardsContent) {
            cardsContent.style.display = 'grid';
            renderCardsCarousel();
        }
    } else {
        showDashboardHome(); // fallback, mostra home
    }
}

function renderCardsCarousel() {
    const cards = [
        { theme: 'blue', label: 'Azul' },
        { theme: 'red', label: 'Vermelho' },
        { theme: 'yellow', label: 'Amarelo' },
        { theme: 'green', label: 'Verde' },
        { theme: 'brasil', label: 'Brasil' },
        { theme: 'russia', label: 'Rússia' },
        { theme: 'diamond', label: 'Diamond' },
        { theme: 'emerald', label: 'Emerald' },
        { theme: 'black', label: 'Black' },
        { theme: 'infinite', label: 'Infinite' },
        { theme: 'ruby', label: 'Ruby' },
        { theme: 'usa', label: 'Estados Unidos' },
    ];
    let html = `<div class='card-carousel-viewport'><div class='card-carousel-track'>`;
    cards.forEach((c, idx) => {
        html += `<div class='card-carousel-item card-${c.theme}-theme'><div class='carousel-card-name'>${c.label}</div></div>`;
    });
    html += `</div></div>`;
    html += `<div class='carousel-controls'><button class='carousel-btn' onclick='moveCarousel(-1)'>&lt;</button> <button class='carousel-btn' onclick='moveCarousel(1)'>&gt;</button></div>`;
    document.getElementById('cards-content').innerHTML = html;
} 
window.moveCarousel = function(dir) {
    const track = document.querySelector('.card-carousel-track');
    if (!track) return;
    const items = Array.from(document.querySelectorAll('.card-carousel-item'));
    let curIdx = items.findIndex(item => item.classList.contains('active'));
    if (curIdx < 0) curIdx = 0;
    let nextIdx = curIdx + dir;
    if (nextIdx < 0) nextIdx = items.length - 1;
    if (nextIdx >= items.length) nextIdx = 0;
    items.forEach(item => item.classList.remove('active'));
    items[nextIdx].classList.add('active');
    track.style.transform = `translateX(-${nextIdx * 100}%)`;
}

// Mostrar página de conta
function showAccountPage() {
    // Atualizar navegação ativa
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.textContent.includes('Conta')) {
            item.classList.add('active');
        }
    });
    
    // Esconder conteúdo do dashboard
    const dashboardContent = document.getElementById('dashboard-home-content');
    const accountContent = document.getElementById('account-content');
    
    if (dashboardContent) dashboardContent.style.display = 'none';
    if (accountContent) {
        accountContent.style.display = 'grid';
        loadAccountData();
    }
}

// Mostrar home do dashboard
function showDashboardHome() {
    // Atualizar navegação ativa
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.textContent.includes('Home')) {
            item.classList.add('active');
        }
    });
    
    // Mostrar conteúdo do dashboard
    const dashboardContent = document.getElementById('dashboard-home-content');
    const accountContent = document.getElementById('account-content');
    
    if (dashboardContent) dashboardContent.style.display = 'grid';
    if (accountContent) accountContent.style.display = 'none';
}

// Carregar dados da conta
async function loadAccountData() {
    if (!currentUser) return;
    
    const userName = currentUser.name;
    const userEmail = currentUser.email;
    
    // Atualizar header
    document.getElementById('account-name').textContent = userName;
    document.getElementById('account-email').textContent = userEmail;
    
    // Avatar
    const initial = userName.charAt(0).toUpperCase();
    document.getElementById('account-avatar-large').textContent = initial;
    
    // Preencher formulário
    document.getElementById('account-name-input').value = userName;
    document.getElementById('account-email-input').value = userEmail;
    
    // Atualizar campo de moeda na conta
    const currencyLabel = document.getElementById('account-currency-label');
    if (currencyLabel) {
        currencyLabel.textContent = userCurrency;
    }
    
    // Atualizar estatísticas
    document.getElementById('account-balance').textContent = formatCurrency(userBalance, userCurrency);
    document.getElementById('account-earnings').textContent = formatCurrency(userEarnings, userCurrency);
    
    // Contar criptomoedas
    const cryptoCount = cryptoData ? cryptoData.length : 0;
    document.getElementById('account-cryptos').textContent = cryptoCount;
    
    // Carregar histórico de transações
    loadTransactionHistory();
}

// Carregar histórico de transações
function loadTransactionHistory() {
    const transactionsList = document.getElementById('transactions-list');
    if (!transactionsList) return;
    
    const email = currentUser?.email || 'demo@frizbank.com';
    const savedTransactions = localStorage.getItem(`transactions_${email}`);
    const transactions = savedTransactions ? JSON.parse(savedTransactions) : [];
    
    if (transactions.length === 0) {
        transactionsList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">Nenhuma transação ainda</p>';
        return;
    }
    
    transactionsList.innerHTML = transactions.slice(-10).reverse().map(transaction => {
        const date = new Date(transaction.date);
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const amount = transaction.amount;
        const isPositive = amount > 0;
        const icon = isPositive ? '➕' : '➖';
        
        return `
            <div class="transaction-item">
                <div class="transaction-icon">${icon}</div>
                <div class="transaction-details">
                    <div class="transaction-title">${transaction.description || (isPositive ? 'Saldo adicionado' : 'Saldo enviado')}</div>
                    <div class="transaction-date">${dateStr} às ${timeStr}</div>
                </div>
                <div class="transaction-amount ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '+' : ''}${formatCurrency(amount, userCurrency)}
                </div>
            </div>
        `;
    }).join('');
}

// Salvar informações da conta
async function saveAccountInfo() {
    if (!currentUser) return;
    
    const newName = document.getElementById('account-name-input').value.trim();
    const newEmail = document.getElementById('account-email-input').value.trim();
    
    if (!newName || !newEmail) {
        alert('Por favor, preencha todos os campos.');
        return;
    }
    
    // Atualizar usuário
    currentUser.name = newName;
    currentUser.email = newEmail;
    
    // Salvar no localStorage
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.email === currentUser.email);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));
    }
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Atualizar dados da conta
    await loadAccountData();
    
    // Atualizar header do dashboard
    document.getElementById('user-name-display-header').textContent = newName;
    document.getElementById('card-name').textContent = newName.toUpperCase();
    const avatarEl = document.getElementById('user-avatar-initial');
    if (avatarEl) avatarEl.textContent = newName.charAt(0).toUpperCase();
    
    alert('Informações salvas com sucesso!');
}

// Reconfigurar reconhecimento facial
function reconfigureFaceRecognition() {
    if (!currentUser) return;
    
    if (confirm('Deseja reconfigurar seu reconhecimento facial? Isso irá remover o registro anterior.')) {
        const email = currentUser.email;
        localStorage.removeItem(`faceDescriptors_${email}`);
        showFaceRecognition(email);
    }
}

// Alterar senha
function changePassword() {
    const newPassword = prompt('Digite sua nova senha (mínimo 6 caracteres):');
    
    if (!newPassword || newPassword.length < 6) {
        alert('Senha deve ter no mínimo 6 caracteres.');
        return;
    }
    
    const confirmPassword = prompt('Confirme sua nova senha:');
    
    if (newPassword !== confirmPassword) {
        alert('As senhas não coincidem.');
        return;
    }
    
    // Atualizar senha
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.email === currentUser.email);
    if (userIndex !== -1) {
        users[userIndex].password = newPassword;
        localStorage.setItem('users', JSON.stringify(users));
        alert('Senha alterada com sucesso!');
    }
}

// Mostrar todas as criptos
function showAllCryptos() {
    // Implementar modal ou página com todas as criptos
    alert('Funcionalidade em desenvolvimento!');
}

// Formatar moeda
function formatCurrency(value, currency) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
    }).format(value);
}

// Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    // Limpar intervalos
    if (window.earningsInterval) {
        clearInterval(window.earningsInterval);
        window.earningsInterval = null;
    }
    
    showLanding();
}

// Modais
function openAddBalanceModal() {
    const modal = document.getElementById('add-balance-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('balance-amount').value = '';
        
        // Atualizar label com a moeda atual
        const currencyLabel = document.getElementById('balance-currency-label');
        if (currencyLabel) {
            currencyLabel.textContent = userCurrency;
        }
    }
}

function closeAddBalanceModal() {
    const modal = document.getElementById('add-balance-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function openSendModal() {
    const modal = document.getElementById('send-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('send-address').value = '';
        document.getElementById('send-amount').value = '';
    }
}

function closeSendModal() {
    const modal = document.getElementById('send-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Adicionar saldo
async function addBalance() {
    const amount = parseFloat(document.getElementById('balance-amount').value);
    const method = document.getElementById('balance-method').value;
    
    if (!amount || amount <= 0) {
        alert('Por favor, insira um valor válido.');
        return;
    }
    
    // O valor já está na moeda do usuário, adicionar diretamente
    userBalance += amount;
    
    // Salvar transação
    const email = currentUser?.email || 'demo@frizbank.com';
    const savedTransactions = localStorage.getItem(`transactions_${email}`);
    const transactions = savedTransactions ? JSON.parse(savedTransactions) : [];
    
    transactions.push({
        date: new Date().toISOString(),
        amount: amount,
        description: `Saldo adicionado via ${method === 'card' ? 'Cartão de Crédito' : method === 'pix' ? 'PIX' : 'Transferência Bancária'}`,
        type: 'deposit'
    });
    
    localStorage.setItem(`transactions_${email}`, JSON.stringify(transactions));
    
    // Salvar dados (será convertido para USD internamente)
    await saveUserData();
    updateBalance();
    
    // Atualizar página de conta se estiver aberta
    const accountContent = document.getElementById('account-content');
    if (accountContent && accountContent.style.display !== 'none') {
        loadAccountData();
    }
    
    const methodName = method === 'card' ? 'Cartão de Crédito' : method === 'pix' ? 'PIX' : 'Transferência Bancária';
    alert(`Saldo de ${formatCurrency(amount, userCurrency)} adicionado com sucesso via ${methodName}!`);
    closeAddBalanceModal();
}

// Enviar cripto
async function sendCrypto() {
    const address = document.getElementById('send-address').value.trim();
    const amount = parseFloat(document.getElementById('send-amount').value);
    if (!address) {
        alert('Por favor, insira um e-mail de conta destino ou chave Pix válida.');
        return;
    }
    if (!amount || amount <= 0) {
        alert('Por favor, insira um valor válido.');
        return;
    }
    if (amount > userBalance) {
        alert('Saldo insuficiente.');
        return;
    }
    // Buscar destinatário
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const toUser = users.find(u => u.email === address);
    // Subtrair do saldo do remetente
    userBalance -= amount;
    // Salvar transação saída
    const email = currentUser?.email || 'demo@frizbank.com';
    const savedTransactions = localStorage.getItem(`transactions_${email}`);
    const transactions = savedTransactions ? JSON.parse(savedTransactions) : [];
    if (toUser) {
        transactions.push({
            date: new Date().toISOString(),
            amount: -amount,
            description: `Transferido para ${address}`,
            type: 'send',
            address
        });
        localStorage.setItem(`transactions_${email}`, JSON.stringify(transactions));
        // Adicionar saldo e transação no destinatário
        const destBalanceKey = `balance_${address}`;
        const destTransKey = `transactions_${address}`;
        const destSavedBalance = parseFloat(localStorage.getItem(destBalanceKey) || '0');
        const destSavedTransactions = localStorage.getItem(destTransKey);
        const destTransactions = destSavedTransactions ? JSON.parse(destSavedTransactions) : [];
        // Atualiza saldo na moeda local do destino
        let destRate = 1;
        try {
            destRate = await getExchangeRate(userCurrency, users.find(u => u.email === address)?.currency || userCurrency);
        } catch { destRate = 1; }
        localStorage.setItem(destBalanceKey, (destSavedBalance + amount/destRate).toString());
        destTransactions.push({
            date: new Date().toISOString(),
            amount: amount/destRate,
            description: `Recebido de ${email}`,
            type: 'receive',
            address: email
        });
        localStorage.setItem(destTransKey, JSON.stringify(destTransactions));
        alert(`Transferência de ${formatCurrency(amount, userCurrency)} realizada com sucesso para ${address}.`);
    } else {
        // Chave aleatória (Pix, fake, não "cai" em ninguém)
        transactions.push({
            date: new Date().toISOString(),
            amount: -amount,
            description: `Enviado para chave/conta externa (${address})`,
            type: 'send',
            address
        });
        localStorage.setItem(`transactions_${email}`, JSON.stringify(transactions));
        alert(`Transferência de ${formatCurrency(amount, userCurrency)} enviada
para ${address}. (conta externa)`);
    }
    await saveUserData();
    updateBalance();
    // Atualizar página de conta se estiver aberta
    const accountContent = document.getElementById('account-content');
    if (accountContent && accountContent.style.display !== 'none') {
        loadAccountData();
    }
    closeSendModal();
}

// Modo Dark
function loadDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    const toggle = document.getElementById('dark-mode-toggle');
    
    if (toggle) {
        toggle.checked = isDark;
    }
    
    if (isDark) {
        document.body.classList.add('dark-mode');
    }
}

function toggleDarkMode() {
    const toggle = document.getElementById('dark-mode-toggle');
    const isDark = toggle.checked;
    
    if (isDark) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'true');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'false');
    }
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const addModal = document.getElementById('add-balance-modal');
    const sendModal = document.getElementById('send-modal');
    
    if (event.target === addModal) {
        closeAddBalanceModal();
    }
    if (event.target === sendModal) {
        closeSendModal();
    }
}

// Toggle de senha
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const toggle = input.nextElementSibling;
    const eyeIcon = toggle.querySelector('.eye-icon');
    
    if (input.type === 'password') {
        input.type = 'text';
        eyeIcon.textContent = '🙈';
    } else {
        input.type = 'password';
        eyeIcon.textContent = '👁️';
    }
}

// Esqueceu senha
function showForgotPassword() {
    alert('Funcionalidade de recuperação de senha em desenvolvimento!');
}

// Inicializar preview do dashboard na tela de cadastro
function initializeRegisterPreviewChart() {
    const registerChart = document.getElementById('register-preview-chart');
    if (registerChart && !window.registerPreviewChartInstance) {
        const ctx = registerChart.getContext('2d');
        window.registerPreviewChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                datasets: [{
                    label: 'Carteira Simulada',
                    data: [60, 150, 200, 300, 380, 450],
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(139, 92, 246, 0.8)'
                    ],
                    borderRadius: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { display: false },
                        ticks: { display: false }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#64748b',
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
    }
}

// Sobrescrever showRegister para inicializar esse gráfico
const originalShowRegister = showRegister;
showRegister = function() {
    hideAllPages();
    document.getElementById('register-page').classList.add('active');
    setTimeout(() => {
        initializeRegisterPreviewChart();
    }, 100);
}

