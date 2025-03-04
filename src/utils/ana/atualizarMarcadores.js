// FILE: src\utils\ana\atualizarMarcadores.js

import { StationMarkers } from '#components/ana/gerenciadorDeMarcadores.js';
import { modalState } from '#utils/ana/telemetry/secaoTelemetria.js';
import { updateModalContent } from '#utils/ana/telemetry/secaoTelemetria.js';

let stationCache = null; // Cache de dados
let lastUpdateTime = 0;
const CACHE_TIME_MS = 2 * 60 * 1000; // Cache por 5 minutos

async function fetchStations() {
  const now = Date.now();
  if (stationCache && now - lastUpdateTime < CACHE_TIME_MS) {
    // console.log("⚡ Usando cache para atualizar marcadores.");
    return stationCache;
  }

  // console.log("🔄 Buscando atualizações no backend...");
  try {
    const response = await fetch('http://localhost:3000/api/stationData');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    stationCache = await response.json();
    lastUpdateTime = now;
    return stationCache;
  } catch (error) {
    console.error("❌ Erro ao buscar estações:", error);
    return [];
  }
}

let atualizarTimer = null;

export async function atualizarMarcadoresIncremental() {
  if (atualizarTimer) {
    console.log("⚠️ Esperando para atualizar, ignorando chamada duplicada.");
    return;
  }

  atualizarTimer = setTimeout(async () => {
    try {
      const newStations = await fetchStations(); // ⚡ Usa cache
      await StationMarkers.update(newStations);

      // Atualiza os gráficos do modal somente se ele estiver aberto
      if (modalState.isOpen && modalState.stationCode && modalState.activeType && modalState.stationName) {
        updateModalContent(modalState.activeType, modalState.stationCode, modalState.stationName, true);
      }
    } catch (error) {
      console.error("❌ Erro ao atualizar marcadores:", error);
    } finally {
      clearTimeout(atualizarTimer);
      atualizarTimer = null;
    }
  }, 3000); // Aguarda 3 segundos antes de permitir uma nova chamada
}
