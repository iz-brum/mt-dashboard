/** 
*  @file src\utils\ana\marker\marcador.js
*  @description
*/

import { createGeneralMarker } from '#utils/ana/marker/estiloMarcador.js';
import { createPopupContent } from '#utils/ana/marker/conteudoPopup.js';
import { attachPopupToggleEvents } from '#utils/ana/marker/alternarPopup.js';
import { DEFAULT_CONFIG } from '#utils/ana/config.js';
import { attachFloatingPopupEvents } from '#utils/ana/marker/floatingPopup.js';

export function createMarkerFromStation(station, renderer) {
  const lat = parseFloat(station.latitude || station.Latitude);
  const lng = parseFloat(station.longitude || station.Longitude);
  if (isNaN(lat) || isNaN(lng)) {
    console.error('Coordenadas inválidas para a estação:', station);
    return null;
  }

  function getMarkerIcon(stationData) {
    const text = (stationData.chuvaAcumulada !== undefined && stationData.chuvaAcumulada !== null
      ? stationData.chuvaAcumulada.toString()
      : DEFAULT_CONFIG.INVALID_VALUE
    ).substring(0, DEFAULT_CONFIG.MARKER_TEXT_LENGTH);

    return createGeneralMarker(text);
  }

  const icon = getMarkerIcon(station);
  const marker = L.marker([lat, lng], { icon, renderer });

  marker.stationData = station;

  // ✅ Remove listeners antigos antes de adicionar novos
  marker.off('add');
  marker.on('add', () => {
    attachFloatingPopupEvents(marker, DEFAULT_CONFIG);
  });

  // ✅ Função para atualizar o ícone quando os dados mudam
  marker.updateIcon = function () {
    const newIcon = getMarkerIcon(marker.stationData);
    marker.setIcon(newIcon);
  };

  marker.bindPopup(() => {
    const popup = L.DomUtil.create('div');
    createPopupContent(marker.stationData).then(content => {
      popup.innerHTML = content;
      attachPopupToggleEvents(popup);
    });
    return popup;
  }, {
    autoClose: false,
    closeOnClick: false
  });

  // attachFloatingPopupEvents(marker, DEFAULT_CONFIG);

  return marker;
}
