// FILE: src/utils/ana/telemetry/estatisticasChuva.js

let cacheEstatisticas = null;
let ultimaAtualizacao = 0;
const TEMPO_CACHE_MS = 90000; // 90 SEGUNDOS



/**
 * Faz uma requisição para a API e retorna os dados ou um array vazio em caso de erro.
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
        return Array.isArray(url) ? [] : {}; // Retorna array ou objeto vazio dependendo da estrutura esperada
    }
}

/**
 * Obtém os dados necessários para cálculos estatísticos, utilizando cache para otimização.
 * @returns {Promise<Object>} Dados estruturados para cálculos estatísticos.
 */
export async function obterDadosEstatisticos() {
    const agora = Date.now();

    // 🟢 Se os dados ainda são válidos, retorna do cache sem fazer nova requisição
    if (cacheEstatisticas && (agora - ultimaAtualizacao < TEMPO_CACHE_MS)) {
        // console.log("⚡ Usando cache para estatísticas");
        return cacheEstatisticas;
    }

    // console.log("🔄 Buscando estatísticas do backend...");

    try {
        // Requisições para as APIs
        const [cidadesData, estacoesData, estacoesCategorizadas] = await Promise.all([
            fetchData('http://localhost:3000/api/stationData/estacoes/chuvaPorCidade'),
            fetchData('http://localhost:3000/api/stationData/estacoes/todas'),
            fetchData('http://localhost:3000/api/stationData/estacoes/categorizadas'),
        ]);

        // 🟢 Armazena os dados no cache
        cacheEstatisticas = calcularEstatisticas(cidadesData, estacoesData, estacoesCategorizadas);
        ultimaAtualizacao = agora;

        return cacheEstatisticas;
    } catch (error) {
        console.error("❌ Erro ao buscar estatísticas:", error);
        return cacheEstatisticas || {}; // Retorna cache antigo se disponível
    }
}

/**
 * Calcula estatísticas baseadas nos dados das cidades e estações.
 * @param {Array} cidadesData - Dados das chuvas por cidade.
 * @param {Array} estacoesData - Dados de todas as estações.
 * @param {Object} estacoesCategorizadas - Dados das estações categorizadas.
 * @returns {Object} Estatísticas calculadas.
 */
function calcularEstatisticas(cidadesData, estacoesData, estacoesCategorizadas) {
    const totalCidadesMonitoradas = cidadesData.length;
    const listaCidades = cidadesData.map(cidade => cidade.cidade);

    const cidadesSemChuva = cidadesData.filter(item => item.chuvaMedia === 0);
    const listaCidadesSemChuva = cidadesSemChuva.map(cidade => cidade.cidade);

    const somaChuva = cidadesData.reduce((acc, item) => acc + item.chuvaMedia, 0);
    const mediaGeral = cidadesData.length ? somaChuva / cidadesData.length : 0;

    const cidadesComChuvaElevada = cidadesData.filter(item => item.chuvaMedia > mediaGeral);
    const listaCidadesComChuvaElevada = cidadesComChuvaElevada.map(cidade => cidade.cidade);

    const estacaoMaiorChuva = estacoesData.reduce((max, estacao) =>
        estacao.chuvaAcumulada !== null && estacao.chuvaAcumulada > max.chuvaAcumulada ? estacao : max,
        { Municipio_Nome: "N/A", chuvaAcumulada: 0 }
    );

    const valoresChuva = cidadesData.map(item => item.chuvaMedia || 0).sort((a, b) => a - b);
    const totalValores = valoresChuva.length;
    const mediana = totalValores > 0
        ? (totalValores % 2 === 1
            ? valoresChuva[Math.floor(totalValores / 2)]
            : (valoresChuva[totalValores / 2 - 1] + valoresChuva[totalValores / 2]) / 2)
        : 0;

    const somaQuadrados = cidadesData.reduce((acc, item) => acc + Math.pow(item.chuvaMedia - mediaGeral, 2), 0);
    const desvioPadrao = cidadesData.length > 1 ? Math.sqrt(somaQuadrados / cidadesData.length) : 0;

    const totalEstacoesMonitoradas = cidadesData.reduce((acc, cidade) => acc + cidade.estacoes.length, 0);
    const totalEstacoesNA = estacoesCategorizadas.desatualizadas ? estacoesCategorizadas.desatualizadas.length : 0;


    return {
        totalCidadesMonitoradas,
        listaCidades,
        cidadesSemChuva: cidadesSemChuva.length,
        listaCidadesSemChuva,
        cidadesComChuvaElevada: cidadesComChuvaElevada.length,
        listaCidadesComChuvaElevada,
        maiorRegistroChuva: `${estacaoMaiorChuva.Municipio_Nome} (${estacaoMaiorChuva.chuvaAcumulada.toFixed(2)} mm)`,
        mediaGeralChuva: `${mediaGeral.toFixed(2)} mm`,  // ✅ Adicionado "mm"
        medianaChuva: `${mediana.toFixed(2)} mm`,        // ✅ Adicionado "mm"
        desvioPadraoChuva: `${desvioPadrao.toFixed(2)} mm`,  // ✅ Adicionado "mm"
        totalEstacoesMonitoradas,
        totalEstacoesNA,
        listaValoresChuva: valoresChuva,
    };
}

/**
 * Atualiza os valores das estatísticas na UI.
 */
export async function atualizarEstatisticasNaUI() {
    const estatisticas = await obterDadosEstatisticos();

    // console.log("📊 Estatísticas carregadas:", estatisticas); // 🔥 Verifica se os valores estão corretos

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
        // console.log(`🔄 Atualizando ${elementos[key]}:`, estatisticas[key]); // Adiciona log para depuração
        if (elemento) {
            elemento.innerText = estatisticas[key] !== undefined ? estatisticas[key] : '--';
        }
    });
}
