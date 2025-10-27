// Cole suas credenciais do Firebase aqui
const firebaseConfig = {
  apiKey: "AIzaSyCbLr_6HXcPYL_pjb2oCiIqzl5bnM9GzdQ",
  authDomain: "dados-meteorologicos-ca4f9.firebaseapp.com",
  databaseURL: "https://dados-meteorologicos-ca4f9-default-rtdb.firebaseio.com",
  projectId: "dados-meteorologicos-ca4f9",
  storageBucket: "dados-meteorologicos-ca4f9.appspot.com",
  messagingSenderId: "573048677136",
  appId: "1:573048677136:web:86cae166c47daf024ebb95",
  measurementId: "G-SQXD1CTLX6"
};
// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- ELEMENTOS DO HTML (VALORES PRINCIPAIS) ---
const statusText = document.getElementById('status-text');
const statusIcon = document.getElementById('status-icon');

const tempValor = document.getElementById('temp-valor');
const umidadeValor = document.getElementById('umidade-valor');
const ventoValor = document.getElementById('vento-valor');
const pressaoValor = document.getElementById('pressao-valor');

// --- ELEMENTOS DO HTML (VALORES EXPANDIDOS) ---
const tempSensacao = document.getElementById('sensacao-valor');
const tempMax = document.getElementById('temp-max-dia');
const tempMin = document.getElementById('temp-min-dia');
const umidadeOrvalho = document.getElementById('ponto-orvalho-valor');

// Novas leituras
const umidMax = document.getElementById('umid-max-dia');
const umidMin = document.getElementById('umid-min-dia');
const pressaoMax = document.getElementById('pressao-max-dia');
const pressaoMin = document.getElementById('pressao-min-dia');
const ventoDirecao = document.getElementById('dir-vento-valor');
const ventoMaxDia = document.getElementById('vento-max-dia');
const luxValor = document.getElementById('lux-valor');
const uvValor = document.getElementById('uv-valor');


// --- CONEXÃO COM O FIREBASE (TEMPO REAL) ---
const ultimoDadoRef = database.ref('dados').orderByKey().limitToLast(1);

ultimoDadoRef.on('value', (snapshot) => {
    if (snapshot.exists()) {
        const ultimoDado = snapshot.val();
        const chaveUnica = Object.keys(ultimoDado)[0];
        const data = ultimoDado[chaveUnica];

        statusText.textContent = "Online";
        statusIcon.className = 'online';

        // Converte os valores para números (melhor para cálculo)
        const temperatura = parseFloat(data.temperatura);
        const umidade = parseFloat(data.umidade);
        const pressao = parseFloat(data.pressao);
        const ventoKmh = parseFloat(data.velocidade_vento);
        
        // Dados de cálculo (Calculados no ESP32, lidos no Vercel)
        const sensacaoTermica = parseFloat(data.sensacao_termica_calculada);
        const pontoDeOrvalho = parseFloat(data.ponto_orvalho_calculado);
        const { texto: potencialTexto, cor: potencialCor } = classificarPotencialEolico(ventoKmh);

        // 1. ATUALIZA VALORES PRINCIPAIS (VISÍVEIS)
        tempValor.innerHTML = `${temperatura.toFixed(1)}<span> &deg;C</span>`;
        umidadeValor.innerHTML = `${umidade.toFixed(1)}<span> %</span>`;
        ventoValor.innerHTML = `${ventoKmh.toFixed(1)}<span> km/h</span>`;
        pressaoValor.innerHTML = `${pressao ? pressao.toFixed(1) : '--'}<span> hPa</span>`;
        
        // 2. ATUALIZA VALORES EXPANDIDOS E MIN/MAX (CRUCIAL)
        // Temperatura
        tempSensacao.innerHTML = `${sensacaoTermica.toFixed(1)}<span> &deg;C</span>`;
        tempMax.textContent = data.temp_max_dia || '--';
        tempMin.textContent = data.temp_min_dia || '--';

        // Umidade
        umidMax.textContent = data.umid_max_dia || '--';
        umidMin.textContent = data.umid_min_dia || '--';
        umidadeOrvalho.innerHTML = `${pontoDeOrvalho.toFixed(1)}<span> &deg;C</span>`;

        // Pressão
        pressaoMax.textContent = data.pressao_max_dia || '--';
        pressaoMin.textContent = data.pressao_min_dia || '--';

        // Vento
        ventoDirecao.textContent = data.direcao_vento || '--';
        ventoMaxDia.textContent = data.vento_max_dia || '--';
        
        // Luz
        luxValor.innerHTML = data.luminosidade_lux ? `${data.luminosidade_lux}<span> lx</span>` : '--<span> lx</span>';
        uvValor.textContent = data.indice_uv || '--';


        // 3. ATUALIZA STATUS E TEXTOS
        document.getElementById('data-hora').textContent = 'Última atualização: ' + data.timestamp;
        document.getElementById('potencial-eolico-valor').textContent = potencialTexto;
        document.getElementById('potencial-eolico-valor').style.color = potencialCor;
        
        const { texto: sumarioTexto, icone } = analisarCondicoes(temperatura, umidade, ventoKmh, pontoDeOrvalho);
        document.getElementById('summary-text').textContent = sumarioTexto;
        document.getElementById('summary-icon').querySelector('svg').innerHTML = icone;
        preencherDescricoes(sumarioTexto, potencialTexto);


    } else {
        statusText.textContent = "Nenhum dado";
        statusIcon.className = 'offline';
    }
}, (error) => {
    console.error("Erro ao ler dados: ", error);
    statusText.textContent = "Erro de Conexão";
    statusIcon.className = 'offline';
});


// --- FUNÇÕES DE CÁLCULO E ANÁLISE (Mantidas do seu código original) ---
// (Estas funções são mantidas para evitar erros de referência no resto do seu JS)

function calcularPontoOrvalho(temperatura, umidade) {
    if (isNaN(temperatura) || isNaN(umidade)) return NaN; // Retorna NaN se inválido
    const b = 17.625; const c = 243.04;
    const gama = Math.log(umidade / 100.0) + (b * temperatura) / (c + temperatura);
    const pontoOrvalho = (c * gama) / (b - gama);
    return pontoOrvalho;
}

function classificarPotencialEolico(ventoKmh) {
    if (isNaN(ventoKmh)) return { texto: '--', cor: '#e1e1e1' };
    if (ventoKmh > 30) {
        return { texto: 'Forte', cor: '#f0ad4e' };
    } else if (ventoKmh > 15) {
        return { texto: 'Moderado', cor: '#28a745' };
    } else if (ventoKmh > 5) {
        return { texto: 'Branda', cor: '#00bcd4' };
    } else {
        return { texto: 'Calmo', cor: '#8a8d93' };
    }
}

function analisarCondicoes(temperatura, umidade, vento, pontoOrvalho) {
    // Lógica de ícones e texto (omitida para brevidade, mas está no seu código original)
    const ICONE_SOL = '<path d="M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,11H22V13H20V11M2,11H4V13H2V11M11,2V4H13V2H11M11,20V22H13V20H11Z" />';
    const ICONE_NEBLINA = '<path d="M7,15H17A5,5 0 0,0 12,10A5,5 0 0,0 7,15M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M5,17H19A3,3 0 0,0 16,14A3,3 0 0,0 13,17H11A3,3 0 0,0 8,14A3,3 0 0,0 5,17Z" />';
    
    if (isNaN(temperatura)) return { texto: "Erro nos Sensores", icone: ICONE_NEBLINA };
    
    // Simplificamos a lógica para rodar no browser:
    if (umidade > 95 && (temperatura - parseFloat(pontoOrvalho) < 2.5)) {
        return { texto: "Neblina / Serração", icone: ICONE_NEBLINA };
    } else if (temperatura > 25 && umidade > 70) {
        return { texto: "Quente e Abafado", icone: ICONE_NEBLINA };
    } else {
        return { texto: "Tempo Agradável", icone: ICONE_SOL };
    }
}

function preencherDescricoes(sumarioTexto, potencialTexto) {
    const descPotencial = {
        'Forte': "Geração de energia significativa. Ventos acima de 30 km/h.",
        'Moderado': "Bom potencial para geração de energia. Ventos entre 15 e 30 km/h.",
        'Branda': "Potencial baixo, suficiente para pequenas turbinas. Ventos entre 5 e 15 km/h.",
        'Calmo': "Sem potencial para geração de energia. Ventos abaixo de 5 km/h.",
        '--': "Sem dados de vento para calcular."
    };
    document.getElementById('potencial-descricao').textContent = descPotencial[potencialTexto] || "--";
    document.getElementById('orvalho-descricao').textContent = "Temperatura na qual o ar fica 100% saturado e a água se condensa, formando orvalho ou neblina.";
    document.getElementById('sensacao-descricao').textContent = "Percepção da temperatura pelo corpo humano, combinando ar, umidade e vento.";
    document.getElementById('direcao-descricao').textContent = "Indica a direção de onde o vento está a soprar (ex: 'N' = Vento Norte).";
    document.getElementById('summary-descricao').textContent = sumarioTexto; 
}


// --- LÓGICA PARA TORNAR OS CARDS EXPANSÍVEIS (SEMPRE ABERTA) ---
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.card').forEach(card => {
        const header = card.querySelector('.card-header');
        if (header) {
            header.addEventListener('click', () => {
                card.classList.toggle('expanded');
            });
        }
    });
});
