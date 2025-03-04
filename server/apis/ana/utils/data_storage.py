"""
@file server/apis/ana/utils/data_storage.py
@description Módulo para armazenamento dos dados das estações em arquivos JSON, 
agrupando os registros por data e estação. Os dados são salvos e atualizados conforme 
a data de leitura dos registros, evitando duplicação.
"""

import os
import json
from datetime import datetime

class DataStorage:
    def __init__(self, root_dir='public/data'):
        """
        Inicializa a classe DataStorage com o diretório raiz onde os dados serão armazenados.
        
        @param root_dir: Diretório base para armazenamento dos dados. Default: 'public/data'
        """
        self.root_dir = root_dir

    def save_station_data_to_file(self, all_data, data_busca, intervalo, station_code):
        """
        Salva os dados das estações em arquivos JSON, agrupando-os por data (extraída do campo
        "Data_Hora_Medicao") e estação. Para cada data, o arquivo correspondente é atualizado com
        os registros novos, evitando duplicação.
        
        @param all_data: Lista de registros retornados pela API.
        @param data_busca: Data da busca (geralmente a data corrente), mas aqui não é usado para filtrar,
                           pois cada registro é salvo de acordo com sua própria data.
        @param intervalo: Intervalo usado na busca (apenas para log ou controle, se necessário).
        @param station_code: Código da estação.
        """
        # Agrupa os registros por data, extraindo os 10 primeiros caracteres do campo "Data_Hora_Medicao"
        registros_por_data = {}
        for entry in all_data:
            if "Data_Hora_Medicao" not in entry:
                continue  # Ignora registros sem a data de medição
            # Extrai a data (assumindo formato "YYYY-MM-DD ...")
            record_date = entry["Data_Hora_Medicao"][:10]
            if record_date not in registros_por_data:
                registros_por_data[record_date] = []
            # Remove o campo "codigoestacao" (pois já estará no cabeçalho)
            entry.pop("codigoestacao", None)
            registros_por_data[record_date].append(entry)
        
        # Para cada data encontrada, ordena os registros em ordem crescente (mais antigo primeiro)
        # e salva (ou atualiza) o arquivo correspondente.
        for record_date, registros in registros_por_data.items():
            try:
                registros.sort(key=lambda r: datetime.strptime(r["Data_Hora_Medicao"], "%Y-%m-%d %H:%M:%S.%f"))
            except Exception as e:
                print(f"Erro na ordenação dos registros para {record_date}: {e}")

            year, month, day = record_date.split("-")
            # Define o diretório baseado na data do registro
            directory = os.path.join(self.root_dir, year, month, f'{record_date}')
            if not os.path.exists(directory):
                os.makedirs(directory)
            # Define o caminho do arquivo para essa estação e data
            file_path = os.path.join(directory, f'codigoestacao_{station_code}.json')
            
            # Se o arquivo já existir, carrega os dados existentes e adiciona os registros novos
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r+', encoding='utf-8') as f:
                        try:
                            dados_existentes = json.load(f)
                        except json.JSONDecodeError:
                            dados_existentes = {"codigoestacao": station_code, "data": record_date, "dados": []}
                        
                        # Pega os timestamps já existentes para evitar duplicação
                        timestamps_existentes = {item.get("Data_Hora_Medicao") for item in dados_existentes.get("dados", [])}
                        novos_registros = [r for r in registros if r.get("Data_Hora_Medicao") not in timestamps_existentes]
                        
                        if novos_registros:
                            dados_existentes["dados"].extend(novos_registros)
                            # Ordena os registros existentes em ordem crescente (mais antigo primeiro)
                            try:
                                dados_existentes["dados"].sort(key=lambda r: datetime.strptime(r["Data_Hora_Medicao"], "%Y-%m-%d %H:%M:%S.%f"))
                            except Exception as e:
                                print(f"Erro na ordenação dos dados existentes para {record_date}: {e}")
                            
                            # Verifica se a ordem atual é diferente da ordenada
                            registros_ordenados = sorted(dados_existentes["dados"], key=lambda r: datetime.strptime(r["Data_Hora_Medicao"], "%Y-%m-%d %H:%M:%S.%f"))
                            if registros_ordenados != dados_existentes["dados"]:
                                dados_existentes["dados"] = registros_ordenados
                            
                            f.seek(0)
                            json.dump(dados_existentes, f, ensure_ascii=False, indent=4)
                            f.truncate()
                            print(f"Arquivo atualizado para a estação {station_code} no dia {record_date} com {len(novos_registros)} novos registros.")
                        else:
                            # Mesmo sem novos registros, verifica se a ordem está correta
                            registros_ordenados = sorted(dados_existentes["dados"], key=lambda r: datetime.strptime(r["Data_Hora_Medicao"], "%Y-%m-%d %H:%M:%S.%f"))
                            if registros_ordenados != dados_existentes["dados"]:
                                dados_existentes["dados"] = registros_ordenados
                                f.seek(0)
                                json.dump(dados_existentes, f, ensure_ascii=False, indent=4)
                                f.truncate()
                                print(f"Arquivo reordenado para a estação {station_code} no dia {record_date}.")
                            else:
                                print(f"Nenhum dado novo para a estação {station_code} no dia {record_date}.")
                except Exception as e:
                    print(f"Erro ao salvar os dados no arquivo {file_path}: {e}")
            else:
                # Se o arquivo não existir, cria-o com todos os registros do grupo (já ordenados)
                try:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        novo_registro = {"codigoestacao": station_code, "data": record_date, "dados": registros}
                        json.dump(novo_registro, f, ensure_ascii=False, indent=4)
                    print(f"Arquivo criado para a estação {station_code} no dia {record_date} com {len(registros)} registros.")
                except Exception as e:
                    print(f"Erro ao criar o arquivo {file_path}: {e}")
