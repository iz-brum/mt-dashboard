/**
 * @file src/utils/formatTimestamp.js
 * @description Utilitários para manipulação de timestamps no formato "YYYYMMDD_HHMMSS" (UTC).
 * 
 * Este módulo exporta funções que convertem e formatam timestamps que seguem o padrão:
 * - "YYYYMMDD_HHMMSS" (ex.: "20231020_123045")
 * para objetos Date e strings formatadas em UTC.
 *
 * @example
 * const dateObj = convertTimestampToDate("20231020_123045");
 * const formatted = formatTimestamp("20231020_123045");
 * console.log(formatted); // "2023-10-20 12:30:45"
 */

/**
 * Converte um timestamp no formato "YYYYMMDD_HHMMSS" para um objeto Date (UTC).
 * 
 * O timestamp deve estar no formato sem separadores para a data e hora, com um underscore
 * separando a parte da data da parte da hora.
 *
 * @param {string} ts - Timestamp no formato "YYYYMMDD_HHMMSS" (ex.: "20231020_123045").
 * @returns {Date} Objeto Date correspondente ao timestamp em UTC.
 */

import { DEFAULT_CONFIG } from '#utils/config.js';

export const DataFormatter = {
    formatArea: (value) =>
        value && !isNaN(value)
            ? `${parseFloat(value).toLocaleString()} km²`
            : DEFAULT_CONFIG.INVALID_VALUE,
    formatSubBasin: (value) =>
        value ? value.replace(/,+/g, ', ').trim() : DEFAULT_CONFIG.INVALID_VALUE,
    formatCoordinate: (value) =>
        value || DEFAULT_CONFIG.INVALID_VALUE,
    formatDate: (value) =>
        value ? new Date(value).toLocaleDateString('pt-BR') : DEFAULT_CONFIG.INVALID_VALUE,
    formatTime: (value) =>
        value
            ? new Date(value).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
            : DEFAULT_CONFIG.INVALID_VALUE
};

export function convertTimestampToDate(ts) {
    // Extrai a parte da data (primeiros 8 caracteres: "YYYYMMDD")
    const datePart = ts.slice(0, 8);
    // Extrai a parte da hora (a partir do caractere 9, os próximos 6 caracteres: "HHMMSS")
    const timePart = ts.slice(9, 15);

    // Converte as partes extraídas para números inteiros
    const year = parseInt(datePart.slice(0, 4), 10);
    const month = parseInt(datePart.slice(4, 6), 10) - 1; // Subtrai 1, pois os meses em JavaScript são base 0 (0 = Janeiro)
    const day = parseInt(datePart.slice(6, 8), 10);
    const hours = parseInt(timePart.slice(0, 2), 10);
    const minutes = parseInt(timePart.slice(2, 4), 10);
    const seconds = parseInt(timePart.slice(4, 6), 10);

    // Cria e retorna um objeto Date em UTC utilizando Date.UTC()
    return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
}

/**
 * Formata um timestamp no formato "YYYYMMDD_HHMMSS" para o formato "YYYY-MM-DD HH:MM:SS" (UTC).
 * 
 * Esta função converte primeiro o timestamp para um objeto Date em UTC e, em seguida,
 * formata a data para uma string legível, substituindo o "T" da notação ISO por um espaço
 * e removendo a parte dos milissegundos.
 *
 * @param {string} timestamp - Timestamp no formato "YYYYMMDD_HHMMSS" (ex.: "20231020_123045").
 * @returns {string} Data formatada em UTC (ex.: "2023-10-20 12:30:45").
 */
export function formatTimestamp(timestamp) {
    // Converte o timestamp para um objeto Date (UTC)
    const date = convertTimestampToDate(timestamp);
    // Formata a data para a string ISO, substitui "T" por espaço e remove a parte dos milissegundos
    return date.toISOString().replace('T', ' ').substring(0, 19);
}


/**
 * Converte uma string de data/hora no formato "YYYY-MM-DD HH:MM:SS.0" para um objeto Date
 * considerando o fuso horário de Brasília (UTC-3).
 *
 * @param {string} dateTimeStr - Exemplo: "2025-02-10 12:00:00.0"
 * @returns {Date} Objeto Date interpretado como horário de Brasília.
 */
export function parseBrasiliaDate(dateTimeStr) {
    // Divide a string em data e hora
    const [datePart, timePartRaw] = dateTimeStr.split(" ");
    if (!timePartRaw) return new Date(dateTimeStr);
    // Remove a parte decimal (por exemplo, ".0")
    const timePart = timePartRaw.split(".")[0];
    // Constrói uma string ISO: "YYYY-MM-DDTHH:MM:SS-03:00"
    const isoStr = `${datePart}T${timePart}-03:00`;
    return new Date(isoStr);
}



/**
 * Verifica se a data/hora está dentro das últimas 24 horas
 * em relação a uma data de referência (não à hora atual)
 * 
 * @param {string} dateTimeStr - Data/hora do registro
 * @param {Date} referenceDate - Data de referência para cálculo
 * @returns {boolean}
 */
export function isWithinLast24Hours(dateTimeStr, referenceDate) {
    const recordDate = parseBrasiliaDate(dateTimeStr);
    const twentyFourHoursAgo = new Date(referenceDate.getTime() - 24 * 60 * 60 * 1000);
    return recordDate >= twentyFourHoursAgo && recordDate <= referenceDate;
}

