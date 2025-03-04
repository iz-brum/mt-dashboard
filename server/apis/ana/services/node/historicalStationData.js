import fs from 'fs/promises';
import path from 'path';

/**
 * Carrega os dados de todos os arquivos JSON de todos os dias
 * do diretório base (ex.: public/data/2025/02) e unifica-os em um único array.
 *
 * @param {string} baseDir - Diretório base dos dados (ex.: /public/data/2025/02).
 * @returns {Promise<Array>} - Array com todos os registros carregados.
 */
async function carregarDados(baseDir) {
  let todosDados = [];
  let dias = [];
  try {
    dias = await fs.readdir(baseDir);
  } catch (err) {
    throw new Error(`Erro ao ler o diretório ${baseDir}: ${err.message}`);
  }
  
  for (const dia of dias) {
    const diaPath = path.join(baseDir, dia);
    let arquivos = [];
    try {
      arquivos = await fs.readdir(diaPath);
    } catch (err) {
      console.error(`Erro ao ler o diretório ${diaPath}: ${err.message}`);
      continue;
    }
    
    for (const arquivo of arquivos) {
      if (arquivo.endsWith('.json')) {
        const filePath = path.join(diaPath, arquivo);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const jsonData = JSON.parse(content);
          if (Array.isArray(jsonData.dados)) {
            // Adiciona a propriedade stationCode para facilitar o agrupamento
            const stationCode = jsonData.codigoestacao;
            const registros = jsonData.dados.map(r => ({ ...r, stationCode }));
            todosDados = todosDados.concat(registros);
          }
        } catch (err) {
          console.error(`Erro ao ler arquivo ${filePath}: ${err.message}`);
        }
      }
    }
  }
  
  return todosDados;
}

/**
 * Filtra os dados com base em um intervalo dinâmico (em minutos).
 * Usa o registro mais recente (após a conversão correta para horário de Brasília)
 * como referência.
 *
 * @param {Array} dados - Array de registros.
 * @param {number} intervaloMinutos - Intervalo desejado, em minutos.
 * @returns {Array} - Registros filtrados dentro do intervalo.
 */
function filtrarPorIntervalo(dados, intervaloMinutos) {
  // Converte Data_Hora_Medicao para objeto Date considerando o fuso de Brasília
  // Transforma "YYYY-MM-DD HH:MM:SS.0" em "YYYY-MM-DDTHH:MM:SS.0-03:00"
  dados.forEach(d => {
    d.Data_Hora_Medicao_Date = new Date(d.Data_Hora_Medicao.replace(' ', 'T') + "-03:00");
  });
  
  // Ordena os registros do mais recente para o mais antigo
  dados.sort((a, b) => b.Data_Hora_Medicao_Date - a.Data_Hora_Medicao_Date);
  
  // Usa o registro mais recente como referência para o filtro
  const maisRecente = dados[0].Data_Hora_Medicao_Date;
  const intervaloMs = intervaloMinutos * 60 * 1000;
  
  return dados.filter(d => (maisRecente - d.Data_Hora_Medicao_Date) <= intervaloMs);
}

/**
 * Formata o registro removendo as chaves de status e reordenando as chaves de data.
 * A ordem definida é:
 *   1. Chuva_Adotada
 *   2. Cota_Adotada
 *   3. Data_Hora_Medicao
 *   4. Data_Atualizacao
 *   5. Vazao_Adotada
 *
 * @param {Object} registro - Registro original.
 * @returns {Object} - Registro formatado.
 */
function formatRecord(registro) {
  return {
    Chuva_Adotada: registro.Chuva_Adotada,
    Cota_Adotada: registro.Cota_Adotada,
    Vazao_Adotada: registro.Vazao_Adotada,
    Data_Hora_Medicao: registro.Data_Hora_Medicao,
    Data_Atualizacao: registro.Data_Atualizacao
  };
}

/**
 * Retorna o histórico dos dados de cada estação para o intervalo especificado e
 * para a data informada (formato "YYYY-MM-DD"). A função carrega os dados de todos
 * os arquivos JSON do mês correspondente e filtra dinamicamente os registros com base
 * no intervalo desejado (convertido para minutos). O resultado é agrupado por estação,
 * e para cada grupo a chave "data" será definida como a data (YYYY-MM-DD) do registro mais recente.
 *
 * @param {number} intervalHours - Intervalo em horas (ex.: 1, 2, 6, 24, etc.).
 * @param {string} dateStr - Data base para consulta, no formato "YYYY-MM-DD".
 * @returns {Promise<Object>} - Histórico agrupado por estação.
 */
export async function getHistoricalStationData(intervalHours, dateStr) {
  if (!dateStr) throw new Error("Data não informada.");
  
  // Converte o intervalo de horas para minutos
  const intervaloMinutos = intervalHours * 60;
  
  // Define o diretório base para o mês (ex.: public/data/2025/02)
  const [year, month] = dateStr.split('-');
  const baseDir = path.join(process.cwd(), 'public', 'data', year, month);
  
  // Carrega os registros de todos os dias do mês
  const todosDados = await carregarDados(baseDir);
  if (todosDados.length === 0) return {};
  
  // Aplica o filtro dinâmico com base no intervalo (em minutos)
  const dadosFiltrados = filtrarPorIntervalo(todosDados, intervaloMinutos);
  
  // Agrupa os registros por estação
  const historicoPorEstacao = {};
  dadosFiltrados.forEach(registro => {
    const stationCode = registro.stationCode;
    if (!historicoPorEstacao[stationCode]) {
      historicoPorEstacao[stationCode] = { data: '', registros: [] };
    }
    // Remove a propriedade auxiliar e formata o registro
    const { Data_Hora_Medicao_Date, ...rest } = registro;
    historicoPorEstacao[stationCode].registros.push(formatRecord(rest));
  });
  
  // Para cada estação, ordena os registros (mais antigo primeiro)
  // e define a chave "data" com a data do registro mais recente.
  for (const stationCode in historicoPorEstacao) {
    const group = historicoPorEstacao[stationCode];
    group.registros.sort((a, b) => new Date(a.Data_Hora_Medicao) - new Date(b.Data_Hora_Medicao));
    const latestRecord = group.registros[group.registros.length - 1];
    // Extrai a data (YYYY-MM-DD) do registro mais recente
    const latestDate = latestRecord.Data_Hora_Medicao.split(' ')[0];
    group.data = latestDate;
  }
  
  return historicoPorEstacao;
}
// ESTÁ BEM FUNCIONAL, MAS CABEM MELHORIAS