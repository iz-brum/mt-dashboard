/**
 * @file src/components/ana/gerenciadorDeMarcadores.js
 */

import { createMarkerFromStation } from '#utils/ana/marker/marcador.js';
import { createTelemetricSection } from '#utils/ana/telemetry/secaoTelemetria.js';
import { attachPopupToggleEvents } from '#utils/ana/marker/alternarPopup.js';
import { attachFloatingPopupEvents } from '#utils/ana/marker/floatingPopup.js'; 
import { DEFAULT_CONFIG } from '#utils/ana/config.js';

export const StationMarkers = (() => {
  let markerLayer = L.layerGroup();
  let currentMap = null;
  let markerMap = new Map();
  let canvasRenderer = L.canvas(); // Usa renderização via Canvas
  let cachedLayer = null;


  // console.log("📌 [gerenciadorDeMarcadores] Módulo carregado.");

  // Função que filtra os marcadores com base nos limites visíveis do mapa.
  function filterMarkersByBounds() {
    if (!currentMap) return;
    const bounds = currentMap.getBounds();

    let adicionados = 0;
    let removidos = 0;

    // console.log("🗺️ Map bounds atualizados:", bounds);

    markerMap.forEach(marker => {
      if (bounds.contains(marker.getLatLng())) {
        if (!markerLayer.hasLayer(marker)) {
          markerLayer.addLayer(marker);
          // ✅ Reconfigura os popups flutuantes ao readicionar o marcador
          if (!marker._floatingEventsAttached) {
            marker.on('add', () => {
              attachFloatingPopupEvents(marker, DEFAULT_CONFIG);
            });
            marker._floatingEventsAttached = true;
          }
          adicionados++;
        }
      } else {
        if (markerLayer.hasLayer(marker)) {
          markerLayer.removeLayer(marker);
          removidos++;
        }
      }
    });

    // console.log(`✅ Filtragem concluída: ${adicionados} marcadores adicionados, ${removidos} marcadores removidos.`);
  }

  return {
    initialize: (map) => {
      // console.log("🔧 [initialize] Iniciando controle de marcadores no mapa...");

      currentMap = map;
      if (!map.hasLayer(markerLayer)) {
        markerLayer.addTo(map);
      }

      let debounceTimer;
      map.on('moveend', () => {
        // console.count("📌 Evento moveend disparado");
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          // console.log("✅ Debounced moveend");
          filterMarkersByBounds();
        }, 300);
      });

      map.on('zoomend', () => {
        // console.count("📌 Evento zoomend disparado");
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          // console.log("✅ Debounced zoomend");
          filterMarkersByBounds();
        }, 300);
      });

      // console.log("✅ Eventos de mapa configurados.");
    },
    load: async () => {
      // console.time("⏳ Tempo de carregamento dos marcadores");
      // console.log("🔄 [load] Carregando marcadores do backend...");

      try {
        const response = await fetch(DEFAULT_CONFIG.DATA_SOURCE);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stations = await response.json();
        // console.log(`📍 ${stations.length} estações carregadas.`);

        stations.forEach(station => {
          if (!markerMap.has(String(station.codigoestacao))) {
            const marker = createMarkerFromStation(station, canvasRenderer);
            if (marker) {
              markerLayer.addLayer(marker);
              markerMap.set(String(station.codigoestacao), marker);
            }
          }
        });

        filterMarkersByBounds();
      } catch (error) {
        console.error('❌ [load] Falha ao carregar estações:', error);
      } finally {
        // console.timeEnd("⏳ Tempo de carregamento dos marcadores");
      }
    },
    update: async (newStations) => {
      // console.log("🔄 [update] Atualizando marcadores...");
      // console.time("⏳ Tempo de atualização dos marcadores");

      const currentCodes = new Set(markerMap.keys());
      let atualizados = 0;
      let novos = 0;
      let houveMudanca = false; // 🟢 Variável para verificar se os dados mudaram

      newStations.forEach(station => {
        const code = String(station.codigoestacao);

        if (markerMap.has(code)) {
          const marker = markerMap.get(code);

          // 🔎 Só atualiza se os dados mudaram
          if (JSON.stringify(marker.stationData) !== JSON.stringify(station)) {
            marker.stationData = station;
            houveMudanca = true;

            if (marker.updateIcon) marker.updateIcon();
            if (marker.isPopupOpen && marker.isPopupOpen()) {
              createTelemetricSection(station).then(newTelemetric => {
                const popupEl = marker.getPopup().getElement();
                if (popupEl) {
                  const telemetricEl = popupEl.querySelector('.telemetric-section');
                  if (telemetricEl) {
                    telemetricEl.innerHTML = newTelemetric;
                  }
                  attachPopupToggleEvents(popupEl);
                }
              });
            }
            if (marker.updateFloatingData) marker.updateFloatingData();
            atualizados++;
          }
          currentCodes.delete(code);
        } else {
          const marker = createMarkerFromStation(station, canvasRenderer);
          if (marker) {
            markerLayer.addLayer(marker);
            markerMap.set(code, marker);
            novos++;
            houveMudanca = true;
          }
        }
      });

      if (!houveMudanca) {
        // console.log("⚠️ Nenhuma mudança nos dados, update cancelado.");
        // console.timeEnd("⏳ Tempo de atualização dos marcadores");
        return; // 🔴 Sai da função sem executar filtro
      }

      // console.log(`✅ Atualização concluída: ${atualizados} marcadores atualizados, ${novos} novos adicionados.`);

      currentCodes.forEach(code => {
        const marker = markerMap.get(code);
        if (marker) {
          markerLayer.removeLayer(marker);
          map.removeLayer(marker);
        }
        markerMap.delete(code);
      });

      filterMarkersByBounds();
      // console.timeEnd("⏳ Tempo de atualização dos marcadores");
    },
    clear: () => {
      console.log("🗑️ [clear] Removendo todos os marcadores...");
      markerLayer.clearLayers();
      markerMap.clear();
      console.log("✅ Todos os marcadores foram removidos.");
    },
    getLayer: () => {
      if (!cachedLayer) {
        // console.log("📌 [getLayer] Criando camada de marcadores.");
        // console.trace("🔍 Trace da chamada de getLayer:");
        cachedLayer = markerLayer;
      } else {
        // console.log("⚡ [getLayer] Retornando camada em cache.");
        // console.trace("🔍 Trace da chamada de getLayer:");
      }
      return cachedLayer;
    },
    getMarkerByCode: (code) => {
      console.log(`🔍 [getMarkerByCode] Buscando marcador ${code}`);
      return markerMap.get(String(code));
    },
    getAllMarkers: () => {
      return Array.from(markerMap.values());
    }

  };
})();
