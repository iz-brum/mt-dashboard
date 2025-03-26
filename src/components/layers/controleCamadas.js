/**
 * @file src/components/layers/controleCamadas.js
 */

import { createBaseLayers, createSatelliteLayer, DEFAULT_LAYER_NAME } from '#components/layers/camadasBase.js';
import { StationMarkers } from '#components/ana/gerenciadorDeMarcadores.js';
import { ClassificationLayers } from '#components/ana/camadasClassificacao.js';
import { getMarkerColorFromLayerName } from '#utils/ana/marker/estiloMarcador.js';
import { FILE_HANDLER_CONFIG } from '#utils/config.js';

const { ICON_BASE_PATH, FILE_TYPE_ICONS } = FILE_HANDLER_CONFIG;

/**
 * Cria um rótulo HTML customizado para overlays importados,
 * usando os ícones definidos em FILE_HANDLER_CONFIG.
 *
 * @param {string} fileName - Nome do arquivo (incluindo extensão).
 * @returns {string} HTML com o rótulo customizado.
 */
function createFileOverlayLabelHTML(fileName) {
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = fileName.substring(0, lastDotIndex);
  let extension = fileName.substring(lastDotIndex + 1).toLowerCase();
  // Se a extensão for "kmz", use o ícone definido para "kml"
  if (extension === 'kmz') {
    extension = 'kml';
  }
  const iconFile = FILE_TYPE_ICONS[extension] || FILE_TYPE_ICONS.default;
  
  return `
    <span class="layer-name" data-layer="${name}">
      <img src="${ICON_BASE_PATH}${iconFile}" 
           alt="${extension}" 
           class="layer-icon"
           title="Tipo de arquivo: ${extension}">
      ${name}
    </span>
  `;
}

// Ordem desejada das camadas (reabilitada "Todas Estações"; camadas de status permanecem removidas)
const ORDEM_GERAL = [
  "Todas Estações",
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

/**
 * Ordena as camadas conforme a ordem desejada.
 * @param {Object} camadas - Objeto com as camadas a serem ordenadas (chave = nome, valor = layer).
 * @param {string[]} ordemDesejada - Lista com a ordem desejada das chaves.
 * @returns {Object} - Objeto ordenado.
 */
function ordenarCamadas(camadas, ordemDesejada) {
  return Object.fromEntries(
    Object.entries(camadas).sort(([nomeA], [nomeB]) => {
      const idxA = ordemDesejada.indexOf(nomeA);
      const idxB = ordemDesejada.indexOf(nomeB);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    })
  );
}

/**
 * Aplica estilos customizados (indicadores de cor, toggles de clustering, etc.)
 * nos rótulos do controle de camadas.
 *
 * @param {L.Control.Layers} layerControl - O controle de camadas do Leaflet.
 * @param {Object} overlaysOrdenados - Objeto contendo as camadas ordenadas.
 */
export function applyOverlayStyles(layerControl, overlaysOrdenados) {
  const container = layerControl.getContainer();
  const overlaysContainer = container.querySelector('.leaflet-control-layers-overlays');
  if (!overlaysContainer) return;

  const labels = overlaysContainer.getElementsByTagName('label');
  Array.from(labels).forEach(label => {
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.justifyContent = 'flex-start';

    const layerName = label.getAttribute('data-layer') || label.textContent.trim();
    label.setAttribute('data-layer', layerName);

    // Verifica se é uma camada importada
    const isImportedLayer = layerName.endsWith('.json') || layerName.endsWith('.geojson') || layerName.endsWith('.kml') || layerName.endsWith('.gpx');

    // Remove indicadores antigos (se existirem) para evitar duplicações
    const oldIndicator = label.querySelector('.group-indicator');
    if (oldIndicator) oldIndicator.remove();

    // Se NÃO for camada importada, adicionamos os estilos corretos
    if (!isImportedLayer) {
      const indicator = document.createElement('span');
      indicator.className = 'group-indicator';
      indicator.style.backgroundColor = getMarkerColorFromLayerName(layerName);
      indicator.style.marginRight = '5px';
      indicator.style.width = '12px';
      indicator.style.height = '12px';
      indicator.style.borderRadius = '50%';
      label.insertBefore(indicator, label.firstChild);
    }

    // Restaurar clusterização se necessário
    const hybridLayer = overlaysOrdenados[layerName];
    if (hybridLayer && typeof hybridLayer.setClusterActive === 'function') {
      if (typeof hybridLayer._isClusterActive === 'undefined') {
        hybridLayer._isClusterActive = false;
      }

      let checkbox = label.querySelector('input[type="checkbox"]');
      let icon = label.querySelector('.individual-clustering-toggle');

      if (!checkbox || !icon) {
        checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = hybridLayer._isClusterActive;
        checkbox.style.display = 'none';

        icon = document.createElement('i');
        icon.className = (checkbox.checked ? 'fa fa-toggle-on' : 'fa fa-toggle-off') + ' individual-clustering-toggle';
        icon.style.cursor = 'pointer';
        icon.title = 'Ativar/Desativar clustering';
        icon.style.marginLeft = 'auto';

        icon.onclick = function (e) {
          e.preventDefault();
          const newState = !hybridLayer._isClusterActive;
          hybridLayer.setClusterActive(newState);
          hybridLayer._isClusterActive = newState;
          icon.className = (newState ? 'fa fa-toggle-on' : 'fa fa-toggle-off') + ' individual-clustering-toggle';
          checkbox.checked = newState;
        };

        checkbox.onchange = function () {
          hybridLayer.setClusterActive(checkbox.checked);
          hybridLayer._isClusterActive = checkbox.checked;
          icon.className = (checkbox.checked ? 'fa fa-toggle-on' : 'fa fa-toggle-off') + ' individual-clustering-toggle';
        };

        label.appendChild(checkbox);
        label.appendChild(icon);
      } else {
        checkbox.checked = hybridLayer._isClusterActive;
        icon.className = (checkbox.checked ? 'fa fa-toggle-on' : 'fa fa-toggle-off') + ' individual-clustering-toggle';
      }
    }
  });
}

/**
 * Cria (se necessário) o controle de camadas e retorna um objeto com
 * as camadas ordenadas, para uso posterior.
 *
 * @param {L.Map} map - Instância do Leaflet Map.
 * @returns {Object} { layerControl, overlaysOrdenados }
 */
export async function initializeLayerControl(map) {
  if (map.layerControl) {
    console.warn("O controle de camadas já foi inicializado. Ignorando nova criação.");
    return { layerControl: map.layerControl, overlaysOrdenados: {} };
  }

  // 1) Cria base layers
  const baseLayers = createBaseLayers();
  const satelliteLayer = createSatelliteLayer();
  baseLayers[DEFAULT_LAYER_NAME] = satelliteLayer;

  // 2) Cria o controle e adiciona ao mapa
  const layerControl = L.control.layers(baseLayers, {}, { collapsed: true }).addTo(map);
  map.layerControl = layerControl;

  // 3) Adiciona camada de satélite
  satelliteLayer.addTo(map);

  // 4) Inicializa camadas de classificação (seu uso normal)
  const stationLayer = StationMarkers.getLayer();
  await ClassificationLayers.initialize(map);

  const camadasStatus = ClassificationLayers.getCamadasStatus();
  const camadasChuva = ClassificationLayers.getCamadasChuva();
  const camadasNivel = ClassificationLayers.getCamadasNivel();
  const camadasVazao = ClassificationLayers.getCamadasVazao();
  const camadasRio = ClassificationLayers.getCamadasRio();

  // 5) Mescla e ordena (reabilitada "Todas Estações"; camadas de status permanecem excluídas)
  const allOverlays = {
    "Todas Estações": stationLayer,
    ...camadasChuva,
    ...camadasNivel,
    ...camadasVazao,
    ...camadasRio
  };
  const overlaysOrdenados = ordenarCamadas(allOverlays, ORDEM_GERAL);

  // 6) Adiciona overlays ao controle
  Object.entries(overlaysOrdenados).forEach(([nome, layer]) => {
    layerControl.addOverlay(layer, nome);
  });

  // 7) Adiciona a camada "Todas Estações" no mapa
  stationLayer.addTo(map);

  // 8) Aplica estilos customizados
  applyOverlayStyles(layerControl, overlaysOrdenados);

  if (!(layerControl instanceof L.Control.Layers)) {
    console.error('Erro: layerControl não é uma instância válida de L.Control.Layers.');
    return null;
  }

  return { layerControl, overlaysOrdenados };
}

/**
 * Atualiza (ou adiciona) novas camadas no controle, reordenando e
 * reaplicando os estilos sem perder a formatação.
 *
 * @param {L.Map} map - Instância do mapa Leaflet.
 * @param {Object} newOverlays - Novas camadas a serem adicionadas, ex: { "Camada Importada": layerImportado }
 */
export function refreshOverlays(map, newOverlays = {}) {
  if (!map.layerControl) {
    // console.warn("O controle de camadas não foi inicializado. Chamando initializeLayerControl...");
    return;
  }

  const layerControl = map.layerControl;

  // console.log("📌 Iniciando atualização das camadas...");

  const existingOverlays = {};
  layerControl._layers.forEach(entry => {
    if (entry.overlay) {
      existingOverlays[entry.name] = entry.layer;
    }
  });

  // console.log("🔍 Camadas existentes antes da atualização:", existingOverlays);

  const merged = { ...existingOverlays, ...newOverlays };

  const overlaysOrdenados = ordenarCamadas(merged, ORDEM_GERAL);
  // console.log("✅ Camadas ordenadas após mesclagem:", overlaysOrdenados);

  const previousStyles = {};
  Object.keys(existingOverlays).forEach(layerName => {
    previousStyles[layerName] = {
      color: getMarkerColorFromLayerName(layerName),
      isClusterActive: existingOverlays[layerName]._isClusterActive || false,
    };
  });
  // console.log("🎨 Estilos salvos antes da atualização:", previousStyles);

  layerControl._layers
    .filter(entry => entry.overlay)
    .forEach(entry => {
      // console.log(`❌ Removendo camada: ${entry.name}`);
      layerControl.removeLayer(entry.layer);
    });

  Object.entries(overlaysOrdenados).forEach(([nome, layer]) => {
    let label;
    if (nome.match(/\.(json|geojson|kml|gpx)$/i)) {
      label = createFileOverlayLabelHTML(nome);
    } else {
      label = nome;
    }
    
    layerControl.addOverlay(layer, label);
    // console.log(`✅ Adicionando camada ao controle: ${nome}`);

    if (previousStyles[nome]) {
      // console.log(`🎨 Restaurando estilo para: ${nome}`, previousStyles[nome]);
      const labelElem = layerControl.getContainer().querySelector(`[data-layer="${nome}"]`);
      if (labelElem) {
        const indicator = labelElem.querySelector('.group-indicator');
        if (indicator) {
          indicator.style.backgroundColor = previousStyles[nome].color;
          // console.log(`🎨 Cor restaurada para ${nome}:`, previousStyles[nome].color);
        }
        if (typeof layer.setClusterActive === 'function') {
          layer.setClusterActive(previousStyles[nome].isClusterActive);
          // console.log(`🔁 Estado de clustering restaurado para ${nome}:`, previousStyles[nome].isClusterActive);
        }
      } else {
        // console.warn(`⚠️ Label não encontrado para a camada ${nome}, estilos podem estar incorretos.`);
      }
    }
  });

  applyOverlayStyles(layerControl, overlaysOrdenados);
  // console.log("✅ Estilos reaplicados com sucesso!");
  // console.log("🚀 Atualização das camadas concluída!");
}
