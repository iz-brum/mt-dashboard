/**
 * @file src/utils/ana/classification/categorizacaoEstacoes.js
 * @description Módulo para classificação geral das estações.
 */

import { STATION_CLASSIFICATION_CONFIG } from '#utils/config.js';

// Define a estação para debug
const DEBUG_STATION_CODE = "66830000";

// Funções de Classificação
function classifyRainfall(totalRainfall, stationCode) {
  const config = STATION_CLASSIFICATION_CONFIG.RAINFALL;

  if (stationCode === DEBUG_STATION_CODE) {
    // console.log(`🌧 [DEBUG] Classificando chuva (${totalRainfall}) para estação ${stationCode}`);
  }

  if (totalRainfall == null || isNaN(totalRainfall)) return config.undefined;
  if (totalRainfall === 0) return config.noRain;
  if (totalRainfall <= config.thresholds.weak) return config.weak;
  if (totalRainfall <= config.thresholds.moderate) return config.moderate;
  if (totalRainfall <= config.thresholds.strong) return config.strong;
  if (totalRainfall <= config.thresholds.veryStrong) return config.veryStrong;
  return config.extreme;
}

function classifyLevel(latestLevel, stationCode) {
  const config = STATION_CLASSIFICATION_CONFIG.LEVEL;
  const level = parseFloat(latestLevel);

  if (stationCode === DEBUG_STATION_CODE) {
    // console.log(`📏 [DEBUG] Classificando nível (${latestLevel}) para estação ${stationCode}`);
  }

  if (isNaN(level) || latestLevel == null) return config.undefined;
  if (level < config.thresholds.low) return config.low;
  if (level <= config.thresholds.normal) return config.normal;
  return config.high;
}

function classifyDischarge(latestDischarge, stationCode) {
  const config = STATION_CLASSIFICATION_CONFIG.DISCHARGE;
  const discharge = parseFloat(latestDischarge);

  if (stationCode === DEBUG_STATION_CODE) {
    // console.log(`💧 [DEBUG] Classificando vazão (${latestDischarge}) para estação ${stationCode}`);
  }

  if (isNaN(discharge) || latestDischarge == null) return config.undefined;
  if (discharge < config.thresholds.low) return config.low;
  if (discharge <= config.thresholds.normal) return config.normal;
  return config.high;
}

// Utilitários de Data e Registros
function parseLocalDate(dateStr) {
  return dateStr ? new Date(dateStr.replace(" ", "T")) : null;
}

function getLatestRecord(records) {
  if (!records || records.length === 0) return null;
  return records.reduce((latest, record) => {
    const recordDate = parseLocalDate(record.Data_Hora_Medicao);
    const latestDate = latest ? parseLocalDate(latest.Data_Hora_Medicao) : null;
    return (!latestDate || (recordDate && recordDate > latestDate)) ? record : latest;
  }, null);
}

function calculateAccumulatedRainfall(records, referenceDate, stationCode) {
  if (!records || !referenceDate) return null;
  const periodMs = STATION_CLASSIFICATION_CONFIG.RAINFALL_ACCUMULATION_PERIOD_HOURS * 60 * 60 * 1000;
  const startTime = new Date(referenceDate.getTime() - periodMs);
  const values = records
    .filter(record => {
      const recordDate = parseLocalDate(record.Data_Hora_Medicao);
      return recordDate && recordDate >= startTime && recordDate <= referenceDate;
    })
    .map(record => parseFloat(record.Chuva_Adotada))
    .filter(v => !isNaN(v));

  if (stationCode === DEBUG_STATION_CODE) {
    // console.log(`🌧 [DEBUG] Cálculo de chuva acumulada para estação ${stationCode}:`, values);
  }

  return values.length ? values.reduce((sum, val) => sum + val, 0) : null;
}

export function categorizeStation(stationData) {
  const stationCode = String(stationData.codigoestacao);
  if (stationCode === DEBUG_STATION_CODE) {
    // console.log(`🚀 [DEBUG] Categorizando estação ${stationCode}...`);
  }

  const records = Array.isArray(stationData.dados) ? stationData.dados : [];

  // 🛠 Verificar se há registros disponíveis
  if (stationCode === DEBUG_STATION_CODE) {
    // console.log(`📜 [DEBUG] Registros disponíveis para ${stationCode}:`, records);
  }

  let latestRecord = getLatestRecord(records);

  // ✅ Correção: Se não houver registros, utilizar os valores de stationData diretamente
  if (!latestRecord) {
    latestRecord = {
      Data_Hora_Medicao: stationData.Data_Hora_Medicao || null,
      Chuva_Adotada: stationData.chuvaAcumulada ?? null,
      Cota_Adotada: stationData.nivelMaisRecente ?? null,
      Vazao_Adotada: stationData.vazaoMaisRecente ?? null
    };
  }

  // 🛠 Verificar qual é o último registro encontrado
  if (stationCode === DEBUG_STATION_CODE) {
    // console.log(`📅 [DEBUG] Último registro para ${stationCode}:`, latestRecord);
  }

  const referenceDate = latestRecord ? parseLocalDate(latestRecord.Data_Hora_Medicao) : new Date();

  // ✅ Correção: Se a chuva acumulada não for encontrada, use stationData.chuvaAcumulada diretamente
  let accumulatedRainfall = calculateAccumulatedRainfall(records, referenceDate, stationCode);
  if (accumulatedRainfall === null) {
    accumulatedRainfall = stationData.chuvaAcumulada ?? null;
  }

  // 🛠 Log detalhado do cálculo da chuva acumulada
  if (stationCode === DEBUG_STATION_CODE) {
    // console.log(`🌧 [DEBUG] Chuva acumulada calculada para ${stationCode}:`, accumulatedRainfall);
  }

  const updateThreshold = STATION_CLASSIFICATION_CONFIG.UPDATE_THRESHOLD_HOURS;
  const updateStatus = latestRecord.Data_Hora_Medicao
    ? ((new Date() - parseLocalDate(latestRecord.Data_Hora_Medicao)) / (1000 * 60 * 60) <= updateThreshold ? "Atualizado" : "Desatualizado")
    : "Desatualizado";

  const classificacaoChuva = classifyRainfall(accumulatedRainfall, stationCode);
  const classificacaoNivel = classifyLevel(latestRecord.Cota_Adotada, stationCode);
  const classificacaoVazao = classifyDischarge(latestRecord.Vazao_Adotada, stationCode);

  return {
    codigoestacao: stationCode,
    Estacao_Nome: stationData.Estacao_Nome,
    data: stationData.data,
    Rio_Nome: stationData.Rio_Nome || "Desconhecido",
    latitude: parseFloat(stationData.Latitude) || null,
    longitude: parseFloat(stationData.Longitude) || null,
    chuvaAcumulada: accumulatedRainfall != null ? Number(accumulatedRainfall.toFixed(2)) : null,
    nivelMaisRecente: latestRecord.Cota_Adotada,
    vazaoMaisRecente: latestRecord.Vazao_Adotada,
    statusAtualizacao: updateStatus,
    classificacaoChuva,
    classificacaoNivel,
    classificacaoVazao
  };
}


// Agrupa um array de estações por diferentes classificações
export function categorizeStations(stationsArray) {
  const categorized = {
    byRiver: {},
    updated: [],
    notUpdated: [],
    byRainfall: {},
    byLevel: {},
    byDischarge: {}
  };

  stationsArray.forEach(stationData => {
    const category = categorizeStation(stationData);
    if (category.statusAtualizacao === "Atualizado") {
      categorized.updated.push(category);
    } else {
      categorized.notUpdated.push(category);
    }

    const rainKey = category.classificacaoChuva;
    categorized.byRainfall[rainKey] = categorized.byRainfall[rainKey] || [];
    categorized.byRainfall[rainKey].push(category);

    const levelKey = category.classificacaoNivel;
    categorized.byLevel[levelKey] = categorized.byLevel[levelKey] || [];
    categorized.byLevel[levelKey].push(category);

    const dischargeKey = category.classificacaoVazao;
    categorized.byDischarge[dischargeKey] = categorized.byDischarge[dischargeKey] || [];
    categorized.byDischarge[dischargeKey].push(category);

    const river = category.Rio_Nome;
    categorized.byRiver[river] = categorized.byRiver[river] || [];
    categorized.byRiver[river].push(category);
  });

  return categorized;
}

export function getAllCategorizedStations(stationsArray) {
  const categorizedList = stationsArray.map((stationData, index) => {
    const categorized = categorizeStation(stationData);
    // Adiciona o índice para facilitar a visualização
    categorized.index = index;
    return categorized;
  });
  return categorizedList;
}
