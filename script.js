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
const tempSensacao = document.getElementById('temp-sensacao');
const tempMax = document.getElementById('temp-max');
const tempMin = document.getElementById('temp-min');
const umidadeOrvalho = document.getElementById('umidade-orvalho');
const ventoDirecao = document.getElementById('vento-direcao');
const ventoMax = document.getElementById('vento-max');
const pressaoTendencia = document.getElementById('pressao-tendencia');

// --- CONEXÃO COM O FIREBASE (TEMPO REAL) ---
const ultimoDadoRef = database.ref('dados').orderByKey().limitToLast(1);

ultimoDadoRef.on('value', (snapshot) => {
    if (snapshot.exists()) {
        statusText.textContent = "Online";
        statusIcon.className = 'online';

        const ultimoDado = snapshot.val();
        const chaveUnica = Object.keys(ultimoDado)[0];
        const dados = ultimoDado[chaveUnica];

        // 1. Atualiza os valores principais (os que estão sempre visíveis)
        tempValor.textContent = `${parseFloat(dados.temperatura).toFixed(1)} °C`;
        umidadeValor.textContent = `${parseFloat(dados.umidade).toFixed(0)} %`;
        ventoValor.textContent = `${parseFloat(dados.velocidade_vento).toFixed(1)} km/h`;
        pressaoValor.textContent = `${parseFloat(dados.pressao).toFixed(1)} hPa`;
        
        // 2. Atualiza os valores expandidos
        // (Por agora, só preenchemos os que o ESP32 já envia)
        ventoDirecao.textContent = dados.direcao_vento;
        
        // (Os dados de 'sensacao', 'max', 'min' virão do ESP32 no futuro)
        // tempSensacao.textContent = `${parseFloat(dados.sensacao_termica).toFixed(1)} °C`;
        // umidadeOrvalho.textContent = `${parseFloat(dados.ponto_orvalho).toFixed(1)} °C`;

    } else {
        statusText.textContent = "Nenhum dado";
        statusIcon.className = 'offline';
    }
}, (error) => {
    console.error("Erro ao ler dados: ", error);
    statusText.textContent = "Erro de Conexão";
    statusIcon.className = 'offline';
});


// --- LÓGICA PARA TORNAR OS CARDS EXPANSÍVEIS ---
// Esta função é executada assim que o HTML é carregado
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
            if (cardPai) {
                cardPai.classList.toggle('expanded');
            }
        });
    });
});
