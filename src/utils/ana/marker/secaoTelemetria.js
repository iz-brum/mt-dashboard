/**
 * @file src/utils/ana/marker/secaoTelemetria.js
 */

import { StationMarkers } from '#components/ana/gerenciadorDeMarcadores.js';

import {
    DEFAULT_CONFIG,
    TELEMETRIC_MODAL_CONFIG,
    TELEMETRIC_CHART_CONFIG
} from '#utils/config.js';
import {
    renderChuvaChart,
    renderCotaChart,
    renderVazaoChart
} from '#utils/ana/telemetry/telemetricChart.js';


// Estado global para controle do modal
export const modalState = {
    stationCode: null,
    stationName: null,
    stationMunicipio_Nome: null,
    activeType: null, // "COTA", "VAZAO" ou "CHUVA"
    isOpen: false,
    lastDataHash: null, // Guarda os dados anteriores para evitar atualizações desnecessárias
    selectedInterval: '24h' // Intervalo atual selecionado no modal
};

// Configuração dos gráficos – mesclando as configurações do modal com as funções de renderização
const chartMapping = {
    CHUVA: {
        ...TELEMETRIC_CHART_CONFIG.CHUVA,
        renderFn: renderChuvaChart
    },
    COTA: {
        ...TELEMETRIC_CHART_CONFIG.COTA,
        renderFn: renderCotaChart
    },
    VAZAO: {
        ...TELEMETRIC_CHART_CONFIG.VAZAO,
        renderFn: renderVazaoChart
    }
};

// Função auxiliar para animar o progresso de forma gradual até o valor alvo em um determinado tempo (em ms)
function animateProgressTo(target, duration) {
    return new Promise(resolve => {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        let current = parseFloat(progressBar.style.width) || 0;
        const steps = duration / 50;
        const increment = (target - current) / steps;
        const interval = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(interval);
                progressBar.style.width = `${current}%`;
                progressText.textContent = `${Math.floor(current)}%`;
                resolve();
            } else {
                progressBar.style.width = `${current}%`;
                progressText.textContent = `${Math.floor(current)}%`;
            }
        }, 50);
    });
}

export async function updateModalContent(
    activeType,             // "COTA", "VAZAO" ou "CHUVA"
    stationCode,            // ex.: "17410100"
    stationName,            // ex.: "UHE SÃO MANOEL JUSANTE 2"
    stationMunicipio_Nome,  // ex.: "APIACÁS"
    skipSpinner = false,
    interval
) {
    // Se o parâmetro interval não for fornecido, usa o selecionado anteriormente
    interval = interval || modalState.selectedInterval || '24h';
    modalState.selectedInterval = interval;

    const telemetricModal = document.getElementById(TELEMETRIC_MODAL_CONFIG.modalId);
    const telemetricModalContent = document.getElementById(TELEMETRIC_MODAL_CONFIG.modalContentId);
    const telemetricModalText = document.getElementById(TELEMETRIC_MODAL_CONFIG.modalTextId);

    // Se o modal não estiver aberto, não faz nada
    if (!modalState.isOpen) return;

    // Exibe o modal
    telemetricModal.style.display = 'block';

    // Atualiza o estado global
    modalState.stationCode = stationCode;
    modalState.stationName = stationName;
    modalState.stationMunicipio_Nome = stationMunicipio_Nome;
    modalState.activeType = activeType;
    modalState.isOpen = true;

    // Se não for para pular o spinner, mostra a progress bar
    if (!skipSpinner) {
        telemetricModalContent.style.display = 'none';
        const existingSpinner = telemetricModal.querySelector('.spinner-overlay');
        if (existingSpinner) telemetricModal.removeChild(existingSpinner);

        const spinnerOverlay = document.createElement('div');
        spinnerOverlay.className = 'spinner-overlay';
        spinnerOverlay.innerHTML = `
            <div class="progress-container" style="position: relative;">
                <div class="progress-bar" id="progressBar" style="width: 0%;"></div>
                <div class="progress-text" id="progressText" 
                     style="position: absolute; left: 0; right: 0; text-align: center;">
                     0%
                </div>
                <div class="progress-status" id="progressStatus" style="text-align: center;"></div>
            </div>
        `;
        telemetricModal.appendChild(spinnerOverlay);

        // Inicia em 0%
        await updateProgressBar(0);
        updateProgressStatus("Iniciando...");
    }

    // Define a data base para a consulta
    const dateStr = DEFAULT_CONFIG.TELEMETRIC_DATE || new Date().toISOString().slice(0, 10);
    const apiUrl = `${DEFAULT_CONFIG.DATA_SOURCE_HISTORICO}/${dateStr}/${interval}/${stationCode}`;

    let stationData;
    try {
        updateProgressStatus("Buscando dados...");
        // STEP 1: Buscar os dados da API
        const response = await fetch(apiUrl);
        if (!response.ok) {
            telemetricModalText.innerHTML = 'Erro ao buscar dados históricos.';
            return;
        }
        stationData = await response.json();
        if (!stationData || !stationData.registros || stationData.registros.length === 0) {
            telemetricModalText.innerHTML = `
                <h4>Histórico - ${activeType}</h4>
                <p>Nenhum dado encontrado para a estação ${stationCode}.</p>
            `;
            return;
        }
        // Atualiza o progresso para 40%
        await updateProgressBar(40);
    } catch (error) {
        telemetricModalText.innerHTML = 'Erro ao buscar dados históricos.';
        console.error(error);
        return;
    }

    try {
        updateProgressStatus("Processando dados...");
        // STEP 2: Processamento dos dados (filtros, cálculos, etc. se necessário)
        await updateProgressBar(70);
    } catch (error) {
        telemetricModalText.innerHTML = 'Erro ao processar dados.';
        console.error(error);
        return;
    }

    // Gera um hash simples dos registros
    const newDataHash = JSON.stringify(stationData.registros);
    if (modalState.lastDataHash && modalState.lastDataHash === newDataHash) {
        // Se os dados não mudaram, finaliza o spinner (se houver) e retorna sem atualizar os gráficos
        if (!skipSpinner) {
            await updateProgressBar(100);
            setTimeout(() => {
                const spinnerOverlay = telemetricModal.querySelector('.spinner-overlay');
                if (spinnerOverlay) telemetricModal.removeChild(spinnerOverlay);
                telemetricModalContent.style.display = 'block';
            }, 300);
        }
        return;
    }
    // Atualiza o hash para os novos dados
    modalState.lastDataHash = newDataHash;

    // 1) Detecta se há registro de 1h com chuva acima de 45 mm
    const highRainAlert = stationData.registros.some(r => parseFloat(r.Chuva_Adotada) > 45);

    // 2) Atualiza a propriedade highRainAlert na stationData
    stationData.highRainAlert = highRainAlert;

    // 3) Atualiza o marcador correspondente utilizando o método setHighRainAlert
    StationMarkers.setHighRainAlert(stationCode, highRainAlert);

    const exclamationHTML = highRainAlert ? '<span class="high-rain-alert" style="color: red; font-weight: bold; font-size: 1.2em;">!</span>' : '';

    // Constrói a interface: cabeçalho, container de gráficos e abas
    const headerHTML = `<div>
                            <h4 style="margin: 0px; margin-bottom: 5px;">${stationCode} ${exclamationHTML}</h4>
                            <h5 style="margin: 0px; margin-bottom: 5px;">${stationName}</h5>
                            <p style="margin: 0; margin-bottom: 20px;"><strong>Município:</strong> ${stationMunicipio_Nome}</p>
                        </div>`;

    const chartHTML = `
      <div class="interval-container">
        <span>Intervalo: <select id="intervalSelect"></select></span>
      </div>
      <div class="chart-container">
        <canvas id="${TELEMETRIC_CHART_CONFIG.CHUVA.canvasId}"></canvas>
        <canvas id="${TELEMETRIC_CHART_CONFIG.COTA.canvasId}"></canvas>
        <canvas id="${TELEMETRIC_CHART_CONFIG.VAZAO.canvasId}"></canvas>
      </div>
    `;

    const measurementTypes = ["COTA", "VAZAO", "CHUVA"];
    let tabsHTML = `<div class="modal-tabs-below">`;
    measurementTypes.forEach(type => {
        const activeClass = (type === activeType) ? ' active-tab' : '';
        const buttonColor = chartMapping[type].buttonColor;
        tabsHTML += `
            <button 
                class="modal-tab${activeClass}" 
                data-type="${type}" 
                style="background-color: ${buttonColor};"
            >
              ${type === "COTA" ? "NÍVEL" : type}
            </button>
        `;
    });
    tabsHTML += `</div>`;

    telemetricModalText.innerHTML = headerHTML + chartHTML + tabsHTML;

    // Preenche o select de intervalos
    const intervalSelect = document.getElementById('intervalSelect');
    intervalSelect.innerHTML = '';
    const intervals = [2, 6, 12, 24, 48];
    intervals.forEach((h) => {
        const opt = document.createElement('option');
        opt.value = `${h}h`;
        opt.textContent = `${h}h`;
        if (`${h}h` === modalState.selectedInterval) {
            opt.selected = true;
        }
        intervalSelect.appendChild(opt);
    });

    intervalSelect.addEventListener('change', (e) => {
        const newInterval = e.target.value;
        if (modalState.isOpen) {
            updateModalContent(
                modalState.activeType,            // activeType
                modalState.stationCode,           // stationCode
                modalState.stationName,           // stationName
                modalState.stationMunicipio_Nome, // stationMunicipio_Nome
                false,                            // skipSpinner
                newInterval                       // interval
            );
        }
    });

    // Renderiza os gráficos de telemetria
    if (!skipSpinner) {
        updateProgressStatus("Renderizando gráficos...");
    }
    chartMapping.CHUVA.renderFn(TELEMETRIC_CHART_CONFIG.CHUVA.canvasId, stationData.registros);
    chartMapping.COTA.renderFn(TELEMETRIC_CHART_CONFIG.COTA.canvasId, stationData.registros);
    chartMapping.VAZAO.renderFn(TELEMETRIC_CHART_CONFIG.VAZAO.canvasId, stationData.registros);

    // Esconde os gráficos que não estão ativos
    measurementTypes.forEach(type => {
        const canvas = document.getElementById(chartMapping[type].canvasId);
        if (canvas) {
            canvas.style.display = (type === modalState.activeType) ? 'block' : 'none';
        }
    });

    // Finaliza o progresso e exibe o conteúdo
    if (!skipSpinner) {
        await updateProgressBar(100);
        setTimeout(() => {
            const spinnerOverlay = telemetricModal.querySelector('.spinner-overlay');
            if (spinnerOverlay) telemetricModal.removeChild(spinnerOverlay);
            telemetricModalContent.style.display = 'block';
        }, 300);
    }

    // Adiciona listeners para troca de abas sem re-renderizar os gráficos
    const tabButtons = telemetricModalText.querySelectorAll('.modal-tab');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const newType = button.getAttribute('data-type');
            tabButtons.forEach(btn => btn.classList.remove('active-tab'));
            button.classList.add('active-tab');
            measurementTypes.forEach(type => {
                const canvas = document.getElementById(chartMapping[type].canvasId);
                if (canvas) {
                    canvas.style.display = (type === newType) ? 'block' : 'none';
                }
            });
            modalState.activeType = newType;
        });
    });
}

async function updateProgressBar(percentage) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    if (progressBar && progressText) {
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${Math.floor(percentage)}%`;
        // Atraso curto para suavizar a atualização
        await delay(300);
    }
}

function updateProgressStatus(message) {
    const progressStatus = document.getElementById('progressStatus');
    if (progressStatus) {
        progressStatus.textContent = message;
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function createTelemetricSection(station) {
    let telemetricHTML = '';
    try {
        const dataMedicao = station.Data_Hora_Medicao
            ? new Date(station.Data_Hora_Medicao).toLocaleDateString('pt-BR')
            : 'N/A';
        const horarioMedicao = station.Data_Hora_Medicao
            ? new Date(station.Data_Hora_Medicao).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            })
            : 'N/A';
        const dataAtualizacao = station.Data_Atualizacao
            ? new Date(station.Data_Atualizacao).toLocaleDateString('pt-BR')
            : 'N/A';
        const horarioAtualizacao = station.Data_Atualizacao
            ? new Date(station.Data_Atualizacao).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            })
            : 'N/A';
        const chuvaAcumulada =
            typeof station.chuvaAcumulada === 'number'
                ? station.chuvaAcumulada
                : 'N/A';
        const nivelMaisRecente = station.nivelMaisRecente || DEFAULT_CONFIG.INVALID_VALUE;
        const vazaoMaisRecente = station.vazaoMaisRecente || DEFAULT_CONFIG.INVALID_VALUE;

        telemetricHTML += `
      <div class="telemetric-header">
        <h4 class="telemetric-title">Dados Telemétricos</h4>
        <div class="data-label">
          <span class="time-info" title="Fuso horário UTC-3">
            <img src="assets/icon_horario.png" class="icon-time" alt="Ícone de horário">
            Medição: ${dataMedicao} ${horarioMedicao}
          </span>
          <span class="time-info" title="Fuso horário UTC-3">
            <img src="assets/icon-atualização.png" class="icon-update" alt="Ícone de atualização">
            Atualização: ${dataAtualizacao} ${horarioAtualizacao}
          </span>
        </div>
      </div>
      <div class="telemetric-card" 
           data-measurement="COTA" 
           data-station-code="${station.codigoestacao || ''}"
           data-station-name="${station.Estacao_Nome || DEFAULT_CONFIG.INVALID_VALUE}">
        <span class="data-label">Nível</span>
        <span class="data-value">${nivelMaisRecente}</span>
        ${nivelMaisRecente !== DEFAULT_CONFIG.INVALID_VALUE ? '<span class="data-unit">cm</span>' : ''}
      </div>
      <div class="telemetric-card" 
           data-measurement="VAZAO" 
           data-station-code="${station.codigoestacao || ''}"
           data-station-name="${station.Estacao_Nome || DEFAULT_CONFIG.INVALID_VALUE}">
        <span class="data-label">Vazão</span>
        <span class="data-value">${vazaoMaisRecente}</span>
        ${vazaoMaisRecente !== DEFAULT_CONFIG.INVALID_VALUE ? '<span class="data-unit">m³/s</span>' : ''}
      </div>
      <div class="telemetric-card" 
           data-measurement="CHUVA" 
           data-station-code="${station.codigoestacao || ''}"
           data-station-name="${station.Estacao_Nome || DEFAULT_CONFIG.INVALID_VALUE}">
        <span class="data-label">Chuva</span>
        <span class="data-value">${typeof chuvaAcumulada === 'number' ? chuvaAcumulada.toFixed(2) : chuvaAcumulada}</span>
        ${typeof chuvaAcumulada === 'number' && chuvaAcumulada !== null ? '<span class="data-unit">mm</span>' : ''}
      </div>
    `;
    } catch (error) {
        telemetricHTML += `
      <div class="telemetric-error">
        ⚠️ Não foi possível carregar os dados telemétricos em tempo real
      </div>
    `;
    }

    // Cria o modal de forma dinâmica se ainda não existir
    if (!document.getElementById(TELEMETRIC_MODAL_CONFIG.modalId)) {
        const telemetricModal = document.createElement('div');
        telemetricModal.id = TELEMETRIC_MODAL_CONFIG.modalId;
        telemetricModal.className = 'telemetric-modal';

        const telemetricModalContent = document.createElement('div');
        telemetricModalContent.id = TELEMETRIC_MODAL_CONFIG.modalContentId;
        telemetricModalContent.className = 'telemetric-modal-content';

        const closeTelemetricModal = document.createElement('span');
        closeTelemetricModal.id = TELEMETRIC_MODAL_CONFIG.closeButtonId;
        closeTelemetricModal.className = 'telemetric-close';
        closeTelemetricModal.innerHTML = '&times;';

        const telemetricModalText = document.createElement('div');
        telemetricModalText.id = TELEMETRIC_MODAL_CONFIG.modalTextId;

        telemetricModalContent.appendChild(closeTelemetricModal);
        telemetricModalContent.appendChild(telemetricModalText);
        telemetricModal.appendChild(telemetricModalContent);
        document.body.appendChild(telemetricModal);

        Object.assign(closeTelemetricModal.style, TELEMETRIC_MODAL_CONFIG.closeButtonStyle);
        closeTelemetricModal.addEventListener('click', () => {
            telemetricModal.style.display = 'none';
            modalState.isOpen = false;
        });
        telemetricModal.addEventListener('click', (event) => {
            if (event.target === telemetricModal) {
                telemetricModal.style.display = 'none';
                modalState.isOpen = false;
            }
        });
    }

    // Configura o evento de clique nos cards para atualizar o modal
    setTimeout(() => {
        const cards = document.querySelectorAll('.telemetric-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const measurementType = card.getAttribute('data-measurement');
                const stationCode = card.getAttribute('data-station-code');
                const stationName = card.getAttribute('data-station-name');

                // Pega o nome do município a partir do objeto station
                const stationMunicipio_Nome = station.Municipio_Nome;

                // Abre o modal, definindo como aberto
                modalState.isOpen = true;

                // Chama updateModalContent passando também o nome da cidade,
                // garantindo que os 6 parâmetros sejam passados na ordem correta.
                updateModalContent(
                    measurementType,        // activeType
                    stationCode,            // stationCode
                    stationName,            // stationName
                    stationMunicipio_Nome,  // stationMunicipio_Nome
                    false,                  // skipSpinner
                    '24h'                   // interval
                );
            });
        });
    }, 0);

    return telemetricHTML;
}

export async function fetchTelemetricData(stationCode) {
    try {
        const [year, month] = DEFAULT_CONFIG.TELEMETRIC_DATE.split('-');
        const url = `/data/${year}/${month}/${DEFAULT_CONFIG.TELEMETRIC_DATE}/codigoestacao_${stationCode}.json`;
        // console.log(`[DEBUG] Fetching telemetric data for station ${stationCode} from URL: ${url}`);
        const response = await fetch(url);
        // console.log(`[DEBUG] Response status for station ${stationCode}: ${response.status}`);
        if (!response.ok) {
            // console.error(`[DEBUG] Response not OK for station ${stationCode}: ${response.statusText}`);
            return null;
        }
        const json = await response.json();
        // console.log(`[DEBUG] Data fetched for station ${stationCode}:`, json);
        return json;
    } catch (error) {
        console.error('Erro ao buscar dados telemétricos:', error);
        return null;
    }
}
