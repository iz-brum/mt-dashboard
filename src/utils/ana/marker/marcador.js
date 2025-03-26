/** 
 *  @file src/utils/ana/marker/marcador.js
 *  @description Cria o marcador e configura seu popup, além de atualizar o ícone se houver alerta de chuva alta.
 */

import { createMarkerByDynamicClassification } from '#utils/ana/marker/estiloMarcador.js';
import { createPopupContent } from '#utils/ana/marker/conteudoPopup.js';
import { attachPopupToggleEvents } from '#utils/ana/marker/alternarPopup.js';
import { DEFAULT_CONFIG } from '#utils/config.js';
import { attachFloatingPopupEvents } from '#utils/ana/marker/floatingPopup.js';
// Importa a função fetchTelemetricData existente (do secaoTelemetria.js)
import { fetchTelemetricData } from '#utils/ana/marker/secaoTelemetria.js';

function getMarkerIcon(stationData) {
  // Formata o valor de chuva para exibição
  const text = (stationData.chuvaAcumulada !== undefined && stationData.chuvaAcumulada !== null
    ? `${stationData.chuvaAcumulada} mm`
    : DEFAULT_CONFIG.INVALID_VALUE
  ).substring(0, DEFAULT_CONFIG.MARKER_TEXT_LENGTH);

  // Define o extraClass conforme o alerta de chuva
  const extraClass = stationData.highRainAlert ? 'blinking-marker' : '';

  // Usa a classificação de chuva (ou um fallback padrão)
  const classification = stationData.classificacaoChuva || CLASSIFICATION_CONFIG.DEFAULT_CLASSIFICATION;

  // Chama createMarkerByDynamicClassification com o tipo "chuva"
  return createMarkerByDynamicClassification(text, classification, "chuva", extraClass);
}


export function createMarkerFromStation(station, renderer) {
  const lat = parseFloat(station.latitude || station.Latitude);
  const lng = parseFloat(station.longitude || station.Longitude);
  if (isNaN(lat) || isNaN(lng)) {
    console.error('Coordenadas inválidas para a estação:', station);
    return null;
  }

  const icon = getMarkerIcon(station);
  const marker = L.marker([lat, lng], { icon, renderer });
  marker.stationData = station;

  // Garante que o floating popup seja anexado apenas uma vez
  if (!marker._floatingPopupAttached) {
    marker.on('add', () => {
      attachFloatingPopupEvents(marker, DEFAULT_CONFIG);
      // Assim que o marcador for adicionado, verifique se o _icon existe
      if (marker._icon && marker.stationData.highRainAlert) {
        marker._icon.classList.add('blinking-marker');
        ensureBlinking(marker);
      }
    });
    marker._floatingPopupAttached = true;
  }

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

  marker.updateIcon = function () {
    const newIcon = getMarkerIcon(marker.stationData);
    marker.setIcon(newIcon);
    // Reseta a flag para forçar a reanexação dos eventos
    marker._floatingPopupAttached = false;
    if (marker._map) {
      attachFloatingPopupEvents(marker, DEFAULT_CONFIG);
    } else {
      marker.once('add', () => {
        attachFloatingPopupEvents(marker, DEFAULT_CONFIG);
      });
    }
    // Após atualizar o ícone, reforce a classe blinking se necessário
    setTimeout(() => {
      if (marker._icon && marker.stationData.highRainAlert) {
        marker._icon.classList.add('blinking-marker');
        ensureBlinking(marker);
      }
    }, 100);
  };

  function ensureBlinking(marker) {
    if (!marker._icon) return;
    if (marker._blinkObserver) {
      marker._blinkObserver.disconnect();
    }
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          if (marker.stationData.highRainAlert && !marker._icon.classList.contains("blinking-marker")) {
            marker._icon.classList.add("blinking-marker");
          }
        }
      });
    });
    observer.observe(marker._icon, { attributes: true });
    marker._blinkObserver = observer;
  }

  // Atualiza o ícone baseado nos dados históricos (blink)
  fetchTelemetricData(station.codigoestacao)
    .then(data => {
      if (data && data.dados) {
        // Seleciona apenas os últimos 5 registros
        const lastFiveRecords = data.dados.slice(-5);
        // Verifica se algum dos 5 registros tem Chuva_Adotada > 25
        const highRainAlert = lastFiveRecords.some(r => parseFloat(r.Chuva_Adotada) > 25);
        marker.stationData.highRainAlert = highRainAlert;
        marker.updateIcon();
      }
    })
    .catch(err => {
      console.error("Erro ao buscar dados históricos para alerta:", err);
    });


  return marker;
}
