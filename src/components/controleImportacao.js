/**
 * @file src/components/importControl.js
 * @description Módulo responsável por configurar o controle de importação de arquivos no mapa.
 * Esse controle exibe um botão no mapa que, ao ser clicado, abre um modal para seleção e upload de arquivos,
 * os quais serão renderizados no mapa.
 *
 * @module importControl
 */

import { importFiles, renderFileOnMap } from '#components/gerenciadorArquivos.js';

/**
 * Configura o controle de importação no mapa.
 * Adiciona um botão de importação à interface do mapa e gerencia a interação com o modal de upload.
 *
 * @param {L.Map} map - Instância do mapa Leaflet.
 * @param {L.Control.Layers} layerControl - Controle de camadas do mapa (utilizado para renderizar os arquivos importados).
 */
export function setupImportControl(map, layerControl) {
    // Cria um novo controle estendendo L.Control para o botão de importação
    const ImportControl = L.Control.extend({
        options: { position: 'topleft' }, // Define a posição do controle no canto superior esquerdo

        /**
         * Método onAdd é chamado pelo Leaflet quando o controle é adicionado ao mapa.
         * Cria e configura o container e o botão que abrirão o modal de importação.
         *
         * @returns {HTMLElement} Container do controle de importação.
         */
        onAdd: function () {
            // Cria um container com as classes 'leaflet-bar' e 'leaflet-control'
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            // Cria um elemento <a> dentro do container para servir de botão
            const button = L.DomUtil.create('a', '', container);

            // Define o conteúdo HTML do botão (ícone de upload)
            button.innerHTML = '<i class="fa-solid fa-upload"></i>';
            button.href = '#';  // Define o href para '#' para evitar comportamento de link
            button.role = 'button';
            button.setAttribute('aria-label', 'Importar arquivo');

            // Adiciona um event listener para exibir o modal quando o botão for clicado
            L.DomEvent.on(button, 'click', (e) => {
                L.DomEvent.preventDefault(e); // Previna o comportamento padrão do link
                showModal();                  // Chama a função para exibir o modal
            });

            // Impede que cliques no container se propaguem para o mapa
            L.DomEvent.disableClickPropagation(container);

            return container;
        }
    });

    // Variável de controle para garantir que os event listeners do modal sejam inicializados apenas uma vez
    let isModalInitialized = false;

    /**
     * Exibe o modal de importação de arquivos.
     * O modal contém áreas para drag-and-drop, seleção via input e um botão para confirmar o upload.
     */
    function showModal() {
        // Obtém os elementos do modal e seus componentes pelo ID
        const modal = document.getElementById('importModal');
        const dropArea = document.getElementById('dropArea');
        const fileInput = document.getElementById('fileInput');
        const fileSelectButton = document.getElementById('fileSelectButton');
        const confirmButton = document.getElementById('confirmUploadButton');
        const fileList = document.getElementById('fileList');
        const closeModalBtn = document.getElementById('closeModal');

        // Array que armazenará os arquivos carregados
        let uploadedFiles = [];

        // Exibe o modal definindo seu display para 'block'
        modal.style.display = 'block';

        // Inicializa os event listeners do modal apenas na primeira vez em que ele é aberto
        if (!isModalInitialized) {
            attachModalListeners();
            isModalInitialized = true;
        }

        /**
         * Anexa os event listeners necessários aos elementos do modal.
         */
        function attachModalListeners() {
            // Configura os eventos de drag-and-drop para a área de drop
            dropArea.addEventListener('dragover', handleDragOver);
            dropArea.addEventListener('dragleave', handleDragLeave);
            dropArea.addEventListener('drop', handleDrop);

            // Configura o evento de clique no botão para abrir a janela de seleção de arquivos
            fileSelectButton.addEventListener('click', handleFileSelectClick);
            // Configura o evento de mudança no input para detectar arquivos selecionados
            fileInput.addEventListener('change', handleFileChange);

            // Configura o evento do botão "OK" para confirmar o upload dos arquivos
            confirmButton.addEventListener('click', handleConfirmUpload);

            // Configura o botão "X" para fechar o modal
            closeModalBtn.onclick = handleCloseModal;
        }

        /**
         * Handler para o evento 'dragover'.
         * Previna o comportamento padrão e adiciona a classe 'dragover' à área de drop.
         *
         * @param {Event} e - Evento de dragover.
         */
        function handleDragOver(e) {
            e.preventDefault();
            dropArea.classList.add('dragover');
        }

        /**
         * Handler para o evento 'dragleave'.
         * Remove a classe 'dragover' da área de drop.
         */
        function handleDragLeave() {
            dropArea.classList.remove('dragover');
        }

        /**
         * Handler para o evento 'drop'.
         * Previne o comportamento padrão, remove a classe 'dragover' e chama importFiles para processar os arquivos.
         *
         * @param {Event} e - Evento de drop.
         */
        function handleDrop(e) {
            e.preventDefault();
            dropArea.classList.remove('dragover');
            // Chama a função importFiles passando os arquivos do drop e outros parâmetros necessários
            importFiles({
                files: e.dataTransfer.files,
                fileListElement: fileList,
                confirmButton,
                uploadedFiles,
                skipDuplicates: true // Evita a duplicação de arquivos
            });
        }

        /**
         * Handler para o clique no botão de seleção de arquivos.
         * Simula um clique no input de arquivos.
         */
        function handleFileSelectClick() {
            fileInput.click();
        }

        /**
         * Handler para o evento 'change' do input de arquivos.
         * Chama importFiles passando os arquivos selecionados e outros parâmetros necessários.
         *
         * @param {Event} e - Evento de mudança no input.
         */
        function handleFileChange(e) {
            importFiles({
                files: e.target.files,
                fileListElement: fileList,
                confirmButton,
                uploadedFiles,
                skipDuplicates: true
            });
        }

        /**
         * Handler para o clique no botão "OK" do modal.
         * Para cada arquivo carregado, chama renderFileOnMap para renderizá-lo no mapa,
         * e depois limpa a lista e fecha o modal.
         */
        function handleConfirmUpload() {
            uploadedFiles.forEach(file => {
                renderFileOnMap(file, map, layerControl);
            });

            // Limpa a lista de arquivos exibida no modal
            fileList.innerHTML = '';
            // Reinicia o array de arquivos carregados
            uploadedFiles = [];
            // Oculta o botão "OK"
            confirmButton.style.display = 'none';
            // Fecha o modal
            modal.style.display = 'none';
        }

        /**
         * Handler para fechar o modal.
         * Simplesmente oculta o modal definindo seu display para 'none'.
         */
        function handleCloseModal() {
            modal.style.display = 'none';
        }
    }

    // Instancia o controle de importação personalizado e o adiciona ao mapa
    const control = new ImportControl();
    control.addTo(map);
}
