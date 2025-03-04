/**
 * @file src/utils/ana/classification/categorizacaoEstacoes.js
 * @description Módulo para classificação geral das estações.
 */

// Funções de Classificação
function classifyRainfall(totalRainfall) {
  if (totalRainfall == null || isNaN(totalRainfall)) return "Indefinido";
  if (totalRainfall === 0) return "Sem Chuva";
  if (totalRainfall <= 5) return "Fraca";
  if (totalRainfall <= 29) return "Moderada";
  if (totalRainfall <= 59) return "Forte";
  if (totalRainfall <= 99) return "Muito Forte";
  return "Extrema";
}

function classifyLevel(latestLevel) {
  const level = parseFloat(latestLevel);
  if (isNaN(level) || latestLevel == null) return "Indefinido";
  if (level < 400) return "Baixo";
  if (level <= 450) return "Normal";
  return "Alto";
}

function classifyDischarge(latestDischarge) {
  const discharge = parseFloat(latestDischarge);
  if (isNaN(discharge) || latestDischarge == null) return "Indefinido";
  if (discharge < 30) return "Baixa";
  if (discharge <= 35) return "Normal";
  return "Alta";
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

function calculateAccumulatedRainfall(records, referenceDate) {
  if (!records || !referenceDate) return null;
  const twentyFourHoursAgo = new Date(referenceDate.getTime() - 24 * 60 * 60 * 1000);
  const values = records
    .filter(record => {
      const recordDate = parseLocalDate(record.Data_Hora_Medicao);
      return recordDate && recordDate >= twentyFourHoursAgo && recordDate <= referenceDate;
    })
    .map(record => parseFloat(record.Chuva_Adotada))
    .filter(v => !isNaN(v));
  return values.length ? values.reduce((sum, val) => sum + val, 0) : null;
}

// Função de Categorização Geral de uma Estação
export function categorizeStation(stationData) {
  const records = Array.isArray(stationData.dados) ? stationData.dados : [];
  const completeness = records.length &&
    records.every(r => r.Chuva_Adotada != null && r.Cota_Adotada != null && r.Vazao_Adotada != null)
    ? "Completo" : "Incompleto";
  const latestRecord = getLatestRecord(records);
  const referenceDate = latestRecord ? parseLocalDate(latestRecord.Data_Hora_Medicao) : new Date();
  const accumulatedRainfall = calculateAccumulatedRainfall(records, referenceDate);
  const updateStatus = latestRecord
    ? ((new Date() - parseLocalDate(latestRecord.Data_Hora_Medicao)) / (1000 * 60 * 60) <= 12 ? "Atualizado" : "Desatualizado")
    : "Desatualizado";

  return {
    codigoestacao: stationData.codigoestacao,
    Estacao_Nome: stationData.Estacao_Nome,
    data: stationData.data,
    Rio_Nome: stationData.Rio_Nome || "Desconhecido",
    latitude: parseFloat(stationData.Latitude) || null,
    longitude: parseFloat(stationData.Longitude) || null,
    completude: completeness,
    chuvaAcumulada: accumulatedRainfall != null ? Number(accumulatedRainfall.toFixed(2)) : null,
    nivelMaisRecente: latestRecord ? latestRecord.Cota_Adotada : null,
    vazaoMaisRecente: latestRecord ? latestRecord.Vazao_Adotada : null,
    statusAtualizacao: updateStatus,
    classificacaoChuva: classifyRainfall(accumulatedRainfall),
    classificacaoNivel: classifyLevel(latestRecord ? latestRecord.Cota_Adotada : null),
    classificacaoVazao: classifyDischarge(latestRecord ? latestRecord.Vazao_Adotada : null)
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
  // console.log("Lista completa de estações categorizadas:", categorizedList);
  return categorizedList;
}
