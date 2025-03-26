import { DEFAULT_CONFIG, CACHE_CONFIG } from '#utils/config.js';

let cacheEstatisticas = null;
let ultimaAtualizacao = 0;
const TEMPO_CACHE_MS = CACHE_CONFIG.ESTATISTICAS.TTL; // Configurado via CACHE_CONFIG

/**
 * Faz uma requisição para a API e retorna os dados ou um array/objeto vazio em caso de erro.
 * @param {string} url - URL da API.
 * @returns {Promise<Array|Object>} Dados da API ou um array/objeto vazio.
 */
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro HTTP! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Erro ao obter dados de ${url}:`, error);
        return Array.isArray(url) ? [] : {};
    }
}

/**
 * Obtém os dados necessários para cálculos estatísticos, utilizando cache para otimização.
 * @returns {Promise<Object>} Dados estruturados para cálculos estatísticos.
 */
export async function obterDadosEstatisticos() {
    const agora = Date.now();

    if (cacheEstatisticas && (agora - ultimaAtualizacao < TEMPO_CACHE_MS)) {
        return cacheEstatisticas;
    }

    try {
        const [cidadesData, estacoesData, estacoesCategorizadas] = await Promise.all([
            fetchData(DEFAULT_CONFIG.DATA_SOURCE_CHUVA_POR_CIDADE),
            fetchData(DEFAULT_CONFIG.DATA_SOURCE),
            fetchData(DEFAULT_CONFIG.DATA_SOURCE_CATEGORIZADAS)
        ]);

        cacheEstatisticas = calcularEstatisticas(cidadesData, estacoesData, estacoesCategorizadas);
        ultimaAtualizacao = agora;

        return cacheEstatisticas;
    } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
        return cacheEstatisticas || {};
    }
}

/**
 * Calcula estatísticas detalhadas das chuvas por cidade e estação.
 * Agora utiliza a MÉDIA GLOBAL: soma de chuvaAcumulada de TODAS as estações / total de estações.
 *
 * @param {Array} cidadesData - Dados de chuva por cidade (cada item tem "chuvaMediana", "chuvaMedia", etc.).
 * @param {Array} estacoesData - Dados de todas as estações (cada item tem "chuvaAcumulada", "Municipio_Nome", etc.).
 * @param {Object} estacoesCategorizadas - Dados das estações categorizadas (para contagem de desatualizadas).
 * @returns {Object} Estatísticas calculadas.
 */
function calcularEstatisticas(cidadesData, estacoesData, estacoesCategorizadas) {
    // 🔹 Total de cidades monitoradas
    const totalCidadesMonitoradas = cidadesData.length;
    const listaCidades = cidadesData.map(cidade => cidade.cidade);

    // 🔹 Filtra cidades com dados válidos para mediana (baseado na chuvaMediana da cidade)
    const cidadesComMediana = cidadesData
        .filter(cidade => cidade.chuvaMediana !== null && cidade.chuvaMediana > 0)
        .map((cidade, index) => ({
            index: index + 1,
            nome: cidade.cidade,
            mediana: cidade.chuvaMediana.toFixed(2) + " mm"
        }));

    // 🔹 Cidades sem chuva
    const cidadesSemChuva = cidadesData.filter(item => item.chuvaMedia === 0);
    const listaCidadesSemChuva = cidadesSemChuva.map(cidade => cidade.cidade);

    // ----------------------------------------------------------------------------
    // 🔹 Cria um array com TODOS os valores de chuva (estação a estação), 
    //     excluindo valores nulos/indefinidos (não substituindo por 0)
    // ----------------------------------------------------------------------------
    const allStationsChuva = estacoesData
        .map(estacao => estacao.chuvaAcumulada)
        .filter(valor => valor !== null && valor !== undefined)
        .sort((a, b) => a - b);

    // ----------------------------------------------------------------------------
    // 🔹 MÉDIA GLOBAL: soma de chuvaAcumulada de TODAS as estações / total de estações
    // ----------------------------------------------------------------------------
    const somaGlobalChuva = allStationsChuva.reduce((acc, val) => acc + val, 0);
    const totalEstacoesGlobal = allStationsChuva.length;
    const mediaGeralGlobal = totalEstacoesGlobal ? somaGlobalChuva / totalEstacoesGlobal : 0;

    // ----------------------------------------------------------------------------
    // 🔹 Calcula mediana global (usando todos os valores de chuva de todas as estações)
    // ----------------------------------------------------------------------------
    const totalGlobal = allStationsChuva.length;
    const medianaGlobal = totalGlobal > 0
        ? (totalGlobal % 2 === 1
            ? allStationsChuva[Math.floor(totalGlobal / 2)]
            : (allStationsChuva[totalGlobal / 2 - 1] + allStationsChuva[totalGlobal / 2]) / 2)
        : 0;

    // ----------------------------------------------------------------------------
    // 🔹 Filtra cidades com chuva acima da MÉDIA GLOBAL
    // ----------------------------------------------------------------------------
    const cidadesComChuvaElevada = cidadesData.filter(item => (item.chuvaMediana || 0) > mediaGeralGlobal);
    const listaCidadesComChuvaElevada = cidadesComChuvaElevada.map(cidade => cidade.cidade);

    // ----------------------------------------------------------------------------
    // 🔹 Identifica a estação com o maior registro de chuva
    // ----------------------------------------------------------------------------
    const estacaoMaiorChuva = estacoesData.reduce((max, estacao) =>
        estacao.chuvaAcumulada !== null && estacao.chuvaAcumulada > max.chuvaAcumulada ? estacao : max,
        { Municipio_Nome: "N/A", chuvaAcumulada: 0 }
    );

    // ----------------------------------------------------------------------------
    // 🔹 Calcula o desvio padrão dos valores (usando o array allStationsChuva e a média global)
    // ----------------------------------------------------------------------------
    const somaQuadrados = allStationsChuva.reduce((acc, item) => acc + Math.pow(item - mediaGeralGlobal, 2), 0);
    const desvioPadrao = allStationsChuva.length > 1 ? Math.sqrt(somaQuadrados / allStationsChuva.length) : 0;

    // ----------------------------------------------------------------------------
    // Contagem de estações monitoradas e desatualizadas
    // ----------------------------------------------------------------------------
    const totalEstacoesMonitoradas = cidadesData.reduce((acc, cidade) => acc + cidade.estacoes.length, 0);
    const totalEstacoesNA = estacoesCategorizadas.desatualizadas ? estacoesCategorizadas.desatualizadas.length : 0;

    // ----------------------------------------------------------------------------
    // Retorno do objeto de estatísticas formatado
    // ----------------------------------------------------------------------------
    return {
        totalCidadesMonitoradas,
        listaCidades,
        cidadesSemChuva: cidadesSemChuva.length,
        listaCidadesSemChuva,
        cidadesComChuvaElevada: cidadesComChuvaElevada.length,
        listaCidadesComChuvaElevada,
        maiorRegistroChuva: `${estacaoMaiorChuva.Municipio_Nome} (${estacaoMaiorChuva.chuvaAcumulada.toFixed(2)} mm)`,

        // Média geral baseada em todas as estações
        mediaGeralChuva: `${mediaGeralGlobal.toFixed(2)} mm`,

        // Mediana global calculada com todos os valores de chuva
        medianaChuva: `${medianaGlobal.toFixed(2)} mm`,

        desvioPadraoChuva: `${desvioPadrao.toFixed(2)} mm`,
        totalEstacoesMonitoradas,
        totalEstacoesNA,

        // Lista de valores baseada na mediana das cidades (se já utilizada em outros gráficos)
        listaValoresChuva: cidadesComMediana.map(item => parseFloat(item.mediana)).sort((a, b) => a - b),
        // Nova lista: todos os valores de chuva das estações
        listaValoresChuvaGlobal: allStationsChuva
    };
}

/**
 * Atualiza os valores das estatísticas na UI.
 */
export async function atualizarEstatisticasNaUI() {
    const estatisticas = await obterDadosEstatisticos();

    const elementos = {
        totalCidadesMonitoradas: 'totalCidades',
        cidadesSemChuva: 'cidadesSemChuva',
        cidadesComChuvaElevada: 'cidadesComChuvaElevada',
        maiorRegistroChuva: 'maiorRegistroChuva',
        mediaGeralChuva: 'mediaGeralChuva',
        medianaChuva: 'medianaChuva',
        desvioPadraoChuva: 'desvioPadraoChuva',
        totalEstacoesMonitoradas: 'totalEstacoes',
        totalEstacoesNA: 'totalEstacoesNA'
    };

    Object.keys(elementos).forEach(key => {
        const elemento = document.getElementById(elementos[key]);
        if (elemento) {
            elemento.innerText = estatisticas[key] !== undefined ? estatisticas[key] : '--';
        }
    });
}
