# FILE: server\apis\ana\tests\test_station_data.py

import sys
import os
import time
import concurrent.futures  # Para paralelização
import unittest

# Adiciona o diretório raiz ao sys.path para permitir a importação de apis.ana
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

# Importando a classe HidroWebAPI de autenticação
from server.apis.ana.services.hidrowebAuth import HidroWebAPI  
from server.apis.ana.services.hidrowebStationData import HidroWebStationData  # Importa a classe de dados da estação
from server.apis.ana.utils.data_storage import DataStorage  # Importando a classe DataStorage corretamente

class TestHidroWebStationData(unittest.TestCase):

    def fetch_station_data(self, station_code, filtro_data, data_busca, intervalo_busca, token, retries=2):
        """
        Obtém os dados de uma estação específica usando a API.

        Args:
            station_code (str): Código da estação.
            filtro_data (str): Tipo de filtro na data (ex.: DATA_LEITURA).
            data_busca (str): Data inicial para a busca (formato yyyy-MM-dd).
            intervalo_busca (str): Intervalo de busca (ex.: HORA_2).
            token (str): Token de autenticação.
            
        Returns:
            dict: Dados da estação.

        Raises:
            Exception: Em caso de erro na consulta.
        """
        station_data_api = HidroWebStationData(token=token)  # Passa o token obtido previamente
        try:
            data = station_data_api.fetch_station_data(station_code, filtro_data, data_busca, intervalo_busca)  # Chama o método para buscar os dados da estação
            
            # Verifica se a chave 'items' existe e se contém dados
            if 'items' in data and data['items']:
                return data
            else:
                print(f"Nenhum dado encontrado para a estação {station_code} na data {data_busca}.")
                return None
        except Exception as e:
            if retries > 0:
                print(f"Erro ao buscar dados da estação {station_code}: {e}, tentando novamente... ({retries} tentativas restantes)")
                time.sleep(3)  # Espera 3 segundos antes de tentar novamente
                return self.fetch_station_data(station_code, filtro_data, data_busca, intervalo_busca, token, retries=retries-1)  # Retry
            else:
                print(f"Falha ao buscar dados da estação {station_code} após 3 tentativas")
                return None

    def test_parallel_fetch_station_data(self):
        """Teste para buscar os dados de várias estações de forma paralela"""
        start_time = time.time()  # Marca o tempo de início total
        total_stations = 0  # Contador para as estações que foram consultadas com sucesso
        failed_stations = []  # Lista para armazenar códigos das estações que falharam
        max_stations = 250  # Define o número de estações a serem consultadas (exemplo)
        station_codes = [
            "15043000", "15044000", "15044100", "15050001", "15120500", "15121000", "15122000", "15123000", "15123080", "15123100", "15710000", "15720000", "15730000", "15740000", "15748000", "15750500", "15750550", "15750600", "15753900", "15754000", "17090400", "17090500", "17090580", "17090600", "17091030", "17091040", "17091045", "17091047", "17091048", "17091050", "17091080", "17091090", "17091093", "17091095", "17091096", "17091097", "17091098", "17091099", "17091130", "17091150", "17091160", "17091170", "17091180", "17091200", "17091210", "17091300", "17091310", "17091400", "17091410", "17091450", "17091580", "17091600", "17092850", "17092960", "17093010", "17093400", "17093500", "17093600", "17093700", "17093750", "17094000", "17094010", "17094050", "17094400", "17094520", "17094550", "17099500", "17228000", "17229000", "17230000", "17240900", "17250500", "17250550", "17260000", "17270000", "17273100", "17275000", "17275100", "17277300", "17277500", "17280980", "17280990", "17305000", "17307000", "17343000", "17354000", "17354450", "17354700", "17354800", "17354930", "17354950", "17354970", "17355000", "17381100", "17384000", "17385000", "17387000", "17388000", "17389000", "17389500", "17390100", "17393000", "17393500", "17394000", "17395000", "17395900", "17410100", "18407500", "18408000", "18408500", "18409350", "18409600", "18409650", "18415000", "18420000", "18422000", "18422400", "18422480", "18422500", "18422600", "18425200", "18428000", "18435000", "24035000", "24051000", "24055000", "24179090", "24180050", "24180070", "24180080", "24500000", "24653000", "24850000", "26033600", "26033700", "26033750", "26033800", "26033900", "26053100", "26053110", "26054000", "26057000", "26100000", "26130000", "26350000", "66005100", "66005400", "66005600", "66005800", "66005900", "66005950", "66005960", "66010000", "66025000", "66025500", "66028000", "66028500", "66029000", "66029010", "66051000", "66052080", "66052081", "66052500", "66052600", "66052800", "66052900", "66053200", "66064000", "66070004", "66071353", "66071355", "66071360", "66071363", "66071375", "66071380", "66071382", "66071385", "66071390", "66071395", "66071397", "66071450", "66071470", "66125000", "66164600", "66165000", "66170100", "66170500", "66170600", "66171400", "66171500", "66174000", "66201100", "66201200", "66210000", "66240080", "66259650", "66260001", "66260050", "66260110", "66270000", "66280000", "66384000", "66385500", "66386000", "66388000", "66390090", "66400050", "66400060", "66400325", "66400355", "66400360", "66400380", "66400390", "66420000", "66420160", "66420180", "66420250", "66425000", "66425050", "66450010", "66452500", "66453000", "66454800", "66454900", "66489000", "66493000", "66521000", "66522000", "66522100", "66523000", "66525100", "66600000", "66650000", "66710000", "66830000"
        ]  # Códigos das estações para buscar

        filtro_data = "DATA_LEITURA"
        data_busca = "2025-02-22"
        intervalo_busca = "HORA_24"

        try:
            # Alteração: Chame diretamente a classe HidroWebAPI para obter o token
            token = HidroWebAPI().authenticate()

            # Usando ThreadPoolExecutor para paralelizar as requisições
            with concurrent.futures.ThreadPoolExecutor(max_workers=12) as executor:
                # Mapeia as estações para a função fetch_station_data, com execução paralela
                futures = {executor.submit(self.fetch_station_data, station_code, filtro_data, data_busca, intervalo_busca, token): station_code for station_code in station_codes[:max_stations]}

                all_station_data = []  # Lista para armazenar os dados de todas as estações

                for future in concurrent.futures.as_completed(futures):
                    station_code = futures[future]  # Obtém o station_code a partir do dicionário de futuras requisições
                    station_data = future.result()
                    if station_data and "items" in station_data:  # Verifica se retornou algum dado e se a chave 'items' existe
                        total_stations += 1
                        # Adiciona os dados da estação à lista
                        all_station_data.append(station_data["items"])
                    else:
                        failed_stations.append(station_code)  # Adiciona o código da estação que falhou

            # Salva todos os dados das estações no arquivo
            data_storage = DataStorage()  # Instancia a classe DataStorage
            for station_data in all_station_data:
                station_code = station_data[0]["codigoestacao"]  # Pega o código da estação a partir dos dados do primeiro item

                data_storage.save_station_data_to_file(station_data, data_busca, intervalo_busca, station_code)

            # Marca o tempo final após o processo completo
            end_time = time.time()
            total_time = end_time - start_time  # Calcula o tempo total de execução
            print(f"Tempo total de execução para {total_stations} estações: {total_time:.2f} segundos")
            print(f"Estações com falha: {failed_stations}")

        except Exception as e:
            self.fail(f"Erro ao buscar dados da estação: {e}")  # Caso ocorra erro, falha no teste

if __name__ == "__main__":
    unittest.main()


# To run the test, use the following command:
# python -m unittest server.apis.ana.tests.test_station_data
