/**
 * @file src/components/geocoding.js
 * @description Módulo para funcionalidades de geocodificação.
 * 
 * Este módulo implementa:
 * - Geocodificação reversa usando a API OpenCage (através de um endpoint local)
 * - Exibição de informações detalhadas de localização em um popup
 * - Manipulação de eventos de clique no mapa para adicionar marcadores removíveis
 * - Configuração do serviço de geocodificação no mapa
 *
 * @requires leaflet                           Sistema de mapas
 * @requires leaflet-control-geocoder          Controle de geocodificação
 */

// Cache para armazenar resultados de geocodificação e evitar requisições repetidas
const cache = {};

// Conjunto para armazenar as coordenadas (como string "lat,lng") dos marcadores já adicionados
const existingMarkers = new Set();

/**
 * Função de debounce para limitar a frequência de execução de uma função.
 * Isso é útil para evitar múltiplas chamadas em sequência (por exemplo, em eventos de clique).
 *
 * @param {Function} func - Função a ser "debounced".
 * @param {number} delay - Tempo de espera em milissegundos antes de executar a função.
 * @returns {Function} - Função debounced que, ao ser chamada, aguardará o delay antes de executar.
 */
const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
};

/**
 * Busca e exibe informações detalhadas de uma localização com base nas coordenadas.
 * Realiza uma requisição para o endpoint de geocodificação (local) e atualiza o conteúdo do popup do marcador.
 *
 * @param {Object} latlng - Objeto com as coordenadas {lat, lng} do ponto selecionado.
 * @param {Object} marker - Instância do marcador Leaflet associado à localização.
 * @param {number} retryCount - Contador de tentativas (para evitar loops infinitos em caso de erro).
 * @returns {Promise<string>} Promise que resolve para o conteúdo formatado (HTML) do popup.
 */
async function exibirInformacoesLocal(latlng, marker, retryCount = 0) {
    // Cria uma chave única baseada nas coordenadas para utilizar no cache
    const key = `${latlng.lat},${latlng.lng}`;
    // Se o resultado já está no cache, retorna-o imediatamente
    if (cache[key]) return cache[key];

    let content = '';

    try {
        // Realiza a requisição para o endpoint local de geocodificação
        const response = await fetch(`http://localhost:3000/api/geocode?lat=${latlng.lat}&lng=${latlng.lng}`);

        // Se a resposta indicar "Too Many Requests", trata a situação para retry
        if (response.status === 429) {
            const errorData = await response.json();
            const error = new Error(errorData.error.message);
            error.code = errorData.error.code;
            error.retryAfter = errorData.error.retryAfter;
            throw error;
        }

        // Se a resposta não for OK, lança um erro com o status
        if (!response.ok) throw new Error(`Request error: ${response.status}`);

        // Converte a resposta em JSON
        const data = await response.json();

        // Se houver resultados, extrai o primeiro resultado e seus componentes
        if (data.results?.[0]) {
            const info = data.results[0];
            const components = info.components;

            // Desestrutura os componentes, utilizando valores padrão caso não existam
            const {
                "ISO_3166-2": stateISO = "n/a",
                city = components.town || components.village || components.county || "Not specified",
                road = components.road || components.highway || components.footway || "Not specified",
                postcode = components.postcode || components.postal_code || "Not available",
                country = components.country || "Not available"
            } = components;

            // Extrai as coordenadas do resultado
            const { lat, lng } = info.geometry || { lat: "n/a", lng: "n/a" };

            // Monta o conteúdo HTML com as informações detalhadas da localização
            content = `
                <div class="geocoding-popup">
                    <div class="geocoding-info-grid">
                        <div class="geocoding-data-item">
                            <span class="geocoding-data-label">ISO 3166-2</span>
                            <span class="geocoding-data-value">${stateISO}</span>
                        </div>
                        
                        <div class="geocoding-data-item">
                            <span class="geocoding-data-label">Cidade</span>
                            <span class="geocoding-data-value">${city}</span>
                        </div>

                        <div class="geocoding-data-item">
                            <span class="geocoding-data-label">Rua</span>
                            <span class="geocoding-data-value">${road}</span>
                        </div>

                        <div class="geocoding-data-item">
                            <span class="geocoding-data-label">CEP</span>
                            <span class="geocoding-data-value">${postcode}</span>
                        </div>

                        <!-- Coordenadas posicionadas na segunda coluna -->
                        <div class="geocoding-data-item">
                            <span class="geocoding-data-label">Latitude</span>
                            <span class="geocoding-data-value">${lat.toFixed(5)}</span>
                        </div>

                        <div class="geocoding-data-item">
                            <span class="geocoding-data-label">Longitude</span>
                            <span class="geocoding-data-value">${lng.toFixed(5)}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Se não houver resultados, define um conteúdo padrão informando que nenhum detalhe foi encontrado
            content = `
                <div class="geocoding-popup">
                    <div class="geocoding-no-data">
                        Nenhum detalhe disponível para esta localização
                    </div>
            `;
        }
    } catch (error) {
        console.error('❌ Erro ao buscar informações:', error);
        let errorMessage;

        // Trata especificamente o erro de "Too Many Requests" com tentativas de retry
        if (error.code === 'TOO_MANY_REQUESTS') {
            if (retryCount < 5) {
                console.warn(`🔄 Tentativa ${retryCount + 1}: Limite de requisições atingido`);

                // Atualiza o popup com uma mensagem de "Aguarde..." durante o retry
                if (marker && marker.getPopup()) {
                    marker.getPopup().setContent(`
                        <div class="geocoding-popup">
                            <div class="geocoding-loading">
                                Aguarde... (Tentativa ${retryCount + 1}/5)
                            </div>
                        </div>
                    `);
                }

                // Aguarda 1 segundo antes de tentar novamente
                await new Promise(resolve => setTimeout(resolve, 1000));
                return exibirInformacoesLocal(latlng, marker, retryCount + 1);
            } else {
                errorMessage = "Erro após várias tentativas. Tente novamente mais tarde.";
            }
        } else if (error.code === 'DAILY_QUOTA_EXCEEDED') {
            errorMessage = "Cota diária esgotada! Tente novamente em 24 horas.";
        } else {
            errorMessage = 'Problema ao carregar dados.';
        }

        // Define o conteúdo de erro a ser exibido no popup
        content = `
            <div class="geocoding-popup">
                <div class="geocoding-error">
                    <strong>⚠️ Erro:</strong> ${errorMessage}
                </div>
        `;
    }

    // Adiciona o botão para remover o marcador no final do conteúdo
    content += `
            <button class="geocoding-remove-btn">Remover Marcador</button>
        </div>
    `;

    // Armazena o conteúdo obtido no cache para as coordenadas especificadas
    cache[key] = content;
    return content;
}

/**
 * Configura o componente de geocodificação e os eventos relacionados no mapa.
 * Adiciona funcionalidades para geocodificação reversa, criação de marcadores removíveis e
 * gerenciamento de cliques no mapa com debounce.
 *
 * @param {L.Map} map - Instância do mapa Leaflet.
 */
export function setupGeocoding(map) {
    // Cria um popup padrão para exibir os resultados da geocodificação
    const popup = L.popup();

    /**
     * Função para adicionar um marcador removível ao mapa com informações de geocodificação.
     * Verifica se já existe um marcador para as coordenadas informadas e, caso contrário,
     * cria um novo marcador, exibe o popup com o estado "Carregando..." e depois atualiza o conteúdo.
     *
     * @param {Object} latlng - Coordenadas do ponto selecionado.
     */
    const addRemovableMarker = async (latlng) => {
        // Cria uma chave única para as coordenadas
        const key = `${latlng.lat},${latlng.lng}`;

        // Se já existe um marcador para estas coordenadas, não adiciona um novo
        if (existingMarkers.has(key)) {
            return;
        }

        // Cria o marcador no mapa e adiciona ao conjunto de marcadores existentes
        const marker = L.marker(latlng).addTo(map);
        existingMarkers.add(key);

        // Configura o popup do marcador com um estado inicial de "Carregando..."
        marker.bindPopup('Carregando...', {
            autoClose: false,
            closeOnClick: false
        }).openPopup();

        // Busca as informações detalhadas de geocodificação e atualiza o conteúdo do popup
        const content = await exibirInformacoesLocal(latlng, marker); // Passa o marker para atualizar seu popup
        marker.getPopup().setContent(content);

        // Adiciona um event listener ao popup para tratar o clique no botão "Remover Marcador"
        const popupElement = marker.getPopup().getElement();
        if (popupElement) {
            const removeMarkerHandler = (e) => {
                // Verifica se o elemento clicado possui a classe 'geocoding-remove-btn'
                if (e.target.classList.contains('geocoding-remove-btn')) {
                    // Remove o marcador do mapa
                    map.removeLayer(marker);
                    // Remove as coordenadas do conjunto de marcadores existentes
                    existingMarkers.delete(key);
                    // Limpa o cache para essa coordenada
                    delete cache[key];
                    // Remove o event listener para evitar chamadas duplicadas
                    popupElement.removeEventListener('click', removeMarkerHandler);
                }
            };
            popupElement.addEventListener('click', removeMarkerHandler);
        }
    };

    // Configura o controle de geocodificação utilizando o plugin do Leaflet
    const geocoder = L.Control.geocoder({
        defaultMarkGeocode: false,              // Impede o comportamento padrão de marcar o geocode
        position: 'topleft',                    // Posiciona o controle no canto superior esquerdo
        placeholder: 'Buscar endereço...',      // Texto placeholder para o campo de busca
        errorMessage: 'Endereço não encontrado.'// Mensagem de erro personalizada
    }).addTo(map);

    // Evento para geocodificação: quando um endereço é encontrado, centraliza o mapa e adiciona um marcador removível
    geocoder.on('markgeocode', (e) => {
        const latlng = e.geocode.center;
        map.setView(latlng, 9); // Centraliza o mapa no local encontrado com zoom 9
        addRemovableMarker(latlng); // Adiciona um marcador removível na posição encontrada
    });

    // Cria uma versão debounced da função addRemovableMarker para evitar muitas chamadas em sequência
    const debouncedAddMarker = debounce((e) => addRemovableMarker(e.latlng), 300);
    // Associa o evento de clique no mapa à função debounced, para adicionar marcadores com atraso controlado
    map.on('click', debouncedAddMarker);
}
