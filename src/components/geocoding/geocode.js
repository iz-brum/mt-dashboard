/**
 * @file src/components/ana/geocode.js
 * @description Módulo para geocodificação reversa usando a API OpenCage.
 * Este módulo define um router do Express que processa requisições GET para obter informações de localização
 * com base nas coordenadas (lat, lng) fornecidas via query string.
 */

import express from 'express';   // Importa o Express para criar o router
import fetch from 'node-fetch';    // Importa a biblioteca node-fetch para realizar requisições HTTP

// Cria uma instância de router do Express para definir as rotas deste módulo
const router = express.Router();

/**
 * Função para validar as coordenadas.
 * Verifica se lat e lng estão definidos e são números válidos.
 *
 * @param {string|number} lat - Valor da latitude.
 * @param {string|number} lng - Valor da longitude.
 * @returns {boolean} Retorna true se as coordenadas são válidas; caso contrário, false.
 */
const validateCoords = (lat, lng) => 
  lat && lng && !isNaN(lat) && !isNaN(lng);

/**
 * Define a rota GET para o endpoint de geocodificação.
 * Espera receber parâmetros "lat" e "lng" na query string.
 *
 * @example GET /?lat=12.34&lng=56.78
 */
router.get('/', async ({ query: { lat, lng } }, res) => {
  try {
    // Valida se as coordenadas fornecidas são válidas
    if (!validateCoords(lat, lng)) {
      return res.status(400).json({ error: 'Coordenadas inválidas' });
    }

    // Monta a URL para a API OpenCage utilizando as coordenadas e a chave de API das variáveis de ambiente.
    // Limita a resposta a 1 resultado.
    const apiUrl = `https://api.opencagedata.com/geocode/v1/json?q=${lat},${lng}&key=${process.env.OPENCAGE_API_KEY}&limit=1`;
    
    // Realiza a requisição para a API OpenCage
    const response = await fetch(apiUrl);
    // Converte a resposta para JSON
    const data = await response.json();
    
    // Retorna os dados obtidos em formato JSON para o cliente
    res.json(data);
  } catch (error) {
    // Em caso de erro, loga a mensagem de erro e retorna status 500 com uma mensagem genérica de falha na geocodificação
    console.error('Erro:', error.message);
    res.status(500).json({ error: 'Falha na geocodificação' });
  }
});

// Exporta o router para que possa ser utilizado em outros módulos
export default router;
