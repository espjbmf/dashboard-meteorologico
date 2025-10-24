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
// --- LÓGICA DE CONTROLE DE ABAS (Broadcast Channel) ---
const channel = new BroadcastChannel('estacao_meteorologica_channel');
let isLeader = false;
let leaderCheckTimeout;

function elegerLider() {
  isLeader = true;
  channel.postMessage({ type: 'CLAIM_LEADERSHIP' });
  console.log("Esta aba está tentando se tornar a líder...");
  iniciarConexaoFirebase(); // Só o líder inicia a conexão
}

channel.onmessage = (event) => {
  if (event.data.type === 'CLAIM_LEADERSHIP') {
    if(isLeader) return; // Ignora a própria mensagem
    console.log("Outra aba já é a líder. Esta aba será uma seguidora.");
    isLeader = false;
    clearTimeout(leaderCheckTimeout);
    // document.getElementById('summary-text').textContent = "Dados exibidos pela aba principal.";
  }
  if (event.data.type === 'DATA_UPDATE') {
    if (!isLeader) {
      console.log("Dados recebidos da aba líder.", event.data.payload);
      atualizarPagina(event.data.payload);
    }
  }
};

leaderCheckTimeout = setTimeout(elegerLider, Math.random() * 200 + 50);

// --- LÓGICA DO FIREBASE ---
function iniciarConexaoFirebase() {
    const app = firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    
    // Referência para o status da conexão
    const statusRef = database.ref('.info/connected');
    const statusText = document.getElementById('status-text');
    const statusIcon = document.getElementById('status-icon');

    // Referência para os dados
    const latestDataRef = database.ref('dados').orderByKey().limitToLast(1);

    // Ouvinte para o status da conexão
    statusRef.on('value', (snapshot) => {
        if (snapshot.val() === true) {
            statusText.textContent = "Online";
            statusIcon.className = 'online';
            console.log("Conectado ao Firebase.");
        } else {
            statusText.textContent = "Offline";
            statusIcon.className = 'offline';
            console.log("Desconectado do Firebase.");
        }
    });

    // Ouvinte para novos dados (child_added)
    latestDataRef.on('child_added', (snapshot) => {
        if (isLeader) {
            const latestData = snapshot.val();
            console.log("Aba LÍDER recebeu novo dado do Firebase:", latestData);
            atualizarPagina(latestData);
            channel.postMessage({ type: 'DATA_UPDATE', payload: latestData });
        }
    });
}

// --- FUNÇÕES DE ATUALIZAÇÃO E CÁLCULO ---
function atualizarPagina(data) {
    if (!data) return;

    const temperatura = parseFloat(data.temperatura);
    const umidade = parseFloat(data.umidade);
    const pressao = parseFloat(data.pressao);
    const ventoKmh = parseFloat(data.velocidade_vento);

    const pontoDeOrvalho = calcularPontoOrvalho(temperatura, umidade);
    const sensacaoTermica = calcularSensacaoTermica(temperatura, umidade, ventoKmh);
    // const { texto: potencialTexto, cor: potencialCor } = classificarPotencialEolico(ventoKmh);
    
    // Atualiza os valores principais (visíveis)
    document.getElementById('temp-valor').textContent = `${temperatura.toFixed(1)} °C`;
    document.getElementById('umidade-valor').textContent = `${umidade.toFixed(0)} %`;
    document.getElementById('vento-valor').textContent = `${ventoKmh.toFixed(1)} km/h`;
    document.getElementById('pressao-valor').textContent = `${pressao ? pressao.toFixed(1) : '--'} hPa`;

    // Atualiza os valores expandidos (escondidos)
    document.getElementById('temp-sensacao').textContent = `${sensacaoTermica} °C`;
    document.getElementById('umidade-orvalho').textContent = `${pontoDeOrvalho} °C`;
    document.getElementById('vento-direcao').textContent = data.direcao_vento;
    
    // (Lógica para o sumário, se você tiver)
    // const { texto: sumarioTexto, icone } = analisarCondicoes(temperatura, umidade, ventoKmh, pontoDeOrvalho);
    // document.getElementById('summary-text').textContent = sumarioTexto;
    // document.getElementById('summary-icon').querySelector('svg').innerHTML = icone;
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

// (As funções analisarCondicoes e classificarPotencialEolico não estão a ser usadas
// no HTML/CSS atual, mas deixo-as aqui caso queira usá-las no futuro.)

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


// --- LÓGICA PARA TORNAR OS CARDS EXPANSÍVEIS ---
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
            if (cardPai && !cardPai.classList.contains('card-summary')) { // Ignora o card de sumário
                cardPai.classList.toggle('expanded');
            }
        });
    });
});
