// FILE: src/utils/ana/telemetry/telemetricChart.js

import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  LineController,
  LineElement,
  PointElement
} from 'chart.js';

import { CHART_STYLES } from '#utils/config.js';

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  LineController,
  LineElement,
  PointElement
);

/**
 * Ordena os registros pela data/hora de medição e prepara rótulos (labels) e valores (dataValues)
 * com base em uma propriedade específica (fieldName). Retorna também o valor máximo encontrado.
 */
function sortAndPrepareData(registros, fieldName) {
  const sortedData = [...registros].sort((a, b) => {
    const dateA = new Date(a.Data_Hora_Medicao.replace(' ', 'T'));
    const dateB = new Date(b.Data_Hora_Medicao.replace(' ', 'T'));
    return dateA - dateB;
  });

  const labels = sortedData.map(item => item.Data_Hora_Medicao);
  const dataValues = sortedData.map(item => {
    const val = parseFloat(item[fieldName]) || 0;
    // Se for 0, retornamos null para evitar barras "zeradas" aparecendo
    return val === 0 ? null : val;
  });

  const maxValue = Math.max(...dataValues.filter(v => v !== null), 0);
  return { labels, dataValues, maxValue };
}

/**
 * Calcula a soma cumulativa de um array de valores (podendo ter null).
 * Caso encontre null, mantém o acumulado anterior.
 *
 * @param {Array<number|null>} values
 * @returns {Array<number>} Soma cumulativa para cada índice
 */
function getCumulativeData(values) {
  let sum = 0;
  return values.map(v => {
    if (v != null) {
      sum += v;
    }
    return sum;
  });
}

/**
 * Cria um formato de label para exibir data e hora de forma mais amigável no eixo X.
 * Exemplo de retorno: "03/07 12:00"
 */
function createLabelFormatter() {
  let previousDay = null;
  return function(fullString, index) {
    const [datePart, timePart] = fullString.split(' ');
    const [year, month, day] = datePart.split('-');
    const [hh, mm] = timePart.split(':');
    const hourFormatted = `${hh}:${mm}`;
    const dayFormatted  = `${day}/${month}`;

    if (index === 0 || datePart !== previousDay) {
      previousDay = datePart;
      return `${dayFormatted} ${hourFormatted}`;
    }
    return hourFormatted;
  };
}

/**
 * Gera um gráfico de barras simples (usado para Cota e Vazão),
 * ordenando e preparando os dados a partir de uma propriedade específica (fieldName).
 */
function renderCombinedChart(canvasId, registros, fieldName, datasetLabel, chartTitle, bgColor, borderColor) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  // Se já houver um gráfico associado a esse canvas, destrua-o.
  const existingChart = Chart.getChart(canvas);
  if (existingChart) {
    existingChart.destroy();
  }
  
  const ctx = canvas.getContext('2d');
  const { labels, dataValues, maxValue } = sortAndPrepareData(registros, fieldName);
  const formatLabel = createLabelFormatter();

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        type: 'bar',
        label: datasetLabel,
        data: dataValues,
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderWidth: 1,
        minBarLength: 15
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            callback: function(value, index) {
              const originalLabel = this.getLabelForValue(index);
              return formatLabel(originalLabel, index);
            }
          }
        },
        y: {
          beginAtZero: true,
          suggestedMax: maxValue + 2
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          align: 'end',
          labels: {
            color: '#333',
            font: { size: 14, weight: 'bold' },
            padding: 20
          }
        },
        title: {
          display: true,
          text: chartTitle,
          align: 'start',
          position: 'top',
          color: '#333',
          font: { size: 16, weight: 'bold' },
          padding: { top: 10, bottom: 20 }
        },
        tooltip: {
          enabled: true,
          callbacks: {
            title: (tooltipItems) => tooltipItems[0].label,
            label: (tooltipItem) => `Valor: ${tooltipItem.raw}`
          }
        },
        datalabels: { display: false }
      }
    }
  });
}

/**
 * Renderiza o gráfico de Chuva, com barras para chuva pontual e linha para acumulado,
 * porém ambos compartilhando o mesmo eixo Y ("Chuva (mm)").
 */
export function renderChuvaChart(canvasId, chuvaRegistros) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Se já houver um Chart associado a esse canvas, destrua-o.
  const existingChart = Chart.getChart(canvas);
  if (existingChart) {
    existingChart.destroy();
  }

  const ctx = canvas.getContext('2d');

  // Ajuste conforme seu estilo
  const bgColor = CHART_STYLES.chuva.bgColor;
  const borderColor = CHART_STYLES.chuva.borderColor;

  // 1. Ordena registros pela data/hora de medição
  const sortedData = [...chuvaRegistros].sort((a, b) => {
    const dateA = new Date(a.Data_Hora_Medicao.replace(' ', 'T'));
    const dateB = new Date(b.Data_Hora_Medicao.replace(' ', 'T'));
    return dateA - dateB;
  });

  // 2. Extrai labels e valores de chuva
  const labels = sortedData.map(item => item.Data_Hora_Medicao);
  const dataValues = sortedData.map(item => {
    const val = parseFloat(item['Chuva_Adotada']) || 0;
    return val === 0 ? null : val;
  });

  // 3. Calcula a soma cumulativa dos valores
  const cumulativeData = getCumulativeData(dataValues);

  // 4. Determina o valor máximo entre chuva pontual e acumulado, para o eixo Y
  const maxBar = Math.max(...dataValues.filter(v => v !== null), 0);
  const maxLine = Math.max(...cumulativeData, 0);
  const maxValue = Math.max(maxBar, maxLine);

  // 5. Configura formatação dos rótulos do eixo X
  const formatLabel = createLabelFormatter();

  // 6. Cria o gráfico com apenas um eixo 'y', compartilhado
  new Chart(ctx, {
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Chuva (mm)',
          data: dataValues,
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: 1,
          minBarLength: 15,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Acumulado (mm)',
          data: cumulativeData,
          borderColor: '#FF0000',
          backgroundColor: 'rgba(255, 0, 0, 0.83)',
          fill: false,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#FF0000',
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            callback: function(value, index) {
              const originalLabel = this.getLabelForValue(index);
              return formatLabel(originalLabel, index);
            }
          }
        },
        y: {
          beginAtZero: true,
          suggestedMax: maxValue + 2,
          position: 'left',
          title: {
            display: true,
            text: 'Chuva (mm)'
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          align: 'end',
          labels: {
            color: '#333',
            font: { size: 14, weight: 'bold' },
            padding: 20
          }
        },
        title: {
          display: true,
          text: 'Histórico de Chuva (com Acumulado)',
          align: 'start',
          position: 'top',
          color: '#333',
          font: { size: 16, weight: 'bold' },
          padding: { top: 10, bottom: 20 }
        },
        tooltip: {
          enabled: true,
          callbacks: {
            title: (tooltipItems) => tooltipItems[0].label,
            label: (tooltipItem) => {
              const datasetLabel = tooltipItem.dataset.label;
              const value = tooltipItem.raw;
              return `${datasetLabel}: ${(value ?? 0).toFixed(2)} mm`;
            }
          }
        },
        datalabels: { display: false }
      }
    }
  });
}

/**
 * Renderiza o gráfico de Nível, usando o renderCombinedChart (barras simples).
 */
export function renderCotaChart(canvasId, cotaRegistros) {
  const { bgColor, borderColor } = CHART_STYLES.cota;
  renderCombinedChart(
    canvasId,
    cotaRegistros,
    'Cota_Adotada',
    'Nível (m)',
    'Histórico de Nível',
    bgColor,
    borderColor
  );
}

/**
 * Renderiza o gráfico de Vazão, usando o renderCombinedChart (barras simples).
 */
export function renderVazaoChart(canvasId, vazaoRegistros) {
  const { bgColor, borderColor } = CHART_STYLES.vazao;
  renderCombinedChart(
    canvasId,
    vazaoRegistros,
    'Vazao_Adotada',
    'Vazão (m³/s)',
    'Histórico de Vazão',
    bgColor,
    borderColor
  );
}
