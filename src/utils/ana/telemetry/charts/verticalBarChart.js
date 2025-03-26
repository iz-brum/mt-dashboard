import { DEFAULT_CONFIG } from '#utils/config.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
Chart.register(ChartDataLabels);

import {
    Chart,
    CategoryScale,
    LinearScale,
    BarElement,
    BarController,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

Chart.register(
    CategoryScale,
    LinearScale,
    BarElement,
    BarController,
    Title,
    Tooltip,
    Legend
);

/**
 * Renderiza um gráfico de barras verticais com dados fornecidos.
 * Adiciona debug detalhado para depuração dos dados usados no gráfico.
 *
 * @param {string} canvasId - ID do elemento canvas onde o gráfico será renderizado.
 * @param {Object} dataConfig - Configuração dos dados do gráfico.
 * @returns {Chart} Instância do gráfico renderizado.
 */
export function renderVerticalBarChart(canvasId, dataConfig) {
    // console.log("📊 [DEBUG] Iniciando renderização do gráfico...");

    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) {
        console.warn("⚠️ [DEBUG] Canvas não encontrado para o gráfico.");
        return;
    }

    if (Chart.getChart(ctx)) {
        Chart.getChart(ctx).destroy();
    }

    // 🔹 Estruturação dos dados de entrada
    const dataPairs = dataConfig.labels.map((label, i) => ({
        index: i + 1, // Adicionando índice baseado na posição do array
        label,
        shortLabel: label.split(' ').slice(0, 2).join(' '), // Mantém apenas as 2 primeiras palavras
        value: dataConfig.values[i]
    }));

    // 🔹 Filtra valores válidos (não-nulos e maiores que zero)
    const validPairs = dataPairs.filter(pair => typeof pair.value === 'number' && pair.value > 0);
    validPairs.sort((a, b) => b.value - a.value);


    const sortedLabels = validPairs.map(pair => pair.shortLabel);
    const fullLabels = validPairs.map(pair => pair.label);
    const sortedValues = validPairs.map(pair => pair.value);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedLabels,
            datasets: [{
                label: dataConfig.label || '',
                data: sortedValues,
                backgroundColor: dataConfig.backgroundColor || 'rgba(75,192,192,0.5)',
                borderColor: dataConfig.borderColor || 'rgba(75,192,192,1)',
                borderWidth: 1,
                minBarLength: 5
            }]
        },
        options: {
            indexAxis: 'x', // 🔄 Gráfico vertical
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                },
                x: {
                    ticks: {
                        font: { size: 8 },
                        autoSkip: false,
                        maxRotation: 90,
                        minRotation: 35
                    }
                }
            },
            plugins: {
                title: {
                    display: !!dataConfig.title,
                    text: dataConfig.title,
                    font: { size: 17, weight: 'bold' },
                    padding: { top: 10, bottom: -15 }
                },
                legend: {
                    display: dataConfig.showLegend !== undefined ? dataConfig.showLegend : true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        boxWidth: 15,
                        font: { size: 14 }
                    }
                },
                datalabels: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: (tooltipItems) => {
                            const index = tooltipItems[0].dataIndex;
                            return fullLabels[index];
                        }
                    }
                }
            }
        }
    });
}

// 🆕 Ajusta a função para chamar a nova versão do gráfico vertical
let chartInstance = null;
let ultimoDataset = null;

/**
 * Atualiza o gráfico de chuvas por cidade utilizando a média dos valores.
 * Inclui logs de depuração para acompanhar os dados utilizados.
 */
export async function atualizarGraficoDeChuva() {
    try {
        const response = await fetch(DEFAULT_CONFIG.DATA_SOURCE_CHUVA_POR_CIDADE);
        if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);

        const cidadesData = await response.json();

        // 🔹 Filtra cidades com dados válidos para manter consistência (usando média)
        const cidadesValidas = cidadesData
            .filter(item => item.chuvaMedia !== null && item.chuvaMedia > 0)
            .map((item, index) => ({
                index: index + 1,
                cidade: item.cidade,
                chuvaMedia: item.chuvaMedia
            }));

        // 🔄 Verifica se os dados mudaram para evitar re-renderizações desnecessárias
        const novoDataset = JSON.stringify({ 
            labels: cidadesValidas.map(c => c.cidade), 
            values: cidadesValidas.map(c => c.chuvaMedia) 
        });
        if (ultimoDataset === novoDataset) {
            console.log("⏳ [DEBUG] Dados não mudaram, gráfico não atualizado.");
            return;
        }
        ultimoDataset = novoDataset;

        // 🔄 Destroi o gráfico anterior antes de criar um novo
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }

        // 🔄 Renderiza o gráfico vertical atualizado com os valores da média
        chartInstance = renderVerticalBarChart('myChart', {
            labels: cidadesValidas.map(c => c.cidade),
            values: cidadesValidas.map(c => c.chuvaMedia),
            label: 'Média de Chuva (mm)',
            backgroundColor: 'rgba(64, 188, 255, 0.85)',
            borderColor: 'rgb(29, 143, 237)',
            title: 'Média de Chuva por Cidade'
        });

        console.log("✅ [DEBUG] Gráfico de chuva atualizado com sucesso!");
    } catch (error) {
        console.error('❌ [DEBUG] Erro ao carregar dados para o gráfico:', error);
    }
}

