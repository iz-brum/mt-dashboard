/**
 * @file server/apis/ana/services/node/combineInventoryAndTelemetry.js
 * @description Módulo responsável por combinar os dados do inventário (dados estáticos das estações)
 * com os dados telemétricos (dados dinâmicos) e, posteriormente, categorizar as estações.
 * O resultado é um array com as estações mescladas, que pode ser utilizado para gerar agrupamentos
 * e classificações (por exemplo, por rio, status, etc.).
 */

import fs from 'fs/promises';
import path from 'path';
import * as dateFnsTz from 'date-fns-tz';
import { addHours } from 'date-fns';

import { categorizeStations, getAllCategorizedStations } from '#utils/ana/classification/categorizacaoEstacoes.js';

/**
 * Formata uma data no padrão "YYYY-MM-DD".
 * @param {Date | string} date - Objeto Date ou string formatada
 * @returns {string}
 */
function formatDate(date) {
    // Se a data já for uma string (caso de date-fns-tz.format), retorna direto
    if (typeof date === 'string') return date;

    // Se não for um Date, converte primeiro
    const validDate = date instanceof Date ? date : new Date(date);
    return validDate.toISOString().split('T')[0];
}

/**
 * Carrega o inventário de estações.
 * @returns {Promise<Object>}
 */
async function loadInventory() {
    try {
        const inventoryPath = path.join('public', 'data', 'inventario_estacoes.json');
        const inventoryContent = await fs.readFile(inventoryPath, 'utf-8');
        return JSON.parse(inventoryContent);
    } catch (error) {
        console.error('Erro ao ler o inventário:', error);
        throw error;
    }
}

/**
 * Carrega os dados telemétricos de uma estação para uma data específica.
 * @param {string} codigoEstacao
 * @param {string} targetDate
 * @returns {Promise<Object|null>}
 */
let missingTelemetryCount = 0;

async function loadTelemetricData(codigoEstacao, targetDate) {
    const [year, month] = targetDate.split('-');
    const telemPath = path.join('public', 'data', year, month, targetDate, `codigoestacao_${codigoEstacao}.json`);
    try {
        const content = await fs.readFile(telemPath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        missingTelemetryCount++;
        // console.warn(`Telemetria não encontrada para a estação ${codigoEstacao} na data ${targetDate}: ${error.message}. Contador de estações sem telemetria: ${missingTelemetryCount}`);
        return null;
    }
}

/**
 * Mescla os dados telemétricos para uma única estação.
 * @param {Object} station
 * @param {string} targetDate
 * @param {string} targetYesterday
 * @returns {Promise<Object>}
 */
async function mergeTelemetricDataForStation(station, targetDate, targetYesterday) {
    const [telemetricToday, telemetricYesterday] = await Promise.all([
        loadTelemetricData(station.codigoestacao, targetDate),
        loadTelemetricData(station.codigoestacao, targetYesterday)
    ]);

    const combinedTelemetric = {
        data: targetDate,
        dados: []
    };

    if (telemetricYesterday?.dados) combinedTelemetric.dados.push(...telemetricYesterday.dados);
    if (telemetricToday?.dados) combinedTelemetric.dados.push(...telemetricToday.dados);

    if (combinedTelemetric.dados.length > 0) {
        combinedTelemetric.dados.sort((a, b) =>
            new Date(b.Data_Hora_Medicao) - new Date(a.Data_Hora_Medicao)
        );
    }

    return combinedTelemetric;
}

/**
 * Mescla os dados do inventário com os dados telemétricos para um conjunto de estações.
 * @returns {Promise<Array<Object>>}
 */
export async function mergeStationData() {
    missingTelemetryCount = 0; // ✅ Reseta o contador antes de iniciar a nova execução

    const inventory = await loadInventory();
    const stationsToProcess = inventory.slice(0, 237); // Considerar parametrizar se necessário.
    const mergedStations = [];

    // Definir o fuso horário de Brasília (UTC-3)
    const timeZone = 'America/Sao_Paulo';

    // Criar uma data correta para Brasília
    const nowUtc = new Date();
    const now = addHours(nowUtc, -3); // Ajuste manual para UTC-3

    // Formatar hoje e ontem no fuso correto
    const today = dateFnsTz.format(now, 'yyyy-MM-dd', { timeZone });
    const yesterday = dateFnsTz.format(addHours(now, -24), 'yyyy-MM-dd', { timeZone });

    // console.log("Hoje (Brasília):", today);
    // console.log("Ontem (Brasília):", yesterday);

    const targetDate = formatDate(today);
    const targetYesterday = formatDate(yesterday);

    for (const station of stationsToProcess) {
        try {
            const combinedTelemetric = await mergeTelemetricDataForStation(station, targetDate, targetYesterday);
            const ultimaMedicao = combinedTelemetric.dados[0]?.Data_Hora_Medicao || null;
            const ultimaAtualizacao = combinedTelemetric.dados[0]?.Data_Atualizacao || null;

            mergedStations.push({
                ...station,
                data: combinedTelemetric.data,
                dados: combinedTelemetric.dados,
                Data_Atualizacao: ultimaAtualizacao,
                Data_Hora_Medicao: ultimaMedicao
            });
        } catch (error) {
            console.error(`Erro ao processar a estação ${station.codigoestacao}:`, error);
        }
    }

    return mergedStations;
}

/**
 * Executa a mesclagem e categorização das estações.
 */
async function runCategorization() {
    try {
        const mergedStations = await mergeStationData();

        // Usa a nova função para obter todas as estações categorizadas com índice
        const allCategorizedStations = getAllCategorizedStations(mergedStations);
        console.log('\nEstações categorizadas (total: ' + allCategorizedStations.length + '):');
        allCategorizedStations.forEach(station => {
            console.log(`Index: ${station.index} - Código: ${station.codigoestacao} - Classificação Chuva: ${station.classificacaoChuva}`);
        });

        const categories = categorizeStations(mergedStations);

        console.log('\nEstações atualizadas:', categories.updated.length ?
            categories.updated.map(st => st.codigoestacao).join(', ') : 'Nenhuma');
        console.log('\nEstações desatualizadas:', categories.notUpdated.length ?
            categories.notUpdated.map(st => st.codigoestacao).join(', ') : 'Nenhuma');

        // Debug opcional: agrupa estações por classificações.
        const groupByClassification = (stations, key) =>
            stations.reduce((acc, station) => {
                acc[station[key]] = acc[station[key]] || [];
                acc[station[key]].push(station.codigoestacao);
                return acc;
            }, {});

        console.log('\nClassificação por chuva:', groupByClassification([...categories.updated, ...categories.notUpdated], 'classificacaoChuva'));
        console.log('\nClassificação por nível:', groupByClassification([...categories.updated, ...categories.notUpdated], 'classificacaoNivel'));
        console.log('\nClassificação por vazão:', groupByClassification([...categories.updated, ...categories.notUpdated], 'classificacaoVazao'));

    } catch (error) {
        console.error('Erro ao mesclar e categorizar estações:', error);
    }
}

runCategorization();
