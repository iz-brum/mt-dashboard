/**
 * @file src/components/Hydro_Estimator_Rainfall/refreshScheduler.js
 * @description Módulo para agendar atualizações de timestamps a cada X minutos, com base no último timestamp disponível.
 * 
 * Esse módulo gerencia o agendamento de atualizações dos timestamps utilizados para a animação de chuva,
 * determinando o atraso adequado com base no último timestamp disponível e garantindo um atraso mínimo.
 */

import { refreshTimestamps } from '../../../server/apis/hydro_estimator_rainfall/services/apiManager.js';  // Função para atualizar os timestamps sem utilizar o cache
// import { refreshTimestamps } from '../../../server/apis/hydro_estimator_rainfall/services/apiManager.js';

import { convertTimestampToDate, formatTimestamp } from '../../utils/formatoData.js'; // Funções para converter e formatar timestamps

/**
 * Agenda a próxima atualização de timestamps.
 * 
 * @param {Object} params - Parâmetros necessários para agendar a atualização.
 * @param {number[]} params.timestamps - Lista atual de timestamps.
 * @param {string} params.productID - ID do produto no RealEarth.
 * @param {function} params.onRefreshSuccess - Callback chamado em caso de sucesso, recebe os novos timestamps.
 * @param {function} params.onRefreshError - Callback chamado em caso de erro, recebe o erro.
 * @param {number} [params.intervalMs=900000] - Intervalo base em milissegundos (15 minutos por padrão).
 * @param {number} [params.minDelay=60000] - Atraso mínimo em milissegundos (1 minuto por padrão).
 */
export function scheduleRefresh({
  timestamps,
  productID,
  onRefreshSuccess,
  onRefreshError,
  intervalMs = 15 * 60 * 1000, // 15 minutos
  minDelay = 60 * 1000        // 1 minuto
}) {
  // Se a lista de timestamps estiver vazia, aguarda o intervalo definido e tenta novamente
  if (timestamps.length === 0) {
    setTimeout(async () => {
      try {
        // Tenta atualizar os timestamps sem utilizar o cache
        const newTimestamps = await refreshTimestamps(productID);
        // Chama o callback de sucesso com os novos timestamps
        onRefreshSuccess(newTimestamps);
      } catch (error) {
        // Em caso de erro, chama o callback de erro
        onRefreshError(error);
      }
    }, intervalMs);
    return;
  }

  // Obtém o último timestamp da lista
  const lastTs = timestamps[timestamps.length - 1];
  // Converte o último timestamp para um objeto Date (UTC)
  const lastDate = convertTimestampToDate(lastTs);
  // Calcula o horário em que o próximo update deve ocorrer: última data + intervalo
  const nextUpdateTime = lastDate.getTime() + intervalMs;
  // Obtém o horário atual (em milissegundos)
  const now = Date.now();
  // Calcula o atraso necessário para a próxima atualização
  let delay = nextUpdateTime - now;

  // Garante que o atraso não seja inferior ao atraso mínimo definido
  if (delay < minDelay) {
    delay = minDelay;
  }

  // Loga no console o tempo em segundos até a próxima atualização, exibindo também o último timestamp formatado
  console.log(
    `Agendando próxima atualização em ${Math.round(delay / 1000)} segundos ` +
    `(baseado no último timestamp: ${formatTimestamp(lastTs)})`
  );

  // Agenda a execução da atualização dos timestamps após o atraso calculado
  setTimeout(async () => {
    try {
      // Tenta buscar os novos timestamps utilizando a função refreshTimestamps (sem cache)
      const newTimestamps = await refreshTimestamps(productID);
      // Chama o callback de sucesso com os novos timestamps
      onRefreshSuccess(newTimestamps);
    } catch (error) {
      // Em caso de erro, chama o callback de erro
      onRefreshError(error);
    }
  }, delay);
}
