/**
 * @file src/components/Hydro_Estimator_Rainfall/animationManager.js
 * @description Módulo responsável pela lógica de animação das camadas de chuva (precipitação horária).
 * Esse módulo gerencia a criação, transição e atualização dos overlays de tiles que representam os frames
 * da animação com base em timestamps.
 */

import { formatTimestamp } from '#utils/formatoData.js'; // Função para formatar o timestamp
import { showError } from '#utils/notificacoes.js';          // Função para exibir mensagens de erro
import { DEFAULT_CONFIG } from '#utils/config.js';            // Importa a configuração centralizada

/**
 * Cria um gerenciador de animação para uma camada específica.
 * @param {Object} map - Instância do mapa Leaflet.
 * @param {string} productID - ID do produto a ser carregado (usado para formar a URL dos tiles).
 * @param {Array} boundsMT - Limites (bounds) para visualização no mapa [sul-oeste, norte-leste].
 * @param {Object} [rainfallControl] - (Opcional) Referência ao controle de chuva, para exibir data/hora do frame.
 * @returns {Object} Retorna um objeto com métodos para iniciar e atualizar a animação.
 */
export function createAnimationManager(map, productID, boundsMT, rainfallControl = null) {
    // Variáveis para gerenciar o overlay atual, o próximo overlay e o ID da animação (para cancelamento)
    let overlayLayer = null;
    let nextOverlayLayer = null;
    let animationFrameId = null;

    /**
     * Função que cria e pré-carrega o novo overlay (o frame atual da animação) para um determinado timestamp.
     * @param {number} time - Timestamp para o qual o overlay deve ser carregado.
     */
    async function updateOverlay(time) {
        // Monta a URL dos tiles utilizando o productID, timestamp e a URL centralizada do proxy
        const tileUrl = `${DEFAULT_CONFIG.TILE_PROXY_URL}?products=${productID}&time=${time}&x={x}&y={y}&z={z}`;

        // Cria o pane para os overlays de chuva
        map.createPane('rainfallPane');
        map.getPane('rainfallPane').style.zIndex = 650;

        // Cria a camada de tiles para o frame atual com opacidade 0 para o efeito fade-in
        nextOverlayLayer = L.tileLayer(tileUrl, {
            pane: 'rainfallPane',
            opacity: 0,
            bounds: boundsMT,
            tileSize: 256,
            maxNativeZoom: 7,
            maxZoom: 12,
        }).addTo(map);

        // Aguarda o carregamento completo dos tiles
        await new Promise(resolve => {
            nextOverlayLayer.once('load', resolve);
        });

        // Formata o timestamp para exibição e atualiza o controle, se houver
        const formatted = formatTimestamp(time);
        console.log('(UTC+0):', formatted);
        if (rainfallControl && typeof rainfallControl.updateDateTime === 'function') {
            rainfallControl.updateDateTime(formatted);
        }

        // Inicia a transição suave entre o overlay atual e o novo overlay
        smoothTransition();
    }

    /**
     * Realiza a transição suave (fade) entre o overlay atual e o próximo overlay.
     */
    function smoothTransition() {
        const fadeOutDuration = 3; // Duração do fade-out (em milissegundos)
        const fadeInDuration = 2;  // Duração do fade-in (em milissegundos)
        let start = null;

        function fadeOut(timestamp) {
            if (!start) start = timestamp;
            let progress = timestamp - start;
            let t = Math.min(progress / fadeOutDuration, 1);

            if (overlayLayer) {
                overlayLayer.setOpacity(1 - t);
            }

            if (progress < fadeOutDuration) {
                animationFrameId = requestAnimationFrame(fadeOut);
            } else {
                if (overlayLayer) {
                    map.removeLayer(overlayLayer);
                }
                overlayLayer = null;
                start = null;
                animationFrameId = requestAnimationFrame(fadeIn);
            }
        }

        function fadeIn(timestamp) {
            if (!start) start = timestamp;
            let progress = timestamp - start;
            let t = Math.min(progress / fadeInDuration, 1);

            if (nextOverlayLayer) {
                nextOverlayLayer.setOpacity(t);
            }

            if (progress < fadeInDuration) {
                animationFrameId = requestAnimationFrame(fadeIn);
            } else {
                overlayLayer = nextOverlayLayer;
                if (overlayLayer) {
                    overlayLayer.bringToFront();
                }
                nextOverlayLayer = null;
            }
        }

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        animationFrameId = requestAnimationFrame(fadeOut);
    }

    /**
     * Inicia o loop de animação, percorrendo uma lista de timestamps.
     * Exibe cada frame com um delay definido e retorna um controller com métodos para pausar e retomar a animação.
     *
     * @param {number[]} timestamps - Lista de timestamps retornados pela API.
     * @returns {Object} Controller com métodos pause() e resume() para controlar a animação.
     */
    function startAnimation(timestamps) {
        if (!timestamps || timestamps.length === 0) {
            console.warn('Nenhum frame disponível para animação.');
            showError('Nenhum dado disponível para animação.');
            return;
        }

        let currentFrame = 0;
        let paused = false;
        let timeoutId = null;

        function nextFrame() {
            if (paused) return;

            if (currentFrame >= timestamps.length) {
                currentFrame = 0;
            }
            updateOverlay(timestamps[currentFrame]);

            const isLastFrame = (currentFrame === timestamps.length - 1);
            const delay = isLastFrame ? 15000 : 3000;
            currentFrame++;
            timeoutId = setTimeout(nextFrame, delay);
        }

        nextFrame();

        return {
            pause: function () {
                paused = true;
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                console.debug('[AnimationManager] Animação pausada.');
            },
            resume: function () {
                if (paused) {
                    paused = false;
                    console.debug('[AnimationManager] Animação retomada.');
                    nextFrame();
                }
            }
        };
    }

    // Retorna os métodos que o módulo principal poderá chamar: startAnimation e updateOverlay.
    return {
        startAnimation,
        updateOverlay
    };
}
