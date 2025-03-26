/**
 * @file src/utils/ana/marker/estiloMarcador.js
 * @description Define os estilos dos marcadores, com função dinâmica para configurar o ícone
 * baseado na classificação.
 */

import { MARKER_STYLE_CONFIG } from '#utils/config.js';

export function getZIndexForClassification(type, classification) {
  const zIndexes = {
    chuva: {
      "Chuva - Extrema": 3000,
      "Chuva - Muito Forte": 2900,
      "Chuva - Forte": 2800,
      "Chuva - Moderada": 2700,
      "Chuva - Fraca": 2600,
      "Chuva - Sem Chuva": 2500,
      "Chuva - Indefinido": 2400,
      default: 2400
    },
    nivel: {
      "Nível - Alto": 2300,
      "Nível - Normal": 2200,
      "Nível - Baixo": 2100,
      "Nível - Indefinido": 2000,
      default: 2000
    },
    vazao: {
      "Vazão - Alta": 1900,
      "Vazão - Normal": 1800,
      "Vazão - Baixa": 1700,
      "Vazão - Indefinido": 1600,
      default: 1600
    }
  };

  if (zIndexes[type] && zIndexes[type][classification] !== undefined) {
    return zIndexes[type][classification];
  }
  return 1000; // fallback
}

export function createGeneralMarker(text, extraClass = '') {
  const { color, sizeMultiplier, textColor } = MARKER_STYLE_CONFIG.general;

  const minWidth = 45; // largura mínima
  const minHeight = 10; // altura mínima
  const padding = 3;
  const fontSize = Math.max(11, 12 * sizeMultiplier);

  return L.divIcon({
    className: 'dynamic-marker', // não adicionamos extraClass aqui
    html: `
      <div class="marker-wrapper">
        <div class="marker-content ${extraClass}" style="
          background-color: ${color};
          min-width: ${minWidth}px;
          min-height: ${minHeight}px;
          font-size: ${fontSize}px;
          color: ${textColor};
          display: inline-flex;
          justify-content: center;
          align-items: center;
          border: 2px solid white;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          font-weight: bold;
          padding: ${padding}px;
          text-align: center;
          line-height: 1.2;
          white-space: nowrap;
          box-sizing: border-box;
        ">
          <span>${text}</span>
        </div>
      </div>
    `,
    iconSize: null,
    iconAnchor: [minWidth / 2, minHeight / 2],
    popupAnchor: [0, -(minHeight / 2 + padding)]
  });
}


export function createMarkerByDynamicClassification(text, classification, type, extraClass = '') {
  let style;
  const defaultStyle = { color: "#FFFFFF", sizeMultiplier: 0.4, textColor: "#000000" };

  if (type === "chuva") {
    style = MARKER_STYLE_CONFIG.chuva[classification] || MARKER_STYLE_CONFIG.chuva.default;
  } else if (type === "nivel") {
    style = MARKER_STYLE_CONFIG.nivel[classification] || MARKER_STYLE_CONFIG.nivel.default;
  } else if (type === "vazao") {
    style = MARKER_STYLE_CONFIG.vazao[classification] || MARKER_STYLE_CONFIG.vazao.default;
  } else {
    style = defaultStyle;
  }

  const { color, sizeMultiplier, textColor } = style;
  const classificationKey = `${type.charAt(0).toUpperCase() + type.slice(1)} - ${classification}`;
  const zIndex = getZIndexForClassification(type, classificationKey);

  const minWidth = 45;
  const minHeight = 10;
  const padding = 3;
  const fontSize = Math.max(11, 12 * sizeMultiplier);
  
  return L.divIcon({
    className: 'dynamic-marker',
    html: `
      <div class="marker-wrapper">
        <div class="marker-content ${extraClass}" style="
          background-color: ${color};
          min-width: ${minWidth}px;
          min-height: ${minHeight}px;
          font-size: ${fontSize}px;
          color: ${textColor};
          display: inline-flex;
          justify-content: center;
          align-items: center;
          border: 2px solid white;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          font-weight: bold;
          padding: ${padding}px;
          text-align: center;
          line-height: 1.2;
          white-space: nowrap;
          box-sizing: border-box;
          z-index: ${zIndex} !important;
        ">
          <span>${text}</span>
        </div>
      </div>
    `,
    iconSize: null,
    iconAnchor: [minWidth / 2, minHeight / 2],
    popupAnchor: [0, -(minHeight / 2 + padding)]
  });
}

/**
 * Retorna a cor dos marcadores para uma camada com base no seu nome.
 * Espera um nome no formato "Chuva - Forte", "Nível - Alto", "Vazão - Normal", etc.
 * Se o tipo ou classificação não for encontrado, retorna a cor do estilo geral.
 * @param {string} layerName - Nome da camada.
 * @returns {string} A cor associada à camada.
 */
export function getMarkerColorFromLayerName(layerName) {
  const parts = layerName.split(' - ');
  if (parts.length < 2) {
    return MARKER_STYLE_CONFIG.general.color;
  }
  let type = parts[0].toLowerCase();
  let classification = parts[1];

  if (type === 'chuva') {
    return (MARKER_STYLE_CONFIG.chuva[classification] && MARKER_STYLE_CONFIG.chuva[classification].color) || MARKER_STYLE_CONFIG.chuva.default.color;
  } else if (type === 'nível' || type === 'nivel') {
    return (MARKER_STYLE_CONFIG.nivel[classification] && MARKER_STYLE_CONFIG.nivel[classification].color) || MARKER_STYLE_CONFIG.nivel.default.color;
  } else if (type === 'vazão' || type === 'vazao') {
    return (MARKER_STYLE_CONFIG.vazao[classification] && MARKER_STYLE_CONFIG.vazao[classification].color) || MARKER_STYLE_CONFIG.vazao.default.color;
  }
  return MARKER_STYLE_CONFIG.general.color;
}

/**
 * Verifica em stationData qual classificação está definida
 * e retorna a cor do MARKER_STYLE_CONFIG correspondente.
 * @param {Object} stationData - Dados da estação, incluindo classificacaoChuva, classificacaoNivel, etc.
 * @returns {string} cor (hex) ou fallback "#999"
 */
export function getMarkerColor(stationData) {
  if (stationData.classificacaoChuva) {
    const classification = stationData.classificacaoChuva;
    return (MARKER_STYLE_CONFIG.chuva[classification] || MARKER_STYLE_CONFIG.chuva.default).color;
  } else if (stationData.classificacaoNivel) {
    const classification = stationData.classificacaoNivel;
    return (MARKER_STYLE_CONFIG.nivel[classification] || MARKER_STYLE_CONFIG.nivel.default).color;
  } else if (stationData.classificacaoVazao) {
    const classification = stationData.classificacaoVazao;
    return (MARKER_STYLE_CONFIG.vazao[classification] || MARKER_STYLE_CONFIG.vazao.default).color;
  }
  return MARKER_STYLE_CONFIG.general.color || '#999';
}
