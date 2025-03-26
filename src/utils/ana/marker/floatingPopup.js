/**
 * @file src/utils/ana/marker/floatingPopup.js
 */
import { FLOATING_POPUP_CONFIG } from '#utils/config.js';

export function attachFloatingPopupEvents(marker, DEFAULT_CONFIG) {
  // Se os popups já estiverem anexados, não recrie-os
  if (marker._floatingPopupAttached) {
    return;
  }
  marker._floatingPopupAttached = true;

  // Se houver popups antigos, remova-os (garante que não há duplicação)
  if (marker._cotaBox) marker._cotaBox.remove();
  if (marker._vazaoBox) marker._vazaoBox.remove();
  if (marker._chuvaBox) marker._chuvaBox.remove();

  // Cria os elementos apenas uma vez
  const cotaBox = document.createElement('div');
  cotaBox.classList.add('floating-info-box', 'floating-cota');

  const vazaoBox = document.createElement('div');
  vazaoBox.classList.add('floating-info-box', 'floating-vazao');

  const chuvaBox = document.createElement('div');
  chuvaBox.classList.add('floating-info-box', 'floating-chuva');

  // Armazena-os no marcador para reutilização
  marker._cotaBox = cotaBox;
  marker._vazaoBox = vazaoBox;
  marker._chuvaBox = chuvaBox;

  // Anexa os elementos ao container do mapa
  const mapContainer = marker._map.getContainer();
  mapContainer.appendChild(cotaBox);
  mapContainer.appendChild(vazaoBox);
  mapContainer.appendChild(chuvaBox);

  let updateTimer = null;
  let hideTimer = null;
  let isHovering = false;

  function updateBoxes() {
    cotaBox.innerHTML = `
        <span class="floating-label">${FLOATING_POPUP_CONFIG.labels.level}</span>
        <span class="floating-value">${(marker.stationData.nivelMaisRecente !== DEFAULT_CONFIG.INVALID_VALUE &&
        marker.stationData.nivelMaisRecente !== null)
        ? marker.stationData.nivelMaisRecente
        : 'N/A'
      }</span>
        <span class="floating-unit">${FLOATING_POPUP_CONFIG.units.level}</span>
      `;

    vazaoBox.innerHTML = `
        <span class="floating-label">${FLOATING_POPUP_CONFIG.labels.discharge}</span>
        <span class="floating-value">${(marker.stationData.vazaoMaisRecente !== DEFAULT_CONFIG.INVALID_VALUE &&
        marker.stationData.vazaoMaisRecente !== null)
        ? marker.stationData.vazaoMaisRecente
        : 'N/A'
      }</span>
        <span class="floating-unit">${FLOATING_POPUP_CONFIG.units.discharge}</span>
      `;

    chuvaBox.innerHTML = `
        <span class="floating-label">${FLOATING_POPUP_CONFIG.labels.rainfall}</span>
        <span class="floating-value">${typeof marker.stationData.chuvaAcumulada === 'number'
        ? marker.stationData.chuvaAcumulada.toFixed(2)
        : 'N/A'
      }</span>
        <span class="floating-unit">${FLOATING_POPUP_CONFIG.units.rainfall}</span>
      `;
  }

  function updatePosition() {
    if (!marker._map) return;
    const markerPos = marker._map.latLngToContainerPoint(marker.getLatLng());
    const mapRect = marker._map.getContainer().getBoundingClientRect();

    cotaBox.style.left = `${mapRect.left + markerPos.x + FLOATING_POPUP_CONFIG.positionOffsets.level.left}px`;
    cotaBox.style.top = `${mapRect.top + markerPos.y + FLOATING_POPUP_CONFIG.positionOffsets.level.top}px`;

    vazaoBox.style.left = `${mapRect.left + markerPos.x + FLOATING_POPUP_CONFIG.positionOffsets.discharge.left}px`;
    vazaoBox.style.top = `${mapRect.top + markerPos.y + FLOATING_POPUP_CONFIG.positionOffsets.discharge.top}px`;

    chuvaBox.style.left = `${mapRect.left + markerPos.x + FLOATING_POPUP_CONFIG.positionOffsets.rainfall.left}px`;
    chuvaBox.style.top = `${mapRect.top + markerPos.y + FLOATING_POPUP_CONFIG.positionOffsets.rainfall.top}px`;
  }

  function showBoxes() {
    updateBoxes();
    updatePosition();
    cotaBox.style.display = 'flex';
    vazaoBox.style.display = 'flex';
    chuvaBox.style.display = 'flex';
    // Se já existe um timer, não cria outro
    if (!updateTimer) {
      updateTimer = setInterval(() => {
        updateBoxes();
        updatePosition();
      }, FLOATING_POPUP_CONFIG.updateInterval);
    }
  }

  function hideBoxes() {
    cotaBox.style.display = 'none';
    vazaoBox.style.display = 'none';
    chuvaBox.style.display = 'none';
    if (updateTimer) {
      clearInterval(updateTimer);
      updateTimer = null;
    }
  }

  function clearHideTimer() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function delayedHideCheck() {
    clearHideTimer();
    hideTimer = setTimeout(() => {
      if (!isHovering) {
        hideBoxes();
      }
    }, 150);
  }

  function setupHoverListeners(element) {
    if (!element || element.__floatingPopupBound) return;
    element.__floatingPopupBound = true;

    element.addEventListener('mouseenter', () => {
      isHovering = true;
      clearHideTimer();
      showBoxes();
    });

    element.addEventListener('mouseleave', () => {
      isHovering = false;
      delayedHideCheck();
    });
  }

  // Listener de resize e fullscreen
  marker._map.on('resize fullscreenchange', updatePosition);

  // Attach listeners ao marcador se o _icon já estiver definido
  if (marker._icon) {
    setupHoverListeners(marker._icon);
  } else {
    marker.once('add', () => {
      setTimeout(() => {
        if (marker._icon) {
          setupHoverListeners(marker._icon);
        }
      }, 0);
    });
  }

  // Attach listeners aos boxes para garantir que o hover funcione
  setupHoverListeners(cotaBox);
  setupHoverListeners(vazaoBox);
  setupHoverListeners(chuvaBox);

  // Ao remover o marcador, limpa tudo e reseta a flag
  marker.on('remove', () => {
    hideBoxes();
    marker._map.off('resize fullscreenchange', updatePosition);
    marker._floatingPopupAttached = false;
  });

  // Permite atualização manual dos dados
  marker.updateFloatingData = () => {
    updateBoxes();
  };
}
