"""
@file server/apis/ana/services/station_data_scheduler.py
@description Módulo para agendar a busca e atualização dos dados das estações.
Este módulo utiliza o APScheduler para executar, a cada 10 minutos, a atualização dos dados
das estações, buscando os dados via API e salvando-os localmente.
"""

from apscheduler.schedulers.blocking import BlockingScheduler  # Scheduler que bloqueia a thread principal durante a execução dos jobs
from datetime import datetime, timedelta, timezone                 # Utilizado para manipulação de datas e fusos horários
import logging                                                      # Biblioteca para log de informações, avisos e erros
import concurrent.futures                                           # Permite a execução paralela de funções (ThreadPoolExecutor)
import time                                                         # Utilizado para medir o tempo de execução
import json                                                         # Para manipulação e formatação de dados em JSON

from server.apis.ana.services.hidrowebAuth import HidroWebAPI
from server.apis.ana.services.hidrowebStationData import HidroWebStationData    # Módulo para buscar dados de uma estação via API HidroWeb
from server.apis.ana.utils.data_storage import DataStorage             # Módulo para salvar os dados das estações em arquivos

logging.basicConfig(
    level=logging.DEBUG,  # <-- Altera para DEBUG
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class StationDataFetcher:
    """
    Classe responsável por buscar os dados de diversas estações de monitoramento.
    
    A classe gerencia:
      - A lista de códigos das estações a serem atualizadas.
      - A data de busca (atualizada a cada execução).
      - O fuso horário para a data de busca (horário de Brasília, UTC-3).
      - O intervalo de busca (exemplo: 12 horas).
      - A execução paralela das requisições para buscar os dados de cada estação.
    """
    def __init__(self):
        # Lista de códigos das estações a serem atualizadas.
        self.station_codes = [
            "15043000", "15044000", "15044100", "15050001", "15120500", "15121000", "15122000", "15123000", "15123080", "15123100", "15710000", "15720000", "15730000", "15740000", "15748000", "15750500", "15750550", "15750600", "15753900", "15754000", "17090400", "17090500", "17090580", "17090600", "17091030", "17091040", "17091045", "17091047", "17091048", "17091050", "17091080", "17091090", "17091093", "17091095", "17091096", "17091097", "17091098", "17091099", "17091130", "17091150", "17091160", "17091170", "17091180", "17091200", "17091210", "17091300", "17091310", "17091400", "17091410", "17091450", "17091580", "17091600", "17092850", "17092960", "17093010", "17093400", "17093500", "17093600", "17093700", "17093750", "17094000", "17094010", "17094050", "17094400", "17094520", "17094550", "17099500", "17228000", "17229000", "17230000", "17240900", "17250500", "17250550", "17260000", "17270000", "17273100", "17275000", "17275100", "17277300", "17277500", "17280980", "17280990", "17305000", "17307000", "17343000", "17354000", "17354450", "17354700", "17354800", "17354930", "17354950", "17354970", "17355000", "17381100", "17384000", "17385000", "17387000", "17388000", "17389000", "17389500", "17390100", "17393000", "17393500", "17394000", "17395000", "17395900", "17410100", "18407500", "18408000", "18408500", "18409350", "18409600", "18409650", "18415000", "18420000", "18422000", "18422400", "18422480", "18422500", "18422600", "18425200", "18428000", "18435000", "24035000", "24051000", "24055000", "24179090", "24180050", "24180070", "24180080", "24500000", "24653000", "24850000", "26033600", "26033700", "26033750", "26033800", "26033900", "26053100", "26053110", "26054000", "26057000", "26100000", "26130000", "26350000", "66005100", "66005400", "66005600", "66005800", "66005900", "66005950", "66005960", "66010000", "66025000", "66025500", "66028000", "66028500", "66029000", "66029010", "66051000", "66052080", "66052081", "66052500", "66052600", "66052800", "66052900", "66053200", "66064000", "66070004", "66071353", "66071355", "66071360", "66071363", "66071375", "66071380", "66071382", "66071385", "66071390", "66071395", "66071397", "66071450", "66071470", "66125000", "66164600", "66165000", "66170100", "66170500", "66170600", "66171400", "66171500", "66174000", "66201100", "66201200", "66210000", "66240080", "66259650", "66260001", "66260050", "66260110", "66270000", "66280000", "66384000", "66385500", "66386000", "66388000", "66390090", "66400050", "66400060", "66400325", "66400355", "66400360", "66400380", "66400390", "66420000", "66420160", "66420180", "66420250", "66425000", "66425050", "66450010", "66452500", "66453000", "66454800", "66454900", "66489000", "66493000", "66521000", "66522000", "66522100", "66523000", "66525100", "66600000", "66650000", "66710000", "66830000"
        ]  # Códigos das estações para buscar

        # Nome do campo usado para filtrar os dados na API (exemplo: "DATA_LEITURA")
        self.filtro_data = "DATA_LEITURA"
        # Cria um objeto timezone para o fuso de Brasília (UTC-3)
        brasilia_tz = timezone(timedelta(hours=-3))
        self.brasilia_tz = brasilia_tz
        # OBSERVAÇÃO: A data de busca será atualizada a cada execução para refletir a data atual.
        # self.intervalo_busca = "HORA_12"  # Exemplo de intervalo de busca (pode indicar 12 horas)
        self.intervalo_busca = "HORA_12"  # Exemplo de intervalo de busca (pode indicar 12 horas)
        self.max_workers = 12             # Número máximo de threads paralelas para a busca de dados

    def update_data_busca(self):
        self.data_busca = datetime.now(self.brasilia_tz).strftime("%Y-%m-%d")
        print('date: ', self.data_busca)
        # self.data_busca = '2025-02-16'
        # Print (ou log) para confirmar a data de busca
        # print(f"[DEBUG] Data de busca atualizada para: {self.data_busca}")
        logger.debug(f"Data de busca atualizada para: {self.data_busca}")

    def fetch_single_station(self, station_code, token):
        try:
            # Loga no início para saber que está iniciando a busca de determinada estação
            print(f"[INFO] Buscando dados para estacao {station_code}...")
            logger.info(f"Iniciando fetch da estacao {station_code}...")

            station_data_api = HidroWebStationData(token=token)
            data = station_data_api.fetch_station_data(
                station_code=station_code,
                filtro_data=self.filtro_data,
                data_busca=self.data_busca,
                intervalo_busca=self.intervalo_busca
            )

            # Exibe a resposta (cuidado com volume de dados)
            logger.debug(f"Resposta da API para {station_code}: {json.dumps(data, indent=2)}")

            if data and data.get('items') and data['items']:
                DataStorage().save_station_data_to_file(
                    data['items'],
                    self.data_busca,
                    self.intervalo_busca,
                    station_code
                )
                # print(f"[SUCCESS] Dados salvos para {station_code}")
                logger.info(f"Dados salvos para a estacao {station_code}")
                return True
            else:
                print(f"[WARNING] Nenhum dado encontrado para {station_code}")
                logger.warning(f"Nenhum dado encontrado para {station_code}")
                return False

        except Exception as e:
            print(f"[ERROR] Erro ao buscar dados para {station_code}: {str(e)}")
            logger.error(f"Erro ao buscar dados para a estacao {station_code}: {str(e)}")
            return False

    def fetch_all_stations(self):
        # Mensagem para sabermos que o método foi chamado
        print("[INFO] Iniciando atualização de dados de todas as estações...")
        logger.info("Iniciando atualização de dados...")

        self.update_data_busca()
        start_time = time.time()

        try:
            token = HidroWebAPI().authenticate()
            logger.debug("Token de autenticação obtido com sucesso.")

            with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = {
                    executor.submit(self.fetch_single_station, code, token): code 
                    for code in self.station_codes
                }
                success = 0
                for future in concurrent.futures.as_completed(futures):
                    station_code = futures[future]
                    if future.result():
                        success += 1
                    else:
                        print(f"[WARNING] Falha na estacao {station_code}")
                        logger.warning(f"Falha na estacao {station_code}")

            elapsed = time.time() - start_time
            print(f"[INFO] Concluido! {success}/{len(self.station_codes)} estacoes atualizadas em {elapsed:.2f}s")
            logger.info(f"Concluido! {success}/{len(self.station_codes)} estacoes atualizadas. Tempo: {elapsed:.2f}s")

        except Exception as e:
            print(f"[ERROR] Falha crítica na atualização: {str(e)}")
            logger.error(f"Falha critica na atualização: {str(e)}")


if __name__ == "__main__":
    # Instancia a classe de busca de dados para as estações
    fetcher = StationDataFetcher()
    
    # Configura o scheduler (BlockingScheduler) para rodar a cada 10 minutos, utilizando o fuso de Brasília
    scheduler = BlockingScheduler(timezone=fetcher.brasilia_tz)
    # Adiciona uma tarefa agendada para chamar fetch_all_stations a cada 10 minutos
    scheduler.add_job(fetcher.fetch_all_stations, 'interval', minutes=10, next_run_time=datetime.now(fetcher.brasilia_tz))
    
    try:
        logger.info("Agendador iniciado (execucao a cada 10 minutos)...")
        scheduler.start()  # Inicia o scheduler; esse método bloqueia a thread principal
    except (KeyboardInterrupt, SystemExit):
        # Trata interrupções (como Ctrl+C) e encerra o scheduler de forma limpa
        logger.info("Agendador interrompido.")
        scheduler.shutdown()

# Instrução para executar este script:
# python -m server.apis.ana.services.station_data_scheduler
