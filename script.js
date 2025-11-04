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

// --- VARIÁVEIS DE CONTROLE DE INATIVIDADE ---
// Inicializa com o tempo de carregamento da página para começar a contagem de inatividade.
let lastDataTimestamp = Date.now(); // Armazena o timestamp da última atualização (em ms) 
// [AJUSTADO PARA TESTES] 6 minutos em milissegundos
const INACTIVITY_LIMIT_MS = 6 * 60 * 1000; 
let inactivityCheckInterval;

// --- LÓGICA DE CONTROLE DE ABAS (Broadcast Channel) ---
const channel = new BroadcastChannel('estacao_meteorologica_channel');
let isLeader = false;
let leaderCheckTimeout;

function elegerLider() {
    isLeader = true;
    channel.postMessage({ type: 'CLAIM_LEADERSHIP' });
    console.log("Esta aba está tentando se tornar a líder...");
    
    // Força uma checagem de inatividade imediata para resolver o problema de "piscada".
    checkForInactivity(); 
    
    iniciarConexaoFirebase(); // Só o líder inicia a conexão
    startInactivityCheck(); // Inicia a checagem de inatividade (só no líder)
}

channel.onmessage = (event) => {
    if (event.data.type === 'CLAIM_LEADERSHIP') {
        if(isLeader) return; 
        console.log("Outra aba já é a líder. Esta aba será uma seguidora.");
        isLeader = false;
        clearTimeout(leaderCheckTimeout);
        document.getElementById('summary-text').textContent = "Dados exibidos pela aba principal.";
        stopInactivityCheck(); 
    }
    if (event.data.type === 'DATA_UPDATE') {
        lastDataTimestamp = Date.now(); 
        hideInactivityWarning(); 
        
        if (!isLeader) {
            console.log("Dados recebidos da aba líder.", event.data.payload);
            atualizarPagina(event.data.payload);
        }
    }
    if (event.data.type === 'INACTIVITY_WARNING') {
        if (!isLeader) {
            showInactivityWarning();
        }
    }
    if (event.data.type === 'DATA_RESUMED') {
        if (!isLeader) {
            hideInactivityWarning();
        }
    }
};

leaderCheckTimeout = setTimeout(elegerLider, Math.random() * 200 + 50);

// --- LÓGICA DE CHECAGEM DE INATIVIDADE ---

function startInactivityCheck() {
    if (inactivityCheckInterval) {
        clearInterval(inactivityCheckInterval);
    }
    inactivityCheckInterval = setInterval(checkForInactivity, 5 * 60 * 1000); 
    console.log("Checagem de inatividade iniciada.");
}

function stopInactivityCheck() {
    if (inactivityCheckInterval) {
        clearInterval(inactivityCheckInterval);
        inactivityCheckInterval = null;
    }
    console.log("Checagem de inatividade parada.");
}

function checkForInactivity() {
    if (!isLeader) return; 

    const currentTime = Date.now();
    const timeSinceLastUpdate = currentTime - lastDataTimestamp; 

    if (timeSinceLastUpdate > INACTIVITY_LIMIT_MS) {
        console.warn(`Alerta de Inatividade: Última atualização foi há ${Math.round(timeSinceLastUpdate / 60000)} minutos. (Limite: 6 min)`);
        showInactivityWarning();
        channel.postMessage({ type: 'INACTIVITY_WARNING' }); 
    } else {
        if (document.body.classList.contains('inactivity-warning-active')) {
            hideInactivityWarning();
            channel.postMessage({ type: 'DATA_RESUMED' });
        }
    }
}

function showInactivityWarning() {
    // [NOVO TEMA] Adiciona a classe que muda o tema no CSS para vermelho
    document.body.classList.add('inactivity-warning-active');
    document.getElementById('inactivity-message').style.display = 'block';
    document.getElementById('summary-text').textContent = "Problemas Técnicos";
    
    const date = new Date(lastDataTimestamp);
    document.getElementById('inactivity-message').querySelector('p:nth-child(3)').textContent = 
        `A estação meteorológica não enviou novos dados nas últimas ${Math.round(INACTIVITY_LIMIT_MS / 60000)} minutos.`;
    document.getElementById('data-hora-inactivity').textContent = `Último dado recebido em: ${date.toLocaleTimeString()} de ${date.toLocaleDateString()}`;
}

function hideInactivityWarning() {
    // [NOVO TEMA] Remove a classe, voltando ao tema original
    document.body.classList.remove('inactivity-warning-active');
    document.getElementById('inactivity-message').style.display = 'none';
    document.getElementById('summary-text').textContent = "Aguardando dados...";
}


// --- LÓGICA DO FIREBASE ---
function iniciarConexaoFirebase() {
    const app = firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const latestDataRef = database.ref('dados').orderByKey().limitToLast(1);

    latestDataRef.on('value', (snapshot) => {
        if (!snapshot.exists()) return;

        const latestDataObj = snapshot.val();
        const pushId = Object.keys(latestDataObj)[0];
        const latestData = latestDataObj[pushId];
        
        if (isLeader) {
            console.log("Aba LÍDER recebeu dado (Value Event) do Firebase:", latestData);
            
            lastDataTimestamp = Date.now(); 
            hideInactivityWarning(); 
            atualizarPagina(latestData);
            channel.postMessage({ type: 'DATA_UPDATE', payload: latestData });
        } else {
             lastDataTimestamp = Date.now();
        }
    });
}


// --- FUNÇÕES DE ATUALIZAÇÃO E CÁLCULO (MANTIDAS) ---

function atualizarPagina(data) {
    if (!data) return;

    const temperatura = parseFloat(data.temperatura);
    const umidade = parseFloat(data.umidade);
    const pressao = parseFloat(data.pressao);
    const ventoKmh = parseFloat(data.velocidade_vento);
    
    const luminosidade = parseFloat(data.luminosidade_lux);
    const indiceUV = parseFloat(data.indice_uv);

    const pontoDeOrvalho = calcularPontoOrvalho(temperatura, umidade);
    const sensacaoTermica = calcularSensacaoTermica(temperatura, umidade, ventoKmh);
    const { texto: potencialTexto, cor: potencialCor } = classificarPotencialEolico(ventoKmh);
    const { texto: uvTexto, cor: uvCor } = classificarRiscoUV(indiceUV); 
    
    document.getElementById('temp-externa-valor').innerHTML = temperatura.toFixed(1) + '<span> &deg;C</span>';
    document.getElementById('umid-valor').innerHTML = umidade.toFixed(1) + '<span> %</span>';
    document.getElementById('ponto-orvalho-valor').innerHTML = pontoDeOrvalho + '<span> &deg;C</span>';
    document.getElementById('sensacao-valor').innerHTML = sensacaoTermica + '<span> &deg;C</span>';
    document.getElementById('pressao-valor').innerHTML = pressao ? pressao.toFixed(1) + '<span> hPa</span>' : '--<span> hPa</span>';
    document.getElementById('vento-valor').innerHTML = ventoKmh.toFixed(1) + '<span> km/h</span>';
    document.getElementById('dir-vento-valor').innerHTML = data.direcao_vento || '--';
    
    document.getElementById('luminosidade-valor').innerHTML = luminosidade.toFixed(0) + '<span> Lux</span>';

    const uvElement = document.getElementById('uv-valor');
    uvElement.textContent = uvTexto;
    uvElement.style.color = uvCor;
    
    const potencialEolicoElement = document.getElementById('potencial-eolico-valor');
    potencialEolicoElement.textContent = potencialTexto;
    potencialEolicoElement.style.color = potencialCor;
    
    document.getElementById('data-hora').textContent = 'Última atualização: ' + data.timestamp;

    const { texto: sumarioTexto, icone } = analisarCondicoes(temperatura, umidade, ventoKmh, pontoOrvalho);
    document.getElementById('summary-text').textContent = sumarioTexto;
    document.getElementById('summary-icon').querySelector('svg').innerHTML = icone;

    preencherDescricoes(sumarioTexto, potencialTexto, uvTexto);
    
    if (data.temp_max_dia) {
       document.getElementById('temp-max-dia').textContent = parseFloat(data.temp_max_dia).toFixed(1) + ' °C';
    }
    if (data.temp_min_dia) {
       document.getElementById('temp-min-dia').textContent = parseFloat(data.temp_min_dia).toFixed(1) + ' °C';
    }
    if (data.umid_max_dia) {
        document.getElementById('umid-max-dia').textContent = parseFloat(data.umid_max_dia).toFixed(1) + ' %';
    }
    if (data.umid_min_dia) {
        document.getElementById('umid-min-dia').textContent = parseFloat(data.umid_min_dia).toFixed(1) + ' %';
    }
    if (data.pressao_max_dia) {
        document.getElementById('pressao-max-dia').textContent = parseFloat(data.pressao_max_dia).toFixed(1) + ' hPa';
    }
    if (data.pressao_min_dia) {
        document.getElementById('pressao-min-dia').textContent = parseFloat(data.pressao_min_dia).toFixed(1) + ' hPa';
    }
    if (data.vento_max_dia) {
        document.getElementById('vento-max-dia').textContent = parseFloat(data.vento_max_dia).toFixed(1) + ' km/h';
    }
    
    if (data.uv_max_dia) {
        document.getElementById('uv-max-dia').textContent = parseFloat(data.uv_max_dia).toFixed(1);
    }
}

function calcularPontoOrvalho(temperatura, umidade) {
    if (isNaN(temperatura) || isNaN(umidade)) return '--';
    const b = 17.625; const c = 243.04;
    const gama = Math.log(umidade / 100.0) + (b * temperatura) / (c + temperatura);
    const pontoOrvalho = (c * gama) / (b - gama);
    return pontoOrvalho.toFixed(1);
}

function calcularSensacaoTermica(tempC, umidade, ventoKmh) {
    if (isNaN(tempC) || isNaN(umidade) || isNaN(ventoKmh)) return tempC.toFixed(1);
    if (tempC <= 10.0 && ventoKmh >= 4.8) {
        const vPow = Math.pow(ventoKmh, 0.16);
        const windChill = 13.12 + 0.6215 * tempC - 11.37 * vPow + 0.3965 * tempC * vPow;
        return windChill.toFixed(1);
    }
    if (tempC >= 27.0 && umidade >= 40.0) {
        const T_f = (tempC * 1.8) + 32; const RH = umidade;
        const HI_f = -42.379 + 2.04901523 * T_f + 10.14333127 * RH - 0.22475541 * T_f * RH - 0.00683783 * T_f * T_f - 0.05481717 * RH * RH + 0.00122874 * T_f * T_f * RH + 0.00085282 * T_f * RH * RH - 0.00000199 * T_f * T_f * RH * RH;
        const HI_c = (HI_f - 32) / 1.8;
        return HI_c.toFixed(1);
    }
    return tempC.toFixed(1);
}

function analisarCondicoes(temperatura, umidade, vento, pontoOrvalho) {
    const ICONE_SOL = '<path d="M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,11H22V13H20V11M2,11H4V13H2V11M11,2V4H13V2H11M11,20V22H13V20H11Z" />';
    const ICONE_NEBLINA = '<path d="M7,15H17A5,5 0 0,0 12,10A5,5 0 0,0 7,15M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M5,17H19A3,3 0 0,0 16,14A3,3 0 0,0 13,17H11A3,3 0 0,0 8,14A3,3 0 0,0 5,17Z" />';
    const ICONE_VENTO = '<path d="M9.5,12.5L12.5,15.5L11,17L8,14M14.5,12.5L11.5,15.5L13,17L16,14M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z" />';
    const ICONE_QUENTE_UMIDO = '<path d="M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2M10,9.5A1.5,1.5 0 0,1 8.5,11A1.5,1.5 0 0,1 7,9.5A1.5,1.5 0 0,1 8.5,8A1.5,1.5 0 0,1 10,9.5M14,9.5A1.5,1.5 0 0,1 12.5,11A1.5,1.5 0 0,1 11,9.5A1.5,1.5 0 0,1 12.5,8A1.5,1.5 0 0,1 14,9.5M17,9.5A1.5,1.5 0 0,1 15.5,11A1.5,1.5 0 0,1 14,9.5A1.5,1.5 0 0,1 15.5,8A1.5,1.5 0 0,1 17,9.5Z" />';
    const ICONE_FRIO = '<path d="M18 11.5C18 13.43 16.43 15 14.5 15S11 13.43 11 11.5 12.57 8 14.5 8 18 9.57 18 11.5M20 11.5C20 8.46 17.54 6 14.5 6S9 8.46 9 11.5C9 13.04 9.61 14.43 10.59 15.41L4.59 21.41L5.41 22.23L12.06 15.58L12.23 15.41C12.92 15.79 13.68 16 14.5 16C17.54 16 20 13.54 20 11.5M5.5 15C3.57 15 2 13.43 2 11.5S3.57 8 5.5 8 9 9.57 9 11.5C9 13.04 8.39 14.43 7.41 15.41L6.59 14.59C7.39 13.79 8 12.7 8 11.5C8 10.12 6.88 9 5.5 9S3 10.12 3 11.5 4.12 14 5.5 14H6.06C5.87 14.32 5.71 14.65 5.59 15H5.5Z" />';
    
    if (isNaN(temperatura) || isNaN(umidade)) {
        return { texto: "Erro nos Sensores", icone: ICONE_NEBLINA };
    }
    if (umidade > 95 && (temperatura - parseFloat(pontoOrvalho) < 2.5)) {
        return { texto: "Neblina / Cerração", icone: ICONE_NEBLINA };
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
    } else { 
        return (umidade > 80)
            ? { texto: "Muito Frio e Úmido", icone: ICONE_FRIO }
            : { texto: "Muito Frio", icone: ICONE_FRIO };
    }
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

function classificarRiscoUV(indiceUV) {
    if (isNaN(indiceUV) || indiceUV < 0) return { texto: '--', cor: '#e1e1e1' };
    const valorUV = indiceUV.toFixed(1);

    if (indiceUV <= 2) {
        return { texto: valorUV + ' (Baixo)', cor: '#28a745' }; 
    } else if (indiceUV <= 5) {
        return { texto: valorUV + ' (Moderado)', cor: '#00bcd4' }; 
    } else if (indiceUV <= 7) {
        return { texto: valorUV + ' (Alto)', cor: '#f0ad4e' }; 
    } else if (indiceUV <= 10) {
        return { texto: valorUV + ' (Muito Alto)', cor: '#dc3545' }; 
    } else {
        return { texto: valorUV + ' (Extremo)', cor: '#880088' }; 
    }
}

function preencherDescricoes(sumarioTexto, potencialTexto, uvTexto) {
    document.getElementById('orvalho-descricao').textContent = "Temperatura na qual o ar fica 100% saturado e a água se condensa, formando orvalho ou neblina.";
    document.getElementById('sensacao-descricao').textContent = "Percepção da temperatura pelo corpo humano, combinando ar, umidade e vento.";
    document.getElementById('direcao-descricao').textContent = "Indica a direção de onde o vento está a soprar (ex: 'N' = Vento Norte).";
    document.getElementById('luminosidade-descricao').textContent = "Medida da intensidade de luz no ambiente (em lux). Um dia ensolarado pode chegar a 100.000 lux.";

    const descUV = {
        'Baixo': "Risco mínimo. Não é necessário proteção solar.",
        'Moderado': "Risco baixo. Use protetor solar se passar muito tempo ao ar livre.",
        'Alto': "Risco moderado. Use camisa, chapéu e protetor solar entre 10h e 16h.",
        'Muito Alto': "Risco alto. Evite exposição ao sol entre 10h e 16h.",
        'Extremo': "Risco muito alto. Evite o sol completamente. Proteção máxima necessária."
    };
    const classificacaoUV = uvTexto.includes('(') ? uvTexto.match(/\((.*?)\)/)[1] : uvTexto;
    document.getElementById('uv-descricao').textContent = descUV[classificacaoUV] || "Nível de radiação ultravioleta.";

    const descSumario = {
        "Neblina / Cerração": "Visibilidade reduzida. O ar está saturado de umidade e a temperatura é igual ao ponto de orvalho.",
        "Ventania": "Ventos fortes. Risco de queda de objetos e poeira.",
        "Tórrido e Abafado": "Calor extremo e muito úmido. Risco elevado de exaustão pelo calor.",
        "Tórrido e Seco": "Calor extremo e ar muito seco. Risco de desidratação e problemas respiratórios.",
        "Quente e Abafado": "Calor e umidade elevados. Desconfortável.",
        "Tempo Quente": "Dia quente com umidade moderada.",
        "Ameno e Seco": "Temperatura agradável, mas com baixa umidade no ar.",
        "Tempo Agradável": "Condições ideais de temperatura e umidade.",
        "Fresco e Úmido": "Tempo fresco com alta umidade, sensação de frio maior.",
        "Tempo Fresco": "Temperatura amena, tendendo para o frio.",
        "Frio e Úmido": "Frio com alta umidade, aumentando a sensação de frio.",
        "Tempo Frio": "Tempo frio, mas com ar relativamente seco.",
        "Muito Frio e Úmido": "Frio intenso e alta umidade. Risco de hipotermia em longas exposições.",
        "Muito Frio": "Frio intenso. Agasalhe-se bem.",
        "Erro nos Sensores": "Um dos sensores de temperatura ou umidade não está a enviar dados."
    };
    document.getElementById('summary-descricao').textContent = descSumario[sumarioTexto] || "Analisando...";

    const descPotencial = {
        'Forte': "Geração de energia significativa. Ventos acima de 30 km/h.",
        'Moderado': "Bom potencial para geração de energia. Ventos entre 15 e 30 km/h.",
        'Branda': "Potencial baixo, suficiente para pequenas turbinas. Ventos entre 5 e 15 km/h.",
        'Calmo': "Sem potencial para geração de energia. Ventos abaixo de 5 km/h.",
        '--': "Sem dados de vento para calcular."
    };
    document.getElementById('potencial-descricao').textContent = descPotencial[potencialTexto] || "--";
}


// --- LÓGICA PARA TORNAR OS CARDS EXPANSÍVEIS ---
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        const header = card.querySelector('.card-header');
        
        if (header) {
            header.addEventListener('click', () => {
                card.classList.toggle('expanded');
            });
        }
    });
});
