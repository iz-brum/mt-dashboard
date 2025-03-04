// FILE: src\utils\ana\telemetry\secaoTelemetria.js

import { DEFAULT_CONFIG } from '#utils/ana/config.js';
import { renderChuvaChart, renderCotaChart, renderVazaoChart } from '#utils/ana/telemetry/telemetricChart.js';

// Estado global para controle do modal
export const modalState = {
    stationCode: null,
    stationName: null,
    activeType: null, // "COTA", "VAZAO" ou "CHUVA"
    isOpen: false,
    lastDataHash: null  // nova propriedade para guardar os dados anteriores
};


// Ajuste seu chartMapping para incluir uma cor para o botão
const chartMapping = {
    CHUVA: {
        canvasId: 'chuvaChartCanvas',
        renderFn: renderChuvaChart,
        buttonColor: 'rgb(154 208 245)' // cor do botão
    },
    COTA: {
        canvasId: 'cotaChartCanvas',
        renderFn: renderCotaChart,
        buttonColor: 'rgb(255 177 193)'
    },
    VAZAO: {
        canvasId: 'vazaoChartCanvas',
        renderFn: renderVazaoChart,
        buttonColor: 'rgb(165 223 223)'
    }
};

/**
 * Atualiza o conteúdo do modal com abas para troca dinâmica entre os tipos de medição.
 * Se os dados da API não mudaram em relação à atualização anterior, a função não refaz a atualização.
 *
 * @param {string} activeType   - Tipo de medição ativo ("CHUVA", "COTA" ou "VAZAO").
 * @param {string} stationCode  - Código da estação.
 * @param {string} stationName  - Nome da estação.
 * @param {boolean} skipSpinner - Se true, não exibe o spinner nem oculta o conteúdo.
 */
export async function updateModalContent(activeType, stationCode, stationName, skipSpinner = false) {
    const telemetricModal = document.getElementById('telemetric-modal');
    const telemetricModalContent = document.getElementById('telemetric-modal-content');
    const telemetricModalText = document.getElementById('telemetricModalText');

    // Se o modal não estiver aberto, não faz nada
    if (!modalState.isOpen) return;

    // Exibe o modal
    telemetricModal.style.display = 'block';

    // Se não for para pular o spinner, oculta o conteúdo e cria o spinner
    if (!skipSpinner) {
        telemetricModalContent.style.display = 'none';
        const existingSpinner = telemetricModal.querySelector('.spinner-overlay');
        if (existingSpinner) telemetricModal.removeChild(existingSpinner);
        const spinnerOverlay = document.createElement('div');
        spinnerOverlay.className = 'spinner-overlay';
        spinnerOverlay.innerHTML = `<div class="spinner"></div>`;
        telemetricModal.appendChild(spinnerOverlay);
    }

    // Atualiza o estado global
    modalState.stationCode = stationCode;
    modalState.stationName = stationName;
    modalState.activeType = activeType;
    modalState.isOpen = true;

    // Chamada à API para obter os dados históricos
    const dateStr = DEFAULT_CONFIG.TELEMETRIC_DATE || new Date().toISOString().slice(0, 10);
    const interval = '24h';
    const apiUrl = `${DEFAULT_CONFIG.DATA_SOURCE_HISTORICO}/${dateStr}/${interval}/${stationCode}`;

    let stationData;
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            telemetricModalText.innerHTML = 'Erro ao buscar dados históricos.';
            return;
        }
        stationData = await response.json();
        if (!stationData || !stationData.registros || stationData.registros.length === 0) {
            telemetricModalText.innerHTML = `<h4>Histórico - ${activeType}</h4>
                                             <p>Nenhum dado encontrado para a estação ${stationCode}.</p>`;
            return;
        }
    } catch (error) {
        telemetricModalText.innerHTML = 'Erro ao buscar dados históricos.';
        console.error(error);
        return;
    } finally {
        if (!skipSpinner) {
            const spinnerOverlay = telemetricModal.querySelector('.spinner-overlay');
            if (spinnerOverlay) telemetricModal.removeChild(spinnerOverlay);
            telemetricModalContent.style.display = 'block';
        }
    }

    // Converte os dados recebidos em string para comparação
    const newDataHash = JSON.stringify(stationData.registros);
    // Se os dados não mudaram em relação à atualização anterior, sai sem atualizar visualmente
    if (modalState.lastDataHash && modalState.lastDataHash === newDataHash) {
        return;
    }
    // Atualiza o hash dos dados
    modalState.lastDataHash = newDataHash;

    // Constrói a interface de abas com os três gráficos
    const headerHTML = `<h4>Estação ${stationCode} - ${stationName}</h4>`;
    const measurementTypes = ["COTA", "VAZAO", "CHUVA"];
    // Container com os 3 canvases
    const chartHTML = `
      <div class="chart-container">
        <canvas id="chuvaChartCanvas"></canvas>
        <canvas id="cotaChartCanvas"></canvas>
        <canvas id="vazaoChartCanvas"></canvas>
      </div>
    `;
    // Abas abaixo do gráfico
    let tabsHTML = `<div class="modal-tabs-below">`;
    measurementTypes.forEach(type => {
        const activeClass = (type === activeType) ? ' active-tab' : '';
        const buttonColor = chartMapping[type].buttonColor;
        tabsHTML += `
          <button class="modal-tab${activeClass}" data-type="${type}" style="background-color: ${buttonColor};">
            ${type}
          </button>`;
    });
    tabsHTML += `</div>`;

    // Atualiza o conteúdo do modal
    telemetricModalText.innerHTML = headerHTML + chartHTML + tabsHTML;

    // Renderiza os três gráficos
    chartMapping.CHUVA.renderFn('chuvaChartCanvas', stationData.registros);
    chartMapping.COTA.renderFn('cotaChartCanvas', stationData.registros);
    chartMapping.VAZAO.renderFn('vazaoChartCanvas', stationData.registros);

    // Exibe apenas o canvas do tipo ativo
    measurementTypes.forEach(type => {
        const canvas = document.getElementById(chartMapping[type].canvasId);
        if (canvas) {
            canvas.style.display = (type === activeType) ? 'block' : 'none';
        }
    });

    // Adiciona listeners para troca de abas (sem recarregar os gráficos)
    const tabButtons = telemetricModalText.querySelectorAll('.modal-tab');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const newType = button.getAttribute('data-type');

            // Atualiza a aba ativa
            tabButtons.forEach(btn => btn.classList.remove('active-tab'));
            button.classList.add('active-tab');

            // Alterna a visibilidade dos canvases
            measurementTypes.forEach(type => {
                const canvas = document.getElementById(chartMapping[type].canvasId);
                if (canvas) {
                    canvas.style.display = (type === newType) ? 'block' : 'none';
                }
            });

            // Aqui está o pulo do gato:
            // Atualiza a variável local 'activeType'
            activeType = newType;

            // E se quiser manter o estado global também atualizado
            modalState.activeType = newType;
        });
    });

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
            ? new Date(station.Data_Hora_Medicao).toLocaleTimeString('pt-BR', {
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
        <span class="data-label">Cota</span>
        <span class="data-value">${nivelMaisRecente}</span>
        ${nivelMaisRecente !== DEFAULT_CONFIG.INVALID_VALUE ? '<span class="data-unit">m</span>' : ''}
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

    // Criação dinâmica do modal (único, se ainda não existir)
    if (!document.getElementById('telemetric-modal')) {
        const telemetricModal = document.createElement('div');
        telemetricModal.id = 'telemetric-modal';
        telemetricModal.className = 'telemetric-modal';

        const telemetricModalContent = document.createElement('div');
        telemetricModalContent.id = 'telemetric-modal-content';
        telemetricModalContent.className = 'telemetric-modal-content';

        const closeTelemetricModal = document.createElement('span');
        closeTelemetricModal.id = 'closeTelemetricModal';
        closeTelemetricModal.className = 'telemetric-close';
        closeTelemetricModal.innerHTML = '&times;';

        const telemetricModalText = document.createElement('div');
        telemetricModalText.id = 'telemetricModalText';

        telemetricModalContent.appendChild(closeTelemetricModal);
        telemetricModalContent.appendChild(telemetricModalText);
        telemetricModal.appendChild(telemetricModalContent);
        document.body.appendChild(telemetricModal);

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

    // Evento de clique nos cards: chama updateModalContent
    setTimeout(() => {
        const cards = document.querySelectorAll('.telemetric-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const measurementType = card.getAttribute('data-measurement');
                const stationCode = card.getAttribute('data-station-code');
                const stationName = card.getAttribute('data-station-name');
                // Atualiza o estado global
                modalState.stationCode = stationCode;
                modalState.stationName = stationName;
                modalState.activeType = measurementType;
                modalState.isOpen = true;

                // Chama a função para atualizar o modal
                updateModalContent(measurementType, stationCode, stationName);
            });
        });
    }, 0);

    return telemetricHTML;
}

export async function fetchTelemetricData(stationCode) {
    try {
        const [year, month, day] = DEFAULT_CONFIG.TELEMETRIC_DATE.split('-');
        const url = `/data/${year}/${month}/${DEFAULT_CONFIG.TELEMETRIC_DATE}/codigoestacao_${stationCode}.json`;
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar dados telemétricos:', error);
        return null;
    }
}
