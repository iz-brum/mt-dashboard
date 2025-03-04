/**
 * @file src/components/mapControl.js
 * @description Módulo responsável por configurar os controles personalizados do mapa.
 * Define controles que ajustam a sensibilidade do zoom, habilitam/desabilitam o arrasto do mapa,
 * além de adicionar controles padrão como escala e tela cheia.
 */

// Constantes para configuração de sensibilidade do zoom
const ZOOM_SENSITIVITY = {
  MIN: 60,      // Valor mínimo permitido para a sensibilidade do zoom
  MAX: 2000,    // Valor máximo permitido para a sensibilidade do zoom
  DEFAULT: 950  // Valor padrão de sensibilidade do zoom
};

// Constantes para as classes CSS utilizadas na construção dos controles personalizados
const CONTROL_CLASSES = {
  CONTAINER: 'custom-map-control leaflet-bar', // Classe do container principal do controle
  HEADER: 'control-header',                     // Classe do cabeçalho do controle
  PANEL_DESCRIPTION: 'panel-description',       // Classe da descrição que aparece no cabeçalho
  EXPANDED_PANEL: 'expanded-panel',             // Classe do painel expandido com os controles
  ZOOM_SECTION: 'zoom-sensitivity-section',     // Classe da seção que controla a sensibilidade do zoom
  DRAG_SECTION: 'drag-toggle-section'           // Classe da seção que controla a habilitação do arrasto do mapa
};

/**
 * Configura os controles personalizados do mapa.
 * Essa função centraliza as configurações, chamando funções para definir padrões, adicionar o painel customizado
 * e incluir controles padrão (como escala e tela cheia).
 *
 * @param {Object} map - Instância do mapa Leaflet.
 */
export function setupMapControls(map) {
  configureMapDefaults(map);
  addCustomControlPanel(map);
  addStandardControls(map);
}

/**
 * Configura os valores padrão do mapa.
 * Em especial, define a sensibilidade do zoom (wheelPxPerZoomLevel) com base no valor DEFAULT.
 *
 * @param {Object} map - Instância do mapa Leaflet.
 */
function configureMapDefaults(map) {
  map.options.wheelPxPerZoomLevel = ZOOM_SENSITIVITY.DEFAULT;
}

/**
 * Adiciona controles padrão ao mapa.
 * Aqui são adicionados o controle de escala e o controle de tela cheia.
 *
 * @param {Object} map - Instância do mapa Leaflet.
 */
function addStandardControls(map) {
  addScaleControl(map);
  addFullscreenControl(map);
}

/**
 * Cria e retorna o container customizado para os controles do mapa.
 * O container inclui:
 *  - Um header com um botão para alternar a visibilidade do painel
 *  - Um painel expandido com controles para ajustar a sensibilidade do zoom e habilitar/desabilitar o arrasto
 *
 * @returns {HTMLElement} Container do controle customizado.
 */
function createControlContainer() {
  // Cria o container utilizando L.DomUtil.create com a classe definida em CONTROL_CLASSES.CONTAINER
  const container = L.DomUtil.create('div', CONTROL_CLASSES.CONTAINER);
  container.innerHTML = `
      <div class="${CONTROL_CLASSES.HEADER}">
        <a href="#" class="toggle-panel" title="Configurações do mapa" role="button" aria-label="Configurações do mapa">
          <i class="fa fa-cog"></i>
        </a>
        <div class="${CONTROL_CLASSES.PANEL_DESCRIPTION}">Controles do mapa</div>
      </div>
      
      <div class="${CONTROL_CLASSES.EXPANDED_PANEL}">
        <div class="${CONTROL_CLASSES.ZOOM_SECTION}">
          <label for="zoomSensitivity">
            <span title="Ajuste de sensibilidade do zoom">
              <img src="/assets/zoom_sensibility.png" alt="Zoom Icon"/>
            </span>
          </label>
          <input id="zoomSensitivity" type="range" min="${ZOOM_SENSITIVITY.MIN}" max="${ZOOM_SENSITIVITY.MAX}"/>
          <span class="value">${ZOOM_SENSITIVITY.DEFAULT}</span>
        </div>
  
        <div class="${CONTROL_CLASSES.DRAG_SECTION}">
          <i class="fa fa-hand-paper" title="Habilitar ou desabilitar o arrasto do mapa"></i>
          <label class="switch">
            <input type="checkbox" id="dragSwitch" checked />
            <span class="slider round"></span>
          </label>
        </div>
      </div>
    `;
  // Desabilita a propagação de cliques para que o controle não interfira com os cliques no mapa
  L.DomEvent.disableClickPropagation(container);
  return container;
}

/**
 * Configura as interações dos elementos do painel customizado com o mapa.
 * Extrai os elementos relevantes do container e configura:
 *  - A lógica de toggle do painel
 *  - O controle de sensibilidade do zoom
 *  - A alternância para habilitar/desabilitar o arrasto do mapa
 *
 * @param {HTMLElement} container - Container dos controles customizados.
 * @param {Object} map - Instância do mapa Leaflet.
 */
function setupControlInteractions(container, map) {
  const elements = {
    toggleBtn: container.querySelector('.toggle-panel'),
    expandedPanel: container.querySelector(`.${CONTROL_CLASSES.EXPANDED_PANEL}`),
    panelDescription: container.querySelector(`.${CONTROL_CLASSES.PANEL_DESCRIPTION}`),
    zoomInput: container.querySelector('#zoomSensitivity'),
    valueSpan: container.querySelector('.value'),
    dragCheckbox: container.querySelector('#dragSwitch')
  };

  setupToggleLogic(elements);
  setupZoomSensitivity(elements, map);
  setupDragToggle(elements, map);
}

/**
 * Configura a lógica de toggle do painel customizado.
 * Quando o botão de toggle é clicado, alterna a visibilidade do painel expandido e da descrição.
 *
 * @param {Object} elements - Objeto contendo os elementos do painel (toggleBtn, expandedPanel, panelDescription).
 */
function setupToggleLogic({ toggleBtn, expandedPanel, panelDescription }) {
  toggleBtn.onclick = () => {
    // Verifica se o painel está visível (display 'block')
    const isVisible = expandedPanel.style.display === 'block';
    // Alterna o display entre 'none' e 'block'
    expandedPanel.style.display = isVisible ? 'none' : 'block';
    // Alterna a visibilidade da descrição também
    panelDescription.style.display = isVisible ? 'none' : 'block';
    return false; // Impede comportamento padrão do link
  };
}

/**
 * Configura a sensibilidade do zoom.
 * Atualiza o valor do input e o valor exibido no span, e ajusta a opção do mapa.
 *
 * @param {Object} elements - Objeto contendo zoomInput e valueSpan.
 * @param {Object} map - Instância do mapa Leaflet.
 */
function setupZoomSensitivity({ zoomInput, valueSpan }, map) {
  // Inicializa o valor do input e do span com a configuração atual do mapa
  zoomInput.value = map.options.wheelPxPerZoomLevel;
  valueSpan.textContent = map.options.wheelPxPerZoomLevel;

  // Ao alterar o input, atualiza a sensibilidade do zoom no mapa e o valor exibido
  zoomInput.onchange = ({ target }) => {
    map.options.wheelPxPerZoomLevel = Number(target.value);
    valueSpan.textContent = target.value;
  };
}

/**
 * Configura o toggle para habilitar ou desabilitar o arrasto do mapa.
 *
 * @param {Object} elements - Objeto contendo dragCheckbox.
 * @param {Object} map - Instância do mapa Leaflet.
 */
function setupDragToggle({ dragCheckbox }, map) {
  dragCheckbox.onchange = ({ target }) => {
    // Se o checkbox estiver marcado, habilita o arrasto; caso contrário, desabilita
    target.checked ? map.dragging.enable() : map.dragging.disable();
  };
}

/**
 * Adiciona o painel de controle customizado ao mapa.
 * Cria o container de controle, configura as interações e o adiciona ao mapa na posição 'topleft'.
 *
 * @param {Object} map - Instância do mapa Leaflet.
 */
function addCustomControlPanel(map) {
  // Cria um novo controle Leaflet na posição 'topleft'
  const customControl = L.control({ position: 'topleft' });

  // Define a função onAdd para criar e configurar o container do controle
  customControl.onAdd = () => {
    const container = createControlContainer();
    setupControlInteractions(container, map);
    return container;
  };

  // Adiciona o controle customizado ao mapa
  customControl.addTo(map);
}

/**
 * Adiciona o controle de escala ao mapa.
 * Configura o controle para exibir a escala em metros (não imperial) e posiciona-o no canto inferior esquerdo.
 *
 * @param {Object} map - Instância do mapa Leaflet.
 */
function addScaleControl(map) {
  L.control.scale({
    position: 'bottomleft',
    metric: true,
    imperial: false,
    maxWidth: 90,
    updateWhenIdle: false
  }).addTo(map);
}


function enableHoverPopups() {
  // Seleciona todos os marcadores e adiciona listeners de mouseover/mouseout
  StationMarkers.getAllMarkers().forEach(marker => {
    marker.on('mouseover', (e) => {
      // Cria e exibe popup flutuante
    });
    marker.on('mouseout', (e) => {
      // Remove popup flutuante
    });
  });
}



/**
 * Adiciona o controle de tela cheia ao mapa.
 * Configura o controle com ícones e textos para entrar e sair do modo tela cheia,
 * e altera o ícone conforme o estado do mapa.
 *
 * @param {Object} map - Instância do mapa Leaflet.
 */
function addFullscreenControl(map) {
  // Cria o controle de tela cheia com as opções definidas
  const fullscreenControl = L.control.fullscreen({
    position: 'topright',
    title: 'Ver em tela cheia',
    titleCancel: 'Sair de tela cheia',
    forceSeparateButton: true,
    pseudoFullscreen: false,
    content: '<i class="fa fa-expand"></i>' // Ícone inicial para entrar em tela cheia
  }).addTo(map);

  // Evento: Quando o mapa entra em tela cheia, altera o ícone para "compress" (indicando que pode sair da tela cheia)
  map.on('enterFullscreen', function () {
    const button = fullscreenControl.getContainer().querySelector('a');
    if (button) {
      button.innerHTML = '<i class="fa fa-compress"></i>';
    }
  });

  // Evento: Quando o mapa sai do modo tela cheia, altera o ícone para "expand" (indicando que pode entrar em tela cheia)
  map.on('exitFullscreen', function () {
    const button = fullscreenControl.getContainer().querySelector('a');
    if (button) {
      button.innerHTML = '<i class="fa fa-expand"></i>';
    }
  });
}
