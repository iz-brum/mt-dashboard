/**
 * @file server/apis/ana/services/node/gerarCacheEstacoes.js
 * Gera arquivo cache com todas as estações + histórico 24h + telemetria.
 */

import fs from 'fs/promises';
import path from 'path';
import { addHours } from 'date-fns';
import * as dateFnsTz from 'date-fns-tz';
import { getHistoricalStationData } from './historicalStationData.js';

const INVENTARIO_PATH = path.join('public', 'data', 'inventario_estacoes.json');
const OUTPUT_DIR = path.join('public', 'data', 'merged');

function formatDate(date) {
  return date instanceof Date
    ? date.toISOString().split('T')[0]
    : date;
}

async function loadTelemetricData(codigoEstacao, targetDate) {
  const [year, month] = targetDate.split('-');
  const filePath = path.join('public', 'data', year, month, targetDate, `codigoestacao_${codigoEstacao}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function gerarCacheEstacoes() {
  console.log("🚀 Iniciando geração de cache...");

  const timeZone = 'America/Sao_Paulo';
  const now = addHours(new Date(), -3);
  const today = formatDate(dateFnsTz.format(now, 'yyyy-MM-dd', { timeZone }));
  const yesterday = formatDate(dateFnsTz.format(addHours(now, -24), 'yyyy-MM-dd', { timeZone }));

  // 📥 Carrega dados
  const [inventarioRaw, historico24h] = await Promise.all([
    fs.readFile(INVENTARIO_PATH, 'utf-8').then(JSON.parse),
    getHistoricalStationData(24, today)
  ]);

  const merged = await Promise.all(
    inventarioRaw.map(async (station) => {
      const [teleToday, teleYest] = await Promise.all([
        loadTelemetricData(station.codigoestacao, today),
        loadTelemetricData(station.codigoestacao, yesterday)
      ]);

      const dados = [
        ...(teleYest?.dados || []),
        ...(teleToday?.dados || [])
      ].sort((a, b) =>
        new Date(b.Data_Hora_Medicao) - new Date(a.Data_Hora_Medicao)
      );

      const historico = historico24h[station.codigoestacao]?.registros || [];
      const ultimaMedicao = dados[0]?.Data_Hora_Medicao || null;
      const ultimaAtualizacao = dados[0]?.Data_Atualizacao || null;

      return {
        ...station,
        data: today,
        dados,
        historicoChuva24h: historico,
        Data_Hora_Medicao: ultimaMedicao,
        Data_Atualizacao: ultimaAtualizacao
      };
    })
  );

  // 💾 Salva resultado
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, `estacoes_completas_${today}.json`);
  await fs.writeFile(outputPath, JSON.stringify(merged, null, 2), 'utf-8');

  console.log(`✅ Cache gerado com sucesso: ${outputPath}`);
  console.log(`📦 Total de estações processadas: ${merged.length}`);
}

gerarCacheEstacoes().catch(console.error);
