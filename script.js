// Cole suas credenciais do Firebase aqui
const firebaseConfig = {
  apiKey: "AIzaSyCbLr_6HXcPYL_pjb2oCiIqzl5bnM9GzdQ",
  authDomain: "dados-meteorologicos-ca4f9.firebaseapp.com",
  databaseURL: "https://dados-meteorologicos-ca4f9-default-rtdb.firebaseio.com",
  projectId: "dados-meteorologicos-ca4f9",
  storageBucket: "dados-meteorologicos-ca4f9.appspot.com",
  messagingSenderId: "573048677136",
  appId: "1:573048677136:web:86cae166c47daf024ebb95",
  measurementId: "G-L9V5W9V0GE"
};

// Inicializa o app do Firebase
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Pega uma referência para o "nó" específico onde os dados estão e busca apenas o último registro
const latestDataRef = database.ref('dados').orderByKey().limitToLast(1);

// Função principal que atualiza a página com os novos dados
function atualizarPagina(data) {
    if (!data) return; // Se não houver dados, não faz nada

    // --- Dados do Firebase ---
    const temperatura = parseFloat(data.temperatura);
    const umidade = parseFloat(data.umidade);
    const pressao = parseFloat(data.pressao);
    const ventoKmh = parseFloat(data.velocidade_vento);

    // --- Dados Calculados no Navegador ---
    const pontoDeOrvalho = calcularPontoOrvalho(temperatura, umidade);
    const sensacaoTermica = calcularSensacaoTermica(temperatura, umidade, ventoKmh);
    const { texto: potencialTexto, cor: potencialCor } = classificarPotencialEolico(ventoKmh);
    
    // --- Atualização dos Elementos HTML ---
    document.getElementById('temp-externa-valor').innerHTML = temperatura.toFixed(1) + '<span> &deg;C</span>';
    document.getElementById('umid-valor').innerHTML = umidade.toFixed(1) + '<span> %</span>';
    document.getElementById('ponto-orvalho-valor').innerHTML = pontoDeOrvalho + '<span> &deg;C</span>';
    document.getElementById('sensacao-valor').innerHTML = sensacaoTermica + '<span> &deg;C</span>';
    document.getElementById('pressao-valor').innerHTML = pressao ? pressao.toFixed(1) + '<span> hPa</span>' : '--<span> hPa</span>';
    
    const potencialEolicoElement = document.getElementById('potencial-eolico-valor');
    potencialEolicoElement.textContent = potencialTexto;
    potencialEolicoElement.style.color = potencialCor;
    
    document.getElementById('vento-valor').innerHTML = ventoKmh.toFixed(1) + '<span> km/h</span>';
    document.getElementById('dir-vento-valor').textContent = data.direcao_vento;
    document.getElementById('data-hora').textContent = 'Última atualização: ' + data.timestamp;

    // --- Sumário do Tempo ---
    const { texto: sumarioTexto, icone } = analisarCondicoes(temperatura, umidade, ventoKmh, pontoDeOrvalho);
    document.getElementById('summary-text').textContent = sumarioTexto;
    document.getElementById('summary-icon').querySelector('svg').innerHTML = icone;
}

// Ouve por novos dados em tempo real
latestDataRef.on('child_added', (snapshot) => {
    const latestData = snapshot.val();
    console.log("Novo dado recebido do Firebase:", latestData);
    atualizarPagina(latestData);
});

// --- FUNÇÕES AUXILIARES ---

function calcularPontoOrvalho(temperatura, umidade) {
    if (isNaN(temperatura) || isNaN(umidade)) return '--';
    const b = 17.625;
    const c = 243.04;
    const gama = Math.log(umidade / 100.0) + (b * temperatura) / (c + temperatura);
    const pontoOrvalho = (c * gama) / (b - gama);
    return pontoOrvalho.toFixed(1);
}

function calcularSensacaoTermica(tempC, umidade, ventoKmh) {
    if (isNaN(tempC) || isNaN(umidade) || isNaN(ventoKmh)) {
        return tempC.toFixed(1);
    }
    // Fator de Resfriamento (Wind Chill)
    if (tempC <= 10.0 && ventoKmh >= 4.8) {
        const vPow = Math.pow(ventoKmh, 0.16);
        const windChill = 13.12 + 0.6215 * tempC - 11.37 * vPow + 0.3965 * tempC * vPow;
        return windChill.toFixed(1);
    }
    // Índice de Calor (Heat Index)
    if (tempC >= 27.0 && umidade >= 40.0) {
        const T_f = (tempC * 1.8) + 32;
        const RH = umidade;
        const HI_f = -42.379 + 2.04901523 * T_f + 10.14333127 * RH - 0.22475541 * T_f * RH - 0.00683783 * T_f * T_f - 0.05481717 * RH * RH + 0.00122874 * T_f * T_f * RH + 0.00085282 * T_f * RH * RH - 0.00000199 * T_f * T_f * RH * RH;
        const HI_c = (HI_f - 32) / 1.8;
        return HI_c.toFixed(1);
    }
    // Se nenhuma condição for atendida, a sensação é a própria temperatura
    return tempC.toFixed(1);
}

function analisarCondicoes(temperatura, umidade, vento, pontoOrvalho) {
    const ICONE_SOL = '<path d="M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,11H22V13H20V11M2,11H4V13H2V11M11,2V4H13V2H11M11,20V22H13V20H11Z" />';
    const ICONE_NEBLINA = '<path d="M7,15H17A5,5 0 0,0 12,10A5,5 0 0,0 7,15M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M5,17H19A3,3 0 0,0 16,14A3,3 0 0,0 13,17H11A3,3 0 0,0 8,14A3,3 0 0,0 5,17Z" />';
    const ICONE_VENTO = '<path d="M9.5,12.5L12.5,15.5L11,17L8,14M14.5,12.5L11.5,15.5L13,17L16,14M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z" />';
    
    if (umidade > 95 && (temperatura - parseFloat(pontoOrvalho) < 2.5)) {
        return { texto: "Neblina / Serração", icone: ICONE_NEBLINA };
    } else if (vento > 20) {
        return { texto: "Ventando Forte", icone: ICONE_VENTO };
    } else {
        return { texto: "Tempo Agradável", icone: ICONE_SOL };
    }
}

function classificarPotencialEolico(ventoKmh) {
    if (isNaN(ventoKmh)) return { texto: '--', cor: '#e1e1e1' };

    if (ventoKmh > 30) {
        return { texto: 'Forte', cor: '#f0ad4e' }; // Laranja
    } else if (ventoKmh > 15) {
        return { texto: 'Moderado', cor: '#28a745' }; // Verde
    } else if (ventoKmh > 5) {
        return { texto: 'Branda', cor: '#00bcd4' }; // Azul (ciano)
    } else {
        return { texto: 'Calmo', cor: '#8a8d93' }; // Cinza
    }
}
