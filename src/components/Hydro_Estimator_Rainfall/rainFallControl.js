/**
 * @file src/components/Hydro_Estimator_Rainfall/rainFallControl.js
 * @description Controle customizado para gerenciar a animação de chuva, incluindo Play/Pause e exibição de Data/Horário.
 * Este módulo define um controle do Leaflet que é adicionado ao mapa e permite ao usuário pausar ou retomar a animação de chuva,
 * além de exibir a data/hora do frame atual. Também inclui a exibição de uma imagem de legenda que, ao clicar, expande em um modal.
 */

// Define um controle customizado estendendo L.Control
const RainfallControl = L.Control.extend({
    // Define as opções padrão do controle
    options: {
        position: 'bottomleft', // Posiciona o controle no canto inferior esquerdo do mapa
        onPlay: null,           // Callback opcional a ser executado quando a animação for retomada (play)
        onPause: null           // Callback opcional a ser executado quando a animação for pausada (pause)
    },

    /**
     * Método onAdd é chamado pelo Leaflet quando o controle é adicionado ao mapa.
     * Cria o container do controle e configura os elementos internos (botão de Play/Pause, área de Data/Horário e legenda).
     * @param {L.Map} map - Instância do mapa Leaflet.
     * @returns {HTMLElement} Container do controle customizado.
     */
    onAdd: function (map) {
        console.debug('[RainfallControl] onAdd chamado.');

        // 1) CONTAINER PRINCIPAL
        const container = L.DomUtil.create('div', 'leaflet-bar rainfall-control-container');

        // 2) BOTÃO PLAY/PAUSE
        const playPauseButton = L.DomUtil.create('a', 'rainfall-play-pause', container);
        playPauseButton.href = '#'; 
        playPauseButton.title = 'Play/Pause Animação de Chuva';
        // Ícone inicial (assumindo animação "tocando")
        playPauseButton.innerHTML = '⏸';

        // 3) EXIBIÇÃO DE DATA/HORA
        const dateTimeDisplay = L.DomUtil.create('div', 'rainfall-date-time', container);
        dateTimeDisplay.title = "SEMPRE 4 horas adiantado em relação a Cuiabá"; // Informativo

        // 4) CONTAINER E IMAGEM DE LEGENDA
        const legendContainer = L.DomUtil.create('div', 'rainfall-legend-container', container);
        const legendImg = L.DomUtil.create('img', 'rainfall-legend-image', legendContainer);
        legendImg.src = '/assets/escala_mm_h_hydro_estimator_rainfall.png';
        legendImg.alt = "Legenda de Chuva Hydro-Estimator";

        // 5) MODAL OVERLAY PARA EXPANDIR LEGENDA
        //    Verifica se já existe um elemento <div id="rainfallModalOverlay"> no DOM.
        //    Caso não exista, criamos agora e anexamos ao <body>.
        let modalOverlay = document.getElementById('rainfallModalOverlay');
        if (!modalOverlay) {
            modalOverlay = L.DomUtil.create('div', 'rainfall-modal-overlay', document.body);
            modalOverlay.id = 'rainfallModalOverlay';
        }

        // 6) ADICIONA EVENTO DE CLIQUE NA IMAGEM (abre o modal)
        L.DomEvent.on(legendImg, 'click', () => {
            // Limpa o conteúdo atual do modal (se houver)
            modalOverlay.innerHTML = '';

            // Cria uma imagem grande para exibir dentro do modal
            const bigImg = document.createElement('img');
            bigImg.src = legendImg.src;
            bigImg.alt = legendImg.alt;

            // Adiciona a imagem ao overlay
            modalOverlay.appendChild(bigImg);

            // Mostra o modal (classe .active faz display: flex, por exemplo)
            modalOverlay.classList.add('active');
        });

        // 7) FECHAR O MODAL AO CLICAR NELE
        L.DomEvent.on(modalOverlay, 'click', () => {
            modalOverlay.classList.remove('active');
        });

        // 8) DEFINE O ESTADO INICIAL DA ANIMAÇÃO (tocando)
        this._animationPlaying = true;

        // 9) MÉTODO PARA ATUALIZAR O TEXTO DE DATA/HORA
        this.updateDateTime = (newDateTimeStr) => {
            dateTimeDisplay.innerHTML = newDateTimeStr + " UTC+0";
        };

        // 10) IMPEDIR PROPAGAÇÃO DE CLIQUES
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.on(playPauseButton, 'click', L.DomEvent.stop);
        L.DomEvent.on(playPauseButton, 'click', L.DomEvent.preventDefault);

        // 11) EVENTO DE CLIQUE NO BOTÃO PLAY/PAUSE
        L.DomEvent.on(playPauseButton, 'click', () => {
            console.debug('[RainfallControl] Botão de play/pause clicado.');
            this._animationPlaying = !this._animationPlaying;
            if (this._animationPlaying) {
                // Retomou a animação
                playPauseButton.innerHTML = '⏸';
                console.debug('[RainfallControl] Animação retomada.');
                if (typeof this.options.onPlay === 'function') {
                    this.options.onPlay();
                }
            } else {
                // Pausou a animação
                playPauseButton.innerHTML = '▶';
                console.debug('[RainfallControl] Animação pausada.');
                if (typeof this.options.onPause === 'function') {
                    this.options.onPause();
                }
            }
        });

        console.debug('[RainfallControl] Estado inicial definido como playing.');
        return container;
    }
});

/**
 * Função para adicionar o controle de chuva ao mapa.
 * Basta chamar esta função passando a instância do mapa Leaflet e, opcionalmente,
 * callbacks para os eventos de play e pause.
 *
 * @param {L.Map} map - Instância do mapa.
 * @param {Object} [options] - Opções adicionais, como os callbacks onPlay e onPause.
 * @returns {L.Control} Instância do controle de chuva adicionado ao mapa.
 */
export function addRainfallControl(map, options = {}) {
    console.debug('[RainfallControl] Adicionando controle ao mapa.');
    const control = new RainfallControl(options);
    control.addTo(map);
    console.debug('[RainfallControl] Controle adicionado com sucesso na posição bottomleft.');
    return control;
}
