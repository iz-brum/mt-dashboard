/**
 * Anexa os eventos de mouse para exibir e atualizar os quadros flutuantes (floating popup boxes)
 * para um marcador fornecido.
 * Essa função cria os boxes se ainda não existirem para esse marcador e configura os eventos de
 * mouseover e mouseout.
 *
 * @param {Object} marker - Marcador do Leaflet que deve exibir os quadros.
 * @param {Object} DEFAULT_CONFIG - Configurações padrão.
 */
export function attachFloatingPopupEvents(marker, DEFAULT_CONFIG) {

  // Remove popups existentes ANTES de criar novos
  if (marker._cotaBox) marker._cotaBox.remove();
  if (marker._vazaoBox) marker._vazaoBox.remove();
  if (marker._chuvaBox) marker._chuvaBox.remove();

  // Cria os boxes PRIMEIRO
  const cotaBox = document.createElement('div');
  cotaBox.classList.add('floating-info-box', 'floating-cota');

  const vazaoBox = document.createElement('div');
  vazaoBox.classList.add('floating-info-box', 'floating-vazao');

  const chuvaBox = document.createElement('div');
  chuvaBox.classList.add('floating-info-box', 'floating-chuva');

  // DEPOIS armazene as referências nos marcadores
  marker._cotaBox = cotaBox;
  marker._vazaoBox = vazaoBox;
  marker._chuvaBox = chuvaBox;

  if (!marker._map) {
    marker.once('add', () => {
      attachFloatingPopupEvents(marker, DEFAULT_CONFIG);
    });
    return;
  }

  // Cria os boxes e os anexa ao contêiner do mapa
  const mapContainer = marker._map.getContainer();

  mapContainer.appendChild(cotaBox);
  mapContainer.appendChild(vazaoBox);
  mapContainer.appendChild(chuvaBox);

  let updateTimer = null; // Timer para atualização periódica

  // Função para atualizar o conteúdo dos boxes
  function updateBoxes() {
    cotaBox.innerHTML = `
        <span class="floating-label">Cota</span>
        <span class="floating-value">${(marker.stationData.nivelMaisRecente !== DEFAULT_CONFIG.INVALID_VALUE && marker.stationData.nivelMaisRecente !== null)
        ? marker.stationData.nivelMaisRecente
        : 'N/A'
      }</span>
        <span class="floating-unit">m</span>
      `;

    vazaoBox.innerHTML = `
        <span class="floating-label">Vazão</span>
        <span class="floating-value">${(marker.stationData.vazaoMaisRecente !== DEFAULT_CONFIG.INVALID_VALUE && marker.stationData.vazaoMaisRecente !== null)
        ? marker.stationData.vazaoMaisRecente
        : 'N/A'
      }</span>
        <span class="floating-unit">m³/s</span>
      `;

    chuvaBox.innerHTML = `
        <span class="floating-label">Chuva</span>
        <span class="floating-value">${typeof marker.stationData.chuvaAcumulada === 'number'
        ? marker.stationData.chuvaAcumulada.toFixed(2)
        : 'N/A'
      }</span>
        <span class="floating-unit">mm</span>
      `;
  }

  // Função para atualizar a posição dos boxes
  function updatePosition() {
    if (!marker._map) return;

    // Coordenadas do marcador *em relação ao contêiner do mapa*
    const markerPos = marker._map.latLngToContainerPoint(marker.getLatLng());

    // Posição absoluta do contêiner do mapa na página
    const mapRect = marker._map.getContainer().getBoundingClientRect();

    // Ajuste final (exemplo para cotaBox):
    cotaBox.style.left = `${mapRect.left + markerPos.x - 85}px`;
    cotaBox.style.top = `${mapRect.top + markerPos.y - 10}px`;

    // Repita para vazaoBox e chuvaBox:
    vazaoBox.style.left = `${mapRect.left + markerPos.x - 50}px`;
    vazaoBox.style.top = `${mapRect.top + markerPos.y + 50}px`;

    chuvaBox.style.left = `${mapRect.left + markerPos.x + 47}px`;
    chuvaBox.style.top = `${mapRect.top + markerPos.y - 10}px`;
  }

  marker.on('add', () => {
    marker._map.on('resize fullscreenchange', updatePosition);
  });

  marker.on('remove', () => {
    marker._map.off('resize fullscreenchange', updatePosition);
  });

  // Configura os eventos de mouse
  marker.on('mouseover', () => {
    console.log('[DEBUG] Mouseover no marcador:', marker.stationData.codigoestacao); // Adicione esta linha

    updateBoxes();
    cotaBox.style.display = 'flex';
    vazaoBox.style.display = 'flex';
    chuvaBox.style.display = 'flex';
    updatePosition();
    updateTimer = setInterval(() => {
      updateBoxes();
      updatePosition();
      console.log("Atualizando quadros telemétricos para", marker.stationData.codigoestacao);
    }, 5000);
  });

  marker.on('mouseout', () => {
    cotaBox.style.display = 'none';
    vazaoBox.style.display = 'none';
    chuvaBox.style.display = 'none';
    if (updateTimer) {
      clearInterval(updateTimer);
      updateTimer = null;
    }
  });

  // Se necessário, permita atualização manual
  marker.updateFloatingData = () => {
    updateBoxes();
  };
}
