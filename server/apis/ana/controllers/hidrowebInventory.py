"""
@file server\apis\ana\controllers\hidrowebInventory.py
@description Este script facilita a interação com a API HidroWeb da Agência Nacional de Águas (ANA),
permitindo a consulta ao inventário de estações hidrométricas. O inventário contém informações detalhadas 
sobre localização, tipos de sensores, dados de telemetria, qualidade da água, piezometria, pluviometria, sedimentos, 
e outros parâmetros ambientais.

Objetivos Específicos:
1. Autenticar o usuário na API HidroWeb utilizando um token JWT (JSON Web Token).
2. Consultar o inventário de uma estação hidrométrica específica, com base no código da estação.
3. Tratar possíveis erros durante a requisição, como falhas de autenticação, parâmetros inválidos ou problemas de rede.
4. Retornar os dados do inventário no formato JSON, facilitando sua integração com outras aplicações ou análises.
5. Registrar mensagens de log para monitoramento e depuração do processo de consulta.
"""

# Importação de módulos necessários
import os                         # Para interação com o sistema operacional e acesso a variáveis de ambiente.
import requests                   # Biblioteca para realizar requisições HTTP.
from dotenv import load_dotenv    # Para carregar variáveis de ambiente de um arquivo .env.
import logging                    # Para registro de mensagens de log (INFO, WARNING, ERROR, etc.).
# from apis.ana.hidrowebAuth import HidroWebAPI  # Importa a classe para autenticação na API HidroWeb.
from apis.ana.services.hidrowebAuth import HidroWebAPI
import time                       # Para manipulação de tempo, utilizado para medir o tempo de execução e delays.

# Carrega as variáveis de ambiente do arquivo .env.
load_dotenv()

# Configuração de logging: define o nível INFO e o formato das mensagens.
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HidroWebInventory:
    """
    Classe para interagir com a API HidroWeb e obter o inventário de estações hidrométricas.
    
    Esta classe encapsula a lógica necessária para autenticar e consultar o inventário de uma estação específica.
    O inventário contém informações detalhadas sobre a estação, como localização, tipos de sensores e dados disponíveis.
    
    Atributos:
        BASE_URL (str): URL base da API HidroWeb.
        token (str): Token de autenticação JWT utilizado para acessar a API.
    """
    BASE_URL = "https://www.ana.gov.br/hidrowebservice"

    def __init__(self, token=None):
        """
        Inicializa a classe com o token de autenticação.
        
        Args:
            token (str, optional): Token de autenticação JWT.
                Se o token não for fornecido, ele será obtido automaticamente utilizando a classe HidroWebAPI.
        
        Raises:
            ValueError: Se o token não puder ser obtido após as tentativas de autenticação.
        """
        # Obtém o token utilizando a classe HidroWebAPI se não for fornecido
        self.token = token or self.HidroWebAPI().authenticate()
        
        if not self.token:
            raise ValueError("Token de autenticação não fornecido. Autentique primeiro.")

    def fetch_station_inventory(self, station_code):
        """
        Obtém o inventário completo de uma estação cadastrada na base Hidro.
        
        Args:
            station_code (str): Código da estação a ser consultada.
        
        Returns:
            dict: Dados do inventário da estação. Se nenhum dado for encontrado, retorna uma estrutura com 
                  status 'OK' e a mensagem 'Nenhum dado encontrado', sem considerá-lo um erro.
        
        Raises:
            Exception: Em caso de erro na consulta, como problemas de rede, autenticação ou parâmetros inválidos.
        """
        # Constrói a URL completa para a requisição à API HidroWeb para consultar o inventário
        url = f"{self.BASE_URL}/EstacoesTelemetricas/HidroInventarioEstacoes/v1"
        
        # Define os cabeçalhos da requisição, incluindo o token de autenticação no formato Bearer
        headers = {
            "Authorization": f"Bearer {self.token}",
            "accept": "*/*"
        }
        
        # Define os parâmetros da requisição, utilizando o código da estação
        params = {"Código da Estação": station_code}

        try:
            # Realiza a requisição GET à API com um timeout de 5 segundos
            response = requests.get(url, headers=headers, params=params, timeout=5)
            
            # Verifica a resposta da API e trata possíveis erros (status code diferente de 200)
            self._handle_response(response)
            
            # Tenta extrair os dados do inventário a partir do campo "items" na resposta JSON
            data = response.json().get("items", [])
            
            # Se a lista "items" estiver vazia, retorna uma estrutura com status OK e mensagem de ausência de dados
            if not data:
                logger.info(f"Nenhum dado encontrado para a estação {station_code}, mas não é considerado erro.")
                return {"status": "OK", "message": "Nenhum dado encontrado", "items": []}
            
            return data

        except requests.RequestException as e:
            logger.error(f"Erro ao buscar inventário da estação {station_code}: {e}")
            raise Exception(f"Erro ao buscar inventário da estação {station_code}: {e}")
        except Exception as e:
            logger.error(f"Erro desconhecido ao buscar inventário: {e}")
            raise Exception(f"Erro desconhecido ao buscar inventário: {e}")

    def _handle_response(self, response):
        """
        Verifica a resposta da API e levanta exceções em caso de erro.
        
        Este método analisa o código de status da resposta. Se o status não for 200,
        ele levanta uma exceção com uma mensagem adequada, tratando casos específicos como:
          - 401: Erro de autenticação.
          - 406: Parâmetro ou informação não aceito.
          - 417: Expectativa falhou.
          - 500: Erro no servidor.
          - Outros: Erro genérico de requisição.
        
        Args:
            response (requests.Response): Objeto de resposta da requisição HTTP.
        
        Raises:
            Exception: Com mensagem detalhada de acordo com o código de status da resposta.
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

# OBSERVAÇÃO:
# Se este script for executado diretamente, é possível testar a autenticação.
if __name__ == "__main__":
    fetcher = HidroWebInventory()
    try:
        token = fetcher.authenticate()  # Tenta autenticar e obter o token
        logger.info(f"Token obtido: {token[:10]}...")  # Exibe o token truncado para segurança
    except Exception as e:
        logger.error(f"Falha na autenticação: {e}")
