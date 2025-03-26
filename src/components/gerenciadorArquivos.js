// FILE: src/components/gerenciadorArquivos.js

import JSZip from 'jszip';
import { refreshOverlays, applyOverlayStyles } from '#components/layers/controleCamadas.js';

/**
 * Módulo de importação e visualização de arquivos no mapa (Refatorado).
 */

/**
 * @typedef {Object} FileImportConfig
 * @property {FileList} files - Lista de arquivos selecionados pelo usuário.
 * @property {HTMLElement} fileListElement - Elemento do DOM onde serão exibidos os arquivos e barras de progresso.
 * @property {HTMLButtonElement} confirmButton - Botão de confirmação de upload.
 * @property {File[]} uploadedFiles - Array com os arquivos já carregados em memória.
 * @property {boolean} [skipDuplicates] - Se true, arquivos com nome+size repetidos serão ignorados. Default: true.
 */

/**
 * Importa arquivos do sistema e exibe-os em uma lista com barra de progresso.
 * Evita inserir duplicados se 'skipDuplicates' estiver true.
 * 
 * @param {FileImportConfig} config - Objeto de configuração com arquivos, elementos do DOM e lista de arquivos.
 */
export function importFiles(config) {
    const {
        files,
        fileListElement,
        confirmButton,
        uploadedFiles,
        skipDuplicates = true
    } = config;

    if (!files || files.length === 0) {
        console.log('Nenhum arquivo selecionado ou importação cancelada.');
        return;
    }

    Array.from(files).forEach(file => {
        if (skipDuplicates && isDuplicate(file, uploadedFiles)) {
            alert(`O arquivo ${file.name} já foi importado. Ignorando duplicata.`);
            return;
        }

        const fileItemElement = createFileItemElement(file, confirmButton, uploadedFiles);
        fileListElement.appendChild(fileItemElement);

        const reader = new FileReader();
        const progressBar = fileItemElement.querySelector('.file-progress');

        setupFileReaderEvents(reader, file, progressBar, confirmButton, uploadedFiles);
        reader.readAsText(file);
    });
}

/**
 * Verifica se o arquivo já foi importado, comparando nome e tamanho.
 *
 * @param {File} newFile - Arquivo que queremos inserir.
 * @param {File[]} uploadedFiles - Lista de arquivos já carregados.
 * @returns {boolean} True se o arquivo já existe na lista, false caso contrário.
 */
function isDuplicate(newFile, uploadedFiles) {
    return uploadedFiles.some(file =>
        file.name === newFile.name &&
        file.size === newFile.size
    );
}

/**
 * Cria o elemento de lista (DOM) para representar um arquivo.
 *
 * @param {File} file - Arquivo a ser exibido.
 * @param {HTMLButtonElement} confirmButton - Botão de confirmação de upload.
 * @param {File[]} uploadedFiles - Lista de arquivos já armazenados.
 * @returns {HTMLDivElement} Elemento <div> representando o item do arquivo na lista.
 */
function createFileItemElement(file, confirmButton, uploadedFiles) {
    const fileItem = document.createElement('div');
    fileItem.classList.add('file-item');
    fileItem.innerHTML = `
      <span class="file-name">${file.name}</span>
      <progress class="file-progress" value="0" max="100"></progress>
      <span class="file-size">${formatFileSize(file.size)}</span>
      <button class="delete-file-btn">Excluir</button>
    `;
    const deleteButton = fileItem.querySelector('.delete-file-btn');
    deleteButton.addEventListener('click', () => {
        removeUploadedFile(fileItem, file, uploadedFiles, confirmButton);
    });
    return fileItem;
}

/**
 * Configura os eventos do FileReader para ler o arquivo, exibir o progresso e armazená-lo na lista.
 *
 * @param {FileReader} reader - Instância do FileReader para ler o arquivo.
 * @param {File} file - Arquivo que está sendo lido.
 * @param {HTMLProgressElement} progressBar - Barra de progresso associada ao arquivo.
 * @param {HTMLButtonElement} confirmButton - Botão de confirmação de upload.
 * @param {File[]} uploadedFiles - Lista de arquivos já carregados.
 */
function setupFileReaderEvents(reader, file, progressBar, confirmButton, uploadedFiles) {
    reader.onerror = () => {
        console.error(`Erro ao ler o arquivo: ${file.name}`);
        alert('Erro ao ler o arquivo. Tente novamente.');
    };

    reader.onloadstart = () => {
        progressBar.value = 0;
    };

    reader.onprogress = event => {
        if (event.lengthComputable) {
            const percentage = (event.loaded / event.total) * 100;
            progressBar.value = percentage;
        }
    };

    reader.onload = () => {
        uploadedFiles.push(file);
        confirmButton.style.display = 'block';
    };
}

/**
 * Formata o tamanho do arquivo de bytes para kilobytes (KB) com 2 casas decimais.
 *
 * @param {number} size - Tamanho do arquivo em bytes.
 * @returns {string} Tamanho formatado em KB.
 */
function formatFileSize(size) {
    const sizeInKB = size / 1024;
    return `${sizeInKB.toFixed(2)} KB`;
}

/**
 * Remove o item do arquivo da lista exibida e do array de arquivos carregados.
 *
 * @param {HTMLDivElement} fileItemElement - Elemento do DOM representando o arquivo na lista.
 * @param {File} file - Arquivo a ser removido.
 * @param {File[]} uploadedFiles - Lista de arquivos armazenados.
 * @param {HTMLButtonElement} confirmButton - Botão de confirmação de upload.
 */
export function removeUploadedFile(fileItemElement, file, uploadedFiles, confirmButton) {
    fileItemElement.remove();
    const fileIndex = uploadedFiles.indexOf(file);
    if (fileIndex !== -1) {
        uploadedFiles.splice(fileIndex, 1);
    }
    if (uploadedFiles.length === 0) {
        confirmButton.style.display = 'none';
    }
}

/**
 * Adiciona um arquivo ao mapa de acordo com sua extensão.
 *
 * @param {File} file - Arquivo a ser adicionado ao mapa.
 * @param {L.Map} map - Instância do Leaflet Map.
 * @param {L.Control.Layer} [layerControl] - Controle de camadas (opcional).
 */
export async function renderFileOnMap(file, map, layerControl) {
    const fileExtension = extractFileExtension(file.name);
    const reader = new FileReader();

    reader.onload = async event => {
        try {
            const content = event.target.result;
            console.log(`Conteúdo do arquivo ${file.name}:`, content);

            // Se for KML simples, parseia o XML
            let xmlDoc = null;
            if (fileExtension === 'kml') {
                xmlDoc = parseKMLString(content);
            }

            // Cria a camada principal (p.ex. via omnivore)
            let mainLayer = createLayerFromContent(content, fileExtension);
            if (mainLayer instanceof Promise) {
                mainLayer = await mainLayer;
            }

            // Se mainLayer é null e o arquivo for PNG, simplesmente ignora
            if (!mainLayer && fileExtension === 'png') {
                console.warn("Arquivo PNG ignorado, pois não é camada geoespacial.");
                return;
            }
            // Se mainLayer é null para outros formatos, lança erro
            if (!mainLayer) {
                throw new Error('Falha ao criar camada a partir do arquivo.');
            }

            // Se for KML, vamos extrair também os Placemarks com ícone customizado
            let placemarkGroup = null;
            if (xmlDoc) {
                placemarkGroup = await parsePlacemarks(xmlDoc, null);
            }

            // Combina a camada principal + placemarks num layerGroup final
            const combinedGroup = L.layerGroup();
            combinedGroup.addLayer(mainLayer);
            if (placemarkGroup) {
                combinedGroup.addLayer(placemarkGroup);
            }

            // Cria a entrada no controle de camadas
            const fileKey = file.name.substring(0, file.name.lastIndexOf('.'));
            const newOverlay = { [fileKey]: combinedGroup };
            refreshOverlays(map, newOverlay);

        } catch (error) {
            console.error(`Erro ao processar arquivo ${file.name}:`, error);
            alert(`Erro ao processar arquivo ${file.name}. Verifique o console para mais detalhes.`);
        }
    };

    if (fileExtension === 'kmz') {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
}

/**
 * Função auxiliar que extrai a extensão do arquivo a partir do nome.
 *
 * @param {string} fileName - Nome completo do arquivo.
 * @returns {string} Extensão em minúsculas.
 */
function extractFileExtension(fileName) {
    return fileName.split('.').pop().toLowerCase();
}

function parseGroundOverlay(xmlDoc, zip) {
    const groundOverlay = xmlDoc.getElementsByTagName("GroundOverlay")[0];
    if (!groundOverlay) return null;

    const iconElem = groundOverlay.getElementsByTagName("Icon")[0];
    const hrefElem = iconElem ? iconElem.getElementsByTagName("href")[0] : null;
    if (!hrefElem) {
        throw new Error("GroundOverlay não contém um href válido.");
    }
    const iconHref = hrefElem.textContent.trim();

    const north = parseFloat(groundOverlay.getElementsByTagName("north")[0].textContent);
    const south = parseFloat(groundOverlay.getElementsByTagName("south")[0].textContent);
    const east = parseFloat(groundOverlay.getElementsByTagName("east")[0].textContent);
    const west = parseFloat(groundOverlay.getElementsByTagName("west")[0].textContent);
    const bounds = [[south, west], [north, east]];

    if (iconHref.startsWith("files/")) {
        const imageFileName = iconHref.replace(/^files\//, "");
        const zipEntry = zip.file(`files/${imageFileName}`);
        if (!zipEntry) {
            console.warn(`Arquivo de imagem ${iconHref} não encontrado no KMZ.`);
            return null;
        }
        return zipEntry.async("blob").then(blob => {
            const imageUrl = URL.createObjectURL(blob);
            return L.imageOverlay(imageUrl, bounds);
        });
    } else {
        console.warn(`GroundOverlay aponta para ${iconHref}, que não está dentro do KMZ.`);
        return L.imageOverlay(iconHref, bounds);
    }
}

/**
 * Cria uma camada Leaflet a partir do conteúdo do arquivo, de acordo com sua extensão.
 *
 * @param {string} content - Conteúdo do arquivo.
 * @param {string} extension - Extensão do arquivo.
 * @returns {L.Layer} Camada Leaflet.
 */
function createLayerFromContent(content, extension) {
    switch (extension) {
        case 'json':
        case 'geojson': {
            const geoData = JSON.parse(content);
            return L.geoJSON(geoData);
        }
        case 'kml': {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, 'text/xml');
            if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                throw new Error('KML inválido ou mal formatado');
            }

            // Aqui, sobrescrevemos a forma de ponto para não exibir o ícone default
            const optionsGeoJson = L.geoJson(null, {
                pointToLayer: (feature, latlng) => {
                    // Retorna um círculo sem raio e sem cor (invisível)
                    return L.circleMarker(latlng, {
                        radius: 0,
                        opacity: 0,
                        fillOpacity: 0
                    });
                }
            });

            return omnivore.kml.parse(content, null, optionsGeoJson);
        }
        case 'gpx':
            return new L.GPX(content);
        case 'kmz': {
            return (async () => {
                const zip = await JSZip.loadAsync(content);
                const kmlFileName = Object.keys(zip.files).find(name =>
                    name.toLowerCase().endsWith('.kml')
                );
                if (!kmlFileName) {
                    throw new Error("KMZ file does not contain a KML file.");
                }
                const kmlContent = await zip.file(kmlFileName).async("string");
                console.log("KML extraído do KMZ:", kmlContent);
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(kmlContent, 'text/xml');
                if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                    throw new Error("KML inválido ou mal formatado");
                }

                if (xmlDoc.getElementsByTagName("GroundOverlay").length > 0) {
                    const result = parseGroundOverlay(xmlDoc, zip);
                    if (result instanceof Promise) {
                        return result;
                    }
                    return result;
                }

                return new Promise((resolve, reject) => {
                    const layer = omnivore.kml.parse(kmlContent);
                    layer.on('ready', () => resolve(layer));
                    layer.on('error', err => reject(err));
                });
            })();
        }
        case 'png': {
            // Se quiser simplesmente ignorar:
            alert("Arquivo PNG não é carregado como camada geoespacial. Ignorando...");
            return null; // Retorna nulo ou algo que não quebre o fluxo
        }
        default:
            throw new Error(`Formato de arquivo não suportado: ${extension}`);
    }
}

function parseKMLString(kmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlString, 'text/xml');
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('KML inválido ou mal formatado');
    }
    return xmlDoc;
}

// Ajuste em parsePlacemarks para passar xmlDoc como parâmetro:
// MODIFICAÇÃO EM parsePlacemarks:
async function parsePlacemarks(xmlDoc, zip = null) {
    const placemarks = xmlDoc.getElementsByTagName('Placemark');
    const layers = [];

    for (let i = 0; i < placemarks.length; i++) {
        const placemarkElem = placemarks[i];
        // Agora passamos xmlDoc como terceiro parâmetro
        const layerOrPromise = parseSinglePlacemark(placemarkElem, zip, xmlDoc);
        layers.push(layerOrPromise);
    }

    // Espera todos os Promises e filtra nulos
    const results = await Promise.all(layers);
    const validMarkers = results.filter(Boolean);

    // Agrupa tudo num LayerGroup
    const placemarkGroup = L.layerGroup(validMarkers);
    return placemarkGroup;
}

function parseSinglePlacemark(placemarkElem, zip, xmlDoc) {
    // 1) Verifica se existe <Point> e <coordinates> (caso seja polígono, ignoramos).
    const pointElem = placemarkElem.getElementsByTagName('Point')[0];
    if (!pointElem) return null;

    const coordsElem = pointElem.getElementsByTagName('coordinates')[0];
    if (!coordsElem) return null;
    const coordsText = coordsElem.textContent.trim();
    const [lng, lat] = coordsText.split(',').map(parseFloat);

    // 2) Captura o <name> para usar como rótulo
    const nameElem = placemarkElem.getElementsByTagName('name')[0];
    let labelText = '';
    if (nameElem) {
      labelText = nameElem.textContent.trim();
    }

    // 3) Verifica <gx:Carousel> para imagem do Google Earth
    const carouselHref = getCarouselImageUrl(placemarkElem);

    // 4) Verifica se há <styleUrl> e extrai IconStyle
    let styleHref = null;
    let styleScale = 1.0;
    const styleUrlElem = placemarkElem.getElementsByTagName('styleUrl')[0];
    if (styleUrlElem) {
        let styleUrl = styleUrlElem.textContent.trim();
        if (styleUrl.startsWith('#')) {
            styleUrl = styleUrl.substring(1);
        }
        const styleOrMapElem = findStyleOrStyleMap(xmlDoc, styleUrl);
        if (styleOrMapElem) {
            const { href, scale } = extractIconStyle(styleOrMapElem, xmlDoc);
            styleHref = href;
            styleScale = scale;
        }
    }

    // 5) Decide qual URL de ícone usar (o do style ou do <gx:Carousel>)
    let iconHref = null;
    let iconScale = 1.0;

    if (styleHref && styleHref !== 'default.png') {
        iconHref = styleHref;
        iconScale = styleScale;
    } else if (carouselHref) {
        iconHref = carouselHref;
        iconScale = 1.2;  // se quiser aumentar
    } else {
        iconHref = 'default.png';
    }

    // 6) Se for KMZ + ícone interno "files/..." => extrai do zip
    if (zip && iconHref.startsWith('files/')) {
        return createMarkerFromKMZFile(iconHref, zip, lat, lng, iconScale)
            .then(marker => {
                // **Se tiver <name>, cria tooltip permanente**:
                if (labelText) {
                    marker.bindTooltip(labelText, {
                        permanent: true,
                        direction: 'top'
                    });
                }
                return marker;
            });
    }

    // 7) Se base64 inline => cria ícone base64
    if (iconHref.startsWith('data:image/')) {
        return createMarkerFromBase64(iconHref, lat, lng, iconScale)
            .then(marker => {
                if (labelText) {
                    marker.bindTooltip(labelText, {
                        permanent: true,
                        direction: 'top'
                    });
                }
                return marker;
            });
    }

    // 8) Caso geral => cria marker normal
    const marker = L.marker([lat, lng], {
        icon: L.icon({
            iconUrl: iconHref,
            iconSize: [32 * iconScale, 32 * iconScale]
        })
    });

    // **Se tiver <name>, adiciona tooltip permanente**:
    if (labelText) {
        marker.bindTooltip(labelText, {
            permanent: true,
            direction: 'top'
        });
    }

    return Promise.resolve(marker);
}

function findStyleOrStyleMap(xmlDoc, styleId) {
    // 1) Tenta achar <Style id="styleId"> ou <StyleMap id="styleId">
    let style = xmlDoc.querySelector(`Style[id="${styleId}"], Style[kml\\:id="${styleId}"]`);
    if (style) return style;

    let styleMap = xmlDoc.querySelector(`StyleMap[id="${styleId}"], StyleMap[kml\\:id="${styleId}"]`);
    if (styleMap) return styleMap;

    // 2) Se não achar, tenta <gx:CascadingStyle kml:id="styleId">
    //    e pega o <Style> ou <StyleMap> que estiver dentro dele
    let cascading = xmlDoc.querySelector(`gx\\:CascadingStyle[kml\\:id="${styleId}"]`);
    if (cascading) {
        // O <gx:CascadingStyle> deve conter um <Style> ou <StyleMap> como filho
        let childStyle = cascading.querySelector('Style, StyleMap');
        return childStyle || null;
    }

    // Nada encontrado
    return null;
}


function extractIconStyle(styleElem, xmlDoc) {
    if (!styleElem) return { href: null, scale: 1 };

    if (styleElem.tagName === 'StyleMap') {
        const pairElems = styleElem.getElementsByTagName('Pair');
        for (let i = 0; i < pairElems.length; i++) {
            const keyElem = pairElems[i].getElementsByTagName('key')[0];
            if (keyElem && keyElem.textContent === 'normal') {
                const innerStyleUrl = pairElems[i].getElementsByTagName('styleUrl')[0];
                if (innerStyleUrl) {
                    let innerId = innerStyleUrl.textContent.trim();
                    if (innerId.startsWith('#')) innerId = innerId.substring(1);
                    const realStyle = findStyleOrStyleMap(xmlDoc, innerId);
                    return extractIconStyle(realStyle, xmlDoc);
                }
            }
        }
        return { href: null, scale: 1 };
    }

    const iconStyle = styleElem.getElementsByTagName('IconStyle')[0];
    if (!iconStyle) return { href: null, scale: 1 };

    let href = null;
    let scale = 1.0;

    const scaleElem = iconStyle.getElementsByTagName('scale')[0];
    if (scaleElem) {
        scale = parseFloat(scaleElem.textContent) || 1.0;
    }

    const iconElem = iconStyle.getElementsByTagName('Icon')[0];
    if (iconElem) {
        const hrefElem = iconElem.getElementsByTagName('href')[0];
        if (hrefElem) {
            href = hrefElem.textContent.trim();
        }
    }

    return { href, scale };
}

function createMarkerFromBase64(base64Url, lat, lng, scale) {
    return Promise.resolve(
        L.marker([lat, lng], {
            icon: L.icon({
                iconUrl: base64Url,
                iconSize: [32 * scale, 32 * scale]
            })
        })
    );
}

function createMarkerFromKMZFile(iconHref, zip, lat, lng, scale) {
    const entryName = iconHref.replace(/^files\//, '');
    const zipEntry = zip.file(`files/${entryName}`);
    if (!zipEntry) {
        console.warn(`Imagem ${iconHref} não encontrada no KMZ.`);
        return Promise.resolve(L.marker([lat, lng]));
    }

    return zipEntry.async('blob').then(blob => {
        const imageUrl = URL.createObjectURL(blob);
        return L.marker([lat, lng], {
            icon: L.icon({
                iconUrl: imageUrl,
                iconSize: [32 * scale, 32 * scale]
            })
        });
    });
}

function getCarouselImageUrl(placemarkElem) {
    // Seleciona <gx:Carousel>
    const carouselElem = placemarkElem.querySelector('gx\\:Carousel');
    if (!carouselElem) return null;

    // Seleciona <gx:Image>
    const imageElem = carouselElem.querySelector('gx\\:Image');
    if (!imageElem) return null;

    // Seleciona <gx:imageUrl>
    const imageUrlElem = imageElem.querySelector('gx\\:imageUrl');
    if (!imageUrlElem) return null;

    const imageUrl = imageUrlElem.textContent.trim();

    // Adicione esta verificação para logar se for do earth.usercontent.google.com:
    if (imageUrl.includes('earth.usercontent.google.com/hostedimage')) {
        console.log('Encontrado <gx:imageUrl> do Earth:', imageUrl);
    }

    return imageUrl;
}
