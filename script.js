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

// --- ELEMENTOS DO HTML (VALORES EXPANDIDOS) ---
// Note que estes IDs vêm do seu HTML e são preenchidos pelos dados do ESP32
const tempSensacao = document.getElementById('sensacao-valor');
const tempMax = document.getElementById('temp-max-dia');
const tempMin = document.getElementById('temp-min-dia');
const umidadeOrvalho = document.getElementById('ponto-orvalho-valor');
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

        // 1. CONVERSÃO E DADOS PRINCIPAIS
        const temperatura = parseFloat(data.temperatura);
        const umidade = parseFloat(data.umidade);
        const pressao = parseFloat(data.pressao);
        const ventoKmh = parseFloat(data.velocidade_vento);

        // DADOS DE CÁLCULO DO ESP32 (agora lidos)
        const sensacaoTermica = parseFloat(data.sensacao_termica_calculada);
        const pontoDeOrvalho = parseFloat(data.ponto_orvalho_calculado);
        const { texto: potencialTexto, cor: potencialCor } = classificarPotencialEolico(ventoKmh);


        // --- ATUALIZA VALORES PRINCIPAIS (VISÍVEIS) ---
        document.getElementById('temp-externa-valor').innerHTML = `${temperatura.toFixed(1)}<span> &deg;C</span>`;
        document.getElementById('umid-valor').innerHTML = `${umidade.toFixed(1)}<span> %</span>`;
        document.getElementById('vento-valor').innerHTML = `${ventoKmh.toFixed(1)}<span> km/h</span>`;
        document.getElementById('pressao-valor').innerHTML = `${pressao ? pressao.toFixed(1) : '--'}<span> hPa</span>`;


        // --- 2. ATUALIZA VALORES EXPANDIDOS E MIN/MAX (CRUCIAL) ---
        
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
        
        // Luz (Novos Sensores)
        luxValor.innerHTML = data.luminosidade_lux ? `${data.luminosidade_lux}<span> lx</span>` : '--<span> lx</span>';
        uvValor.textContent = data.indice_uv || '--';


        // 3. ATUALIZA STATUS E TEXTOS (Lógica de Alerta/Sumário)
        const { texto: sumarioTexto, icone } = analisarCondicoes(temperatura, umidade, ventoKmh, pontoDeOrvalho);
        document.getElementById('summary-text').textContent = sumarioTexto;
        document.getElementById('summary-icon').querySelector('svg').innerHTML = icone;
        preencherDescricoes(sumarioTexto, potencialTexto);
        
        // [O resto da lógica de status/conexão]
        document.getElementById('data-hora').textContent = 'Última atualização: ' + data.timestamp;
        document.getElementById('potencial-eolico-valor').textContent = potencialTexto;
        document.getElementById('potencial-eolico-valor').style.color = potencialCor;


    } else {
        // [Lógica Offline/Sem Dados]
        document.getElementById('summary-text').textContent = "Sem Dados";
    }
}, (error) => {
    console.error("Erro ao ler dados: ", error);
    document.getElementById('summary-text').textContent = "Erro de Conexão Firebase";
});


// --- FUNÇÕES DE CÁLCULO E ANÁLISE (Do seu código original) ---

function calcularPontoOrvalho(temperatura, umidade) {
    if (isNaN(temperatura) || isNaN(umidade)) return NaN;
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
    // [Lógica de análise de condições e ícones - mantida]
    // Ícones SVG
    const ICONE_SOL = '<path d="M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,11H22V13H20V11M2,11H4V13H2V11M11,2V4H13V2H11M11,20V22H13V20H11Z" />';
    const ICONE_NEBLINA = '<path d="M7,15H17A5,5 0 0,0 12,10A5,5 0 0,0 7,15M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M5,17H19A3,3 0 0,0 16,14A3,3 0 0,0 13,17H11A3,3 0 0,0 8,14A3,3 0 0,0 5,17Z" />';
    const ICONE_VENTO = '<path d="M9.5,12.5L12.5,15.5L11,17L8,14M14.5,12.5L11.5,15.5L13,17L16,14M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z" />';
    const ICONE_QUENTE_UMIDO = '<path d="M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2M10,9.5A1.5,1.5 0 0,1 8.5,11A1.5,1.5 0 0,1 7,9.5A1.5,1.5 0 0,1 8.5,8A1.5,1.5 0 0,1 10,9.5M14,9.5A1.5,1.5 0 0,1 12.5,11A1.5,1.5 0 0,1 11,9.5A1.5,1.5 0 0,1 12.5,8A1.5,1.5 0 0,1 14,9.5M17,9.5A1.5,1.5 0 0,1 15.5,11A1.5,1.5 0 0,1 14,9.5A1.5,1.5 0 0,1 15.5,8A1.5,1.5 0 0,1 17,9.5Z" />';
    const ICONE_FRIO = '<path d="M18 11.5C18 13.43 16.43 15 14.5 15S11 13.43 11 11.5 12.57 8 14.5 8 18 9.57 18 11.5M20 11.5C20 8.46 17.54 6 14.5 6S9 8.46 9 11.5C9 13.04 9.61 14.43 10.59 15.41L4.59 21.41L5.41 22.23L12.06 15.58L12.23 15.41C12.92 15.79 13.68 16 14.5 16C17.54 16 20 13.54 20 11.5M5.5 15C3.57 15 2 13.43 2 11.5S3.57 8 5.5 8 9 9.57 9 11.5C9 13.04 8.39 14.43 7.41 15.41L6.59 14.59C7.39 13.79 8 12.7 8 11.5C8 10.12 6.88 9 5.5 9S3 10.12 3 11.5 4.12 14 5.5 14H6.06C5.87 14.32 5.71 14.65 5.59 15H5.5Z" />';
    
    if (isNaN(temperatura) || isNaN(umidade)) {
        return { texto: "Erro nos Sensores", icone: ICONE_NEBLINA };
    }
    if (umidade > 95 && (temperatura - parseFloat(pontoOrvalho) < 2.5)) {
        return { texto: "Neblina / Serração", icone: ICONE_NEBLINA };
    } else if (vento > 35) {
        return { texto: "Ventania", icone: ICONE_VENTO };
    } else if (temperatura > 32) {
        return (umidade > 60) 
            ? { texto: "Tórrido e Abafado", icone: ICONE_QUENTE_UMIDO } 
            : { texto: "Tórrido e Seco", icone: ICONE_SOL };
    } else if (temperatura > 27) {
        return (umidade > 70) 
            ? { texto: "Quente e Abafado", icone: ICONE_QUENTE_UMIDO } 
            : { texto: "Tempo Quente", icone: ICONE_SOL };
    } else if (temperatura > 20) {
        return (umidade < 40)
            ? { texto: "Ameno e Seco", icone: ICONE_SOL }
            : { texto: "Tempo Agradável", icone: ICONE_SOL };
    } else if (temperatura > 13) {
        return (umidade > 80)
            ? { texto: "Fresco e Úmido", icone: ICONE_FRIO }
            : { texto: "Tempo Fresco", icone: ICONE_SOL };
    } else if (temperatura > 5) {
        return (umidade > 80)
            ? { texto: "Frio e Úmido", icone: ICONE_FRIO }
            : { texto: "Tempo Frio", icone: ICONE_FRIO };
    } else { // Abaixo de 5°C
        return (umidade > 80)
            ? { texto: "Muito Frio e Úmido", icone: ICONE_FRIO }
            : { texto: "Muito Frio", icone: ICONE_FRIO };
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
    // Seleciona TODOS os elementos que têm a classe ".card-header"
    const headers = document.querySelectorAll('.card-header');

    // Faz um loop por cada cabeçalho encontrado
    headers.forEach(header => {
        
        // Adiciona um "ouvinte de clique" a este cabeçalho específico
        header.addEventListener('click', () => {
            // Encontra o elemento ".card" pai mais próximo
            const cardPai = header.closest('.card');
            
            // Adiciona ou remove a classe "expanded" do card pai
            if (cardPai && !cardPai.classList.contains('summary-card')) { // Ignora o card de sumário
                cardPai.classList.toggle('expanded');
            }
        });
    });
});
