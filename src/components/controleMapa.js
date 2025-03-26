/**
 * @file src/components/mapControl.js
 * @description Módulo responsável por configurar os controles personalizados do mapa.
 * Define controles que ajustam a sensibilidade do zoom, habilitam/desabilitam o arrasto do mapa,
 * além de adicionar controles padrão como escala e tela cheia.
 */

// Importa os estilos e o plugin do fullscreen
import 'leaflet.fullscreen/Control.FullScreen.css';
import 'leaflet.fullscreen';
// import 'font-awesome/css/font-awesome.css';

import { MAP_CONTROL_CONFIG } from '#utils/config.js';
import { StationMarkers } from '#components/ana/gerenciadorDeMarcadores.js';
import { ClassificationLayers } from '#components/ana/camadasClassificacao.js';

// Utiliza as configurações centralizadas para a sensibilidade do zoom e as classes CSS
const ZOOM_SENSITIVITY = MAP_CONTROL_CONFIG.ZOOM_SENSITIVITY;
const CONTROL_CLASSES = MAP_CONTROL_CONFIG.CONTROL_CLASSES;


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
  // Impede que cliques no container propagam para o mapa
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
 *
 * @param {Object} elements - Contém toggleBtn, expandedPanel e panelDescription.
 */
function setupToggleLogic({ toggleBtn, expandedPanel, panelDescription }) {
  toggleBtn.onclick = () => {
    const isVisible = expandedPanel.style.display === 'block';
    expandedPanel.style.display = isVisible ? 'none' : 'block';
    panelDescription.style.display = isVisible ? 'none' : 'block';
    return false;
  };
}

/**
 * Configura a sensibilidade do zoom.
 *
 * @param {Object} elements - Contém zoomInput e valueSpan.
 * @param {Object} map - Instância do mapa Leaflet.
 */
function setupZoomSensitivity({ zoomInput, valueSpan }, map) {
  zoomInput.value = map.options.wheelPxPerZoomLevel;
  valueSpan.textContent = map.options.wheelPxPerZoomLevel;
  zoomInput.onchange = ({ target }) => {
    map.options.wheelPxPerZoomLevel = Number(target.value);
    valueSpan.textContent = target.value;
  };
}

/**
 * Configura o toggle para habilitar ou desabilitar o arrasto do mapa.
 *
 * @param {Object} elements - Contém dragCheckbox.
 * @param {Object} map - Instância do mapa Leaflet.
 */
function setupDragToggle({ dragCheckbox }, map) {
  dragCheckbox.onchange = ({ target }) => {
    target.checked ? map.dragging.enable() : map.dragging.disable();
  };
}

/**
 * Adiciona o painel de controle customizado ao mapa.
 *
 * @param {Object} map - Instância do mapa Leaflet.
 */
function addCustomControlPanel(map) {
  const customControl = L.control({ position: 'topleft' });
  customControl.onAdd = () => {
    const container = createControlContainer();
    setupControlInteractions(container, map);
    return container;
  };
  customControl.addTo(map);
}

/**
 * Adiciona o controle de escala ao mapa.
 *
 * @param {Object} map - Instância do mapa Leaflet.
 */
function addScaleControl(map) {
  L.control.scale(MAP_CONTROL_CONFIG.SCALE_CONTROL_CONFIG).addTo(map);
}

/**
 * Adiciona o controle de tela cheia ao mapa.
 *
 * @param {Object} map - Instância do mapa Leaflet.
 */
function addFullscreenControl(map) {
  const fullscreenControl = L.control.fullscreen(MAP_CONTROL_CONFIG.FULLSCREEN_CONTROL_CONFIG).addTo(map);
  map.on('enterFullscreen', function () {
    const button = fullscreenControl.getContainer().querySelector('a');
    if (button) {
      button.innerHTML = MAP_CONTROL_CONFIG.FULLSCREEN_CONTROL_CONFIG.enterIcon;
    }
  });
  map.on('exitFullscreen', function () {
    const button = fullscreenControl.getContainer().querySelector('a');
    if (button) {
      button.innerHTML = MAP_CONTROL_CONFIG.FULLSCREEN_CONTROL_CONFIG.exitIcon;
    }
  });
}


function addClusterToggleControl(map) {
  const toggleControl = L.control({ position: 'topleft' });

  toggleControl.onAdd = function () {
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    container.title = 'Ativar/Desativar Clustering';

    const button = L.DomUtil.create('a', '', container);
    button.href = '#';
    button.innerHTML = 'C';

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    let isClusterActive = true;

    L.DomEvent.on(button, 'click', (e) => {
      L.DomEvent.preventDefault(e);

      if (isClusterActive) {
        // DESATIVAR CLUSTER
        // 1) Desabilita cluster na "Todas Estações" se ela estiver no mapa
        if (map.hasLayer(StationMarkers.getLayer())) {
          StationMarkers.disableCluster(); 
          // Se "Todas Estações" estiver ativa, remove o cluster e adiciona a versão sem cluster
        }

        // 2) Para cada camada de classificação
        const clusterLayers = ClassificationLayers.getClusterLayers();   // { "Chuva - Forte": markerClusterGroup, ... }
        const noClusterLayers = ClassificationLayers.getNoClusterLayers(); // { "Chuva - Forte": layerGroup, ... }

        Object.keys(clusterLayers).forEach(layerName => {
          const clusterLayer = clusterLayers[layerName];
          const noClusterLayer = noClusterLayers[layerName];
          
          if (map.hasLayer(clusterLayer)) {
            // Se essa camada com cluster está ativa, removemos e adicionamos a sem cluster
            map.removeLayer(clusterLayer);
            map.addLayer(noClusterLayer);
          }
        });

        isClusterActive = false;
        button.innerHTML = 'NC';
      } else {
        // ATIVAR CLUSTER
        // 1) Se "Todas Estações" estiver no mapa, habilitar cluster
        if (map.hasLayer(StationMarkers.getLayer())) {
          StationMarkers.enableCluster();
        }

        // 2) Para cada camada de classificação
        const clusterLayers = ClassificationLayers.getClusterLayers();
        const noClusterLayers = ClassificationLayers.getNoClusterLayers();

        Object.keys(clusterLayers).forEach(layerName => {
          const clusterLayer = clusterLayers[layerName];
          const noClusterLayer = noClusterLayers[layerName];

          if (map.hasLayer(noClusterLayer)) {
            // Se a camada sem cluster está ativa, remove e adiciona a versão com cluster
            map.removeLayer(noClusterLayer);
            map.addLayer(clusterLayer);
          }
        });

        isClusterActive = true;
        button.innerHTML = 'C';
      }
    });

    return container;
  };

  toggleControl.addTo(map);
}

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


export { addClusterToggleControl };