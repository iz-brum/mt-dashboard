/**
 * @file server/server.js
 * @description Servidor principal da aplicação de monitoramento hidrometeorológico.
 * Responsável por configurar middlewares, rotas, limitadores de requisições e proxy para a RealEarth API.
 * 
 * @module server
 * @license MIT
 * @copyright 2024 Sistema de Monitoramento Hidrometeorológico
 */

import express from 'express';               // Framework web para criar o servidor HTTP
import cors from 'cors';                       // Middleware para habilitar Cross-Origin Resource Sharing (CORS)
import dotenv from 'dotenv';                   // Carrega variáveis de ambiente a partir de um arquivo .env
import path from 'path';                       // Manipulação de caminhos de arquivos e diretórios
import { fileURLToPath } from 'url';            // Utilitário para obter __dirname em módulos ES
import rateLimit from 'express-rate-limit';    // Middleware para limitar a taxa de requisições (rate limiting)
import geocodeRouter from '#components/geocoding/geocode.js';  // Router para o serviço de geocodificação
import stationDataRouter from '#apis/ana/routes/rotasDadosEstacoes.js'; // Router para o serviço de dados das estações
import { pipeline } from 'stream';             // Utilitário para encadear streams (usado no proxy)
import fetch from 'node-fetch';                // Biblioteca para fazer requisições HTTP (substituindo o fetch nativo)

// Configura __dirname para módulos ES usando fileURLToPath e path.dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega as variáveis de ambiente do arquivo .env localizado na mesma pasta do server.js
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Configuração do rate limiter para limitar a 1 requisição por segundo na rota de geocodificação
const perSecondLimiter = rateLimit({
    windowMs: 1000, // Janela de 1 segundo
    max: 1,         // Máximo de 1 requisição por IP a cada 1 segundo
    standardHeaders: true,  // Retorna os headers padrão de rate limit
    legacyHeaders: false,   // Desativa headers legados
    statusCode: 429,        // Código de status quando o limite é excedido
    handler: (req, res) => {
        res.status(429).json({
            error: {
                code: "TOO_MANY_REQUESTS",
                message: "Limite de 1 requisição por segundo atingido.",
                retryAfter: 1
            }
        });
    }
});

// Configuração do rate limiter para limitar a 2500 requisições por 24 horas na rota de geocodificação
const dailyLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // Janela de 24 horas
    max: 2500,                   // Máximo de 2500 requisições por IP em 24 horas
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    handler: (req, res) => {
        res.status(429).json({
            error: {
                code: "DAILY_QUOTA_EXCEEDED",
                message: "Cota diária de 2500 requisições esgotada.",
                retryAfter: 86400 // 24 horas em segundos
            }
        });
    }
});

// Cria a instância do aplicativo Express
const app = express();

// Configura o middleware CORS para permitir requisições de qualquer origem
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'RE-Access-Key'],
}));

// Aplica os limitadores de requisição à rota /api/geocode
app.use('/api/geocode', dailyLimiter);
app.use('/api/geocode', perSecondLimiter);
// Monta o router de geocodificação para a rota /api/geocode
app.use('/api/geocode', geocodeRouter);

// Adiciona o serviço de dados das estações na rota /api/stationData
app.use('/api/stationData', stationDataRouter);

// Configura um proxy para a RealEarth API na rota /proxy/image
app.use('/proxy/image', async (req, res) => {
    // Extrai os parâmetros da query string
    const { products, time, x, y, z } = req.query;
    // Constrói a URL da RealEarth API com os parâmetros recebidos
    const url = `https://realearth.ssec.wisc.edu/api/image?products=${products}&time=${time}&x=${x}&y=${y}&z=${z}`;
    // Obtém a chave de acesso a partir das variáveis de ambiente
    const accessKey = process.env.REAL_EARTH_API_KEY;

    try {
        // Faz a requisição à RealEarth API com os headers necessários
        const response = await fetch(url, {
            headers: {
                'RE-Access-Key': accessKey,
                'Referer': 'https://realearth.ssec.wisc.edu/',
            },
        });

        // Se a resposta não for bem-sucedida, retorna um erro para o cliente
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Erro ao acessar a API' });
        }

        // Define o header Content-Type com base na resposta ou usa 'image/png'
        res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
        // Encadeia o stream de resposta da API para a resposta HTTP usando pipeline
        pipeline(response.body, res, (err) => {
            if (err) {
                console.error('Erro no pipeline:', err.message);
                res.status(500).json({ error: 'Erro interno no servidor' });
            }
        });
    } catch (error) {
        // Em caso de erro na requisição, loga o erro e retorna status 500
        console.error('Erro ao encaminhar requisição:', error.message);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// Inicia o servidor, escutando na porta definida em process.env.PORT ou 3000 por padrão
app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://<SEU_IP_LOCAL>:${process.env.PORT || 3000} 🚀`);
});
