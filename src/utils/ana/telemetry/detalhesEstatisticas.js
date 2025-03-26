/**
 * @file src/utils/ana/telemetry/detalhesEstatisticas.js
 */

import Chart from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';

import { obterDadosEstatisticos } from '#utils/ana/telemetry/estatisticasChuva.js';
import { STAT_CHART_DELAY_MS, MATHJAX_RENDER_DELAY_MS, MODAL_CONFIG } from '#utils/config.js';

Chart.register(annotationPlugin);

// =====================
// Variáveis Globais p/ Instâncias dos Gráficos
// =====================
let graficoDesvioPadraoInstance = null;
let graficoMedianaInstance = null;
let graficoMediaInstance = null;

// =====================
// Funções Auxiliares
// =====================
/**
 * Converte [v1, v2, ...] em [{x: 1, y: v1}, {x: 2, y: v2}, ...]
 */
function criarDadosScatter(listaValores) {
  return listaValores.map((valor, i) => ({ x: i + 1, y: valor }));
}

/**
 * Cria dados para linha horizontal:
 * Cria um ponto para cada índice, com y fixo em valorConstante.
 */
function criarDadosLinhaHorizontal(listaValores, valorConstante) {
  if (!listaValores || listaValores.length === 0) return [];
  return listaValores.map((_, i) => ({
    x: i + 1,
    y: valorConstante
  }));
}

// =====================
// Gráfico de Mediana
// =====================
function gerarGraficoMedianaChuva(listaValores, medianaCalculada) {
  const medianaNumeric = parseFloat(medianaCalculada);

  setTimeout(() => {
    const canvas = document.getElementById('graficoMedianaChuva');
    if (!canvas) {
      console.error("❌ Erro: Elemento #graficoMedianaChuva não encontrado.");
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error("❌ Falha ao obter contexto 2D do canvas.");
      return;
    }
    if (graficoMedianaInstance) {
      graficoMedianaInstance.destroy();
    }
    const scatterData = criarDadosScatter(listaValores);

    graficoMedianaInstance = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Valores de Chuva',
            type: 'scatter',
            data: scatterData,
            backgroundColor: 'rgba(0, 0, 255, 0.5)',
            borderColor: 'rgba(0, 0, 255, 0.7)',
            pointRadius: 4,
            datalabels: { display: false }
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Ordem dos Valores' },
            grid: { drawBorder: false, display: false }
          },
          y: {
            title: { display: true, text: 'Valor da Chuva (mm)' },
            beginAtZero: true
          }
        },
        plugins: {
          legend: { display: true },
          tooltip: {
            enabled: true,
            callbacks: {
              label: (tooltipItem) => {
                const datasetLabel = tooltipItem.dataset.label;
                if (datasetLabel === 'Valores de Chuva') {
                  const index = tooltipItem.dataIndex + 1;
                  const yVal = tooltipItem.parsed.y;
                  return `Valor de chuva [${index}]: ${yVal.toFixed(2)} mm`;
                } else {
                  return `${datasetLabel}: ${medianaNumeric.toFixed(2)} mm`;
                }
              }
            }
          },
          datalabels: { display: false },
          annotation: {
            annotations: {
              medianLine: {
                type: 'line',
                yMin: medianaNumeric,
                yMax: medianaNumeric,
                borderColor: 'rgba(255, 165, 0, 0.8)', // cor laranja, por exemplo
                borderWidth: 2,
                label: {
                  display: true,
                  content: `Mediana = ${medianaNumeric.toFixed(2)} mm`,
                  position: 'end',
                  backgroundColor: '#ffffff',
                  color: '#000000'
                }
              }
            }
          }
        }
      }
    });
  }, STAT_CHART_DELAY_MS);
}

// =====================
// Gráfico de Média
// =====================
function gerarGraficoMediaChuva(listaValores, mediaCalculada) {
  const mediaNumeric = parseFloat(mediaCalculada);

  setTimeout(() => {
    const canvas = document.getElementById('graficoMediaChuva');
    if (!canvas) {
      console.error("❌ Erro: Elemento #graficoMediaChuva não encontrado.");
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error("❌ Falha ao obter contexto 2D do canvas.");
      return;
    }
    if (graficoMediaInstance) {
      graficoMediaInstance.destroy();
    }
    const scatterData = criarDadosScatter(listaValores);

    graficoMediaInstance = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Valores de Chuva',
            data: scatterData,
            backgroundColor: 'rgba(0, 0, 255, 0.5)',
            borderColor: 'rgba(0, 0, 255, 0.7)',
            pointRadius: 4,
            datalabels: { display: false }
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Ordem dos Valores' },
            grid: { drawBorder: false, display: false }
          },
          y: {
            title: { display: true, text: 'Valor da Chuva (mm)' },
            beginAtZero: true
          }
        },
        plugins: {
          datalabels: { display: false },
          legend: { display: true },
          tooltip: {
            enabled: true,
            callbacks: {
              label: (tooltipItem) => {
                const index = tooltipItem.dataIndex + 1;
                const yVal = tooltipItem.parsed.y;
                return `Valor de chuva [${index}]: ${yVal.toFixed(2)} mm`;
              }
            }
          },
          annotation: {
            annotations: {
              meanLine: {
                type: 'line',
                yMin: mediaNumeric,
                yMax: mediaNumeric,
                borderColor: 'red',
                borderWidth: 2,
                label: {
                  display: true,
                  content: `Média = ${mediaNumeric.toFixed(2)} mm`,
                  position: 'start',
                  backgroundColor: '#ffffff',
                  color: '#000000'
                }
              }
            }
          }
        }
      }
    });
  }, STAT_CHART_DELAY_MS);
}

function criarAnotacoesDesvio(mean, std, maxSigma) {
  // Objeto onde armazenaremos as linhas
  const annotations = {};

  // 1) Linha da média
  annotations.meanLine = {
    type: 'line',
    yMin: mean,
    yMax: mean,
    borderColor: 'green',
    borderWidth: 2,
    label: {
      display: true,
      content: `Média = ${mean.toFixed(2)}`,
      position: 'start',
      backgroundColor: '#ffffff',
      color: '#000000'
    }
  };

  // 2) Linha de -1σ (apenas se não for negativo ou se você quiser mesmo que fique negativo)
  //    Se quiser truncar em zero, use: const minus = Math.max(0, mean - std)
  const minus = mean - std;
  annotations.minusStdLine = {
    type: 'line',
    yMin: minus,
    yMax: minus,
    borderColor: 'blue',
    borderWidth: 2,
    label: {
      display: true,
      content: `-1σ = ${minus.toFixed(2)}`,
      position: 'start',
      backgroundColor: '#ffffff',
      color: '#000000'
    }
  };

  // 3) Linhas para +1σ, +2σ, +3σ, etc.
  //    Para cada i de 1 até maxSigma, cria uma linha.
  //    Cores podem ser definidas em array ou calculadas dinamicamente.
  const sigmaColors = ['red', 'orange', 'purple']; // Exemplo para i=1..3
  for (let i = 1; i <= maxSigma; i++) {
    const color = sigmaColors[i - 1] || 'red'; // se faltar cor, usa 'red'
    const yVal = mean + i * std;
    // Nome único para cada linha, ex.: plus1StdLine, plus2StdLine, plus3StdLine
    const annotationName = `plus${i}StdLine`;
    annotations[annotationName] = {
      type: 'line',
      yMin: yVal,
      yMax: yVal,
      borderColor: color,
      borderWidth: 2,
      label: {
        display: true,
        content: `+${i}σ = ${yVal.toFixed(2)}`,
        position: 'start',
        backgroundColor: '#ffffff',
        color: '#000000'
      }
    };
  }

  return annotations;
}

// =====================
// Gráfico de Desvio Padrão
// =====================
function gerarGraficoDesvioPadrao(listaValores, mediaCalculada, stdValue) {
  const canvas = document.getElementById('graficoDesvioPadrao');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const mean = parseFloat(mediaCalculada);
  const std = parseFloat(stdValue);

  // Converte lista para scatter
  const scatterData = listaValores.map((valor, i) => ({ x: i + 1, y: valor }));

  // Gera as linhas dinamicamente (média, -1σ, +1σ..+3σ)
  const annotations = criarAnotacoesDesvio(mean, std, 5); // 3 => até +3σ

  new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Valores de Chuva',
          data: scatterData,
          backgroundColor: 'rgba(0, 0, 255, 0.5)',
          borderColor: 'rgba(0, 0, 255, 0.7)',
          pointRadius: 4,
          // Desativa data labels nesse dataset (caso use chartjs-plugin-datalabels)
          datalabels: {
            display: false
          }
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          ticks: { display: true },
          title: {
            display: true,
            text: 'Ordem dos Valores'
          }
        },
        y: {
          beginAtZero: true,
          ticks: { display: true },
          title: {
            display: true,
            text: 'Valor de Chuva (mm)'
          }
        }
      },
      plugins: {
        // Desativa data labels globalmente (se o plugin estiver ativo)
        datalabels: {
          display: false
        },
        legend: { display: true },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context) => {
              const index = context.dataIndex + 1; // Exibe índice começando em 1
              const yVal = context.parsed.y;
              return `Valor de chuva [${index}]: ${yVal.toFixed(2)} mm`;
            }
          }
        },
        annotation: {
          annotations // insere as linhas geradas dinamicamente
        }
      }
    }
  });
}

// =====================
// Exibir Modal de Detalhes (com seções separadas para GRÁFICO e LISTA)
// =====================
export async function exibirDetalhesEstatistica(tipo) {
  console.log(`[exibirDetalhesEstatistica] Chamado com tipo: ${tipo}`);
  // Verifica e cria o modal se ainda não existir
  let modal = document.getElementById(MODAL_CONFIG.DETALHES_ID);
  let modalContent = document.getElementById(MODAL_CONFIG.DETALHES_CONTENT_ID);
  let modalClose = document.getElementById(MODAL_CONFIG.DETALHES_CLOSE_ID);

  if (!modal) {
    modal = document.createElement('div');
    modal.id = MODAL_CONFIG.DETALHES_ID;
    modal.className = 'modal';
    modal.innerHTML = `
      <span id="${MODAL_CONFIG.DETALHES_CLOSE_ID}" class="modal-close">&times;</span>
      <div id="${MODAL_CONFIG.DETALHES_CONTENT_ID}" class="modal-body"></div>
    `;
    document.body.appendChild(modal);

    modalClose = document.getElementById(MODAL_CONFIG.DETALHES_CLOSE_ID);
    Object.assign(modalClose.style, MODAL_CONFIG.CLOSE_STYLE);
    modalClose.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  modalContent = document.getElementById(MODAL_CONFIG.DETALHES_CONTENT_ID);
  modalContent.innerHTML = '<p>Carregando...</p>';
  modal.style.display = 'block';

  try {
    console.log('[exibirDetalhesEstatistica] Chamando obterDadosEstatisticos()...');
    const estatisticas = await obterDadosEstatisticos();
    console.log('[exibirDetalhesEstatistica] estatisticas obtidas:', estatisticas);

    let detalhes = '';

    const mapeamentoEstatisticas = {
      'totalCidadesMonitoradas': {
        titulo: `Total de Cidades Monitoradas: <strong>${estatisticas.totalCidadesMonitoradas}</strong>`,
        descricao: 'Lista de cidades atualmente monitoradas:',
        lista: estatisticas.listaCidades || []
      },
      'cidadesSemChuva': {
        titulo: `Cidades sem Registro de Chuva: <strong>${estatisticas.cidadesSemChuva}</strong>`,
        descricao: 'Estas cidades não registraram chuva acumulada:',
        lista: estatisticas.listaCidadesSemChuva || []
      },
      'cidadesComChuvaElevada': {
        titulo: `Cidades com Chuva Elevada: <strong>${estatisticas.cidadesComChuvaElevada}</strong>`,
        descricao: 'Estas cidades registraram chuvas acima da média:',
        lista: estatisticas.listaCidadesComChuvaElevada || []
      },
      'medianaChuva': {
        titulo: `Mediana da Chuva: <strong>${estatisticas.medianaChuva}</strong>`,
        descricao: `A mediana é o valor central quando os registros de chuva são organizados em ordem crescente.<br>
                    <strong>Fórmula usada:</strong> Se houver um número ímpar de valores, a mediana é o valor central. Se for par, é a média dos dois valores centrais.`,
        lista: estatisticas.listaValoresChuva || []
      },
      'mediaGeralChuva': {
        titulo: `Média Geral da Chuva: <strong>${estatisticas.mediaGeralChuva}</strong>`,
        descricao: `A média geral é obtida somando todos os registros de chuva e dividindo pelo total de registros.`,
        calculo: `(${estatisticas.listaValoresChuva.join(' + ')}) / ${estatisticas.listaValoresChuva.length} = ${estatisticas.mediaGeralChuva} mm`,
        lista: estatisticas.listaValoresChuva || []
      },
      'desvioPadraoChuva': {
        titulo: `Desvio Padrão da Chuva: <strong>${estatisticas.desvioPadraoChuva}</strong>`,
        descricao: '',
        lista: estatisticas.listaValoresChuva || []
      }
    };

    if (mapeamentoEstatisticas[tipo]) {
      const { titulo, descricao, lista } = mapeamentoEstatisticas[tipo];
      // Aqui, totalValores, somaValores e mediaCalculada não serão usados para mediana global,
      // pois usamos os valores globais calculados em calcularEstatisticas.
      console.log(`[exibirDetalhesEstatistica] Tipo: ${tipo}`, {
        titulo,
        descricao,
        lista
      });

      if (tipo === 'medianaChuva') {
        // Para a mediana global, usamos estatisticas.listaValoresChuvaGlobal
        const totalValoresGlobal = estatisticas.listaValoresChuvaGlobal.length;
        const valorCentralIndex = Math.floor(totalValoresGlobal / 2);
        let valoresMediana = '';

        if (totalValoresGlobal % 2 === 1) {
          valoresMediana = `<strong>📌 Valor da Mediana:</strong> 
                              ${estatisticas.listaValoresChuvaGlobal[valorCentralIndex].toFixed(2)} mm 
                              <br> 📍 <em>Índice:</em> ${valorCentralIndex + 1}`;
        } else {
          const valor1 = estatisticas.listaValoresChuvaGlobal[valorCentralIndex - 1];
          const valor2 = estatisticas.listaValoresChuvaGlobal[valorCentralIndex];
          valoresMediana = `<strong>📌 Valores Usados na Mediana:</strong> 
                              ${valor1.toFixed(2)} mm (📍 Índice: ${valorCentralIndex}) e 
                              ${valor2.toFixed(2)} mm (📍 Índice: ${valorCentralIndex + 1}) <br>
                              <strong>📊 Mediana Global:</strong> ${estatisticas.medianaChuva}`;
        }

        detalhes = `
          <div class="modal-content-container">
            <!-- Coluna da descrição (lado esquerdo) -->
            <div class="modal-list-section">
              <h3>${titulo}</h3> <!-- TÍTULO DO MODAL -->
              <div class="mediana-info">
                ${valoresMediana}
              </div>
              <p>${descricao}</p>
            </div>
        
            <!-- Coluna do gráfico (lado direito) -->
            <div class="modal-graph-section">
              <h4 class="graph-title">📊 Visualização Gráfica da Mediana</h4>
              <div class="chart-container" style="height:300px; max-height:300px; width:100%;">
                <canvas id="graficoMedianaChuva"></canvas>
              </div>
            </div>
          </div>
        `;

        modalContent.innerHTML = detalhes;
        console.log('[exibirDetalhesEstatistica] Chamando gerarGraficoMedianaChuva...');
        setTimeout(() => {
          gerarGraficoMedianaChuva(estatisticas.listaValoresChuvaGlobal, estatisticas.medianaChuva);
        }, STAT_CHART_DELAY_MS);

      } else if (tipo === 'mediaGeralChuva') {
        // Calcula algumas informações dinâmicas
        const n = estatisticas.listaValoresChuvaGlobal.length;
        const soma = estatisticas.listaValoresChuvaGlobal.reduce((acc, val) => acc + val, 0);
        const mediaNumber = parseFloat(estatisticas.mediaGeralChuva);

        detalhes = `
          <div class="modal-content-container">
            <!-- Coluna da descrição -->
            <div class="modal-list-section">
              <h3>${titulo}</h3>
              <p>${descricao}</p>
              
              <div class="formula-container">
                <h5 class="formula-title">🔍 Fórmula da Média</h5>
                <div class="mathjax-formula">
                  \\[ \\bar{x} = \\frac{\\sum_{i=1}^{N} x_i}{N} \\]
                </div>
              </div>
      
              <!-- Seção de variáveis dispostas lado a lado -->
              <div class="formula-variables" style="display: flex; gap: 5px; flex-wrap: wrap;">
                <div class="variable-card" style="display: flex; align-items: center; gap: 10px;">
                  <div class="math-symbol">\\[ \\sum x_i \\]</div>
                  <div class="arrow"><i class="fas fa-arrow-right"></i></div>
                  <p>Soma total dos valores</p>
                </div>
                <div class="variable-card" style="display: flex; align-items: center; gap: 10px;">
                  <div class="math-symbol">\\[ N \\]</div>
                  <div class="arrow"><i class="fas fa-arrow-right"></i></div>
                  <p>Número total de registros</p>
                </div>
                <div class="variable-card" style="display: flex; align-items: center; gap: 10px;">
                  <div class="math-symbol">\\[ \\bar{x} \\]</div>
                  <div class="arrow"><i class="fas fa-arrow-right"></i></div>
                  <p>Média calculada</p>
                </div>
              </div>
      
              <!-- Informações dinâmicas sobre o cálculo -->
              <div class="calc-details">
                <p>
                  Registros válidos: <strong>N = ${n}</strong><br>
                  Soma total dos valores: <strong>${soma.toFixed(2)} mm</strong><br>
                  Média (𝑥̄) calculada: <strong>${mediaNumber.toFixed(2)} mm</strong>
                  &nbsp;<br>
                </p>
              </div>
            </div>
            
            <!-- Coluna do gráfico -->
            <div class="modal-graph-section">
              <h4 class="graph-title">📊 Visualização Gráfica da Média</h4>
              <div class="chart-container" style="height:300px; max-height:300px; width:100%;">
                <canvas id="graficoMediaChuva"></canvas>
              </div>
            </div>
          </div>
        `;

        modalContent.innerHTML = detalhes;

        if (window.MathJax) {
          setTimeout(() => {
            MathJax.typesetPromise()
              .then(() => console.log("✅ MathJax atualizado com sucesso!"))
              .catch(err => console.error("❌ Erro ao atualizar MathJax:", err));
          }, MATHJAX_RENDER_DELAY_MS);
        }

        setTimeout(() => {
          gerarGraficoMediaChuva(
            estatisticas.listaValoresChuvaGlobal,
            estatisticas.mediaGeralChuva
          );
        }, STAT_CHART_DELAY_MS);
      }

      else if (tipo === 'desvioPadraoChuva') {
        // Em vez de usar "lista", usamos estatisticas.listaValoresChuvaGlobal,
        // que contém TODOS os valores de chuva das estações.
        const listaValores = estatisticas.listaValoresChuvaGlobal;

        // Recalcula a média local para plotar a linha no gráfico (opcional, se quiser a média no chart).
        const totalValores = listaValores.length;
        const somaValores = listaValores.reduce((acc, val) => acc + val, 0);
        const mediaCalculada = totalValores ? somaValores / totalValores : 0;

        // Monta o HTML do modal em duas colunas: descrição e gráfico
        detalhes = `
        <div class="modal-content-container">
          <!-- Coluna da descrição (lado esquerdo) -->
          <div class="modal-list-section">
            <h3>${titulo}</h3> <!-- TÍTULO DO MODAL -->

            <p class="stat-description">
              O desvio padrão de <strong>${estatisticas.desvioPadraoChuva}</strong> 
              indica a variação média dos registros em relação à média calculada.
            </p>

            <div class="formula-container">
              <h5 class="formula-title">🔍 Fórmula do Desvio Padrão</h5>
              <div class="mathjax-formula">
                \\[ \\sigma = \\sqrt{\\frac{\\sum_{i=1}^{N} (x_i - \\bar{x})^2}{N}} \\]
              </div>
            </div>

            <!-- Exibe as variáveis lado a lado usando Flexbox -->
            <div class="formula-variables" style="display: flex; gap: 5px; flex-wrap: wrap;">
              <div class="variable-card" style="display: flex; align-items: center; gap: 10px;">
                <div class="math-symbol">\\[ x_i \\]</div>
                <div class="arrow"><i class="fas fa-arrow-right"></i></div>
                <p>Valores individuais de chuva registrados</p>
              </div>
              <div class="variable-card" style="display: flex; align-items: center; gap: 10px;">
                <div class="math-symbol">\\[ \\bar{x} \\]</div>
                <div class="arrow"><i class="fas fa-arrow-right"></i></div>
                <p>Média aritmética dos valores</p>
              </div>
              <div class="variable-card" style="display: flex; align-items: center; gap: 10px;">
                <div class="math-symbol">\\[ N \\]</div>
                <div class="arrow"><i class="fas fa-arrow-right"></i></div>
                <p>Número total de registros</p>
              </div>
            </div>

            <!-- Informações dinâmicas sobre o cálculo -->
            <div class="calc-details">
              <p>
                Registros válidos: <strong>N = ${totalValores}</strong><br>
                Soma total: <strong>${somaValores.toFixed(2)} mm</strong><br>
                Média (x̄): <strong>${mediaCalculada.toFixed(2)} mm</strong>
                &nbsp;<br>
                Variância: Somatório de (xᵢ − <strong>${mediaCalculada.toFixed(2)}</strong>)² e / por <strong>${totalValores}</strong>.<br>
                Desvio Padrão (σ): Raiz quadrada da variância.
              </p>
            </div>
          </div>
          
          <!-- Coluna do gráfico (lado direito) -->
          <div class="modal-graph-section">
            <h4 class="graph-title">📊 Visualização Gráfica dos Valores</h4>
            <div class="chart-container desvio-padrao-chart" 
                style="height:300px; max-height:300px; width:100%;">
              <canvas id="graficoDesvioPadrao"></canvas>
            </div>
          </div>
        </div>
        `;

        // Insere o HTML no modal
        modalContent.innerHTML = detalhes;

        // Se MathJax estiver disponível, processa a fórmula
        if (window.MathJax) {
          setTimeout(() => {
            MathJax.typesetPromise()
              .then(() => console.log("✅ MathJax atualizado com sucesso!"))
              .catch(err => console.error("❌ Erro ao atualizar MathJax:", err));
          }, MATHJAX_RENDER_DELAY_MS);
        } else {
          console.warn("⚠️ MathJax não carregado corretamente!");
        }

        // Chama a função que desenha o gráfico de desvio padrão,
        setTimeout(() => {
          // 'desvioPadraoChuva' é algo como "9.34 mm" (string)
          // Precisamos extrair o número:
          const stdValue = parseFloat(estatisticas.desvioPadraoChuva);

          gerarGraficoDesvioPadrao(
            listaValores,            // array de todos os valores
            mediaCalculada,          // a média local ou global
            stdValue                 // o desvio padrão
          );
        }, STAT_CHART_DELAY_MS);
      }

      else {
        // Para outros tipos (lista de cidades, etc.)
        detalhes += `<div class="modal-list-container">
                       <ul class="modal-list-grid">`;
        if (lista.length > 0) {
          lista.forEach((cidade, index) => {
            detalhes += `<li>${index + 1}º - ${cidade}</li>`;
          });
        } else {
          detalhes += '<li>Nenhuma cidade encontrada.</li>';
        }
        detalhes += '</ul></div>';
        modalContent.innerHTML = detalhes;
      }

    } else {
      detalhes = '<p>Informação não encontrada.</p>';
      modalContent.innerHTML = detalhes;
    }
  } catch (error) {
    modalContent.innerHTML = '<p>Erro ao carregar os detalhes.</p>';
    console.error('Erro ao carregar detalhes da estatística:', error);
  }
}

// =====================
// Configuração de Eventos
// =====================
let eventosConfigurados = false;

export function configurarEventosEstatisticas() {
  if (eventosConfigurados) return;

  document.querySelectorAll('.info-box.square').forEach(box => {
    box.addEventListener('click', () => {
      const tipo = box.getAttribute('data-tipo');
      console.log(`📌 Clique detectado: ${tipo}`);
      if (tipo) {
        exibirDetalhesEstatistica(tipo);
      } else {
        console.warn("⚠️ Nenhum tipo definido para este quadrado.");
      }
    });
  });

  eventosConfigurados = true;
}
