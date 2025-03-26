/**
 * @file server\apis\ana\routes\rotasDadosEstacoes.js
 * @description Serviço responsável por fornecer os dados das estações.
 * Esse módulo importa funções para mesclar os dados do inventário com os dados telemétricos,
 * e expõe endpoints HTTP para que os clientes possam obter as informações.
 *
 * @module stationDataService
 */

import express from 'express'; // Framework Express para criação do roteador
import { mergeStationData } from '#apis/ana/services/node/mesclarDadosEstacoes.js';
import { categorizeStations, categorizeStation } from '#utils/ana/classification/categorizacaoEstacoes.js'; // Funções para categorizar as estações
import { getHistoricalStationData } from '#apis/ana/services/node/historicalStationData.js';

const router = express.Router();

router.get('/estacoes/categorizadas', async (req, res) => {
  try {
    const mergedStations = await mergeStationData();
    const categories = categorizeStations(mergedStations);

    // Função auxiliar para extrair apenas o código e o nome da estação
    const extrairInfoEstacao = (estacao) => ({
      codigoestacao: estacao.codigoestacao,
      Estacao_Nome: estacao.Estacao_Nome
    });

    // Remapeando os agrupamentos para nomes em pt-BR
    const resultado = {
      porRio: {},
      atualizadas: [],
      desatualizadas: [],
      porChuva: {},
      porNivel: {},
      porVazao: {}
    };

    // Agrupamento por rio: cada chave conterá apenas código e nome da estação
    Object.keys(categories.byRiver).forEach(rio => {
      resultado.porRio[rio] = categories.byRiver[rio].map(extrairInfoEstacao);
    });

    // Listas de atualizadas e desatualizadas
    resultado.atualizadas = Array.isArray(categories.updated)
      ? categories.updated.map(extrairInfoEstacao)
      : [];
    resultado.desatualizadas = Array.isArray(categories.notUpdated)
      ? categories.notUpdated.map(extrairInfoEstacao)
      : [];

    // Agrupamento por classificação de chuva
    Object.keys(categories.byRainfall).forEach(chuva => {
      resultado.porChuva[chuva] = categories.byRainfall[chuva].map(extrairInfoEstacao);
    });

    // Agrupamento por classificação de nível
    Object.keys(categories.byLevel).forEach(nivel => {
      resultado.porNivel[nivel] = categories.byLevel[nivel].map(extrairInfoEstacao);
    });

    // Agrupamento por classificação de vazão
    Object.keys(categories.byDischarge).forEach(vazao => {
      resultado.porVazao[vazao] = categories.byDischarge[vazao].map(extrairInfoEstacao);
    });

    res.json(resultado);
  } catch (error) {
    console.error('Erro ao categorizar as estações:', error);
    res.status(500).json({ error: 'Falha ao obter as estações categorizadas.' });
  }
});

/**
 * GET /estacoes/todas
 *
 * Novo endpoint para obter os dados resumidos de todas as estações (sem agrupamento).
 * Para cada estação, removemos as chaves duplicadas (por exemplo, "Latitude", "Longitude" e "dados")
 * e combinamos os dados do inventário com os campos calculados pela função categorizeStation().
 */
router.get('/estacoes/todas', async (req, res) => {
  try {
    const mergedStations = await mergeStationData();
    const summarizedStations = mergedStations.map(station => {
      const cat = categorizeStation(station);
      return {
        latitude: cat.latitude,
        longitude: cat.longitude,
        Altitude: station.Altitude,
        Area_Drenagem: station.Area_Drenagem,
        Bacia_Nome: station.Bacia_Nome,
        Estacao_Nome: station.Estacao_Nome,
        Municipio_Codigo: station.Municipio_Codigo,
        Municipio_Nome: station.Municipio_Nome,
        Operadora_Codigo: station.Operadora_Codigo,
        Operadora_Sigla: station.Operadora_Sigla,
        Operando: station.Operando,
        Responsavel_Codigo: station.Responsavel_Codigo,
        Responsavel_Sigla: station.Responsavel_Sigla,
        Rio_Codigo: station.Rio_Codigo,
        Rio_Nome: station.Rio_Nome,
        Sub_Bacia_Codigo: station.Sub_Bacia_Codigo,
        Sub_Bacia_Nome: station.Sub_Bacia_Nome,
        Tipo_Estacao: station.Tipo_Estacao,
        UF_Estacao: station.UF_Estacao,
        UF_Nome_Estacao: station.UF_Nome_Estacao,
        codigoestacao: station.codigoestacao,
        completude: cat.completude,
        Data_Atualizacao: station.Data_Atualizacao,
        Data_Hora_Medicao: station.Data_Hora_Medicao,
        chuvaAcumulada: cat.chuvaAcumulada,
        nivelMaisRecente: cat.nivelMaisRecente,
        vazaoMaisRecente: cat.vazaoMaisRecente,
        statusAtualizacao: cat.statusAtualizacao,
        classificacaoChuva: cat.classificacaoChuva,
        classificacaoNivel: cat.classificacaoNivel,
        classificacaoVazao: cat.classificacaoVazao
      };
    });
    res.json(summarizedStations);
  } catch (error) {
    console.error('Erro ao obter dados resumidos das estações:', error);
    res.status(500).json({ error: 'Falha ao obter dados resumidos das estações.' });
  }
});

/**
 * GET /estacoes/historico/:dateStr/:intervaloh/:stationCode?
 * Retorna o histórico dos dados de cada estação para o intervalo especificado (ex.: "2h", "6h", "12h", "24h" ou "48h")
 * e para a data informada (formato "YYYY-MM-DD"). Se o stationCode for informado, retorna somente os dados daquela estação.
 */
router.get('/estacoes/historico/:dateStr/:intervaloh/:stationCode?', async (req, res) => {
  try {
    const { dateStr, intervaloh, stationCode } = req.params;
    const intValue = Number(intervaloh.replace('h', ''));
    if (![2, 6, 12, 24, 48].includes(intValue)) {
      return res.status(400).json({ error: "Intervalo inválido. Os valores permitidos são 2h, 6h, 12h, 24h e 48h." });
    }
    const historicalData = await getHistoricalStationData(intValue, dateStr);
    if (stationCode) {
      if (historicalData.hasOwnProperty(stationCode)) {
        return res.json(historicalData[stationCode]);
      } else {
        return res.status(404).json({ error: "Dados não encontrados para a estação informada." });
      }
    }
    res.json(historicalData);
  } catch (error) {
    console.error("Erro ao obter histórico de estações:", error);
    res.status(500).json({ error: "Falha ao obter o histórico das estações." });
  }
});

/**
 * GET /estacoes/chuvaPorCidade
 * Retorna os dados de chuva acumulada agrupados por cidade (usando Municipio_Nome),
 * calculando a média e a mediana dos valores de "chuvaAcumulada" de cada estação por cidade.
 */
router.get('/estacoes/chuvaPorCidade', async (req, res) => {
  try {
    const mergedStations = await mergeStationData();

    // Atualiza o campo chuvaAcumulada conforme a categorização
    const categorizedStations = mergedStations.map(station => {
      const cat = categorizeStation(station);
      const chuvaValue = Number(cat.chuvaAcumulada);
      return {
        ...station,
        chuvaAcumulada: !isNaN(chuvaValue) && chuvaValue !== null && chuvaValue !== 'N/A'
          ? chuvaValue
          : null
      };
    });

    // Função auxiliar para calcular a mediana de um array de números
    function calcularMediana(numeros) {
      if (!numeros.length) return 0;
      const ordenados = numeros.slice().sort((a, b) => a - b);
      const meio = Math.floor(ordenados.length / 2);
      if (ordenados.length % 2 === 0) {
        return (ordenados[meio - 1] + ordenados[meio]) / 2;
      } else {
        return ordenados[meio];
      }
    }

    // Agrupa os dados por cidade, armazenando também os valores individuais de chuva
    const chuvaPorCidade = {};

    categorizedStations.forEach(station => {
      const cidade = station.Municipio_Nome
        ? station.Municipio_Nome.trim().toUpperCase()
        : 'DESCONHECIDO';
      const chuva = station.chuvaAcumulada;

      if (chuva !== null) { // Ignora valores inválidos
        if (!chuvaPorCidade[cidade]) {
          chuvaPorCidade[cidade] = {
            cidade,
            chuvaTotal: 0,
            numEstacoes: 0,
            valoresChuva: [],
            estacoes: []
          };
        }

        chuvaPorCidade[cidade].chuvaTotal += chuva;
        chuvaPorCidade[cidade].numEstacoes += 1;
        chuvaPorCidade[cidade].valoresChuva.push(chuva);
        chuvaPorCidade[cidade].estacoes.push({
          codigoestacao: station.codigoestacao,
          Estacao_Nome: station.Estacao_Nome,
          chuvaAcumulada: chuva
        });
      }
    });

    // Calcula a média e a mediana para cada cidade
    Object.values(chuvaPorCidade).forEach(cidadeData => {
      const media = cidadeData.numEstacoes > 0
        ? cidadeData.chuvaTotal / cidadeData.numEstacoes
        : 0;
      const mediana = calcularMediana(cidadeData.valoresChuva);
      cidadeData.chuvaMedia = media;
      cidadeData.chuvaMediana = mediana;
      // Remove os campos intermediários, se desejar
      delete cidadeData.chuvaTotal;
      delete cidadeData.numEstacoes;
      delete cidadeData.valoresChuva;
    });

    res.json(Object.values(chuvaPorCidade));
  } catch (error) {
    console.error("Erro ao calcular a média e a mediana de chuva por cidade:", error);
    res.status(500).json({ error: "Falha ao calcular a média e a mediana de chuva por cidade." });
  }
});

export default router;