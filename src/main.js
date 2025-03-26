/**
 * @file src/main.js
 * @description Módulo principal para inicialização e configuração do mapa Leaflet.
 * @module MainMap
 * 
 * @license MIT
 * @copyright 2024 Sistema de Monitoramento Hidrometeorológico
 * 
 * @summary Implementa a configuração central do mapa e integração de componentes:
 *  - Inicialização do mapa base com parâmetros geográficos específicos
 *  - Gerenciamento de camadas e controles interativos
 *  - Integração de serviços de geocodificação
 *  - Carregamento dinâmico de marcadores
 *  - Tratamento centralizado de erros
 * 
 * @example
 * // Estrutura HTML requerida
 * <div id="map" style="height: 100vh; width: 100%"></div>
 * 
 * @see {@link https://leafletjs.com/|Leaflet.js Documentation}
 * 
 */

import { setupGeocoding } from '#components/geocoding/geocoding.js';
import { setupMapControls, addClusterToggleControl } from '#components/controleMapa.js';
import { setupImportControl } from '#components/controleImportacao.js';
import { initializeLayerControl } from '#components/layers/controleCamadas.js';
import { MAP_CONFIG, APP_CONFIG } from '#utils/config.js';
import { atualizarMarcadoresIncremental } from '#utils/ana/atualizarMarcadores.js';
import { StationMarkers } from '#components/ana/gerenciadorDeMarcadores.js';
import { showError } from '#utils/notificacoes.js';
// import { setupHourlyRainfall } from '#components/Hydro_Estimator_Rainfall/HourlyRainfall.js';
import { atualizarGraficoDeChuva } from '#utils/ana/telemetry/charts/verticalBarChart.js';
import { atualizarEstatisticasNaUI } from '#utils/ana/telemetry/estatisticasChuva.js';
import { configurarEventosEstatisticas } from '#utils/ana/telemetry/detalhesEstatisticas.js';
import { addLocalAssetsThroughImporter } from '#components/layers/camadasBase.js';

// Utiliza o ID centralizado para buscar o elemento do mapa
const mapElement = document.getElementById(APP_CONFIG.MAP_ELEMENT_ID);
if (!mapElement) {
    const errorMessage = `Elemento do mapa não encontrado. Verifique se o ID "${APP_CONFIG.MAP_ELEMENT_ID}" está correto.`;
    console.error(errorMessage);
    showError(errorMessage);
} else {
    (async () => {
        try {
            if (typeof L === 'undefined') {
                throw new TypeError('Leaflet.js não está carregado. Verifique se a biblioteca foi importada corretamente.');
            }

            console.time('Map Initialization');

            // Cria a instância do mapa utilizando o ID configurado
            const map = L.map(APP_CONFIG.MAP_ELEMENT_ID, MAP_CONFIG);

            if (!(map instanceof L.Map)) {
                throw new TypeError('Instância do mapa Leaflet inválida');
            }

            console.timeEnd('Map Initialization');

            StationMarkers.initialize(map);
            await StationMarkers.load();

            const { layerControl } = await initializeLayerControl(map);

            if (!layerControl) {
                console.error('Erro: initializeLayerControl não retornou um L.Control.Layers válido.');
            } else {
                // console.log('layerControl inicializado com sucesso:', layerControl);
            }

            // Carrega seu KML local (ou KMZ, GeoJSON etc.)
            // Carrega os arquivos da pasta assets
            const filesToLoad = [
                'assets/dce-mt.kml',
                'assets/br_mt.json',
                // Adicione quantos quiser...
            ];

            await addLocalAssetsThroughImporter(filesToLoad, map, layerControl);
            setupImportControl(map, layerControl);


            addClusterToggleControl(map);
            setupGeocoding(map);
            setupMapControls(map);

            atualizarGraficoDeChuva();
            atualizarEstatisticasNaUI();
            setTimeout(configurarEventosEstatisticas, APP_CONFIG.CONFIG_EVENT_DELAY_MS);

            // Atualiza os marcadores, gráficos e estatísticas conforme o intervalo definido em APP_CONFIG
            setInterval(() => {
                atualizarMarcadoresIncremental();
                atualizarGraficoDeChuva();
                atualizarEstatisticasNaUI();
                setTimeout(configurarEventosEstatisticas, APP_CONFIG.CONFIG_EVENT_DELAY_MS);
            }, APP_CONFIG.REFRESH_INTERVAL_MS);

        } catch (error) {
            console.error('Erro ao inicializar o mapa:', error);
            showError('Falha ao inicializar o mapa. Verifique o console para mais detalhes.');
        }
    })();
}


// Inicialização opcional: configuração das camadas de precipitação horária
// setupHourlyRainfall(map);