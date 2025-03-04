// FILE: src/components/ana/camadasClassificacao.js

import { StationMarkers } from '#components/ana/gerenciadorDeMarcadores.js';
import { createMarkerByDynamicClassification, createGeneralMarker } from '#utils/ana/marker/estiloMarcador.js';
import { createPopupContent } from '#utils/ana/marker/conteudoPopup.js';
import { attachPopupToggleEvents } from '#utils/ana/marker/alternarPopup.js';
import { DEFAULT_CONFIG } from '#utils/ana/config.js';
import { attachFloatingPopupEvents } from '#utils/ana/marker/floatingPopup.js';

/**
 * Converte stationLayer (que pode ser um layerGroup ou um array) para um array de marcadores.
 */
function toMarkersArray(stationLayer) {
  if (Array.isArray(stationLayer)) return stationLayer;
  if (stationLayer && typeof stationLayer.eachLayer === 'function') {
    const arr = [];
    stationLayer.eachLayer(marker => arr.push(marker));
    return arr;
  }
  return [];
}

/**
 * Função auxiliar para processar um array em batches, retornando uma Promise.
 * Usamos setTimeout(…, 0) para não bloquear a thread principal entre os lotes.
 */
function processBatch(items, batchSize, processItem) {
  return new Promise(resolve => {
    let index = 0;
    function processNextBatch() {
      const end = Math.min(index + batchSize, items.length);
      for (let i = index; i < end; i++) {
        processItem(items[i], i);
      }
      index += batchSize;

      if (index < items.length) {
        setTimeout(processNextBatch, 0);
      } else {
        resolve(); // Concluiu todos os itens
      }
    }
    processNextBatch();
  });
}

/**
 * Cria e retorna um marcador customizado para chuva, nível ou vazão.
 */
function cloneMarkerWithDynamicStyle(marker, type) {
  const latlng = marker.getLatLng();
  let text = DEFAULT_CONFIG.INVALID_VALUE;
  let classificationValue = "";

  if (type === "chuva") {
    text = (marker.stationData.chuvaAcumulada ?? DEFAULT_CONFIG.INVALID_VALUE)
      .toString()
      .substring(0, DEFAULT_CONFIG.MARKER_TEXT_LENGTH);
    classificationValue = marker.stationData.classificacaoChuva;
  } else if (type === "nivel") {
    text = (marker.stationData.nivelMaisRecente ?? DEFAULT_CONFIG.INVALID_VALUE)
      .toString()
      .substring(0, DEFAULT_CONFIG.MARKER_TEXT_LENGTH);
    classificationValue = marker.stationData.classificacaoNivel;
  } else if (type === "vazao") {
    text = (marker.stationData.vazaoMaisRecente ?? DEFAULT_CONFIG.INVALID_VALUE)
      .toString()
      .substring(0, DEFAULT_CONFIG.MARKER_TEXT_LENGTH);
    classificationValue = marker.stationData.classificacaoVazao;
  }

  const customIcon = createMarkerByDynamicClassification(text, classificationValue, type);
  const customMarker = L.marker(latlng, { icon: customIcon });
  customMarker.stationData = { ...marker.stationData };

  // Configura o popup de forma assíncrona
  customMarker.bindPopup(() => {
    const popup = L.DomUtil.create('div');
    createPopupContent(customMarker.stationData).then(content => {
      popup.innerHTML = content;
      attachPopupToggleEvents(popup);
    });
    return popup;
  }, { autoClose: false, closeOnClick: false });

  // attachFloatingPopupEvents(customMarker, DEFAULT_CONFIG);
  customMarker.on('add', () => {
    attachFloatingPopupEvents(customMarker, DEFAULT_CONFIG);
  });


  return customMarker;
}

/**
 * Cria e retorna um marcador para status (atualizado/desatualizado).
 */
function cloneMarkerByStatus(marker) {
  const latlng = marker.getLatLng();
  const text = (marker.stationData.chuvaAcumulada ?? 'N/A').toString();
  const customIcon = createGeneralMarker(text);

  const clonedMarker = L.marker(latlng, { icon: customIcon });
  clonedMarker.stationData = { ...marker.stationData };

  clonedMarker.bindPopup(() => {
    const popup = L.DomUtil.create('div');
    createPopupContent(clonedMarker.stationData).then(content => {
      popup.innerHTML = content;
      attachPopupToggleEvents(popup);
    });
    return popup;
  }, { autoClose: false, closeOnClick: false });


  clonedMarker.on('add', () => {
    attachFloatingPopupEvents(clonedMarker, DEFAULT_CONFIG);
  });


  return clonedMarker;
}

/**
 * Cria e retorna um marcador para a classificação por rio, mantendo o estilo geral do marcador original.
 */
function cloneMarkerByRio(marker) {
  const latlng = marker.getLatLng();
  const clonedMarker = L.marker(latlng, { icon: marker.options.icon });
  clonedMarker.stationData = { ...marker.stationData };

  clonedMarker.bindPopup(() => {
    const popup = L.DomUtil.create('div');
    createPopupContent(clonedMarker.stationData).then(content => {
      popup.innerHTML = content;
      attachPopupToggleEvents(popup);
    });
    return popup;
  }, { autoClose: false, closeOnClick: false });

  // attachFloatingPopupEvents(clonedMarker, DEFAULT_CONFIG);
  // attachFloatingPopupEvents(clonedMarker, DEFAULT_CONFIG);
  clonedMarker.on('add', () => {
    attachFloatingPopupEvents(clonedMarker, DEFAULT_CONFIG);
  });

  return clonedMarker;
}

// Objeto que armazenará todas as camadas de classificação
let layers = {};

/**
 * Retorna ou cria (sem limpar a cada chamada) uma layerGroup para o tipo e classificação fornecidos.
 */
function getOrCreateLayerForType(type, classification) {
  const prefix = type === "chuva" ? "Chuva" :
    type === "nivel" ? "Nível" :
      type === "vazao" ? "Vazão" : "Rio";
  const layerName = `${prefix} - ${classification}`;
  if (!layers[layerName]) {
    layers[layerName] = L.layerGroup();
  }
  return layers[layerName];
}

/**
 * Atualiza as camadas de chuva, nível ou vazão, processando marcadores em batch de forma assíncrona.
 */
async function atualizarCamadasPorTipo(type, stationLayer) {
  // Limpa as camadas do tipo correspondente
  Object.keys(layers).forEach(name => {
    if (
      (type === "chuva" && name.startsWith("Chuva - ")) ||
      (type === "nivel" && name.startsWith("Nível - ")) ||
      (type === "vazao" && name.startsWith("Vazão - "))
    ) {
      layers[name].clearLayers();
    }
  });

  const allMarkers = toMarkersArray(stationLayer);
  console.log(`[atualizarCamadasPorTipo] Tipo: ${type} - Total de marcadores: ${allMarkers.length}`);

  // Processa os marcadores em lotes
  await processBatch(allMarkers, 235, marker => {
    let classificationValue = "";
    if (type === "chuva") classificationValue = marker.stationData.classificacaoChuva;
    else if (type === "nivel") classificationValue = marker.stationData.classificacaoNivel;
    else if (type === "vazao") classificationValue = marker.stationData.classificacaoVazao;

    if (!classificationValue) classificationValue = "Indefinido";

    const camada = getOrCreateLayerForType(type, classificationValue);
    const customMarker = cloneMarkerWithDynamicStyle(marker, type);
    camada.addLayer(customMarker);
  });
}

/**
 * Atualiza as camadas de Rio, processando em batch.
 */
async function atualizarCamadasRio(stationLayer) {
  Object.keys(layers).forEach(name => {
    if (name.startsWith("Rio - ")) {
      layers[name].clearLayers();
    }
  });

  const allMarkers = toMarkersArray(stationLayer);
  console.log(`[atualizarCamadasRio] Total de marcadores: ${allMarkers.length}`);

  await processBatch(allMarkers, 235, marker => {
    const rio = marker.stationData.Rio_Nome || "Desconhecido";
    const camada = getOrCreateLayerForType("rio", rio);
    const cloned = cloneMarkerByRio(marker);
    camada.addLayer(cloned);
  });
}

/**
 * Atualiza as camadas de Status (Atualizado / Desatualizado), processando em batch.
 */
async function atualizarCamadasStatus(allMarkers) {
  if (layers["Status - Atualizado"]) layers["Status - Atualizado"].clearLayers();
  if (layers["Status - Desatualizado"]) layers["Status - Desatualizado"].clearLayers();

  if (!layers["Status - Atualizado"]) {
    layers["Status - Atualizado"] = L.layerGroup();
  }
  if (!layers["Status - Desatualizado"]) {
    layers["Status - Desatualizado"] = L.layerGroup();
  }

  const markersArray = toMarkersArray(allMarkers);
  console.log(`[atualizarCamadasStatus] Total de marcadores: ${markersArray.length}`);

  await processBatch(markersArray, 235, marker => {
    const status = marker.stationData.statusAtualizacao;
    if (!status) return;
    const cloned = cloneMarkerByStatus(marker);
    if (status === "Atualizado") {
      layers["Status - Atualizado"].addLayer(cloned);
    } else if (status === "Desatualizado") {
      layers["Status - Desatualizado"].addLayer(cloned);
    }
  });
}

/**
 * Função para obter camadas por tipo (chuva, nível, vazão, rio).
 * Tornamos assíncrona para aguardar o batch quando for "rio".
 */
async function getCamadasPorTipo(type, stationLayer) {
  stationLayer = stationLayer || StationMarkers.getAllMarkers();

  if (type === "rio") {
    await atualizarCamadasRio(stationLayer);
    return Object.fromEntries(Object.entries(layers).filter(([key]) => key.startsWith("Rio - ")));
  }
  await atualizarCamadasPorTipo(type, stationLayer);
  const prefix = type === "chuva" ? "Chuva" : type === "nivel" ? "Nível" : "Vazão";
  return Object.fromEntries(Object.entries(layers).filter(([key]) => key.startsWith(`${prefix} - `)));
}

/**
 * Função para obter camadas de Status.
 */
async function getCamadasStatus() {
  const allMarkers = StationMarkers.getAllMarkers();
  await atualizarCamadasStatus(allMarkers);
  return {
    "Status - Atualizado": layers["Status - Atualizado"],
    "Status - Desatualizado": layers["Status - Desatualizado"]
  };
}

/**
 * Objeto principal que expõe as funções de classificação.
 */
export const ClassificationLayers = {
  async initialize() {
    const allMarkers = StationMarkers.getAllMarkers();
    await atualizarCamadasPorTipo("chuva", allMarkers);
    await atualizarCamadasPorTipo("nivel", allMarkers);
    await atualizarCamadasPorTipo("vazao", allMarkers);
    await atualizarCamadasRio(allMarkers);
    await atualizarCamadasStatus(allMarkers);
    // Marca que as camadas já foram inicializadas.
    this.initialized = true;
    return layers;
  },

  getLayers: () => layers,

  // Se as camadas já foram inicializadas, simplesmente retorna o cache.
  async getCamadasChuva(stationLayer) {
    if (this.initialized) return Object.fromEntries(Object.entries(layers).filter(([key]) => key.startsWith("Chuva - ")));
    return await getCamadasPorTipo("chuva", stationLayer);
  },

  async getCamadasNivel(stationLayer) {
    if (this.initialized) return Object.fromEntries(Object.entries(layers).filter(([key]) => key.startsWith("Nível - ")));
    return await getCamadasPorTipo("nivel", stationLayer);
  },

  async getCamadasVazao(stationLayer) {
    if (this.initialized) return Object.fromEntries(Object.entries(layers).filter(([key]) => key.startsWith("Vazão - ")));
    return await getCamadasPorTipo("vazao", stationLayer);
  },

  async getCamadasRio(stationLayer) {
    if (this.initialized) return Object.fromEntries(Object.entries(layers).filter(([key]) => key.startsWith("Rio - ")));
    return await getCamadasPorTipo("rio", stationLayer);
  },

  async getCamadasStatus() {
    if (this.initialized) {
      return {
        "Status - Atualizado": layers["Status - Atualizado"],
        "Status - Desatualizado": layers["Status - Desatualizado"]
      };
    }
    return await getCamadasStatus();
  }
};
