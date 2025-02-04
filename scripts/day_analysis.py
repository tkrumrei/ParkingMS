import pandas as pd
import matplotlib.pyplot as plt
import pandas as pd
from datetime import datetime

dir_path = input("Geben Sie den Pfad zum Ordner mit den CSV-Dateien ein: ").strip()
weekdays = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}


def split_csv_by_date(input_file, output_file_alt, output_file_neu, split_date):
    # Datei einlesen
    df = pd.read_csv(input_file, header=None)

    # Annahme: Die erste Spalte enthält die Zeitstempel
    df[0] = pd.to_datetime(df[0], format="%Y-%m-%d %H:%M:%S")

    # Split der Daten basierend auf dem Datum
    df_alt = df[df[0] < split_date]
    df_neu = df[df[0] >= split_date]

    # Dateien speichern
    df_alt.to_csv(output_file_alt, index=False, header=False)
    df_neu.to_csv(output_file_neu, index=False, header=False)

# Parameter
input_file = '/mnt/data/Sunday.csv'  # Eingabedatei
output_file_alt = '/mnt/data/Sunday_alt.csv'  # Ausgabe alt
output_file_neu = '/mnt/data/Sunday_neu.csv'  # Ausgabe neu
split_date = datetime(2024, 11, 10)  # Stichtag

# Funktion aufrufen
split_csv_by_date(input_file, output_file_alt, output_file_neu, split_date)

print("Dateien wurden erfolgreich erstellt:")
print(f"- Alt: {output_file_alt}")
print(f"- Neu: {output_file_neu}")
