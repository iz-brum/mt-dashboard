/**
 * @file src/components/Hydro_Estimator_Rainfall/animationManager.js
 * @description Módulo responsável pela lógica de animação das camadas de chuva (precipitação horária).
 * Esse módulo gerencia a criação, transição e atualização dos overlays de tiles que representam os frames
 * da animação com base em timestamps.
 */

import { formatTimestamp } from '../../utils/formatoData.js'; // Função para formatar o timestamp
import { showError } from '../../utils/notificacoes.js';           // Função para exibir mensagens de erro

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
        // Monta a URL dos tiles utilizando o productID e o timestamp atual
        const tileUrl = `http://localhost:3000/proxy/image?products=${productID}&time=${time}&x={x}&y={y}&z={z}`;

        // Exemplo: createPane('rainfallPane')
        map.createPane('rainfallPane');
        // Ajuste o zIndex desse pane conforme a posição que você quer
        // Se quiser que fique acima do tilePane (200) mas ainda abaixo do markerPane (600), pode ser algo entre 201 e 599
        map.getPane('rainfallPane').style.zIndex = 650;


        // Cria a camada de tiles para o frame atual, com opacidade 0 para possibilitar o efeito de fade-in,
        // restringida aos bounds fornecidos, com tamanho padrão de 256x256 e zoom máximo configurado.
        nextOverlayLayer = L.tileLayer(tileUrl, {
            pane: 'rainfallPane',    // Diga ao Leaflet qual pane usar
            opacity: 0,
            bounds: boundsMT,
            tileSize: 256,
            maxNativeZoom: 7,
            maxZoom: 12,
        }).addTo(map);

        // Aguarda o carregamento completo dos tiles da nova camada
        await new Promise(resolve => {
            nextOverlayLayer.once('load', resolve);
        });

        // Formata o timestamp para exibição e atualiza, se houver, o controle de chuva
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
     * A transição ocorre em duas fases: fade-out do overlay atual e fade-in do novo overlay.
     */
    function smoothTransition() {
        const fadeOutDuration = 3; // Duração do fade-out (em milissegundos)
        const fadeInDuration = 2;  // Duração do fade-in (em milissegundos)
        let start = null;          // Variável para armazenar o timestamp inicial da animação

        /**
         * Função interna para realizar o fade-out do overlay atual.
         * Ajusta a opacidade do overlay atual de 1 para 0 ao longo do tempo.
         * @param {number} timestamp - Timestamp fornecido pelo requestAnimationFrame.
         */
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
                // Após completar o fade-out, remove o overlay atual do mapa e inicia o fade-in
                if (overlayLayer) {
                    map.removeLayer(overlayLayer);
                }
                overlayLayer = null;
                start = null; // Reinicia o timer para o fade-in
                animationFrameId = requestAnimationFrame(fadeIn);
            }
        }

        /**
         * Função interna para realizar o fade-in do novo overlay.
         * Ajusta a opacidade do novo overlay de 0 para 1.
         * @param {number} timestamp - Timestamp fornecido pelo requestAnimationFrame.
         */
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
                // Ao final do fade-in, define o novo overlay como o overlay atual e traz para a frente
                overlayLayer = nextOverlayLayer;
                if (overlayLayer) {
                    overlayLayer.bringToFront();

                }
                nextOverlayLayer = null;
            }
        }

        // Se houver uma animação em andamento, cancela-a
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        // Inicia a animação com a fase de fade-out
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

        let currentFrame = 0;   // Índice do frame atual na lista de timestamps
        let paused = false;     // Estado da animação (pausada ou não)
        let timeoutId = null;   // ID do timeout para controle do delay entre frames

        /**
         * Função interna que avança para o próximo frame.
         * Atualiza o overlay com base no timestamp atual e define o delay para o próximo frame.
         */
        function nextFrame() {
            if (paused) return; // Se a animação estiver pausada, não prossegue

            if (currentFrame >= timestamps.length) {
                currentFrame = 0; // Reinicia a animação quando atingir o final da lista
            }
            updateOverlay(timestamps[currentFrame]);

            // Define o delay: se for o último frame, delay maior; caso contrário, delay padrão
            const isLastFrame = (currentFrame === timestamps.length - 1);
            const delay = isLastFrame ? 15000 : 3000;
            currentFrame++;
            timeoutId = setTimeout(nextFrame, delay);
        }

        // Inicia o loop de animação
        nextFrame();

        // Retorna um controller com métodos para pausar e retomar a animação
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
