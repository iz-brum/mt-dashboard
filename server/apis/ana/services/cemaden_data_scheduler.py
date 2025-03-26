import os
import json
import requests
from datetime import datetime, timedelta
from apscheduler.schedulers.blocking import BlockingScheduler
import concurrent.futures

def merge_day_info(antigo, novo):
    """
    Mescla os dados do dia 'novo' com 'antigo', unificando duplicatas
    e retendo sempre a leitura mais 'informativa'.
    Retorna o dicionário final mesclado, pronto para ser salvo.
    """
    existing_data = {}
    for rec in antigo.get("dados", []):
        ts = rec["Data_Hora_Medicao"].strip()
        if ts in existing_data:
            if existing_data[ts]["Chuva_Adotada"] is None and rec["Chuva_Adotada"] is not None:
                existing_data[ts]["Chuva_Adotada"] = rec["Chuva_Adotada"]
        else:
            existing_data[ts] = rec

    cleaned_novo = {}
    for rec in novo.get("dados", []):
        ts = rec["Data_Hora_Medicao"].strip()
        if ts in cleaned_novo:
            if cleaned_novo[ts]["Chuva_Adotada"] is None and rec["Chuva_Adotada"] is not None:
                cleaned_novo[ts]["Chuva_Adotada"] = rec["Chuva_Adotada"]
        else:
            cleaned_novo[ts] = rec

    for ts, rec in cleaned_novo.items():
        if ts not in existing_data:
            existing_data[ts] = rec
        else:
            if rec["Chuva_Adotada"] is not None:
                existing_data[ts]["Chuva_Adotada"] = rec["Chuva_Adotada"]

    merged_list = list(existing_data.values())
    merged_list.sort(key=lambda x: x["Data_Hora_Medicao"])

    total_chuva = 0.0
    for item in merged_list:
        val = 0.0
        if item["Chuva_Adotada"] is not None:
            try:
                val = float(item["Chuva_Adotada"])
            except:
                pass
        total_chuva += val

    antigo["dados"] = merged_list
    antigo["chuvaAcumulada"] = f"{total_chuva:.2f}" if total_chuva > 0 else "0.00"

    return antigo


def fetch_station_data(station_id):
    """Obtém o JSON direto da API do Cemaden com timeout aumentado."""
    url = f"https://mapservices.cemaden.gov.br/MapaInterativoWS/resources/horario/{station_id}/24"
    try:
        # Timeout aumentado para 90 segundos
        resp = requests.get(url, timeout=90)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"Erro ao buscar dados para {station_id}: {e}")
        return None


def process_cemaden_data(data, station_id):
    """
    Processa o JSON de uma estação e separa, dia a dia, apenas as horas que pertencem a cada data.
    Retorna uma lista de estruturas, cada qual representando um dia.
    Converte as horas para UTC-3 (subtraindo 3 horas).
    """
    if not data or not isinstance(data, dict):
        return []

    datas = data.get("datas", [])
    horarios = data.get("horarios", [])
    acumulados_list = data.get("acumulados", [])
    estacao_info = data.get("estacao", {})

    cod_estacao = estacao_info.get("codEstacao", str(station_id))

    if not datas or not horarios or not acumulados_list:
        return []

    try:
        starting_hour = int(horarios[0].replace("h", ""))
    except:
        starting_hour = 0

    resultados = []

    for i, dt_str in enumerate(datas):
        try:
            date_obj = datetime.strptime(dt_str, "%d/%m/%Y")
            date_str = date_obj.strftime("%Y-%m-%d")
        except:
            print(f"Data inválida: {dt_str}")
            continue

        if i >= len(acumulados_list):
            continue

        acumulados = acumulados_list[i]
        registros = []
        total_chuva = 0.0

        for j, hora_str in enumerate(horarios):
            try:
                hora_n = int(hora_str.replace("h", ""))
            except:
                hora_n = 0

            if j >= len(acumulados):
                continue

            valor_chuva_raw = acumulados[j]
            if valor_chuva_raw is not None:
                try:
                    chuva_val = float(valor_chuva_raw)
                    chuva_str = f"{chuva_val:.2f}"
                except:
                    chuva_val = 0.0
                    chuva_str = None
            else:
                chuva_val = 0.0
                chuva_str = None

            if i == 0:
                if starting_hour <= hora_n <= 23:
                    dt_naive = date_obj.replace(hour=hora_n)
                    dt_medicao = (dt_naive - timedelta(hours=3)).strftime("%Y-%m-%d %H:%M:%S.0")
                    registros.append({
                        "Chuva_Adotada": chuva_str,
                        "Data_Hora_Medicao": dt_medicao
                    })
                    total_chuva += chuva_val
            else:
                if 0 <= hora_n < starting_hour or (j == len(horarios) - 1 and hora_n == starting_hour):
                    dt_naive = date_obj.replace(hour=hora_n)
                    dt_medicao = (dt_naive - timedelta(hours=3)).strftime("%Y-%m-%d %H:%M:%S.0")
                    registros.append({
                        "Chuva_Adotada": chuva_str,
                        "Data_Hora_Medicao": dt_medicao
                    })
                    total_chuva += chuva_val

        registros.sort(key=lambda x: x["Data_Hora_Medicao"])

        resultados.append({
            "idestacao": str(station_id),
            "codigoestacao": cod_estacao,
            "data": date_str,
            "chuvaAcumulada": f"{total_chuva:.2f}" if total_chuva > 0 else "0.00",
            "dados": registros
        })

    return resultados


def save_by_date(results):
    for day_info in results:
        data_str = day_info["data"]
        cod_estacao = day_info["codigoestacao"] or day_info["idestacao"]

        year, month, day = data_str.split("-")
        dir_path = os.path.join("public", "data", year, month, data_str)
        os.makedirs(dir_path, exist_ok=True)

        filename = os.path.join(dir_path, f"codigoestacao_{cod_estacao}.json")

        if os.path.exists(filename):
            with open(filename, "r", encoding="utf-8") as f:
                antigo = json.load(f)
        else:
            antigo = {
                "idestacao": day_info["idestacao"],
                "codigoestacao": day_info["codigoestacao"],
                "data": data_str,
                "chuvaAcumulada": None,
                "dados": []
            }

        final_data = merge_day_info(antigo, day_info)

        with open(filename, "w", encoding="utf-8") as f:
            json.dump(final_data, f, ensure_ascii=False, indent=4)
        print(f"Salvo: {filename}")


def process_station(station_id):
    print(f"\nProcessando estação {station_id}...")
    raw_data = fetch_station_data(station_id)
    if raw_data:
        days_info = process_cemaden_data(raw_data, station_id)
        save_by_date(days_info)
    else:
        print(f"Nenhum dado retornado para {station_id}.")


def update_stations_data():
    """
    Realiza o ciclo completo de:
      1) Obter lista de estações
      2) Para cada estação, buscar dados (em paralelo, 5 por vez)
      3) Processar e salvar os dados
    """
    station_ids = [
        7883, 7884, 7885, 7886, 7887, 7888, 7889, 7890, 7891, 7892,
        7893, 7894, 7895, 7896, 7897, 7898, 7899, 7900, 7901, 7902,
        7903, 7904, 7905, 7907, 8753
    ]
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(process_station, sid): sid for sid in station_ids}
        for future in concurrent.futures.as_completed(futures):
            sid = futures[future]
            try:
                future.result()
            except Exception as e:
                print(f"Erro ao processar a estação {sid}: {e}")


def main():
    """Inicia um scheduler que chama update_stations_data a cada 10 minutos."""
    scheduler = BlockingScheduler()
    scheduler.add_job(update_stations_data, 'interval', minutes=10, next_run_time=datetime.now())
    print("Scheduler iniciado. Atualizações a cada 10 minutos.")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        print("Scheduler interrompido.")


if __name__ == "__main__":
    main()


# Instrução para executar este script:
# python server\apis\ana\services\cemaden_data_scheduler.py
