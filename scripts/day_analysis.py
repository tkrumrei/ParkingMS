import pandas as pd
import matplotlib.pyplot as plt

dir_path = input("Geben Sie den Pfad zum Ordner mit den CSV-Dateien ein: ").strip()
weekdays = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}

# Delete additional data
for weekday in weekdays:
    file_path = f"{dir_path}{weekday}.csv"
    try:
        # CSV-Datei laden
        data = pd.read_csv(file_path, delimiter=",", engine="python", encoding="utf-8")
        
        # Sicherstellen, dass die erste Spalte Datum/Uhrzeit enthält
        data.rename(columns={data.columns[0]: "Datum und Uhrzeit"}, inplace=True)

        # Umwandlung der Datum/Uhrzeit-Spalte in einen datetime-Typ
        data["Datum und Uhrzeit"] = pd.to_datetime(data["Datum und Uhrzeit"], errors="coerce")

        # Entfernen von Zeilen mit ungültigen Datumsangaben
        data = data.dropna(subset=["Datum und Uhrzeit"])

        # Filter: Nur Zeitstempel mit 15-Minuten-Schritten behalten
        data = data[data["Datum und Uhrzeit"].dt.minute.isin([0, 15, 30, 45])]

        # Gefilterte Datei überschreiben
        data.to_csv(file_path, index=False, encoding="utf-8")
        print(f"Gefilterte Daten wurden gespeichert und die Datei wurde überschrieben: {file_path}")

    except Exception as e:
        print(f"Fehler bei der Verarbeitung der Datei: {e}")

    file_path = f"{dir_path}{weekday}.csv"
    output_file = f"{dir_path}{weekday}_Averages.csv"

    try:
        # Daten einlesen
        monday_data = pd.read_csv(file_path)

        # Sicherstellen, dass die erste Spalte Datum/Uhrzeit korrekt ist
        monday_data.rename(columns={monday_data.columns[0]: "Datum und Uhrzeit"}, inplace=True)
        monday_data["Datum und Uhrzeit"] = pd.to_datetime(monday_data["Datum und Uhrzeit"], errors="coerce")

        # Zeit extrahieren für Gruppierung
        monday_data["Time"] = monday_data["Datum und Uhrzeit"].dt.time

        # Nur numerische Spalten für Berechnungen auswählen
        numeric_columns = monday_data.columns[1:-1]  # Ignoriere "Datum und Uhrzeit" und "Time"
        
        # Nicht-numerische Werte in numerischen Spalten bereinigen
        for col in numeric_columns:
            monday_data[col] = pd.to_numeric(monday_data[col], errors="coerce")

        # Gruppierung nach Zeit und Mittelwert berechnen
        average_data = monday_data.groupby("Time")[numeric_columns].mean().round(0).astype(int)

        # Wochentagsspalte hinzufügen
        average_data["Weekday"] = weekday

        # Index zurücksetzen und Datei speichern
        average_data.reset_index(inplace=True)
        average_data.to_csv(output_file, index=False)
        print(f"Die bereinigten Durchschnittswerte wurden gespeichert unter: {output_file}")
    except Exception as e:
        print(f"Fehler bei der Verarbeitung: {e}")

files = [
    f"{dir_path}Monday_Averages.csv",
    f"{dir_path}Tuesday_Averages.csv",
    f"{dir_path}Wednesday_Averages.csv",
    f"{dir_path}Thursday_Averages.csv",
    f"{dir_path}Friday_Averages.csv",
    f"{dir_path}Saturday_Averages.csv",
    f"{dir_path}Sunday_Averages.csv"
]

# Alle Dateien kombinieren
combined_data = pd.concat([pd.read_csv(file) for file in files], ignore_index=True)

# Datei speichern
output_file = f"{dir_path}All_Weekdays_Averages.csv"
combined_data.to_csv(output_file, index=False)
print(f"Die kombinierte Datei wurde gespeichert unter: {output_file}")

data = pd.read_csv(output_file)

# Überprüfen der Header und der ersten Zeilen
print("Spaltennamen:")
print(data.columns.tolist())

print("\nErste Zeilen:")
print(data.head())

# Überprüfen der Wochentage in der Datei
if "Weekday" in data.columns:
    print("\nEindeutige Wochentage:")
    print(data["Weekday"].unique())
else:
    print("\nDie Spalte 'Weekday' fehlt in der Datei.")

# Anzahl der Zeilen überprüfen
print(f"\nGesamtanzahl der Zeilen: {len(data)}")