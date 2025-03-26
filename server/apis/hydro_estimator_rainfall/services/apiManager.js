/**
 * @file src/components/Hydro_Estimator_Rainfall/apiManager.js
 * @description Módulo para gerenciar requisições à API e manipulação de timestamps.
 * 
 * Este módulo é responsável por buscar os timestamps de um produto a partir de uma API externa,
 * filtrar os timestamps para obter apenas aqueles dos últimos 2 horas (UTC) e gerenciar um cache
 * para evitar requisições desnecessárias.
 */

import { convertTimestampToDate } from '#utils/formatoData.js';
import { DEFAULT_CONFIG, CACHE_CONFIG } from '#utils/config.js';

// Cache para armazenar os dados retornados pela API e evitar requisições frequentes
const apiCache = {
    data: null,         // Dados armazenados (timestamps)
    timestamp: null,    // Momento em que os dados foram armazenados (em milissegundos)
    ttl: CACHE_CONFIG.TIMESTAMPS.TTL // Tempo de vida do cache definido na configuração
};

/**
 * Filtra os timestamps para selecionar apenas aqueles que estão dentro do intervalo dos últimos 2 horas (UTC).
 *
 * @param {Array<string>} data - Array de timestamps no formato "YYYYMMDD_HHMMSS".
 * @returns {Array<string>} Array de timestamps filtrados que ocorreram entre duas horas atrás e agora (UTC).
 */
function filterTimestamps(data) {
    const nowUTC = new Date(Date.now());
    const twoHoursAgoUTC = new Date(nowUTC.getTime() - 2 * 60 * 60 * 1000);

    return data.filter(timestamp => {
        const tsDate = convertTimestampToDate(timestamp);
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
        // Verifica se o cache está válido
        if (useCache && apiCache.data && now - apiCache.timestamp < apiCache.ttl) {
            console.log('Usando dados do cache...');
            return filterTimestamps(apiCache.data);
        }

        // Realiza a requisição usando a URL centralizada no DEFAULT_CONFIG
        const response = await fetch(`${DEFAULT_CONFIG.REAL_EARTH_API_URL}?products=${productID}`);
        if (!response.ok) throw new Error(`Erro na requisição: ${response.statusText}`);
        const data = await response.json();

        // Valida se os dados retornados estão no formato esperado e se há timestamps disponíveis
        if (!data || !data[productID] || !Array.isArray(data[productID]) || data[productID].length === 0) {
            throw new Error('Nenhum tempo disponível na resposta da API.');
        }

        // Atualiza o cache com os dados obtidos e o momento atual
        apiCache.data = data[productID];
        apiCache.timestamp = now;

        // Retorna os timestamps filtrados para os últimos 2 horas (UTC)
        return filterTimestamps(apiCache.data);
    } catch (error) {
        console.error('Erro ao carregar tempos:', error.message);
        throw error;
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
        const response = await fetch(`${DEFAULT_CONFIG.REAL_EARTH_API_URL}?products=${productID}`);
        if (!response.ok) throw new Error(`Erro na requisição: ${response.statusText}`);
        const data = await response.json();

        // Verifica se os dados retornados estão no formato esperado e se há timestamps disponíveis
        if (!data || !data[productID] || !Array.isArray(data[productID]) || data[productID].length === 0) {
            throw new Error('Nenhum tempo disponível na resposta da API.');
        }

        // Retorna os timestamps filtrados para os últimos 2 horas (UTC)
        return filterTimestamps(data[productID]);
    } catch (error) {
        console.error('Erro ao atualizar timestamps:', error.message);
        throw error;
    }
}
