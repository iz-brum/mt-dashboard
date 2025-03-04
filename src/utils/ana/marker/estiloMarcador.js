/**
 * @file src/utils/ana/marker/estiloMarcador.js
 * @description Define os estilos dos marcadores, com função dinâmica para configurar o ícone
 * baseado na classificação.
 */

export function createGeneralMarker(text) {
  const color = '#FFFFFF'; // Estilo padrão para "Todas Estações"
  const sizeMultiplier = 0.55;
  const baseSize = 30;
  return L.divIcon({
    className: 'dynamic-marker',
    html: `
      <div class="marker-content" style="
          background-color: ${color};
          transform: scale(${sizeMultiplier});
          width: ${baseSize}px;
          height: ${baseSize}px;
          font-size: ${11 / sizeMultiplier}px;
          color: #000000;
          display: flex;
          justify-content: center;
          align-items: center;
      ">
          <span>${text}</span>
      </div>
    `,
    iconSize: [baseSize * sizeMultiplier, baseSize * sizeMultiplier],
    iconAnchor: [15 * sizeMultiplier, 15 * sizeMultiplier],
    popupAnchor: [8, -15 * sizeMultiplier]
  });
}

/**
 * Cria um ícone dinâmico com base na classificação e no tipo.
 * @param {string} text - Texto a ser exibido no marcador.
 * @param {string} classification - Valor da classificação (ex.: "Fraca", "Moderada", etc.).
 * @param {string} type - Tipo de classificação ("chuva", "nivel" ou "vazao").
 * @returns {L.DivIcon} - O ícone configurado.
 */
export function createMarkerByDynamicClassification(text, classification, type) {
  let color = "#FFFFFF";
  let sizeMultiplier = 0.55;
  const baseSize = 30;

  // Define uma variável para a cor do texto (default: preta)
  let textColor = "#000000";

  if (type === "chuva") {
    switch (classification) {
      case "Indefinido":
        color = "#CCCCCC";
        sizeMultiplier = 0.65;
        break;
      case "Sem Chuva":
        color = "#AAAAAA";
        sizeMultiplier = 0.65;
        break;
      case "Fraca":
        color = "#00FF00";
        sizeMultiplier = 0.7;
        break;
      case "Moderada":
        color = "#FFFF00";
        sizeMultiplier = 0.7;
        break;
      case "Forte":
        color = "#FFA500";
        sizeMultiplier = 0.75;
        break;
      case "Muito Forte":
        color = "#FF0000";
        sizeMultiplier = 0.8;
        textColor = "#FFFFFF";
        break;
      case "Extrema":
        color = "#27046b";
        sizeMultiplier = 0.85;
        textColor = "#FFFFFF";
        break;
      default:
        color = "#FFFFFF";
        sizeMultiplier = 0.65;
    }
  } else if (type === "nivel") {
    switch (classification) {
      case "Indefinido":
        color = "#CCCCCC";
        sizeMultiplier = 0.65;
        break;
      case "Baixo":
        color = "#00FFFF";
        sizeMultiplier = 0.7;
        break;
      case "Normal":
        color = "#00AAFF";
        sizeMultiplier = 0.75;
        break;
      case "Alto":
        color = "#0000FF";
        sizeMultiplier = 0.9;
        textColor = "#FFFFFF";
        break;
      default:
        color = "#FFFFFF";
        sizeMultiplier = 0.65;
    }
  } else if (type === "vazao") {
    switch (classification) {
      case "Indefinido":
        color = "#CCCCCC";
        sizeMultiplier = 0.65;
        break;
      case "Baixa":
        color = "#FF00FF";
        sizeMultiplier = 0.7;
        break;
      case "Normal":
        color = "#FFAA00";
        sizeMultiplier = 0.75;
        break;
      case "Alta":
        color = "#AA0000";
        sizeMultiplier = 0.9;
        textColor = "#FFFFFF";
        break;
      default:
        color = "#FFFFFF";
        sizeMultiplier = 0.65;
    }
  }

  return L.divIcon({
    className: 'dynamic-marker',
    html: `
      <div class="marker-content" style="
          background-color: ${color};
          transform: scale(${sizeMultiplier});
          width: ${baseSize}px;
          height: ${baseSize}px;
          font-size: ${11 / sizeMultiplier}px;
          color: ${textColor};
          display: flex;
          justify-content: center;
          align-items: center;
      ">
          <span>${text}</span>
      </div>
    `,
    iconSize: [baseSize * sizeMultiplier, baseSize * sizeMultiplier],
    iconAnchor: [15 * sizeMultiplier, 15 * sizeMultiplier],
    popupAnchor: [8, -15 * sizeMultiplier]
  });
}

