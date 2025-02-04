import pandas as pd
from datetime import datetime

# Funktion zum Berechnen der Durchschnitte nach Uhrzeit pro Parkhaus für alte Dateien
def calculate_avg_old(input_file, output_file):
    df = pd.read_csv(input_file, header=None)

    # Zeitspalte extrahieren und nur die Uhrzeit beibehalten
    df['time_only'] = pd.to_datetime(df[0]).dt.time

    # Numerische Spalten identifizieren (alles außer erster und Zeitspalte)
    numeric_cols = df.columns[1:-1]

    # Durchschnitt pro Uhrzeit und Parkhaus berechnen
    avg_df = df.groupby(['time_only'])[numeric_cols].mean()

    # Ergebnisse speichern
    avg_df.to_csv(output_file)

# Funktion zum Berechnen der gemischten Werte (inkl. "ges") nach Uhrzeit pro Parkhaus für neue Dateien
def calculate_avg_new(input_file, output_file):
    df = pd.read_csv(input_file, header=None)

    # Zeitspalte extrahieren und nur die Uhrzeit beibehalten
    df['time_only'] = pd.to_datetime(df[0], errors='coerce').dt.time

    # Numerische Spalten identifizieren (alles außer erster und Zeitspalte)
    numeric_cols = df.columns[1:-1]

    # Ergebnisse pro Uhrzeit und Parkhaus vorbereiten
    result = []
    for time, group in df.groupby('time_only'):
        row = {'time_only': time}
        for col in numeric_cols:
            values = group[col]
            numeric_values = values.apply(pd.to_numeric, errors='coerce')
            if (values == 'ges').any() and numeric_values.count() < 3:
                row[col] = 'ges'
            else:
                row[col] = numeric_values.mean()
        result.append(row)

    # DataFrame aus Ergebnissen erstellen und speichern
    result_df = pd.DataFrame(result)
    result_df.to_csv(output_file, index=False)

# Alte und neue Dateien verarbeiten
def process_files():
    files = [
        ("/mnt/data/Monday_alt.csv", "/mnt/data/Monday_alt_avg.csv"),
        ("/mnt/data/Tuesday_alt.csv", "/mnt/data/Tuesday_alt_avg.csv"),
        ("/mnt/data/Wednesday_alt.csv", "/mnt/data/Wednesday_alt_avg.csv"),
        ("/mnt/data/Thursday_alt.csv", "/mnt/data/Thursday_alt_avg.csv"),
        ("/mnt/data/Friday_alt.csv", "/mnt/data/Friday_alt_avg.csv"),
        ("/mnt/data/Saturday_alt.csv", "/mnt/data/Saturday_alt_avg.csv"),
        ("/mnt/data/Sunday_alt.csv", "/mnt/data/Sunday_alt_avg.csv"),
        ("/mnt/data/Monday_neu.csv", "/mnt/data/Monday_neu_avg.csv"),
        ("/mnt/data/Tuesday_neu.csv", "/mnt/data/Tuesday_neu_avg.csv"),
        ("/mnt/data/Wednesday_neu.csv", "/mnt/data/Wednesday_neu_avg.csv"),
        ("/mnt/data/Thursday_neu.csv", "/mnt/data/Thursday_neu_avg.csv"),
        ("/mnt/data/Friday_neu.csv", "/mnt/data/Friday_neu_avg.csv"),
        ("/mnt/data/Saturday_neu.csv", "/mnt/data/Saturday_neu_avg.csv"),
        ("/mnt/data/Sunday_neu.csv", "/mnt/data/Sunday_neu_avg.csv"),
    ]

    # Verarbeiten
    for input_file, output_file in files:
        if 'alt' in input_file:
            calculate_avg_old(input_file, output_file)
        elif 'neu' in input_file:
            calculate_avg_new(input_file, output_file)

# Funktion ausführen
process_files()
