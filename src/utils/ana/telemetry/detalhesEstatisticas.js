// FILE: src/utils/ana/telemetry/detalhesEstatisticas.js

import Chart from 'chart.js/auto';
import { obterDadosEstatisticos } from './estatisticasChuva.js';

// Variável global para armazenar a instância do gráfico
let graficoDesvioPadraoInstance = null;
let graficoMedianaInstance = null;
let graficoMediaInstance = null;

// 🟢 Função para gerar o gráfico da Mediana
function gerarGraficoMedianaChuva(listaValores, medianaCalculada) {
    setTimeout(() => {
        const canvas = document.getElementById('graficoMedianaChuva');
        if (!canvas) {
            console.error("❌ Erro: Elemento #graficoMedianaChuva não encontrado.");
            return;
        }

        const ctx = canvas.getContext('2d');

        // 🛑 Se já houver um gráfico no canvas, destrua-o antes de criar um novo
        if (graficoMedianaInstance) {
            graficoMedianaInstance.destroy();
        }

        // ✅ Criar o gráfico e armazenar a instância globalmente
        graficoMedianaInstance = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Valores de Chuva',
                        data: listaValores.map((valor, i) => ({ x: i + 1, y: valor })),
                        backgroundColor: 'rgba(0, 0, 255, 0.5)', // Azul com transparência
                        borderColor: 'rgba(0, 0, 255, 0.7)',
                        pointRadius: 4
                    },
                    {
                        label: 'Mediana da Chuva',
                        data: listaValores.map((_, i) => ({ x: i + 1, y: medianaCalculada })),
                        backgroundColor: 'rgba(255, 165, 0, 0.6)', // Laranja com transparência
                        borderColor: 'rgba(255, 165, 0, 0.8)',
                        pointRadius: 3,
                        pointStyle: 'triangle'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true },
                    tooltip: { enabled: true }, // Mostra os valores ao passar o mouse
                    datalabels: { display: false } // ✅ Remove os rótulos dos pontos
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Ordem dos Valores' },
                        grid: { drawBorder: false, display: false }
                    },
                    y: {
                        title: { display: true, text: 'Valor da Chuva (mm)' },
                        beginAtZero: true
                    }
                }
            }
        });
    }, 500);
}

// 🟢 Função para gerar o gráfico da Média Geral
function gerarGraficoMediaChuva(listaValores, mediaCalculada) {
    setTimeout(() => {
        const canvas = document.getElementById('graficoMediaChuva');
        if (!canvas) {
            console.error("❌ Erro: Elemento #graficoMediaChuva não encontrado.");
            return;
        }

        const ctx = canvas.getContext('2d');

        // 🛑 Se já houver um gráfico no canvas, destrua-o antes de criar um novo
        if (graficoMediaInstance) {
            graficoMediaInstance.destroy();
        }

        // ✅ Criar o gráfico e armazenar a instância globalmente
        graficoMediaInstance = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Valores de Chuva',
                        data: listaValores.map((valor, i) => ({ x: i + 1, y: valor })),
                        backgroundColor: 'rgba(0, 0, 255, 0.5)', // Azul com transparência
                        borderColor: 'rgba(0, 0, 255, 0.7)',
                        pointRadius: 4
                    },
                    {
                        label: 'Média da Chuva',
                        data: listaValores.map((_, i) => ({ x: i + 1, y: mediaCalculada })),
                        backgroundColor: 'rgba(255, 0, 0, 0.6)', // Vermelho com transparência
                        borderColor: 'rgba(255, 0, 0, 0.8)',
                        pointRadius: 3,
                        pointStyle: 'triangle'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true },
                    tooltip: { enabled: true }, // Mostra os valores ao passar o mouse
                    datalabels: { display: false } // ✅ Remove os rótulos dos pontos
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Ordem dos Valores' },
                        grid: { drawBorder: false, display: false }
                    },
                    y: {
                        title: { display: true, text: 'Valor da Chuva (mm)' },
                        beginAtZero: true
                    }
                }
            }
        });
    }, 500);
}

// Função para exibir o gráfico no modal
function gerarGraficoDesvioPadrao(listaValores, mediaCalculada) {
    setTimeout(() => {
        const canvas = document.getElementById('graficoDesvioPadrao');
        if (!canvas) {
            console.error("❌ Erro: Elemento #graficoDesvioPadrao não encontrado.");
            return;
        }

        const ctx = canvas.getContext('2d');

        // 🛑 Se já houver um gráfico no canvas, destrua-o antes de criar um novo
        if (graficoDesvioPadraoInstance) {
            graficoDesvioPadraoInstance.destroy();
        }

        // ✅ Cria um novo gráfico e armazena a instância globalmente
        graficoDesvioPadraoInstance = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Valores de Chuva',
                        data: listaValores.map((valor, i) => ({ x: i + 1, y: valor })),
                        backgroundColor: 'rgba(0, 0, 255, 0.5)', // Azul com transparência
                        borderColor: 'rgba(0, 0, 255, 0.7)',
                        pointRadius: 4
                    },
                    {
                        label: 'Média da Chuva',
                        data: listaValores.map((_, i) => ({ x: i + 1, y: mediaCalculada })),
                        backgroundColor: 'rgba(255, 0, 0, 0.6)', // Vermelho com transparência
                        borderColor: 'rgba(255, 0, 0, 0.8)',
                        pointRadius: 3,
                        pointStyle: 'triangle'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true },
                    tooltip: { enabled: true }, // Mostra os valores ao passar o mouse
                    datalabels: { display: false } // ✅ Remove os rótulos dos pontos
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Ordem dos Valores' },
                        grid: { drawBorder: false, display: false }
                    },
                    y: {
                        title: { display: true, text: 'Valor da Chuva (mm)' },
                        beginAtZero: true
                    }
                }
            }
        });
    }, 500);
}

/**
 * Exibe um modal com detalhes das estatísticas de chuva.
 * @param {string} tipo - O tipo de estatística a ser exibida.
 */
export async function exibirDetalhesEstatistica(tipo) {
    // Verifica e cria o modal caso não exista
    let modal = document.getElementById('modalDetalhes');
    let modalContent = document.getElementById('modalDetalhesContent');
    let modalClose = document.getElementById('modalDetalhesClose');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalDetalhes';
        modal.innerHTML = `
            <span id="modalDetalhesClose">&times;</span>
            <div id="modalDetalhesContent"></div>
        `;
        document.body.appendChild(modal);

        modalClose = document.getElementById('modalDetalhesClose');
        modalClose.style.position = 'absolute';
        modalClose.style.top = '10px';
        modalClose.style.right = '15px';
        modalClose.style.cursor = 'pointer';
        modalClose.style.fontSize = '24px';
        modalClose.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    modalContent = document.getElementById('modalDetalhesContent');
    modalContent.innerHTML = '<p>Carregando...</p>';
    modal.style.display = 'block';

    try {
        const estatisticas = await obterDadosEstatisticos();
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
            const totalValores = lista.length;
            const somaValores = lista.reduce((acc, val) => acc + val, 0);
            const mediaCalculada = somaValores / totalValores;

            detalhes = `<h3>${titulo}</h3>
                        <div class="modal-content-container">`;

            // ✅ Exibir gráfico da Mediana no modal
            if (tipo === 'medianaChuva') {
                const totalValores = estatisticas.listaValoresChuva.length;
                const valorCentralIndex = Math.floor(totalValores / 2);
                let valoresMediana = '';

                if (totalValores % 2 === 1) {
                    // 🔹 Se for ímpar, pega o valor central com índice
                    valoresMediana = `<strong>📌 Valor da Mediana:</strong> 
                                      ${estatisticas.listaValoresChuva[valorCentralIndex].toFixed(2)} mm 
                                      <br> 📍 <em>Índice:</em> ${valorCentralIndex + 1}`;
                } else {
                    // 🔹 Se for par, pega os dois valores centrais e mostra a média com seus índices
                    const valor1 = estatisticas.listaValoresChuva[valorCentralIndex - 1];
                    const valor2 = estatisticas.listaValoresChuva[valorCentralIndex];
                    valoresMediana = `<strong>📌 Valores Usados na Mediana:</strong> 
                                      ${valor1.toFixed(2)} mm (📍 Índice: ${valorCentralIndex}) e 
                                      ${valor2.toFixed(2)} mm (📍 Índice: ${valorCentralIndex + 1}) <br>
                                      <strong>📊 Média dos valores:</strong> ${estatisticas.medianaChuva}`;
                }

                detalhes += `<h4>📊 Visualização Gráfica da Mediana</h4>
                <canvas id="graficoMedianaChuva"></canvas>
                <div class="mediana-info">
                    ${valoresMediana}
                </div>
                <p>${descricao}</p>
                </div>`;


                modalContent.innerHTML = detalhes;

                // 🔥 Chamar a função do gráfico da Mediana
                setTimeout(() => {
                    gerarGraficoMedianaChuva(estatisticas.listaValoresChuva, estatisticas.medianaChuva);
                }, 500);
            }
            // ✅ Exibir gráfico da Média no modal
            else if (tipo === 'mediaGeralChuva') {
                detalhes += `<h4>📊 Visualização Gráfica da Média</h4>
                            <canvas id="graficoMediaChuva"></canvas>
                            <p>${descricao}</p>`;

                modalContent.innerHTML = detalhes;

                // 🔥 Chamar a função do gráfico
                setTimeout(() => {
                    gerarGraficoMediaChuva(estatisticas.listaValoresChuva, estatisticas.mediaGeralChuva);
                }, 500);
            }
            // ✅ Exibir valores usados no cálculo de desvio padrão
            else if (tipo === 'desvioPadraoChuva') {
                detalhes += `<h4>📊 Visualização Gráfica dos Valores</h4>
                <canvas id="graficoDesvioPadrao"></canvas>
                <p>O desvio padrão mede a dispersão dos valores de chuva em relação à média.</p>
                
                <h4>📌 Fórmula Usada:</h4>
                <div class="mathjax-formula">
                    \\[ \\sigma = \\sqrt{\\frac{\\sum (x_i - \\bar{x})^2}{N}} \\]
                </div>

                <h4>Onde:</h4>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <div style="background: #f5f5f5; padding: 10px; border-radius: 8px;">
                        \\[ x_i \\] são os valores de chuva registrados
                    </div>
                    <div style="background: #f5f5f5; padding: 10px; border-radius: 8px;">
                        \\[ \\bar{x} \\] é a média da chuva
                    </div>
                    <div style="background: #f5f5f5; padding: 10px; border-radius: 8px;">
                        \\[ N \\] é o total de registros
                    </div>
                </div>`;

                // 🔴 Adiciona o conteúdo ao modal antes de chamar a função do gráfico
                modalContent.innerHTML = detalhes;

                // 🟢 Agora forçamos o MathJax a renderizar após a inserção
                if (window.MathJax) {
                    setTimeout(() => {
                        MathJax.typesetPromise()
                            .then(() => console.log("✅ MathJax atualizado com sucesso!"))
                            .catch(err => console.error("❌ Erro ao atualizar MathJax:", err));
                    }, 100);


                } else {
                    console.warn("⚠️ MathJax não carregado corretamente!");
                }

                // ✅ Agora podemos chamar a função para gerar o gráfico sem erro!
                setTimeout(() => {
                    gerarGraficoDesvioPadrao(lista, mediaCalculada);
                }, 500);
            }
            else {
                detalhes += `<div class="modal-lista-container">
                                <ul class="modal-lista">`;

                if (lista.length > 0) {
                    lista.forEach((cidade, index) => {
                        detalhes += `<li>${index + 1}º - ${cidade}</li>`;
                    });
                } else {
                    detalhes += '<li>Nenhuma cidade encontrada.</li>';
                }

                detalhes += '</ul></div>';
            }
        } else {
            detalhes = '<p>Informação não encontrada.</p>';
        }

        modalContent.innerHTML = detalhes;
    } catch (error) {
        modalContent.innerHTML = '<p>Erro ao carregar os detalhes.</p>';
        console.error('Erro ao carregar detalhes da estatística:', error);
    }
}

let eventosConfigurados = false; // ✅ Variável para evitar múltiplas configurações de eventos

/**
 * Configura os eventos de clique para exibir os detalhes das estatísticas.
 */
export function configurarEventosEstatisticas() {
    if (eventosConfigurados) {
        // console.log("⚠️ Eventos de clique já foram configurados. Ignorando nova configuração.");
        return;
    }

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

    eventosConfigurados = true; // ✅ Marca que os eventos já foram configurados
    // console.log("✅ Eventos de clique configurados para os quadrados.");
}
