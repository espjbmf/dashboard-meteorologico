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
// --- CONFIGURAÇÃO DO FIREBASE ---
// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- ELEMENTOS DO HTML ---
const statusText = document.getElementById('status-text');
const statusIcon = document.getElementById('status-icon');

const tempValor = document.getElementById('temp-valor');
const umidadeValor = document.getElementById('umidade-valor');
const ventoValor = document.getElementById('vento-valor');
const pressaoValor = document.getElementById('pressao-valor');

// Placeholders para os dados expandidos (ainda não estão a ser preenchidos)
const tempSensacao = document.getElementById('temp-sensacao');
const tempMax = document.getElementById('temp-max');
const tempMin = document.getElementById('temp-min');
const umidadeOrvalho = document.getElementById('umidade-orvalho');
const ventoDirecao = document.getElementById('vento-direcao');
const ventoMax = document.getElementById('vento-max');
const pressaoTendencia = document.getElementById('pressao-tendencia');

// --- CONEXÃO COM O FIREBASE (TEMPO REAL) ---

// 1. Referência para o último dado em "dados"
const ultimoDadoRef = database.ref('dados').orderByKey().limitToLast(1);

// 2. Ouvinte de "valor"
ultimoDadoRef.on('value', (snapshot) => {
    if (snapshot.exists()) {
        statusText.textContent = "Online";
        statusIcon.className = 'online';

        // O Firebase retorna um objeto com o último ID, então precisamos "entrar" nele
        const ultimoDado = snapshot.val();
        const chaveUnica = Object.keys(ultimoDado)[0];
        const dados = ultimoDado[chaveUnica];

        // 3. Atualiza os valores principais nos cards
        tempValor.textContent = `${parseFloat(dados.temperatura).toFixed(1)} °C`;
        umidadeValor.textContent = `${parseFloat(dados.umidade).toFixed(0)} %`;
        ventoValor.textContent = `${parseFloat(dados.velocidade_vento).toFixed(1)} km/h`;
        pressaoValor.textContent = `${parseFloat(dados.pressao).toFixed(1)} hPa`;
        
        // --- PREENCHIMENTO DOS DADOS EXPANDIDOS ---
        // (Por agora, vamos preencher os que já temos. Máx/Mín virão do ESP32 depois)
        
        ventoDirecao.textContent = dados.direcao_vento;
        
        // (Deixamos os outros com "--" até o ESP32 enviar os dados)
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
// Adiciona o "ouvinte de clique" a cada card

// Espera o HTML carregar completamente antes de adicionar os ouvintes
document.addEventListener('DOMContentLoaded', () => {

    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        // Adiciona o ouvinte ao cabeçalho do card
        const header = card.querySelector('.card-header');
        if (header) {
            header.addEventListener('click', () => {
                // Adiciona ou remove a classe "expanded" do card pai
                card.classList.toggle('expanded');
            });
        }
    });

});
