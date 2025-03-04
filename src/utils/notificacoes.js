/**
 * Exibe uma mensagem de erro visível ao usuário criando dinamicamente um elemento na página.
 *
 * @param {string} message - A mensagem de erro que será exibida.
 */
export function showError(message) {
    // Cria um elemento <div> que atuará como container da mensagem de erro
    const errorDiv = document.createElement('div');
    
    // Define os estilos inline para o container de erro, garantindo que fique fixo, centralizado e visível
    errorDiv.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: #ffe6e6; /* Fundo com tom claro de vermelho */
        border: 1px solid red;
        border-radius: 5px;
        padding: 12px 40px 12px 20px;
        color: red;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        max-width: 80%;
        font-size: 18px;
    `;

    // Cria um elemento <span> para conter o texto da mensagem de erro
    const text = document.createElement('span');
    // Preenche o <span> com a mensagem de erro, prefixada por "Erro:"
    text.textContent = `Erro: ${message}`;

    // Cria um elemento <span> para servir como ícone de fechar (X)
    const closeIcon = document.createElement('span');
    // Define o conteúdo HTML do ícone (entidade HTML para "×")
    closeIcon.innerHTML = '&times;';
    // Define estilos para o ícone, posicionando-o e ajustando seu tamanho para parecer um botão de fechamento
    closeIcon.style.cssText = `
        cursor: pointer;
        font-size: 25px;
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        line-height: 1;
    `;

    // Adiciona um event listener ao ícone para remover o container de erro quando clicado
    closeIcon.addEventListener('click', () => {
        document.body.removeChild(errorDiv);
    });

    // Adiciona os elementos de texto e o ícone de fechar ao container de erro
    errorDiv.appendChild(text);
    errorDiv.appendChild(closeIcon);
    // Insere o container de erro no corpo do documento para que seja exibido
    document.body.appendChild(errorDiv);

    // Define uma função para fechar a mensagem ao pressionar a tecla Esc
    const handleKeyPress = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(errorDiv);
            document.removeEventListener('keydown', handleKeyPress);
        }
    };
    // Adiciona o listener de teclado para monitorar a tecla Esc
    document.addEventListener('keydown', handleKeyPress);
}
