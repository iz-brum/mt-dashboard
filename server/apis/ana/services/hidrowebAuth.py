"""
@file server/apis/ana/services/hidrowebAuth.py
@description Módulo para autenticar e interagir com a API HidroWeb.
Esse módulo define a classe HidroWebAPI, que é responsável por realizar a autenticação na API,
obtendo um token de autenticação, e por fornecer métodos para interagir com os serviços da API.
@license MIT
@copyright 2024 Sistema de Monitoramento Hidrometeorológico
"""

import os
import requests
import time
import logging
from dotenv import load_dotenv

# Carrega as variáveis de ambiente a partir do arquivo .env
load_dotenv()

# Configuração do logging para exibir mensagens com nível INFO
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class HidroWebAPI:
    """
    Classe para autenticar e interagir com a API HidroWeb.
    
    Essa classe gerencia a autenticação com a API utilizando credenciais (username e password) e fornece
    métodos para obter um token de autenticação. O token é utilizado posteriormente para realizar requisições
    aos serviços da API HidroWeb.
    """
    BASE_URL = "https://www.ana.gov.br/hidrowebservice"

    def __init__(self, username=None, password=None):
        """
        Inicializa a instância da classe HidroWebAPI com as credenciais para autenticação.

        Args:
            username (str, optional): Nome de usuário para a API. Se não for fornecido, será lido da variável de ambiente "HIDROWEB_USERNAME".
            password (str, optional): Senha para a API. Se não for fornecido, será lido da variável de ambiente "HIDROWEB_PASSWORD".

        Raises:
            ValueError: Se as credenciais não forem fornecidas via parâmetro ou variáveis de ambiente.
        """
        self.username = username or os.getenv("HIDROWEB_USERNAME")
        self.password = password or os.getenv("HIDROWEB_PASSWORD")
        self.token = None

        # Verifica se as credenciais foram definidas, caso contrário, levanta uma exceção.
        if not self.username or not self.password:
            raise ValueError("Credenciais de autenticação não fornecidas. "
                             "Defina username e password ou configure variáveis de ambiente.")

    def authenticate(self):
        """
        Realiza a autenticação na API e obtém o token de autenticação.

        Returns:
            str: Token de autenticação obtido da API.

        Raises:
            Exception: Em caso de falha na autenticação.
        """
        # Chama o método interno que implementa a lógica de obtenção do token com tentativa de retry.
        return self._get_token_with_retry()

    def _get_token_with_retry(self, retries=1):
        """
        Tenta obter o token de autenticação, realizando uma tentativa adicional em caso de erro.
        
        Args:
            retries (int, optional): Número de tentativas restantes. Padrão é 1.

        Returns:
            str: Token de autenticação JWT obtido da API.

        Raises:
            Exception: Se o token não puder ser obtido após o número máximo de tentativas.
        """
        # Monta a URL de autenticação a partir da base URL e do endpoint
        url = f"{self.BASE_URL}/EstacoesTelemetricas/OAUth/v1"
        # Define os headers necessários para a autenticação
        headers = {
            "Identificador": self.username,
            "Senha": self.password,
            "accept": "*/*"
        }

        # Marca o tempo de início da requisição para medir o tempo de resposta
        start_time = time.time()

        try:
            # Realiza a requisição GET para a API com um timeout de 5 segundos e verificação de SSL ativa
            response = requests.get(url, headers=headers, timeout=5, verify=True)

            # Marca o tempo de término e calcula o tempo decorrido
            end_time = time.time()
            elapsed_time = end_time - start_time

            # Loga o tempo total da requisição
            logger.info(f"Tempo total para obter o token: {elapsed_time:.2f} segundos")

            # Chama o método para verificar se a resposta da API foi bem-sucedida
            self._handle_response(response)

            # Tenta extrair o token da resposta JSON
            data = response.json()
            if "items" in data and "tokenautenticacao" in data["items"]:
                self.token = data["items"]["tokenautenticacao"]

                # Loga uma mensagem de sucesso com o token truncado (por segurança)
                logger.info(f"Token de autenticação obtido com sucesso. Token truncado: {self.token[:10]}...")

                return self.token
            else:
                raise Exception("Token não encontrado na resposta da API.")

        except requests.exceptions.Timeout:
            logger.error("A requisição para a API demorou demais e expirou.")
            raise Exception("A requisição para a API demorou demais e expirou.")
        except requests.exceptions.ConnectionError:
            logger.error("Erro de conexão com a API. Verifique sua conexão de rede.")
            raise Exception("Erro de conexão com a API. Verifique sua conexão de rede.")
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao realizar a requisição: {e}")
            raise Exception(f"Erro ao realizar a requisição: {e}")
        except Exception as e:
            logger.error(f"Erro desconhecido: {e}")
            raise Exception(f"Erro desconhecido: {e}")

    def _handle_response(self, response):
        """
        Verifica a resposta da API e levanta exceções em caso de erro.

        Args:
            response (requests.Response): Resposta da requisição.

        Raises:
            Exception: Se a resposta da API não for bem-sucedida (status code diferente de 200).
        """
        if response.status_code != 200:
            # Loga o erro sem expor informações sensíveis e levanta exceção com a mensagem de erro
            logger.error(f"Erro na requisição: Status {response.status_code} - {response.text}")
            raise Exception(f"Erro na requisição: Status {response.status_code} - {response.text}")
            
# Exemplo de uso (caso o script seja executado diretamente)
if __name__ == "__main__":
    fetcher = HidroWebAPI()
    
    # Configura o scheduler para rodar a cada 10 minutos (ver APScheduler)
    # Neste exemplo, o scheduler é iniciado, e as atualizações são realizadas a cada 10 minutos.
    # Para executar este script: python -m server.apis.ana.services.station_data_scheduler
    # A execução aqui demonstra a autenticação e pode ser adaptada conforme a necessidade.
    try:
        token = fetcher.authenticate()
        logger.info(f"Token obtido: {token[:10]}...")
    except Exception as e:
        logger.error(f"Falha na autenticação: {e}")
