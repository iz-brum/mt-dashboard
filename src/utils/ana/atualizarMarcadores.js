// file src/utils/ana/atualizarMarcadores.js

import { StationMarkers } from '#components/ana/gerenciadorDeMarcadores.js';
import { modalState, updateModalContent } from '#utils/ana/marker/secaoTelemetria.js';
import { DEFAULT_CONFIG, CACHE_CONFIG, APP_CONFIG } from '#utils/config.js';

let stationCache = null;
let lastUpdateTime = 0;
const CACHE_TIME_MS = CACHE_CONFIG.STATIONS.TTL;
const UPDATE_INTERVAL = APP_CONFIG.MARKER_UPDATE_INTERVAL_MS;
let updateIntervalId = null;

async function fetchStations() {
  const now = Date.now();
  if (stationCache && now - lastUpdateTime < CACHE_TIME_MS) {
    return stationCache;
  }

  try {
    // Utiliza a URL centralizada no DEFAULT_CONFIG
    const response = await fetch(DEFAULT_CONFIG.DATA_SOURCE);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    stationCache = await response.json();
    lastUpdateTime = Date.now();
    return stationCache;
  } catch (error) {
    console.error("❌ Erro ao buscar estações:", error);
    return stationCache || []; // Retorna cache anterior se disponível
  }
}

export async function atualizarMarcadoresIncremental() {
  try {
    const newStations = await fetchStations();
    await StationMarkers.update(newStations);

    if (modalState.isOpen && modalState.stationCode && modalState.activeType && modalState.stationName) {
      updateModalContent(
        modalState.activeType,            // activeType
        modalState.stationCode,           // stationCode
        modalState.stationName,           // stationName
        modalState.stationMunicipio_Nome, // stationMunicipio_Nome (nome da cidade)
        true                              // skipSpinner (ou false, conforme a necessidade)
        // Se necessário, o intervalo pode ser passado como 6º parâmetro
      );
    }
  } catch (error) {
    console.error("❌ Erro ao atualizar marcadores:", error);
  }
}

export function startAutoUpdate() {
  if (!updateIntervalId) {
    // Primeira execução imediata
    atualizarMarcadoresIncremental();
    // Configura intervalo periódico
    updateIntervalId = setInterval(atualizarMarcadoresIncremental, UPDATE_INTERVAL);
    console.log("🔄 Atualização automática iniciada (30 segundos)");
  }
}

export function stopAutoUpdate() {
  if (updateIntervalId) {
    clearInterval(updateIntervalId);
    updateIntervalId = null;
    console.log("⏹ Atualização automática parada");
  }
}
