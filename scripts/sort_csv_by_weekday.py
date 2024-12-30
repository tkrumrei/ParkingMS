import os
import pandas as pd
from datetime import datetime

def sort_csv_by_weekday(folder_path):
    # Dictionary zur Speicherung der Daten nach Wochentag
    weekday_data = {"Monday": [], "Tuesday": [], "Wednesday": [], "Thursday": [], "Friday": [], "Saturday": [], "Sunday": []}

    # Alle CSV-Dateien im Ordner durchgehen
    for file_name in os.listdir(folder_path):
        if file_name.endswith(".csv"):
            file_path = os.path.join(folder_path, file_name)

            # CSV-Datei einlesen
            df = pd.read_csv(file_path)

            # Datum aus dem Dateinamen extrahieren
            try:
                date_part = os.path.splitext(file_name)[0]
                date_obj = datetime.strptime(date_part, "%Y-%m-%d")

                # Wochentag bestimmen
                weekday = date_obj.strftime("%A")

                # Daten zur entsprechenden Liste hinzufügen
                weekday_data[weekday].append(df)
            except ValueError as e:
                print(f"Fehler beim Verarbeiten von {file_name}: {e}")

    # Pro Wochentag eine zusammengeführte CSV-Datei speichern
    for weekday, data_frames in weekday_data.items():
        if data_frames:  # Überprüfen, ob es Daten für den Wochentag gibt
            combined_df = pd.concat(data_frames, ignore_index=True)
            output_file = os.path.join(folder_path, f"{weekday}.csv")
            combined_df.to_csv(output_file, index=False)
            print(f"Datei für {weekday} gespeichert: {output_file}")

if __name__ == "__main__":
    folder_path = input("Geben Sie den Pfad zum Ordner mit den CSV-Dateien ein: ").strip()
    if os.path.isdir(folder_path):
        sort_csv_by_weekday(folder_path)
    else:
        print("Der angegebene Pfad ist kein gültiger Ordner.")
