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

// 🔄 Agora o gráfico é vertical
export function renderVerticalBarChart(canvasId, dataConfig) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    if (Chart.getChart(ctx)) {
        Chart.getChart(ctx).destroy();
    }

    const dataPairs = dataConfig.labels.map((label, i) => ({
        label,
        shortLabel: label.split(' ').slice(0, 2).join(' '),
        value: dataConfig.values[i]
    }));

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
            indexAxis: 'x', // 🔄 Agora é vertical
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { // 🔄 Ajustado para eixo Y ser categórico
                    beginAtZero: true,
                    ticks: { precision: 0 }
                },
                x: { // 🔄 Aqui está o eixo que contém os nomes das cidades!
                    ticks: {
                        font: { size: 8 }, // 🔹 Ajuste o tamanho da fonte dos nomes das cidades
                        autoSkip: false, // 🔹 Garante que todos os rótulos sejam exibidos
                        maxRotation: 90, // 🔹 Inclina os nomes para melhor visualização (90° = vertical)
                        minRotation: 35  // 🔹 Define um ângulo mínimo para melhor leitura
                    }
                }
            },
            plugins: {
                title: {
                    display: !!dataConfig.title,
                    text: dataConfig.title,
                    font: { size: 17, weight: 'bold' },
                    padding: { top: 10, bottom: -15 } // 🔽 Aumente esse valor para abaixar o título
                },
                legend: {
                    display: dataConfig.showLegend !== undefined ? dataConfig.showLegend : true,
                    position: 'top', // 🔹 Move a legenda para cima
                    align: 'end', // 🔹 Alinha a legenda à direita do título
                    labels: {
                        boxWidth: 15, // 🔹 Reduz o tamanho do ícone na legenda
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

export async function atualizarGraficoDeChuva() {
    try {
        const response = await fetch('http://localhost:3000/api/stationData/estacoes/chuvaPorCidade');
         
        if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);

        const cidadesData = await response.json();
        const labels = cidadesData.map(item => item.cidade);
        // Agora usamos a mediana em vez da média
        const values = cidadesData.map(item => item.chuvaMediana);

        const novoDataset = JSON.stringify({ labels, values });
        if (ultimoDataset === novoDataset) {
            // console.log('Os dados não mudaram, gráfico não atualizado.');
            return;
        }
        ultimoDataset = novoDataset;

        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }

        // 🔄 Agora chama o gráfico vertical usando a mediana
        chartInstance = renderVerticalBarChart('myChart', {
            labels,
            values,
            label: 'Mediana de Chuva (mm)', // Atualiza o label para refletir a mediana
            backgroundColor: 'rgba(64, 188, 255, 0.85)',
            borderColor: 'rgb(29, 143, 237)',
            title: 'Mediana de Chuva por Cidade'
        });

        // console.log('Gráfico de mediana de chuvas atualizado.');
    } catch (error) {
        console.error('Erro ao carregar dados para o gráfico:', error);
    }
}
