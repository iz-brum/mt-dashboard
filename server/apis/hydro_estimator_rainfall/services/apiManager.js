/**
 * @file src/components/Hydro_Estimator_Rainfall/apiManager.js
 * @description Módulo para gerenciar requisições à API e manipulação de timestamps.
 * 
 * Este módulo é responsável por buscar os timestamps de um produto a partir de uma API externa,
 * filtrar os timestamps para obter apenas aqueles dos últimos 2 horas (UTC) e gerenciar um cache
 * para evitar requisições desnecessárias.
 */

import { convertTimestampToDate } from '../../../../src/utils/formatoData.js'; // Importa a função para converter um timestamp para um objeto Date (UTC)
// import { convertTimestampToDate } from '../../../../src/utils/formatTimestamp.js';

// Cache para armazenar os dados retornados pela API e evitar requisições frequentes
const apiCache = {
    data: null,         // Dados armazenados (timestamps)
    timestamp: null,    // Momento em que os dados foram armazenados (em milissegundos)
    ttl: 1 * 60 * 60 * 1000 // Tempo de vida do cache: 1 hora em milissegundos
};

/**
 * Filtra os timestamps para selecionar apenas aqueles que estão dentro do intervalo dos últimos 2 horas (UTC).
 *
 * @param {Array<string>} data - Array de timestamps no formato "YYYYMMDD_HHMMSS".
 * @returns {Array<string>} Array de timestamps filtrados que ocorreram entre duas horas atrás e agora (UTC).
 */
function filterTimestamps(data) {
    const nowUTC = new Date(Date.now()); // Data e hora atuais em UTC
    // Calcula a data e hora de duas horas atrás a partir do momento atual
    const twoHoursAgoUTC = new Date(nowUTC.getTime() - 2 * 60 * 60 * 1000);

    // Filtra os timestamps, mantendo somente os que estão entre duas horas atrás e agora
    return data.filter(timestamp => {
        const tsDate = convertTimestampToDate(timestamp); // Converte o timestamp para objeto Date (UTC)
        return tsDate >= twoHoursAgoUTC && tsDate <= nowUTC;
    });
}

/**
 * Busca os timestamps da API para um determinado produto, utilizando cache se apropriado.
 *
 * @param {string} productID - ID do produto para o qual os timestamps serão buscados.
 * @param {boolean} [useCache=true] - Se true, utiliza o cache se os dados estiverem válidos.
 * @returns {Promise<Array<string>>} Promise que resolve para um array de timestamps filtrados.
 * @throws {Error} Se ocorrer um erro na requisição ou se não houver dados disponíveis.
 */
export async function fetchTimestamps(productID, useCache = true) {
    try {
        const now = Date.now();
        // Verifica se o cache deve ser utilizado e se os dados armazenados ainda são válidos
        if (useCache && apiCache.data && now - apiCache.timestamp < apiCache.ttl) {
            console.log('Usando dados do cache...');
            return filterTimestamps(apiCache.data);
        }

        // Faz a requisição à API usando o productID
        const response = await fetch(`https://realearth.ssec.wisc.edu/api/times?products=${productID}`);
        // Se a resposta não for OK, lança um erro com a mensagem do status
        if (!response.ok) throw new Error(`Erro na requisição: ${response.statusText}`);
        const data = await response.json();

        // Valida se os dados retornados estão no formato esperado e se há timestamps disponíveis
        if (!data || !data[productID] || !Array.isArray(data[productID]) || data[productID].length === 0) {
            throw new Error('Nenhum tempo disponível na resposta da API.');
        }

        // Atualiza o cache com os dados obtidos e a hora atual
        apiCache.data = data[productID];
        apiCache.timestamp = now;

        // Retorna os timestamps filtrados para os últimos 2 horas (UTC)
        return filterTimestamps(apiCache.data);
    } catch (error) {
        console.error('Erro ao carregar tempos:', error.message);
        throw error; // Propaga o erro para tratamento posterior
    }
}

/**
 * Busca os timestamps da API para um determinado produto sem utilizar o cache.
 *
 * @param {string} productID - ID do produto para o qual os timestamps serão buscados.
 * @returns {Promise<Array<string>>} Promise que resolve para um array de timestamps filtrados.
 * @throws {Error} Se ocorrer um erro na requisição ou se não houver dados disponíveis.
 */
export async function refreshTimestamps(productID) {
    try {
        // Realiza a requisição à API para buscar os timestamps
        const response = await fetch(`https://realearth.ssec.wisc.edu/api/times?products=${productID}`);
        if (!response.ok) throw new Error(`Erro na requisição: ${response.statusText}`);
        const data = await response.json();

        // Verifica se os dados retornados estão no formato esperado e se há timestamps
        if (!data || !data[productID] || !Array.isArray(data[productID]) || data[productID].length === 0) {
            throw new Error('Nenhum tempo disponível na resposta da API.');
        }

        // Retorna os timestamps filtrados para os últimos 2 horas (UTC)
        return filterTimestamps(data[productID]);
    } catch (error) {
        console.error('Erro ao atualizar timestamps:', error.message);
        throw error; // Propaga o erro para tratamento posterior
    }
}
