import fs from 'fs/promises';
import path from 'path';

/**
 * Carrega os dados de todos os arquivos JSON de um diretório base.
 * Essa função processa os subdiretórios (dias) em paralelo.
 *
 * @param {string} baseDir - Diretório base dos dados (ex.: /public/data/2025/02).
 * @returns {Promise<Array>} - Array com todos os registros carregados.
 */
async function carregarDados(baseDir) {
  let dias;
  try {
    dias = await fs.readdir(baseDir);
  } catch (err) {
    throw new Error(`Erro ao ler o diretório ${baseDir}: ${err.message}`);
  }

  const registrosPorDia = await Promise.all(
    dias.map(async (dia) => {
      const diaPath = path.join(baseDir, dia);
      let arquivos = [];
      try {
        arquivos = await fs.readdir(diaPath);
      } catch (err) {
        console.error(`Erro ao ler o diretório ${diaPath}: ${err.message}`);
        return []; // Se der erro, retorna array vazio para esse dia
      }

      const registrosArquivos = await Promise.all(
        arquivos
          .filter((arquivo) => arquivo.endsWith('.json'))
          .map(async (arquivo) => {
            const filePath = path.join(diaPath, arquivo);
            try {
              const content = await fs.readFile(filePath, 'utf-8');
              const jsonData = JSON.parse(content);
              if (Array.isArray(jsonData.dados)) {
                const stationCode = jsonData.codigoestacao;
                return jsonData.dados.map(r => ({ ...r, stationCode }));
              }
            } catch (err) {
              console.error(`Erro ao ler arquivo ${filePath}: ${err.message}`);
            }
            return [];
          })
      );

      // Retorna todos os registros deste dia (achatando o array)
      return registrosArquivos.flat();
    })
  );

  return registrosPorDia.flat();
}

/**
 * Formata o registro removendo as chaves auxiliares e reordenando os campos.
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
 * para a data informada (formato "YYYY-MM-DD").
 *
 * @param {number} intervalHours - Intervalo em horas (ex.: 2, 24, 48, etc.).
 * @param {string} dateStr - Data base para consulta, no formato "YYYY-MM-DD".
 * @returns {Promise<Object>} - Histórico agrupado por estação.
 */
export async function getHistoricalStationData(intervalHours, dateStr) {
  if (!dateStr) throw new Error("Data não informada.");

  const intervaloMs = intervalHours * 60 * 60 * 1000;

  // Determina os dias a serem carregados com base no intervalo:
  let diasParaCarregar = [];
  if (intervalHours < 24) {
    diasParaCarregar = [dateStr];
  } else if (intervalHours === 24) {
    diasParaCarregar = [getDateStr(dateStr, 1), dateStr];
  } else if (intervalHours === 48) {
    diasParaCarregar = [getDateStr(dateStr, 2), getDateStr(dateStr, 1), dateStr];
  }

  // Agrupa os dias por diretório base (mês/ano)
  const baseDirs = {};
  for (const dia of diasParaCarregar) {
    const [ano, mes] = dia.split('-');
    const baseDir = path.join(process.cwd(), 'public', 'data', ano, mes);
    if (!baseDirs[baseDir]) {
      baseDirs[baseDir] = new Set();
    }
    baseDirs[baseDir].add(dia);
  }

  let dadosDoPeriodo = [];
  // Para cada diretório base, carrega os dados apenas uma vez
  await Promise.all(
    Object.entries(baseDirs).map(async ([baseDir, diasSet]) => {
      try {
        const registros = await carregarDados(baseDir);
        diasSet.forEach((dia) => {
          // Filtra os registros do dia específico
          dadosDoPeriodo = dadosDoPeriodo.concat(
            registros.filter(d => d.Data_Hora_Medicao.startsWith(dia))
          );
        });
      } catch (err) {
        console.error(`Erro ao carregar dados para o diretório ${baseDir}: ${err.message}`);
      }
    })
  );

  if (dadosDoPeriodo.length === 0) return {};

  // Converte a string de data de medição para objeto Date (ajustando para o fuso -03:00)
  dadosDoPeriodo.forEach(d => {
    d.Data_Hora_Medicao_Date = new Date(d.Data_Hora_Medicao.replace(' ', 'T') + "-03:00");
  });

  // Agrupa os registros por estação
  const historicoPorEstacao = {};
  dadosDoPeriodo.forEach(registro => {
    const stationCode = registro.stationCode;
    if (!historicoPorEstacao[stationCode]) {
      historicoPorEstacao[stationCode] = [];
    }
    historicoPorEstacao[stationCode].push(registro);
  });

  // Para cada estação, filtra os registros na janela do intervalo desejado
  const resultado = {};
  for (const stationCode in historicoPorEstacao) {
    const registros = historicoPorEstacao[stationCode];
    // Ordena do mais recente para o mais antigo
    registros.sort((a, b) => b.Data_Hora_Medicao_Date - a.Data_Hora_Medicao_Date);
    const referencia = registros[0].Data_Hora_Medicao_Date;
    const inicioIntervalo = new Date(referencia.getTime() - intervaloMs);

    const filtrados = registros.filter(d =>
      d.Data_Hora_Medicao_Date >= inicioIntervalo && d.Data_Hora_Medicao_Date <= referencia
    );

    // Ordena do mais antigo para o mais recente e formata os registros
    const registrosFormatados = filtrados
      .sort((a, b) => a.Data_Hora_Medicao_Date - b.Data_Hora_Medicao_Date)
      .map(registro => {
        const { Data_Hora_Medicao_Date, ...rest } = registro;
        return formatRecord(rest);
      });

    const dataReferencia = registrosFormatados.length > 0
      ? registrosFormatados[registrosFormatados.length - 1].Data_Hora_Medicao.split(' ')[0]
      : dateStr;

    resultado[stationCode] = {
      data: dataReferencia,
      registros: registrosFormatados
    };
  }

  return resultado;
}

/**
 * Retorna uma data no formato "YYYY-MM-DD" subtraindo um número de dias da data informada.
 *
 * @param {string} dataStr - Data base no formato "YYYY-MM-DD".
 * @param {number} offsetDias - Número de dias a subtrair.
 * @returns {string} - Data ajustada.
 */
function getDateStr(dataStr, offsetDias) {
  const data = new Date(dataStr);
  data.setDate(data.getDate() - offsetDias);
  return data.toISOString().split('T')[0];
}
