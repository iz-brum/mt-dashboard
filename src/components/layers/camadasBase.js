/**
 * @file src\components\layers\camadasBase.js
 * @description Módulo para criação e configuração das camadas base do mapa.
 */

import { renderFileOnMap } from '#components/gerenciadorArquivos.js';

// Configuração das camadas base utilizando diversas fontes
const BASE_LAYERS_CONFIG = {
    'OpenStreetMap': {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap'
    },
    'OpenTopoMap': {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '© OpenTopoMap'
    },
    'OSM Humanitarian': {
        url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team'
    },
    'CartoDB Voyager': {
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        attribution: '© OpenStreetMap contributors, © CartoDB'
    },
    'Esri WorldStreetMap': {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles © Esri'
    },
    'Stadia Maps - OSM Bright': {
        url: 'https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png',
        attribution: '© OpenStreetMap contributors, © Stadia Maps'
    },
    'Stadia Maps - Stamen Terrain': {
        url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png',
        attribution: 'Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under ODbL.'
    }
};

// Configuração para camadas da Esri, incluindo camada base, labels e referência
const ESRI_LAYERS_CONFIG = {
    base: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© Esri'
    },
    labels: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
        options: { opacity: 0.8 }
    },
    reference: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        options: { opacity: 0.95 }
    }
};

// Nome padrão para a camada de satélite que será adicionada aos base layers
const DEFAULT_LAYER_NAME = 'Satélite com Rótulos';

/**
 * Função utilitária que cria uma camada de tiles utilizando a URL, attribution e opções.
 *
 * @param {string} url - URL do serviço de tiles.
 * @param {string} [attribution=''] - Texto de atribuição a ser exibido.
 * @param {Object} [options={}] - Outras opções de configuração para a camada.
 * @returns {L.TileLayer} Uma instância de L.tileLayer.
 */
const createTileLayer = (url, attribution = '', options = {}) =>
    L.tileLayer(url, { attribution, ...options });

/**
 * Função utilitária que cria um grupo de camadas (L.LayerGroup) a partir de um array de camadas.
 *
 * @param {Array<L.TileLayer>} layers - Array de camadas.
 * @returns {L.LayerGroup} Uma instância de L.layerGroup contendo as camadas fornecidas.
 */
const createLayerGroup = layers => L.layerGroup(layers);

/**
 * Cria e retorna um objeto com as camadas base, utilizando a configuração definida em BASE_LAYERS_CONFIG.
 *
 * @returns {Object} Objeto onde cada chave é o nome da camada base e o valor é a camada criada.
 */
export function createBaseLayers() {
    const layers = {};
    for (const [name, config] of Object.entries(BASE_LAYERS_CONFIG)) {
        layers[name] = createTileLayer(config.url, config.attribution);
    }
    return layers;
}

/**
 * Cria as camadas da Esri e as agrupa em um único layer group.
 * Utiliza as configurações definidas em ESRI_LAYERS_CONFIG para criar:
 *  - A camada base de imagens
 *  - A camada de labels
 *  - A camada de referências
 *
 * @returns {L.LayerGroup} Um layer group contendo as camadas Esri.
 */
export function createEsriLayers() {
    const layers = {
        base: createTileLayer(ESRI_LAYERS_CONFIG.base.url, ESRI_LAYERS_CONFIG.base.attribution),
        labels: createTileLayer(ESRI_LAYERS_CONFIG.labels.url, '', ESRI_LAYERS_CONFIG.labels.options),
        reference: createTileLayer(ESRI_LAYERS_CONFIG.reference.url, '', ESRI_LAYERS_CONFIG.reference.options)
    };
    return createLayerGroup([layers.base, layers.labels, layers.reference]);
}

/**
 * Cria e retorna a camada de satélite, composta pela camada base de imagens, labels e referências da Esri.
 * @returns {L.LayerGroup} Um layer group contendo as camadas Esri para satélite com rótulos.
 */
export function createSatelliteLayer() {
    const base = createTileLayer(ESRI_LAYERS_CONFIG.base.url, ESRI_LAYERS_CONFIG.base.attribution);
    const labels = createTileLayer(ESRI_LAYERS_CONFIG.labels.url, '', ESRI_LAYERS_CONFIG.labels.options);
    const reference = createTileLayer(ESRI_LAYERS_CONFIG.reference.url, '', ESRI_LAYERS_CONFIG.reference.options);
    return createLayerGroup([base, labels, reference]);
}

/**
 * Carrega vários arquivos locais (kml, kmz, geojson...) via fetch
 * e chama `renderFileOnMap` para que cada um seja interpretado do mesmo jeito que o upload faria.
 *
 * @param {string[]} urls - Array com os caminhos dos arquivos (ex: ['assets/dce-mt.kml', 'assets/outro.kml']).
 * @param {L.Map} map - Instância do Leaflet Map.
 * @param {Object} layerControl - Seu controle de camadas (opcional).
 */
async function addLocalAssetsThroughImporter(urls, map, layerControl) {
    // Cria um array de promessas para processar todos os arquivos
    const promises = urls.map(async (url) => {
        const fileName = url.split('/').pop();
        const extension = fileName.split('.').pop().toLowerCase();

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Falha ao carregar ${url}: status ${response.status}`);
        }

        let file;
        if (extension === 'kmz') {
            const arrayBuffer = await response.arrayBuffer();
            file = new File([arrayBuffer], fileName, { type: 'application/vnd.google-earth.kmz' });
        } else {
            const text = await response.text();
            file = new File([text], fileName, { type: 'text/xml' });
        }

        return renderFileOnMap(file, map, layerControl);
    });

    // Aguarda que todos os arquivos sejam processados
    await Promise.all(promises);
}


export { DEFAULT_LAYER_NAME, addLocalAssetsThroughImporter };
