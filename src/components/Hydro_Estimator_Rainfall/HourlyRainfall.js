/**
 * @file src/components/Hydro_Estimator_Rainfall/HourlyRainfall.js
 * @description Módulo para gestão de camadas de precipitação horária no mapa Leaflet.
 * Esse módulo é responsável por configurar e iniciar a animação de chuva (precipitação horária),
 * bem como agendar a atualização dos timestamps para manter a animação atualizada.
 * 
 * @module HourlyRainfall
 */

import { showError } from '../../utils/notificacoes.js';        // Importa a função para exibir mensagens de erro na interface
import { formatTimestamp } from '../../utils/formatoData.js';    // Importa a função para formatar os timestamps
import { fetchTimestamps } from '../../../server/apis/hydro_estimator_rainfall/services/apiManager.js';                   // Importa a função para buscar os timestamps da API
import { createAnimationManager } from './animationManager.js';      // Importa o gerenciador de animação para os overlays
import { scheduleRefresh } from './refreshScheduler.js';             // Importa a função para agendar a atualização dos timestamps
import { addRainfallControl } from './rainFallControl.js';             // Importa a função para adicionar o controle de chuva no mapa

/**
 * Configura as camadas e a animação da precipitação horária no mapa.
 * - Busca os timestamps para o produto "NESDIS-GHE-HourlyRainfall".
 * - Adiciona o controle de chuva que permite pausar e retomar a animação.
 * - Inicia a animação dos overlays de chuva e agenda atualizações periódicas dos timestamps.
 *
 * @param {L.Map} map - Instância do mapa Leaflet onde a animação será exibida.
 */
export function setupHourlyRainfall(map) {

    // Define o ID do produto para os dados de chuva
    const productID = 'NESDIS-GHE-HourlyRainfall';
    // Inicializa o array que armazenará os timestamps obtidos
    let timestamps = [];

    // Cria o controle de chuva e obtém sua instância.
    // O controle possui callbacks para pausar e retomar a animação quando o usuário interage.
    const rainfallControl = addRainfallControl(map, {
        onPlay: () => {
            console.debug('Callback onPlay: retome a animação de chuva.');
            if (map.rainfallAnimationController) {
                map.rainfallAnimationController.resume();
            }
        },
        onPause: () => {
            console.debug('Callback onPause: pause a animação de chuva.');
            if (map.rainfallAnimationController) {
                map.rainfallAnimationController.pause();
            }
        }
    });

    // Define os limites geográficos para a região de Mato Grosso (ou outra região desejada)
    const boundsMT = [
        [-18.1835, -63.0000],
        [-7.9869, -50.2244]
    ];

    // Instancia o gerenciador de animação passando o mapa, o productID, os limites e o controle de chuva
    // A função createAnimationManager retorna um objeto com o método startAnimation
    const { startAnimation } = createAnimationManager(map, productID, boundsMT, rainfallControl);

    /**
     * Callback que lida com a atualização bem-sucedida dos timestamps.
     * Atualiza o array de timestamps, exibe-os no console e agenda uma nova atualização.
     *
     * @param {Array<number>} newTimestamps - Array de timestamps atualizados.
     */
    function handleRefreshSuccess(newTimestamps) {
        timestamps = newTimestamps;
        console.log('Timestamps atualizados:', timestamps.map(formatTimestamp));
        // Agenda a próxima atualização dos timestamps
        scheduleRefresh({
            timestamps,
            productID,
            onRefreshSuccess: handleRefreshSuccess,
            onRefreshError: handleRefreshError
        });
    }

    /**
     * Callback que lida com erros na atualização dos timestamps.
     * Exibe uma mensagem de erro e agenda uma nova tentativa de atualização.
     *
     * @param {Error} error - Objeto de erro ocorrido na atualização.
     */
    function handleRefreshError(error) {
        console.error('Erro ao atualizar timestamps:', error.message);
        // Agenda novamente a atualização dos timestamps mesmo em caso de erro
        scheduleRefresh({
            timestamps,
            productID,
            onRefreshSuccess: handleRefreshSuccess,
            onRefreshError: handleRefreshError
        });
    }

    // Busca inicial dos timestamps para o produto
    fetchTimestamps(productID)
        .then(data => {
            timestamps = data;
            console.log('Tempos carregados:', timestamps.map(formatTimestamp));
            if (timestamps.length > 0) {
                // Se houver timestamps, inicia a animação e armazena o controller no objeto do mapa
                const animationController = startAnimation(timestamps);
                map.rainfallAnimationController = animationController;
                // Agenda a atualização dos timestamps para manter a animação atualizada
                scheduleRefresh({
                    timestamps,
                    productID,
                    onRefreshSuccess: handleRefreshSuccess,
                    onRefreshError: handleRefreshError
                });
            } else {
                // Se não houver timestamps válidos, exibe um aviso no console e notifica o usuário
                console.warn('Nenhum timestamp válido dentro do intervalo de 2 horas.');
                showError('Nenhum dado disponível nas últimas 2 horas.');
            }
        })
        .catch(error => {
            // Em caso de erro na busca inicial, loga o erro e exibe uma mensagem de erro para o usuário
            console.error('Erro ao carregar tempos:', error.message);
            showError('Falha ao carregar tempos do RealEarth. Verifique a conexão ou a API.');
        });
}
