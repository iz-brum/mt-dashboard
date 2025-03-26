/**
 * @file src/components/ana/camadasClassificacao.js
 */

import { StationMarkers } from '#components/ana/gerenciadorDeMarcadores.js';
import { createMarkerByDynamicClassification } from '#utils/ana/marker/estiloMarcador.js';
import { createPopupContent } from '#utils/ana/marker/conteudoPopup.js';
import { attachPopupToggleEvents } from '#utils/ana/marker/alternarPopup.js';
import { attachFloatingPopupEvents } from '#utils/ana/marker/floatingPopup.js';
import { DEFAULT_CONFIG, CLASSIFICATION_CONFIG } from '#utils/config.js';
import { FLOATING_POPUP_CONFIG } from '#utils/config.js';
import { HybridLayer } from '#components/ana/HybridLayer.js';
import { fetchTelemetricData } from '#utils/ana/marker/secaoTelemetria.js';

// Mapeia o "type" para o "layerType" que queremos usar no createClusterIcon
// Removido suporte para 'status'
function resolveLayerType(type) {
  // if (type === 'status') return 'chuva';
  return type; // 'chuva', 'nivel', 'vazao', 'rio', etc.
}

let layers = {};

export function formatValue(value, unit) {
  const numericValue = parseFloat(value);
  if (isNaN(numericValue) || !isFinite(numericValue)) return 'N/A';

  let formattedValue = numericValue;
  if (numericValue >= 10000) {
    formattedValue = (numericValue / 1000).toFixed(1) + 'k';
  }
  return `${formattedValue} ${unit}`;
}

function createClassificationMarker(marker, type) {
  const latlng = marker.getLatLng();
  let classificationValue = '';
  let text = DEFAULT_CONFIG.INVALID_VALUE;

  switch (type) {
    case 'chuva':
      classificationValue = marker.stationData.classificacaoChuva;
      text = formatValue(marker.stationData.chuvaAcumulada, FLOATING_POPUP_CONFIG.units.rainfall);
      break;
    case 'nivel':
      classificationValue = marker.stationData.classificacaoNivel;
      text = formatValue(marker.stationData.nivelMaisRecente, FLOATING_POPUP_CONFIG.units.level);
      break;
    case 'vazao':
      classificationValue = marker.stationData.classificacaoVazao;
      text = formatValue(marker.stationData.vazaoMaisRecente, FLOATING_POPUP_CONFIG.units.discharge);
      break;
    // Removido o suporte a "status":
    /*
    case 'status':
      classificationValue = marker.stationData.statusAtualizacao;
      text = formatValue(marker.stationData.chuvaAcumulada, FLOATING_POPUP_CONFIG.units.rainfall);
      break;
    */
    case 'rio':
      classificationValue = marker.stationData.Rio_Nome || 'Desconhecido';
      text = classificationValue;
      break;
    default:
      classificationValue = CLASSIFICATION_CONFIG.DEFAULT_CLASSIFICATION;
  }

  text = text.toString().substring(0, DEFAULT_CONFIG.MARKER_TEXT_LENGTH);

  // Define a classe extra com base no alerta de chuva (inicialmente pode ser vazia)
  let extraClass = marker.stationData.highRainAlert ? 'blinking-marker' : '';
  let customIcon = createMarkerByDynamicClassification(text, classificationValue, type, extraClass);

  const newMarker = L.marker(latlng, { icon: customIcon });
  newMarker.stationData = { ...marker.stationData };

  newMarker.bindPopup(() => {
    const popup = L.DomUtil.create('div');
    createPopupContent(newMarker.stationData).then(content => {
      popup.innerHTML = content;
      attachPopupToggleEvents(popup);
    });
    return popup;
  }, { autoClose: false, closeOnClick: false });

  newMarker.on('add', () => attachFloatingPopupEvents(newMarker, DEFAULT_CONFIG));

  // Após criar o marcador, busca os dados históricos para atualizar o alerta
  fetchTelemetricData(newMarker.stationData.codigoestacao).then(data => {
    if (data && data.dados) {
      const highRainAlert = data.dados.some(r => parseFloat(r.Chuva_Adotada) > 25);
      newMarker.stationData.highRainAlert = highRainAlert;
      // Para debug, se desejar:
      if (newMarker.stationData.codigoestacao === "66170600") {
        // console.log("🚧 Debug (createClassificationMarker) - 66170600: highRainAlert =", highRainAlert);
      }
      // Atualiza o ícone com a classe se necessário
      extraClass = highRainAlert ? 'blinking-marker' : '';
      const updatedIcon = createMarkerByDynamicClassification(text, classificationValue, type, extraClass);
      newMarker.setIcon(updatedIcon);
    }
  }).catch(err => {
    console.error("Erro ao buscar dados históricos para alerta (createClassificationMarker):", err);
  });

  return newMarker;
}

/**
 * Cria ou recupera uma HybridLayer para uma determinada camada de classificação.
 * Removido o uso de 'status' para forçar 'chuva'.
 */
function getOrCreateHybridLayer(layerName, type) {
  if (!layers[layerName]) {
    const layerType = resolveLayerType(type);

    // Cria a versão COM cluster
    const clusterLayer = L.markerClusterGroup({
      maxClusterRadius: 40,
      // Chama a função createClusterIcon do StationMarkers com layerType
      iconCreateFunction: (cluster) => StationMarkers.createClusterIcon(cluster, layerType),
      showCoverageOnHover: true,
      polygonOptions: {
        color: '#0fde18',
        weight: 4,
        opacity: 0.9,
        fillOpacity: 0.8
      }
    });

    // Cria a versão SEM cluster
    const noClusterLayer = L.layerGroup();

    // Cria a HybridLayer que encapsula ambas as versões
    layers[layerName] = new HybridLayer(clusterLayer, noClusterLayer, true);
  }
  return layers[layerName];
}

async function atualizarCamadasPorTipo(type) {
  const DEBUG_STATION_CODE = "66830000";
  const allMarkers = StationMarkers.getAllMarkers();

  Object.keys(layers)
    .filter(name => name.startsWith(`${CLASSIFICATION_CONFIG.PREFIXES[type]} - `))
    .forEach(name => {
      if (layers[name]) {
        layers[name]._clusterLayer.clearLayers();
        layers[name]._noClusterLayer.clearLayers();
      }
    });

  allMarkers.forEach(marker => {
    const stationCode = marker.stationData.codigoestacao;
    let classificationValue = "";

    switch (type) {
      case 'chuva':
        classificationValue = marker.stationData.classificacaoChuva || CLASSIFICATION_CONFIG.DEFAULT_CLASSIFICATION;
        break;
      case 'nivel':
        classificationValue = marker.stationData.classificacaoNivel || CLASSIFICATION_CONFIG.DEFAULT_CLASSIFICATION;
        break;
      case 'vazao':
        classificationValue = marker.stationData.classificacaoVazao || CLASSIFICATION_CONFIG.DEFAULT_CLASSIFICATION;
        break;
      // Removido o case 'status'
      /*
      case 'status':
        classificationValue = marker.stationData.statusAtualizacao || CLASSIFICATION_CONFIG.DEFAULT_CLASSIFICATION;
        break;
      */
      case 'rio':
        classificationValue = marker.stationData.Rio_Nome || 'Desconhecido';
        break;
      default:
        classificationValue = CLASSIFICATION_CONFIG.DEFAULT_CLASSIFICATION;
    }

    if (classificationValue === CLASSIFICATION_CONFIG.DEFAULT_CLASSIFICATION && stationCode === DEBUG_STATION_CODE) {
      // console.warn(`⚠ [Depuração] Marcador ${stationCode} indefinido para '${type}'`);
    }

    // Como não usamos 'status', layerName será composto somente pelo prefixo do tipo
    const layerName = `${CLASSIFICATION_CONFIG.PREFIXES[type]} - ${classificationValue}`;

    // Agora passamos "type" para getOrCreateHybridLayer
    const hybridLayer = getOrCreateHybridLayer(layerName, type);

    const classificationMarker = createClassificationMarker(marker, type);
    if (classificationMarker) {
      hybridLayer.addLayer(classificationMarker);
    }
  });
}

export async function atualizarCamadas() {
  await Promise.all([
    atualizarCamadasPorTipo('chuva'),
    atualizarCamadasPorTipo('nivel'),
    atualizarCamadasPorTipo('vazao'),
    atualizarCamadasPorTipo('rio')
    // Atualizar camadas de 'status' removido
  ]);
}

export const ClassificationLayers = {
  initialize: async function () {
    await atualizarCamadas();
  
    // Garante que todas as camadas definidas na ordem geral existam (mesmo vazias)
    const allNames = [
      // "Status - Atualizado",
      // "Status - Desatualizado",
      "Chuva - Extrema",
      "Chuva - Muito Forte",
      "Chuva - Forte",
      "Chuva - Moderada",
      "Chuva - Fraca",
      "Chuva - Sem Chuva",
      "Chuva - Indefinido",
      "Nível - Alto",
      "Nível - Normal",
      "Nível - Baixo",
      "Nível - Indefinido",
      "Vazão - Alta",
      "Vazão - Normal",
      "Vazão - Baixa",
      "Vazão - Indefinido"
    ];
  
    for (const name of allNames) {
      if (!layers[name]) {
        const type = name.split(" - ")[0].toLowerCase(); // chuva, nível, etc.
        layers[name] = getOrCreateHybridLayer(name, type);
      }
    }
  
    this.initialized = true;
  },
  atualizarCamadas,
  getClusterLayers: () => {
    return Object.fromEntries(
      Object.entries(layers).map(([key, hybridLayer]) => [key, hybridLayer._clusterLayer])
    );
  },
  getNoClusterLayers: () => {
    return Object.fromEntries(
      Object.entries(layers).map(([key, hybridLayer]) => [key, hybridLayer._noClusterLayer])
    );
  },
  getLayers: () => layers,
  getCamadasChuva: () => Object.fromEntries(Object.entries(layers).filter(([key]) => key.startsWith(`${CLASSIFICATION_CONFIG.PREFIXES.chuva} - `))),
  getCamadasNivel: () => Object.fromEntries(Object.entries(layers).filter(([key]) => key.startsWith(`${CLASSIFICATION_CONFIG.PREFIXES.nivel} - `))),
  getCamadasVazao: () => Object.fromEntries(Object.entries(layers).filter(([key]) => key.startsWith(`${CLASSIFICATION_CONFIG.PREFIXES.vazao} - `))),
  getCamadasRio: () => Object.fromEntries(Object.entries(layers).filter(([key]) => key.startsWith(`${CLASSIFICATION_CONFIG.PREFIXES.rio} - `))),
  getCamadasStatus: () => ({}) // Retornando objeto vazio para não incluir camadas de status
};
