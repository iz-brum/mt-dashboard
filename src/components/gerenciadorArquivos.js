/**
 * @file src\components\fileHandler.js
 * 
 * @module fileHandler
 * Módulo de importação e visualização de arquivos no mapa (Refatorado).
 */

// Constantes para ícones e caminhos
const ICON_BASE_PATH = 'assets/icons/'; // Caminho base para os ícones dos arquivos
const FILE_TYPE_ICONS = {
    geojson: 'geojson.png', // Ícone para arquivos GeoJSON
    json: 'json.png',       // Ícone para arquivos JSON
    kml: 'kml.png',         // Ícone para arquivos KML
    gpx: 'gpx.png',         // Ícone para arquivos GPX
    default: 'file.png'     // Ícone padrão para formatos não reconhecidos
};

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

    // Se nenhum arquivo foi selecionado, loga a informação e encerra a função.
    if (!files || files.length === 0) {
        console.log('Nenhum arquivo selecionado ou importação cancelada.');
        return;
    }

    // Converte a FileList para Array e processa cada arquivo
    Array.from(files).forEach(file => {
        // Verifica duplicidade se a opção skipDuplicates estiver ativa
        if (skipDuplicates && isDuplicate(file, uploadedFiles)) {
            console.warn(`O arquivo ${file.name} já foi importado. Ignorando duplicata.`);
            return;
        }

        // Cria o elemento de lista (DOM) para representar o arquivo e o adiciona ao elemento fileListElement
        const fileItemElement = createFileItemElement(file, confirmButton, uploadedFiles);
        fileListElement.appendChild(fileItemElement);

        // Cria um FileReader para ler o conteúdo do arquivo e exibir o progresso
        const reader = new FileReader();
        // Seleciona a barra de progresso contida no elemento do arquivo
        const progressBar = fileItemElement.querySelector('.file-progress');

        // Configura os eventos do FileReader para atualizar a barra de progresso e armazenar o arquivo
        setupFileReaderEvents(reader, file, progressBar, confirmButton, uploadedFiles);
        // Inicia a leitura do arquivo como texto
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
 * O elemento inclui o nome do arquivo, uma barra de progresso, o tamanho formatado e um botão para excluir.
 *
 * @param {File} file - Arquivo a ser exibido.
 * @param {HTMLButtonElement} confirmButton - Botão de confirmação de upload.
 * @param {File[]} uploadedFiles - Lista de arquivos já armazenados.
 * @returns {HTMLDivElement} Elemento <div> representando o item do arquivo na lista.
 */
function createFileItemElement(file, confirmButton, uploadedFiles) {
    const fileItem = document.createElement('div');
    fileItem.classList.add('file-item');

    // Define o conteúdo HTML do item com o nome do arquivo, barra de progresso, tamanho e botão de exclusão
    fileItem.innerHTML = `
      <span class="file-name">${file.name}</span>
      <progress class="file-progress" value="0" max="100"></progress>
      <span class="file-size">${formatFileSize(file.size)}</span>
      <button class="delete-file-btn">Excluir</button>
    `;

    // Adiciona um listener ao botão de exclusão para remover o arquivo da lista e do array
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
    // Em caso de erro na leitura do arquivo, exibe uma mensagem de erro e alerta o usuário
    reader.onerror = () => {
        console.error(`Erro ao ler o arquivo: ${file.name}`);
        alert('Erro ao ler o arquivo. Tente novamente.');
    };

    // Inicializa a barra de progresso no início da leitura
    reader.onloadstart = () => {
        progressBar.value = 0;
    };

    // Atualiza a barra de progresso conforme o arquivo é lido
    reader.onprogress = event => {
        if (event.lengthComputable) {
            const percentage = (event.loaded / event.total) * 100;
            progressBar.value = percentage;
        }
    };

    // Quando a leitura é concluída, adiciona o arquivo à lista e exibe o botão de confirmação
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
 * Ajusta a visibilidade do botão "OK" se não houver mais arquivos na lista.
 *
 * @param {HTMLDivElement} fileItemElement - Elemento do DOM representando o arquivo na lista.
 * @param {File} file - Arquivo a ser removido.
 * @param {File[]} uploadedFiles - Lista de arquivos armazenados.
 * @param {HTMLButtonElement} confirmButton - Botão de confirmação de upload.
 */
export function removeUploadedFile(fileItemElement, file, uploadedFiles, confirmButton) {
    // Remove o elemento do DOM
    fileItemElement.remove();

    // Encontra o índice do arquivo no array e o remove
    const fileIndex = uploadedFiles.indexOf(file);
    if (fileIndex !== -1) {
        uploadedFiles.splice(fileIndex, 1);
    }

    // Se não houver mais arquivos, oculta o botão de confirmação
    if (uploadedFiles.length === 0) {
        confirmButton.style.display = 'none';
    }
}

/**
 * Adiciona um arquivo ao mapa de acordo com sua extensão (JSON, GEOJSON, KML ou GPX).
 * Lê o arquivo usando FileReader e, quando a leitura é concluída, cria uma camada a partir do seu conteúdo.
 *
 * @param {File} file - Arquivo a ser adicionado ao mapa.
 * @param {L.Map} map - Instância do Leaflet Map.
 * @param {L.Control.Layer} [layerControl] - Controle de camadas (opcional) para adicionar a camada.
 */
export function renderFileOnMap(file, map, layerControl) {
    // Extrai a extensão do arquivo
    const fileExtension = extractFileExtension(file.name);
    const reader = new FileReader();

    reader.onload = event => {
        try {
            // Obtém o conteúdo do arquivo
            const content = event.target.result;
            // Cria uma camada a partir do conteúdo e da extensão
            const layer = createLayerFromContent(content, fileExtension);

            if (!layer) {
                throw new Error('Falha ao criar camada a partir do arquivo.');
            }
            // Adiciona a camada ao mapa e ao controle de camadas (se fornecido)
            addLayerToMap(layer, map, file, layerControl);

        } catch (error) {
            console.error(`Erro ao processar arquivo ${file.name}:`, error);
            alert(`Erro ao processar arquivo ${file.name}. Verifique o console para mais detalhes.`);
            // DEBUG:
            // Erro ao processar arquivo br_mt.json: TypeError: layerControl.addOverlay is not a function
            // at addLayerToMap (fileHandler.js:258:22)
            // at reader.onload (fileHandler.js:187:13)
        }
    };

    // Inicia a leitura do arquivo como texto
    reader.readAsText(file);
}

/**
 * Função auxiliar que extrai o nome e a extensão do arquivo.
 *
 * @param {string} fileName - Nome completo do arquivo.
 * @returns {Object} Objeto contendo 'name' (nome do arquivo sem extensão) e 'extension' (extensão em minúsculas).
 */
const getFileNameParts = (fileName) => {
    const lastDotIndex = fileName.lastIndexOf('.');
    return {
        name: fileName.substring(0, lastDotIndex),
        extension: fileName.substring(lastDotIndex + 1).toLowerCase()
    };
};

/**
 * Cria um HTML para exibir o nome da camada, incluindo um ícone correspondente à extensão do arquivo.
 *
 * @param {string} fileName - Nome do arquivo.
 * @returns {string} HTML contendo o nome da camada e o ícone.
 */
const createLayerNameHTML = (fileName) => {
    const { name, extension } = getFileNameParts(fileName);
    const iconFile = FILE_TYPE_ICONS[extension] || FILE_TYPE_ICONS.default;

    return `
        <span class="layer-name">
            <img src="${ICON_BASE_PATH}${iconFile}" 
                 alt="${extension}" 
                 class="layer-icon"
                 title="Tipo de arquivo: ${extension}">
            ${name}
        </span>
    `;
};

/**
 * Extrai a extensão do arquivo a partir do nome.
 *
 * @param {string} fileName - Nome completo do arquivo.
 * @returns {string} Extensão do arquivo em letras minúsculas.
 */
function extractFileExtension(fileName) {
    return fileName.split('.').pop().toLowerCase();
}

/**
 * Cria uma camada Leaflet a partir do conteúdo do arquivo, de acordo com sua extensão.
 * Suporta os formatos JSON/GeoJSON, KML e GPX.
 *
 * @param {string} content - Conteúdo do arquivo.
 * @param {string} extension - Extensão do arquivo (ex.: "json", "kml", etc.).
 * @returns {L.Layer} Camada Leaflet criada a partir do conteúdo.
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
            return omnivore.kml.parse(content);
        }
        case 'gpx':
            return new L.GPX(content);
        default:
            throw new Error(`Formato de arquivo não suportado: ${extension}`);
    }
}

/**
 * Adiciona uma camada ao mapa e, se fornecido, ao controle de camadas.
 * Após adicionar a camada ao mapa, ajusta o zoom do mapa para os limites da camada, se possível.
 *
 * @param {L.Layer} layer - Camada criada a partir do arquivo.
 * @param {L.Map} map - Instância do mapa Leaflet.
 * @param {File} file - Arquivo que originou a camada.
 * @param {L.Control.Layer} [layerControl] - Controle de camadas (opcional).
 */
function addLayerToMap(layer, map, file, layerControl) {
    // Adiciona a camada ao mapa
    layer.addTo(map);

    // Quando a camada estiver pronta, ajusta o zoom do mapa para se adequar aos limites da camada
    layer.on('ready', function () {
        this.getBounds && map.fitBounds(this.getBounds());
    });

    // Se um controle de camadas foi fornecido, adiciona a camada a ele com um nome formatado
    if (layerControl) {
        const layerNameHTML = createLayerNameHTML(file.name);
        layerControl.addOverlay(layer, layerNameHTML);
    }
}
