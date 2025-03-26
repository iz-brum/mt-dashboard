import L from 'leaflet';

export class HybridLayer extends L.Layer {
  constructor(clusterLayer, noClusterLayer, isClusterActive = true) {
    super();
    this._clusterLayer = clusterLayer;
    this._noClusterLayer = noClusterLayer;
    this._isClusterActive = isClusterActive;
    this._map = null;
  }

  // Quando a camada é adicionada ao mapa, adiciona a subcamada correta
  onAdd(map) {
    this._map = map;
    if (this._isClusterActive) {
      map.addLayer(this._clusterLayer);
    } else {
      map.addLayer(this._noClusterLayer);
    }
  }

  // Quando removida, remove ambas as subcamadas
  onRemove(map) {
    map.removeLayer(this._clusterLayer);
    map.removeLayer(this._noClusterLayer);
    this._map = null;
  }

  // Alterna entre cluster e noCluster sem remover a camada híbrida do mapa
  setClusterActive(isActive) {
    if (!this._map) return;
    if (this._isClusterActive === isActive) return;
    this._isClusterActive = isActive;
    if (isActive) {
      this._map.removeLayer(this._noClusterLayer);
      this._map.addLayer(this._clusterLayer);
    } else {
      this._map.removeLayer(this._clusterLayer);
      this._map.addLayer(this._noClusterLayer);
    }
  }

  // Adiciona um marcador nas duas versões para que ambas contenham o mesmo conteúdo
  addLayer(layer) {
    this._clusterLayer.addLayer(layer);
    this._noClusterLayer.addLayer(layer);
  }

  // Remove o marcador de ambas as versões
  removeLayer(layer) {
    this._clusterLayer.removeLayer(layer);
    this._noClusterLayer.removeLayer(layer);
  }

  // Limpa ambas as subcamadas
  clearLayers() {
    if (this._clusterLayer.clearLayers) {
      this._clusterLayer.clearLayers();
    }
    if (this._noClusterLayer.clearLayers) {
      this._noClusterLayer.clearLayers();
    }
  }
}
