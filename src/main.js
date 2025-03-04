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

// Importa módulos necessários para as funcionalidades do mapa
import { setupGeocoding } from '#components/geocoding/geocoding.js';
import { setupMapControls } from '#components/controleMapa.js';
import { setupImportControl } from '#components/controleImportacao.js';
import { addLayerControl } from '#components/layers/controleCamadas.js';
import { MAP_CONFIG } from '#utils/ana/config.js';
import { atualizarMarcadoresIncremental } from '#utils/ana/atualizarMarcadores.js';
import { StationMarkers } from '#components/ana/gerenciadorDeMarcadores.js';
import { showError } from '#utils/notificacoes.js';
// import { setupHourlyRainfall } from '#components/Hydro_Estimator_Rainfall/HourlyRainfall.js';
import { atualizarGraficoDeChuva } from '#utils/ana/telemetry/charts/verticalBarChart.js';
import { atualizarEstatisticasNaUI } from '#utils/ana/telemetry/estatisticasChuva.js';
import { configurarEventosEstatisticas } from '#utils/ana/telemetry/detalhesEstatisticas.js';


// Verifica se o elemento HTML com id "map" existe na página
const mapElement = document.getElementById('map');
if (!mapElement) {
    // Se não existir, loga um erro e exibe uma notificação ao usuário
    const errorMessage = 'Elemento do mapa não encontrado. Verifique se o ID "map" está correto.';
    console.error(errorMessage);
    showError(errorMessage);
} else {
    // Se o elemento existir, inicia a configuração do mapa de forma assíncrona
    (async () => {
        try {
            // Verifica se a biblioteca Leaflet está carregada
            if (typeof L === 'undefined') {
                throw new TypeError('Leaflet.js não está carregado. Verifique se a biblioteca foi importada corretamente.');
            }

            // Inicia o timer para configuração do mapa
            console.time('Map Initialization');

            // Cria a instância do mapa com a configuração vinda de MAP_CONFIG
            const map = L.map('map', MAP_CONFIG);

            // Validação: assegura que a instância criada é realmente um objeto do Leaflet
            if (!(map instanceof L.Map)) {
                throw new TypeError('Instância do mapa Leaflet inválida');
            }

            // Finaliza o timer de configuração do mapa
            console.timeEnd('Map Initialization');

            // Chama o initialize para registrar os eventos de moveend/zoomend
            StationMarkers.initialize(map);

            // Agora carrega os marcadores:
            await StationMarkers.load();

            console.time('Classification Layers Initialization');
            const layerControl = await addLayerControl(map);
            console.timeEnd('Classification Layers Initialization');
            
            // Inicializa os serviços de geocodificação, importação e controles customizados do mapa
            setupGeocoding(map);
            setupImportControl(map, layerControl);
            setupMapControls(map);

            // Atualiza o gráfico de chuvas e estatísticas na UI
            atualizarGraficoDeChuva();
            atualizarEstatisticasNaUI();
            setTimeout(configurarEventosEstatisticas, 1000); // Pequeno delay para garantir que os elementos existem


            // Inicialização opcional: configuração das camadas de precipitação horária
            // setupHourlyRainfall(map);


            // Atualiza o gráfico de chuvas, estatísticas e os marcadores a cada 5 minutos (300000 ms)
            setInterval(() => {
                atualizarMarcadoresIncremental();
                atualizarGraficoDeChuva();
                atualizarEstatisticasNaUI();
                setTimeout(configurarEventosEstatisticas, 1000); // Pequeno delay para garantir que os elementos existem
            }, 30000);


        } catch (error) {
            // Em caso de erro na inicialização do mapa, loga o erro e exibe uma notificação ao usuário
            console.error('Erro ao inicializar o mapa:', error);
            showError('Falha ao inicializar o mapa. Verifique o console para mais detalhes.');
        }
    })();
}
