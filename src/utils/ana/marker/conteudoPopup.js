// popupContent.js
import { DataFormatter } from '#utils/formatoData.js';
import { createTelemetricSection } from '#utils/ana/telemetry/secaoTelemetria.js';
import { DEFAULT_CONFIG } from '#utils/ana/config.js';


export async function createPopupContent(station) {
  const staticContent = `
    <div class="popup-container">
      <div class="popup-header">
        <h4>Informações da Estação</h4>
        <span class="toggle-icon">▶</span>
      </div>

      <div class="popup-grid expandable collapsed">
        <div class="data-item">
          <span class="data-label">Estação</span>
          <span class="data-value">${station.Estacao_Nome || DEFAULT_CONFIG.INVALID_VALUE}</span>
        </div>

        <div class="data-item">
          <span class="data-label">Código</span>
          <span class="data-value">${station.codigoestacao || DEFAULT_CONFIG.INVALID_VALUE}</span>
        </div>

        <div class="data-item">
          <span class="data-label">Município</span>
          <span class="data-value">${station.Municipio_Nome || DEFAULT_CONFIG.INVALID_VALUE}</span>
        </div>

        <div class="data-item">
          <span class="data-label">Rio</span>
          <span class="data-value">${station.Rio_Nome || DEFAULT_CONFIG.INVALID_VALUE}</span>
        </div>
        
        <div class="data-item">
          <span class="data-label">Altura</span>
          <span class="data-value">${station.Altitude ? `${station.Altitude} m` : DEFAULT_CONFIG.INVALID_VALUE}</span>
        </div>
        <div class="data-item">
          <span class="data-label">Bacia</span>
          <span class="data-value">${station.Bacia_Nome || DEFAULT_CONFIG.INVALID_VALUE}</span>
        </div>

        <div class="data-item">
          <span class="data-label">Área Drenagem</span>
          <span class="data-value">${DataFormatter.formatArea(station.Area_Drenagem)}</span>
        </div>

        <div class="coordinate-section">
          <div class="data-item">
            <span class="data-label">Latitude</span>
            <span class="data-value">${DataFormatter.formatCoordinate(station.latitude || station.Latitude)}</span>
          </div>

          <div class="data-item">
            <span class="data-label">Longitude</span>
            <span class="data-value">${DataFormatter.formatCoordinate(station.longitude || station.Longitude)}</span>
          </div>
        </div>
      </div>
  `;
  const telemetricContent = await createTelemetricSection(station);

  const fullContent = staticContent + `<div class="telemetric-section">${telemetricContent}</div></div>`;
  return fullContent;
}
