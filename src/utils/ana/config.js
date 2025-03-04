// FILE: src\utils\ana\config.js

export const DEFAULT_CONFIG = {
  MARKER_COLOR: '#8c8eb6',
  MARKER_TEXT_LENGTH: 7,
  INVALID_VALUE: 'N/A',
  DATA_SOURCE: 'http://localhost:3000/api/stationData/estacoes/todas', // endereço completo
  DATA_SOURCE_HISTORICO: 'http://localhost:3000/api/stationData/estacoes/historico', // endereço completo
  TELEMETRIC_DATE: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
};

/**
 * Configuração geográfica inicial:
 * - Centro do mapa: Coordenadas de Mato Grosso (-12.6819, -56.9211)
 * - Zoom inicial: Nível 6 (visualização estadual)
 * - Limites de navegação: [-85, -180] a [85, 180] (prevenção de pan excessivo)
 * - Comportamento do zoom: Suave com snap de 0.3 e delta de 0.6
 * 
 * @constant {Object} mapConfig
 * @property {number[]} center Coordenadas [lat, lng] do centro inicial
 * @property {number} zoom Nível de zoom inicial (0-18)
 * @property {number} minZoom Zoom mínimo permitido
 * @property {number} maxZoom Zoom máximo permitido
 * @property {number[][]} maxBounds Limites máximos de navegação
 * @property {number} maxBoundsViscosity Resistência ao arraste além dos limites
 */

export const MAP_CONFIG = {
  center: [-12.6819, -56.9211],  // Coordenadas de Mato Grosso
  zoom: 7,                       // Nível de zoom inicial
  minZoom: 2,                    // Zoom mínimo permitido
  maxZoom: 18,                   // Zoom máximo permitido
  zoomControl: true,             // Habilita os controles de zoom
  zoomSnap: 0.3,                 // Permite um zoom mais suave
  zoomDelta: 0.6,                // Define o incremento de zoom a cada clique
  maxBounds: [                   // Limites máximos do mapa (previnem que o usuário navegue além do mundo)
    [-89.9999, -179.9999],     // Canto sudoeste (próximo ao Polo Sul)
    [89.9999, 179.9999]        // Canto nordeste (próximo ao Polo Norte)
  ],
  maxBoundsViscosity: 1.0        // Determina a resistência ao arraste além dos limites
};

// const apiUrl = `${DEFAULT_CONFIG.DATA_SOURCE_HISTORICO}${dateStr}/${interval}/${stationCode}`;
