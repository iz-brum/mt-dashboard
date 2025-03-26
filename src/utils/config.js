// FILE: src/utils/config.js

// Verifica se a aplicação está rodando em "localhost"
const isLocalhost = (typeof window !== 'undefined' && window.location.hostname === 'localhost');
const API_BASE = isLocalhost
  ? 'http://localhost:3000'
  : 'https://optics-collective-grid-turkey.trycloudflare.com';

export const DEFAULT_CONFIG = {
  MARKER_COLOR: '#8c8eb6',
  MARKER_TEXT_LENGTH: 12,
  INVALID_VALUE: 'N/A',
  DATA_SOURCE: `${API_BASE}/api/stationData/estacoes/todas`,
  DATA_SOURCE_HISTORICO: `${API_BASE}/api/stationData/estacoes/historico`,
  DATA_SOURCE_CHUVA_POR_CIDADE: `${API_BASE}/api/stationData/estacoes/chuvaPorCidade`,
  DATA_SOURCE_CATEGORIZADAS: `${API_BASE}/api/stationData/estacoes/categorizadas`,
  TELEMETRIC_DATE: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }),
  TILE_PROXY_URL: `${API_BASE}/proxy/image`,
  GEOCODE_ENDPOINT: `${API_BASE}/api/geocode`,
  REAL_EARTH_API_URL: 'https://realearth.ssec.wisc.edu/api/times',
};



// Configurações de cache para diferentes módulos, definindo tempos de expiração (TTL).
export const CACHE_CONFIG = {
  GEOCODING: {
    ENABLED: true,
    TTL: 1 * 60 * 1000 // Tempo de expiração para a cache de geocodificação (60 segundos)
  },
  ESTATISTICAS: {
    TTL: 1 * 60 * 1000 // 10 segundos em milissegundos
  },
  STATIONS: {
    TTL: 1 * 60 * 1000 // 10 segundos em milissegundos
  }
};

// Configurações gerais do aplicativo, como IDs de elementos e intervalos de atualização.
export const APP_CONFIG = {
  MAP_ELEMENT_ID: 'map',              // ID do elemento HTML do mapa
  REFRESH_INTERVAL_MS: 1 * 40 * 1000,          // Intervalo de atualização dos dados (10000 ms = 10 segundo)
  CONFIG_EVENT_DELAY_MS: 1 * 60 * 1000,        // Delay para disparar a configuração dos eventos após atualização (10000 ms = 10 segundos)
  MARKER_UPDATE_INTERVAL_MS: 1 * 20 * 1000     // Intervalo de atualização dos marcadores (10000 ms = 10 segundos)
};

// Configurações para classificação, com prefixos, tamanho de lote para processamento e valor padrão.
export const CLASSIFICATION_CONFIG = {
  PREFIXES: {
    chuva: "Chuva",
    nivel: "Nível",
    vazao: "Vazão",
    rio: "Rio",
    statusAtualizado: "Status - Atualizado",
    statusDesatualizado: "Status - Desatualizado"
  },
  BATCH_SIZE: 260,
  DEFAULT_CLASSIFICATION: "Indefinido"
};

// Configurações específicas para os marcadores no mapa, como o delay para debouncing.
export const MAP_MARKERS_CONFIG = {
  DEBOUNCE_DELAY_MS: 300 // Delay para debouncing dos eventos do mapa (300 ms = 0.3 segundos)
};

// Configurações para classificação de estações, definindo limiares e rótulos para chuva, nível e vazão.
export const STATION_CLASSIFICATION_CONFIG = {
  RAINFALL: {
    undefined: "Indefinido",
    noRain: "Sem Chuva",
    weak: "Fraca",
    moderate: "Moderada",
    strong: "Forte",
    veryStrong: "Muito Forte",
    extreme: "Extrema",
    // Limiares em milímetros
    thresholds: {
      weak: 5,
      moderate: 29,
      strong: 59,
      veryStrong: 99
    }
  },
  LEVEL: {
    undefined: "Indefinido",
    low: "Baixo",
    normal: "Normal",
    high: "Alto",
    // Limiares numéricos
    thresholds: {
      low: 400,
      normal: 450
    }
  },
  DISCHARGE: {
    undefined: "Indefinido",
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    // Limiares numéricos
    thresholds: {
      low: 30,
      normal: 35
    }
  },
  // Período para acumulação de chuva (em horas)
  RAINFALL_ACCUMULATION_PERIOD_HOURS: 24,
  // Limiar para considerar que os dados estão atualizados (em horas)
  UPDATE_THRESHOLD_HOURS: 12
};

// Configurações de estilo para os marcadores, tanto gerais quanto específicos para chuva, nível e vazão.
export const MARKER_STYLE_CONFIG = {
  general: {
    color: "#FFFFFF",
    sizeMultiplier: 0.4,
    baseSize: 30,
    textColor: "#000000"
  },
  chuva: {
    "Indefinido": { color: "#CCCCCC", sizeMultiplier: 0.3, textColor: "#000000" },
    "Sem Chuva": { color: "#AAAAAA", sizeMultiplier: 0.3, textColor: "#000000" },
    "Fraca": { color: "#00FF00", sizeMultiplier: 0.35, textColor: "#000000" },
    "Moderada": { color: "#FFFF00", sizeMultiplier: 0.4, textColor: "#000000" },
    "Forte": { color: "#FFA500", sizeMultiplier: 0.5, textColor: "#000000" },
    "Muito Forte": { color: "#FF0000", sizeMultiplier: 0.55, textColor: "#FFFFFF" },
    "Extrema": { color: "#27046b", sizeMultiplier: 0.65, textColor: "#FFFFFF" },
    default: { color: "#FFFFFF", sizeMultiplier: 0.4, textColor: "#000000" }
  },
  nivel: {
    "Indefinido": { color: "#CCCCCC", sizeMultiplier: 0.65, textColor: "#FFFFFF" },
    "Baixo": { color: "#00FFFF", sizeMultiplier: 0.7, textColor: "#000000" },
    "Normal": { color: "#00AAFF", sizeMultiplier: 0.75, textColor: "#000000" },
    "Alto": { color: "#0000FF", sizeMultiplier: 0.9, textColor: "#FFFFFF" },
    default: { color: "#FFFFFF", sizeMultiplier: 0.65, textColor: "#000000" }
  },
  vazao: {
    "Indefinido": { color: "#CCCCCC", sizeMultiplier: 0.65, textColor: "#FFFFFF" },
    "Baixa": { color: "#FF00FF", sizeMultiplier: 0.7, textColor: "#000000" },
    "Normal": { color: "#FFAA00", sizeMultiplier: 0.75, textColor: "#000000" },
    "Alta": { color: "#C62E2E", sizeMultiplier: 0.8, textColor: "#FFFFFF" },
    default: { color: "#FFFFFF", sizeMultiplier: 0.65, textColor: "#000000" }
  }
};

// Configurações para os popups flutuantes dos marcadores, incluindo rótulos, unidades, offsets e intervalo de atualização.
export const FLOATING_POPUP_CONFIG = {
  labels: {
    level: "Nível",
    discharge: "Vazão",
    rainfall: "Chuva"
  },
  units: {
    level: "cm",
    discharge: "m³/s",
    rainfall: "mm"
  },
  positionOffsets: {
    level: { left: -85, top: -10 },       //  -85 px e -10 px
    discharge: { left: -50, top: 50 },      //  -50 px e 50 px
    rainfall: { left: 47, top: -10 }         //  47 px e -10 px
  },
  updateInterval: 5000 // 5000 ms = 5 segundos
};

// Configuração de delay para criação dos gráficos de estatísticas.
export const STAT_CHART_DELAY_MS = 500;         // 500 ms = 0.5 segundos

// Configuração de delay para renderização do MathJax.
export const MATHJAX_RENDER_DELAY_MS = 100;       // 100 ms = 0.1 segundos

// Configurações do modal para exibir detalhes telemétricos.
export const MODAL_CONFIG = {
  DETALHES_ID: 'modalDetalhes',               // ID do modal de detalhes
  DETALHES_CONTENT_ID: 'modalDetalhesContent',  // ID do container de conteúdo do modal
  DETALHES_CLOSE_ID: 'modalDetalhesClose',      // ID do botão de fechar
  CLOSE_STYLE: {
    position: 'absolute',
    top: '10px',
    right: '15px',
    cursor: 'pointer',
    fontSize: '24px'
  }
};

// Configurações do modal telemétrico, incluindo IDs, estilos e intervalo padrão para consulta.
export const TELEMETRIC_MODAL_CONFIG = {
  modalId: 'telemetric-modal',
  modalContentId: 'telemetric-modal-content',
  modalTextId: 'telemetricModalText',
  closeButtonId: 'closeTelemetricModal',
  closeButtonStyle: {
    position: 'absolute',
    top: '10px',
    right: '15px',
    cursor: 'pointer',
    fontSize: '24px'
  },
  defaultInterval: '24h' // Intervalo padrão para consulta de dados telemétricos
};

// Configurações dos gráficos telemétricos, incluindo IDs de canvas e cores dos botões.
export const TELEMETRIC_CHART_CONFIG = {
  CHUVA: {
    canvasId: 'chuvaChartCanvas',
    buttonColor: 'rgb(154 208 245)'
  },
  COTA: {
    canvasId: 'cotaChartCanvas',
    buttonColor: 'rgb(255 177 193)'
  },
  VAZAO: {
    canvasId: 'vazaoChartCanvas',
    buttonColor: 'rgb(165 223 223)'
  }
};

// Configurações dos estilos dos gráficos (cores de fundo e borda) para os diferentes tipos de dados.
export const CHART_STYLES = {
  chuva: { bgColor: 'rgba(54, 162, 235, 0.5)', borderColor: 'rgba(54, 162, 235, 1)' },
  cota: { bgColor: 'rgba(255, 99, 132, 0.5)', borderColor: 'rgba(255, 99, 132, 1)' },
  vazao: { bgColor: 'rgba(75, 192, 192, 0.5)', borderColor: 'rgba(75, 192, 192, 1)' }
};

// Configurações dos controles do mapa, como sensibilidade do zoom, classes CSS e opções para controles padrão.
export const MAP_CONTROL_CONFIG = {
  ZOOM_SENSITIVITY: {
    MIN: 60,      // Valor mínimo permitido para a sensibilidade do zoom
    MAX: 2000,    // Valor máximo permitido para a sensibilidade do zoom
    DEFAULT: 450  // Valor padrão de sensibilidade do zoom
  },
  CONTROL_CLASSES: {
    CONTAINER: 'custom-map-control leaflet-bar', // Classe do container principal do controle
    HEADER: 'control-header',                     // Classe do cabeçalho do controle
    PANEL_DESCRIPTION: 'panel-description',       // Classe da descrição que aparece no cabeçalho
    EXPANDED_PANEL: 'expanded-panel',             // Classe do painel expandido com os controles
    ZOOM_SECTION: 'zoom-sensitivity-section',     // Classe da seção que controla a sensibilidade do zoom
    DRAG_SECTION: 'drag-toggle-section'           // Classe da seção que controla a habilitação do arrasto do mapa
  },
  SCALE_CONTROL_CONFIG: {
    position: 'bottomleft',
    metric: true,
    imperial: false,
    maxWidth: 90,
    updateWhenIdle: false
  },
  FULLSCREEN_CONTROL_CONFIG: {
    position: 'topright',
    title: 'Ver em tela cheia',
    titleCancel: 'Sair de tela cheia',
    forceSeparateButton: true,
    pseudoFullscreen: false,
    content: '<i class="fa fa-expand"></i>',
    enterIcon: '<i class="fa fa-compress"></i>',
    exitIcon: '<i class="fa fa-expand"></i>'
  }
};

// Configurações para manipulação de arquivos, como ícones e caminhos.
export const FILE_HANDLER_CONFIG = {
  ICON_BASE_PATH: 'assets/icons/', // Caminho base para os ícones dos arquivos
  FILE_TYPE_ICONS: {
    geojson: 'geojson.png', // Ícone para arquivos GeoJSON
    json: 'json.png',       // Ícone para arquivos JSON
    kml: 'kml.png',         // Ícone para arquivos KML
    gpx: 'gpx.png',         // Ícone para arquivos GPX
    default: 'file.png'     // Ícone padrão para formatos não reconhecidos
  }
};

// Configurações do mapa, definindo centro, zoom e limites de navegação.
export const MAP_CONFIG = {
  center: [-12.6819, -56.9211],
  zoom: 7,
  minZoom: 2,
  maxZoom: 18,
  zoomControl: true,
  zoomSnap: 0.3,
  zoomDelta: 0.6,
  maxBounds: [
    [-89.9999, -179.9999],
    [89.9999, 179.9999]
  ],
  maxBoundsViscosity: 1.0
};
