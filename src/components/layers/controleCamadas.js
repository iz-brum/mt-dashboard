// FILE: src\components\layers\controleCamadas.js

import { createBaseLayers, createSatelliteLayer, DEFAULT_LAYER_NAME } from '#components/layers/camadasBase.js';
import { StationMarkers } from '#components/ana/gerenciadorDeMarcadores.js';
import { ClassificationLayers } from '#components/ana/camadasClassificacao.js';

// Definição da ordem correta das camadas
const ORDEM_GERAL = [
  "Todas Estações",
  "Status: Atualizado",
  "Status: Desatualizado",
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
  "Vazão - Alta",
  "Vazão - Normal",
  "Vazão - Baixa"
];

/**
 * Ordena as camadas conforme a ordem desejada.
 * @param {Object} camadas - Objeto com as camadas a serem ordenadas.
 * @param {string[]} ordemDesejada - Lista com a ordem desejada das chaves.
 * @returns {Object} - Objeto ordenado.
 */
function ordenarCamadas(camadas, ordemDesejada) {
  return Object.fromEntries(
    Object.entries(camadas).sort(([a], [b]) => {
      const idxA = ordemDesejada.indexOf(a);
      const idxB = ordemDesejada.indexOf(b);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    })
  );
}

export async function addLayerControl(map) {
  if (map.layerControl) {
    console.warn("O controle de camadas já foi inicializado. Ignorando nova criação.");
    return map.layerControl;
  }

  // Cria os base layers
  const baseLayers = createBaseLayers();
  const satelliteLayer = createSatelliteLayer();
  baseLayers[DEFAULT_LAYER_NAME] = satelliteLayer;

  // Cria o controle de camadas e adiciona-o ao mapa
  const layerControl = L.control.layers(baseLayers, {}, { collapsed: true }).addTo(map);
  map.layerControl = layerControl;

  // Adiciona a camada de satélite explicitamente ao mapa
  satelliteLayer.addTo(map);

  // Adiciona a camada "Todas Estações" (usando o layerGroup com os marcadores)
  const stationLayer = StationMarkers.getLayer();
  layerControl.addOverlay(stationLayer, "Todas Estações");

  // (1) Carrega todas as camadas de classificação usando batch (assíncrono)
  //     Isso garante que todas as camadas (chuva, nível, vazão, rio, status) sejam criadas.
  await ClassificationLayers.initialize();

  // (2) Agora, recupera cada conjunto de camadas e adiciona ao Layer Control
  const camadasStatus = await ClassificationLayers.getCamadasStatus();
  Object.entries(camadasStatus).forEach(([name, layer]) => {
    layerControl.addOverlay(layer, name);
  });

  // Chuva
  const camadasChuva = await ClassificationLayers.getCamadasChuva();
  Object.entries(camadasChuva).forEach(([name, layer]) => {
    layerControl.addOverlay(layer, name);
  });

  // Nível
  const camadasNivel = await ClassificationLayers.getCamadasNivel();
  Object.entries(camadasNivel).forEach(([name, layer]) => {
    layerControl.addOverlay(layer, name);
  });

  // Vazão
  const camadasVazao = await ClassificationLayers.getCamadasVazao();
  Object.entries(camadasVazao).forEach(([name, layer]) => {
    layerControl.addOverlay(layer, name);
  });

  // Rio
  const camadasRio = await ClassificationLayers.getCamadasRio();
  Object.entries(camadasRio).forEach(([name, layer]) => {
    layerControl.addOverlay(layer, name);
  });

  return layerControl;
}