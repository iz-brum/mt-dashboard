// FILE: src\utils\ana\telemetry\telemetricChart.js

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

function sortAndPrepareData(registros, fieldName) {
  const sortedData = [...registros].sort((a, b) => {
    const dateA = new Date(a.Data_Hora_Medicao.replace(' ', 'T'));
    const dateB = new Date(b.Data_Hora_Medicao.replace(' ', 'T'));
    return dateA - dateB;
  });
  const labels = sortedData.map(item => item.Data_Hora_Medicao);
  const dataValues = sortedData.map(item => {
    const val = parseFloat(item[fieldName]) || 0;
    return val === 0 ? null : val;
  });
  const maxValue = Math.max(...dataValues.filter(v => v !== null));
  return { labels, dataValues, maxValue };
}

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

function renderBarChart(canvasId, registros, fieldName, datasetLabel, chartTitle, bgColor, borderColor) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  
  const { labels, dataValues, maxValue } = sortAndPrepareData(registros, fieldName);
  const formatLabel = createLabelFormatter();
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
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

function renderCombinedChart(canvasId, registros, fieldName, datasetLabel, chartTitle, bgColor, borderColor) {
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return;
  
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

export function renderChuvaChart(canvasId, chuvaRegistros) {
  renderBarChart(
    canvasId, 
    chuvaRegistros, 
    'Chuva_Adotada', 
    'Chuva (mm)', 
    'Histórico de Chuva', 
    'rgba(54, 162, 235, 0.5)', 
    'rgba(54, 162, 235, 1)'
  );
}

export function renderCotaChart(canvasId, cotaRegistros) {
  renderCombinedChart(
    canvasId, 
    cotaRegistros, 
    'Cota_Adotada', 
    'Cota (m)', 
    'Histórico de Cota', 
    'rgba(255, 99, 132, 0.5)', 
    'rgba(255, 99, 132, 1)'
  );
}

export function renderVazaoChart(canvasId, vazaoRegistros) {
  renderCombinedChart(
    canvasId, 
    vazaoRegistros, 
    'Vazao_Adotada', 
    'Vazão (m³/s)', 
    'Histórico de Vazão', 
    'rgba(75, 192, 192, 0.5)', 
    'rgba(75, 192, 192, 1)'
  );
}
