# Ana Map – Sistema de Monitoramento Hidrometeorológico 🌊🗺️

**Ana Map** é uma aplicação avançada para monitoramento hidrológico que integra dados telemétricos e inventário de estações hidrométricas fornecidos pela **Agência Nacional de Águas (ANA)**. Com mapas interativos, atualizações dinâmicas e diversas camadas de classificação, o sistema oferece uma experiência completa para análise ambiental e gestão de recursos hídricos.

---

## 📑 Índice

- [Recursos e Funcionalidades](#recursos-e-funcionalidades)
- [Arquitetura do Projeto](#arquitetura-do-projeto)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Instalação e Configuração](#instalação-e-configuração)
- [Como Executar](#como-executar)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Scheduler](#scheduler)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Documentação e Comentários](#documentação-e-comentários)
- [Contribuição](#contribuição)
- [Licença](#licença)
- [Contato](#contato)

---

## 🚀 Recursos e Funcionalidades

- **Mapas Interativos:** Exibição de mapas com a biblioteca Leaflet, permitindo zoom, pan e controles personalizados.
- **Atualização Dinâmica:** Os dados dos marcadores e popups são atualizados automaticamente sem recarregar a página.
- **Camadas de Classificação:** Agrupamento dos marcadores por:
  - 🏞️ **Rio**
  - ✅ **Status** (Atualizado/Desatualizado)
  - 🌧️ **Chuva**
  - 📏 **Nível (Cota)**
  - 💧 **Vazão**
- **Geocodificação Reversa:** Consulta de informações detalhadas de localização via OpenCage API.
- **Importação de Arquivos:** Suporte para importar arquivos (GeoJSON, JSON, KML, GPX) e renderizá-los no mapa.
- **Animação de Precipitação:** Visualização de precipitação horária com controle de play/pause e atualização de timestamps.
- **Scheduler Automatizado:** Um script Python atualiza periodicamente os dados das estações via API HidroWeb.
- **Logs e Monitoramento:** Sistema robusto de logging para facilitar a depuração e o monitoramento do sistema.

---

## 🏗️ Arquitetura do Projeto

O projeto é organizado em três camadas principais:

1. **Frontend:**  
   - Desenvolvido com Webpack e Leaflet.
   - Gerencia marcadores, popups, controles de camadas, geocodificação e animação de precipitação.
   - Se comunica com a API backend para atualização dinâmica dos dados.

2. **Backend:**  
   - Implementado com Express (Node.js) e fornece endpoints REST para dados das estações.
   - Gerenciado com nodemon durante o desenvolvimento e PM2 em produção.

3. **Scheduler:**  
   - Desenvolvido em Python utilizando APScheduler.
   - Atualiza periodicamente os dados das estações via API HidroWeb e salva os dados em arquivos JSON no diretório `public/data`.

---

## 💻 Tecnologias Utilizadas

- **Linguagens e Frameworks:**
  - **JavaScript (ES6+)** para frontend e backend.
  - **Python** para o scheduler.
  - **Express** – Framework Node.js para o servidor.
  - **Leaflet** – Biblioteca para mapas interativos.
  - **APScheduler** – Agendamento de tarefas no Python.
  - **PM2** – Gerenciamento de processos em produção.
  - **Webpack** – Bundler para assets do frontend.

- **Bibliotecas e Ferramentas:**
  - **Nodemon** – Monitoramento de alterações para desenvolvimento.
  - **dotenv** – Gerenciamento de variáveis de ambiente.
  - **node-fetch / requests** – Realização de requisições HTTP.
  - **concurrent.futures** – Execução paralela no Python.
  - **JSDoc / Docstrings** – Documentação inline do código.
  - **CSS** – Folhas de estilo customizadas (ex.: markerStyles.css, layerControl.css, mapControls.css, importControl.css, rainFallControl.css, style.css).

---

## 🛠️ Instalação e Configuração

### Pré-requisitos

- **Node.js** (>= 16.0.0)
- **npm** (>= 8.0.0)
- **Python** (>= 3.6) – Preferencialmente em um ambiente virtual

### Passos para Instalação

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/ana_map.git
   cd ana_map
   ```

2. **Instale as dependências do Node.js:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**  
   Crie um arquivo `.env` na raiz do projeto com as variáveis necessárias:

4. **Instale as dependências do Python (para o scheduler):**
   Crie e ative um ambiente virtual e instale os pacotes necessários:
   ```bash
   python -m venv venv
   source venv/bin/activate   # No Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

---

## ⚙️ Como Executar

### Frontend

Para iniciar o servidor de desenvolvimento do frontend:
```bash
npm run dev
```
*O navegador será aberto automaticamente com hot-reloading ativado.*

### Backend

Para iniciar o backend em modo de desenvolvimento (usando nodemon):
```bash
npm run backend
```
Para produção, utilize PM2:
```bash
pm2 start ecosystem.config.cjs --only backend --update-env
```

### Scheduler

Para iniciar o scheduler (responsável por atualizar os dados das estações a cada 10 minutos):
```bash
python -m server.apis.ana.services.station_data_scheduler
```
Ou via PM2:
```bash
pm2 start ecosystem.config.cjs --only scheduler --update-env
```

---

## 📚 Documentação e Comentários

- **Documentação Inline:**  
  Todos os módulos JavaScript e Python possuem documentação detalhada utilizando JSDoc (ou docstrings no Python), facilitando a compreensão e a manutenção do código.

- **Comentários:**  
  Cada função e bloco de código possui comentários explicativos que detalham a lógica implementada, tornando o código autossuficiente e de fácil entendimento para novos desenvolvedores.

---

## 🤝 Contribuição

Contribuições são super bem-vindas!  
Para contribuir com o projeto, siga os passos abaixo:

1. Faça um **fork** do repositório.
2. Crie uma branch para sua feature ou correção:
   ```bash
   git checkout -b minha-nova-feature
   ```
3. Realize suas alterações e faça commit:
   ```bash
   git commit -am "Adiciona nova feature X"
   ```
4. Envie sua branch para o repositório remoto:
   ```bash
   git push origin minha-nova-feature
   ```
5. Abra um **Pull Request** descrevendo suas alterações.

---

## 📄 Licença

Este projeto é licenciado sob a [Licença MIT](LICENSE).

---

## 📞 Contato

Para dúvidas, sugestões ou suporte, entre em contato:
- **Email:** seuemail@dominio.com
- **GitHub:** [seu-usuario](https://github.com/seu-usuario)
