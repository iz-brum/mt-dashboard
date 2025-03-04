"""
@file server/apis/ana/services/hidrowebStationData.py
@description Este script facilita a interação com a API HidroWeb da Agência Nacional de Águas (ANA)
para obter dados telemétricos de estações hidrométricas. Esses dados incluem informações como níveis de água
e vazões, essenciais para o monitoramento hidrológico, gestão de recursos hídricos e estudos ambientais.

Objetivos Específicos:
1. Autenticar o usuário na API HidroWeb utilizando um token JWT (JSON Web Token).
2. Consultar dados de uma estação hidrométrica específica, com base em parâmetros como código da estação,
   tipo de filtro de data, data de busca e intervalo de busca.
3. Tratar possíveis erros durante a requisição, como falhas de autenticação, parâmetros inválidos ou problemas de rede.
4. Retornar os dados no formato JSON, facilitando sua integração com outras aplicações ou análises.
5. Registrar mensagens de log para monitoramento e depuração do processo de consulta.
"""

# Importação de módulos necessários
import os                          # Permite interagir com o sistema operacional, por exemplo, para acessar variáveis de ambiente.
import requests                    # Biblioteca para realizar requisições HTTP de forma simples e eficiente.
from dotenv import load_dotenv     # Carrega variáveis de ambiente a partir de um arquivo .env.
import logging                     # Módulo para registrar mensagens de log, útil para depuração e monitoramento.
# from .hidrowebAuth import HidroWebAPI  # Importa a classe de autenticação para interagir com a API HidroWeb.
from .hidrowebAuth import HidroWebAPI
import json                        # Módulo para manipulação de dados no formato JSON.

# Carrega as variáveis de ambiente do arquivo .env.
# Este arquivo é usado para armazenar informações sensíveis, como tokens de autenticação,
# evitando que esses dados sejam hardcoded no código-fonte.
load_dotenv()

# Configuração de logging: define o nível de log para INFO.
logging.basicConfig(level=logging.INFO)

# Cria um logger específico para este módulo, facilitando a identificação da origem das mensagens de log.
logger = logging.getLogger(__name__)

class HidroWebStationData:
    """
    Classe para interagir com a API HidroWeb da Agência Nacional de Águas (ANA) e obter dados telemétricos de estações hidrométricas.

    A API HidroWeb fornece dados telemétricos, como níveis de água e vazões, coletados por estações hidrométricas.
    Esta classe encapsula a lógica necessária para autenticar e consultar os dados de uma estação específica.

    Atributos:
        BASE_URL (str): URL base da API HidroWeb.
        token (str): Token de autenticação JWT (JSON Web Token) necessário para acessar a API.
    """
    # URL base da API HidroWeb.
    BASE_URL = "https://www.ana.gov.br/hidrowebservice"

    def __init__(self, token=None):
        """
        Inicializa a classe com o token de autenticação.

        Args:
            token (str, optional): Token de autenticação JWT.
                Caso o token não seja fornecido, uma exceção será levantada.

        Raises:
            ValueError: Se o token não for fornecido.
        """
        if not token:
            # Levanta um erro se o token não for fornecido, pois é essencial para autenticar as requisições.
            raise ValueError("Token de autenticação não fornecido. Autentique primeiro.")
        
        # Armazena o token para uso nas requisições.
        self.token = token

    def fetch_station_data(self, station_code, filtro_data, data_busca, intervalo_busca):
        """
        Obtém os dados de uma estação hidrométrica específica usando a API HidroWeb.

        Este método faz uma requisição GET à API, passando o código da estação, o tipo de filtro de data,
        a data de busca e o intervalo de busca como parâmetros. Os dados retornados são formatados em JSON.

        Args:
            station_code (str): Código único da estação hidrométrica.
            filtro_data (str): Tipo de filtro de data (ex.: "DATA_LEITURA").
            data_busca (str): Data inicial para a busca no formato "yyyy-MM-dd".
            intervalo_busca (str): Intervalo de busca (ex.: "HORA_2").

        Returns:
            dict: Dados da estação no formato JSON. Se nenhum dado for encontrado, retorna uma estrutura vazia.

        Raises:
            Exception: Se ocorrer um erro durante a requisição, como problemas de rede, autenticação ou parâmetros inválidos.
        """
        # Constrói a URL completa para a requisição à API.
        url = f"{self.BASE_URL}/EstacoesTelemetricas/HidroinfoanaSerieTelemetricaAdotada/v1"
        
        # Define os cabeçalhos da requisição, incluindo o token de autenticação.
        headers = {
            "Authorization": f"Bearer {self.token}",  # Token JWT no formato "Bearer <token>".
            "accept": "*/*"                           # Indica que a resposta deve ser no formato JSON.
        }
        
        # Define os parâmetros da requisição.
        params = {
            "Código da Estação": station_code,
            "Tipo Filtro Data": filtro_data,
            "Data de Busca (yyyy-MM-dd)": data_busca,
            "Range Intervalo de busca": intervalo_busca,
        }

        try:
            # Realiza a requisição GET à API com um timeout de 5 segundos.
            response = requests.get(url, headers=headers, params=params, timeout=5)
            
            # Verifica o status da resposta e trata possíveis erros.
            self._handle_response(response)
            
            # Converte a resposta para JSON.
            data = response.json()
            
            # Exibe os dados retornados pela API no console, formatados para facilitar a depuração.
            print("Dados retornados pela API (formato JSON):", json.dumps(data, ensure_ascii=False, indent=4))
            
            # Se a resposta não contiver dados válidos, retorna uma estrutura vazia com status "OK".
            if "items" not in data or not data["items"]:
                logger.info(f"Nenhum dado encontrado para a estação {station_code}, mas não é considerado erro.")
                return {"status": "OK", "message": "Nenhum dado encontrado", "items": []}

            # Retorna os dados da estação.
            return data

        except requests.RequestException as e:
            logger.error(f"Erro ao buscar dados da estação {station_code}: {e}")
            raise Exception(f"Erro ao buscar dados da estação {station_code}: {e}")

    def _handle_response(self, response):
        """
        Verifica o código de status da resposta e levanta exceções em caso de erro.

        Este método analisa a resposta da API. Se o status não for 200, ele levanta uma exceção apropriada
        com base no tipo de erro (por exemplo, erro de autenticação, parâmetro inválido, erro do servidor, etc.).

        Args:
            response (requests.Response): Resposta da requisição HTTP.

        Raises:
            Exception: Com uma mensagem detalhada de acordo com o código de status da resposta.
        """
        if response.status_code != 200:
            if response.status_code == 401:
                raise Exception(f"Erro de autenticação: Status {response.status_code} - {response.text}")
            elif response.status_code == 406:
                raise Exception(f"Parâmetro ou informação não aceito: Status {response.status_code} - {response.text}")
            elif response.status_code == 417:
                raise Exception(f"Expectativa falhou: Status {response.status_code} - {response.text}")
            elif response.status_code == 500:
                raise Exception(f"Erro inesperado no servidor: Status {response.status_code} - {response.text}")
            else:
                raise Exception(f"Erro na requisição: Status {response.status_code} - {response.text}")
