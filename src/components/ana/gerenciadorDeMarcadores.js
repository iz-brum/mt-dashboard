/**
 * @file src/components/ana/gerenciadorDeMarcadores.js
 */

import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { createMarkerFromStation } from '#utils/ana/marker/marcador.js';
import { attachFloatingPopupEvents } from '#utils/ana/marker/floatingPopup.js';
import { DEFAULT_CONFIG, MAP_MARKERS_CONFIG, FLOATING_POPUP_CONFIG, MARKER_STYLE_CONFIG } from '#utils/config.js';
import { categorizeStation } from '#utils/ana/classification/categorizacaoEstacoes.js';
import { ClassificationLayers } from '#components/ana/camadasClassificacao.js';
import { HybridLayer } from '#components/ana/HybridLayer.js';

export const StationMarkers = (() => {
  // -------------------------------------------------
  // 1) Funções auxiliares de cor do marcador
  // -------------------------------------------------
  function getMarkerColorByType(stationData, layerType) {
    if (layerType === 'chuva') {
      const classification = stationData.classificacaoChuva || 'default';
      return (MARKER_STYLE_CONFIG.chuva[classification] || MARKER_STYLE_CONFIG.chuva.default).color;
    } else if (layerType === 'nivel') {
      const classification = stationData.classificacaoNivel || 'default';
      return (MARKER_STYLE_CONFIG.nivel[classification] || MARKER_STYLE_CONFIG.nivel.default).color;
    } else if (layerType === 'vazao') {
      const classification = stationData.classificacaoVazao || 'default';
      return (MARKER_STYLE_CONFIG.vazao[classification] || MARKER_STYLE_CONFIG.vazao.default).color;
    }
    return MARKER_STYLE_CONFIG.general.color;
  }

  function getMarkerTextColorByType(stationData, layerType) {
    if (layerType === 'chuva') {
      const classification = stationData.classificacaoChuva || 'default';
      return (MARKER_STYLE_CONFIG.chuva[classification] || MARKER_STYLE_CONFIG.chuva.default).textColor;
    } else if (layerType === 'nivel') {
      const classification = stationData.classificacaoNivel || 'default';
      return (MARKER_STYLE_CONFIG.nivel[classification] || MARKER_STYLE_CONFIG.nivel.default).textColor;
    } else if (layerType === 'vazao') {
      const classification = stationData.classificacaoVazao || 'default';
      return (MARKER_STYLE_CONFIG.vazao[classification] || MARKER_STYLE_CONFIG.vazao.default).textColor;
    }
    return MARKER_STYLE_CONFIG.general.textColor;
  }

  function createClusterIcon(cluster, layerType) {
    const childCount = cluster.getChildCount();
    const markers = cluster.getAllChildMarkers();
    let bgColor = '#999'; // fallback
    let textColor = '#000';

    if (markers && markers.length > 0) {
      const stationData = markers[0].stationData || {};
      bgColor = getMarkerColorByType(stationData, layerType);
      textColor = getMarkerTextColorByType(stationData, layerType);
    }

    return L.divIcon({
      html: `
      <div 
        style="
          background-color: ${bgColor};
          border-radius: 50%;
          width: 25px; 
          height: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${textColor};
          border: 2px solid #fff;
        "
      >
        <span>${childCount}</span>
      </div>
    `,
      className: '',
      iconSize: L.point(40, 40)
    });
  }

  let currentMap = null;
  let clusterEnabled = true; // Flag para indicar se o cluster está ativo

  // Cria o cluster principal e uma layer sem cluster
  const clusterLayer = L.markerClusterGroup({
    maxClusterRadius: 20,
    iconCreateFunction: (cluster) => createClusterIcon(cluster, 'chuva'),
    showCoverageOnHover: true,
    polygonOptions: {
      color: '#0fde18',
      weight: 4,
      opacity: 0.9,
      fillOpacity: 0.8
    }
  });
  const noClusterLayer = L.layerGroup();
  const hybridPrincipal = new HybridLayer(clusterLayer, noClusterLayer, clusterEnabled);

  let markerMap = new Map(); // Mapeia stationCode -> { marker, camada }

  function filterMarkersByBounds() {
    if (!currentMap) return;
    const bounds = currentMap.getBounds();

    markerMap.forEach((data) => {
      const { marker } = data;
      const isVisible = bounds.contains(marker.getLatLng());
      if (isVisible) {
        if (clusterEnabled && !clusterLayer.hasLayer(marker)) {
          clusterLayer.addLayer(marker);
          if (!marker._floatingEventsAttached) {
            marker.on('add', () => attachFloatingPopupEvents(marker, DEFAULT_CONFIG));
            marker._floatingEventsAttached = true;
          }
        } else if (!clusterEnabled && !noClusterLayer.hasLayer(marker)) {
          noClusterLayer.addLayer(marker);
          if (!marker._floatingEventsAttached) {
            marker.on('add', () => attachFloatingPopupEvents(marker, DEFAULT_CONFIG));
            marker._floatingEventsAttached = true;
          }
        }
      } else {
        if (clusterEnabled && clusterLayer.hasLayer(marker)) {
          clusterLayer.removeLayer(marker);
        } else if (!clusterEnabled && noClusterLayer.hasLayer(marker)) {
          noClusterLayer.removeLayer(marker);
        }
      }
    });
  }

  function enableCluster() {
    clusterEnabled = true;
    noClusterLayer.clearLayers();
    if (currentMap && !currentMap.hasLayer(clusterLayer)) {
      currentMap.addLayer(clusterLayer);
    }
    hybridPrincipal.setClusterActive(true);
    filterMarkersByBounds();
  }

  function disableCluster() {
    clusterEnabled = false;
    if (currentMap) {
      currentMap.removeLayer(clusterLayer);
      clusterLayer.clearLayers();
    }
    if (currentMap && !currentMap.hasLayer(noClusterLayer)) {
      currentMap.addLayer(noClusterLayer);
    }
    hybridPrincipal.setClusterActive(false);
    filterMarkersByBounds();
  }

  return {
    initialize: (map) => {
      currentMap = map;
      map.addLayer(hybridPrincipal);
      let debounceTimer;
      map.on('moveend zoomend', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(filterMarkersByBounds, MAP_MARKERS_CONFIG.DEBOUNCE_DELAY_MS);
      });
    },

    load: async () => {
      try {
        const response = await fetch(DEFAULT_CONFIG.DATA_SOURCE);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stations = await response.json();
        stations.forEach(station => {
          const code = String(station.codigoestacao);
          if (!markerMap.has(code)) {
            const chuvaValor = station.chuvaAcumulada !== null && !isNaN(station.chuvaAcumulada)
              ? `${station.chuvaAcumulada} ${FLOATING_POPUP_CONFIG.units.rainfall}`
              : 'N/A';
            const marker = createMarkerFromStation(station, L.canvas(), { text: chuvaValor });
            if (marker) {
              marker.stationData = station;
              markerMap.set(code, { marker, camada: 'principal' });
              hybridPrincipal.addLayer(marker);
            }
          }
        });
        filterMarkersByBounds();
      } catch (error) {
        console.error('❌ [load] Falha ao carregar estações:', error);
      }
    },

    update: async (newStations) => {
      const currentCodes = new Set(markerMap.keys());
      let houveMudanca = false;
      newStations.forEach(station => {
        const code = String(station.codigoestacao);
        if (markerMap.has(code)) {
          const { marker } = markerMap.get(code);
          const oldCategory = categorizeStation(marker.stationData);
          const newCategory = categorizeStation(station);
          const dadosMudaram = JSON.stringify(marker.stationData) !== JSON.stringify(station);
          const categoriaMudou = JSON.stringify(oldCategory) !== JSON.stringify(newCategory);
          if (dadosMudaram || categoriaMudou) {
            // Atualiza os dados do marcador
            marker.stationData = {
              ...station,
              classificacaoChuva: newCategory.classificacaoChuva,
              classificacaoNivel: newCategory.classificacaoNivel,
              classificacaoVazao: newCategory.classificacaoVazao
            };
            // Atualiza a posição caso ela tenha mudado
            const newLat = parseFloat(station.latitude || station.Latitude);
            const newLng = parseFloat(station.longitude || station.Longitude);
            marker.setLatLng([newLat, newLng]);
            // Atualiza o ícone (isso já reflete a nova classificação e alerta)
            marker.updateIcon();
            houveMudanca = true;
          }
          currentCodes.delete(code);
        }
      });
      // Remove marcadores que não estão mais presentes na nova lista
      currentCodes.forEach(code => {
        const { marker } = markerMap.get(code);
        hybridPrincipal.removeLayer(marker);
        currentMap.removeLayer(marker);
        markerMap.delete(code);
      });
      if (houveMudanca) {
        await ClassificationLayers.atualizarCamadas();
      }
    },    

    clear: () => {
      hybridPrincipal.clearLayers();
      markerMap.clear();
    },

    getAllMarkers: () => Array.from(markerMap.values()).map(item => item.marker),

    /**
     * Retorna o objeto marker correspondente a um stationCode específico.
     */
    getMarkerByCode: (code) => markerMap.get(String(code))?.marker,

    /**
     * Define se a estação deve ter alerta de chuva e atualiza o ícone.
     * @param {string|number} stationCode - Código da estação
     * @param {boolean} isAlert - true para ativar o piscar, false para desativar
     */
    setHighRainAlert: (stationCode, isAlert) => {
      const entry = markerMap.get(String(stationCode));
      if (!entry) return;
      const { marker } = entry;
      marker.stationData.highRainAlert = isAlert;
      marker.updateIcon();
    },

    getLayer: () => hybridPrincipal,
    enableCluster,
    disableCluster,
    createClusterIcon
  };
})();
