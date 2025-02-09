setwd("C:/Users/t.krumrein/Downloads")
# Benötigte Bibliotheken laden
library(dplyr)
library(lubridate)
library(readr)
library(tidyr)
library(hms)

load_all_csv <- function(directory) {
  file_list <- list.files(directory, pattern = "*.csv", full.names = TRUE)
  
  data_list <- lapply(file_list, function(file) {
    data <- read_csv(file, show_col_types = FALSE)
    
    # Datum und Uhrzeit in datetime-Format umwandeln
    data <- data %>%
      mutate(`Datum und Uhrzeit` = as.POSIXct(`Datum und Uhrzeit`, format = "%Y-%m-%d %H:%M", tz = "UTC"))
    
    # Alle nicht-numerischen Werte in Parkhaus-Spalten durch NA ersetzen
    numeric_cols <- colnames(data)[-1]  # Alle Spalten außer der ersten (Datum und Uhrzeit)
    data <- data %>%
      mutate(across(all_of(numeric_cols), ~ as.numeric(ifelse(. == "ges", NA, .))))
    
    return(data)
  })
  
  # Alle Dateien zusammenfügen
  data <- bind_rows(data_list)
  return(data)
}

# Daten einlesen (ersetze "your_path" mit dem Pfad zu deinen CSV-Dateien)
directory <- "C:/Users/t.krumrein/Downloads/ParkingMS_data_2024"
data <- load_all_csv(directory)

data <- data %>%
  mutate(
    Datum = as.Date(`Datum und Uhrzeit`),
    Uhrzeit = format(`Datum und Uhrzeit`, "%H:%M"),
    Monat = month(Datum),
    Wochentag = wday(Datum, label = TRUE, abbr = FALSE),
    Minuten = minute(`Datum und Uhrzeit`)  # Minuten extrahieren
  )

data_15min <- data %>%
  filter(Minuten %% 15 == 0)

# Durchschnitt der freien Plätze pro Wochentag, Monat und Intervall berechnen
average_data <- data_15min %>%
  group_by(Monat, Wochentag, Uhrzeit) %>%
  summarise(across(where(is.numeric), ~ as.integer(round(mean(., na.rm = TRUE)))))

average_data <- average_data %>%
  mutate(across(where(is.numeric), ~ replace_na(., 0)))

average_data <- average_data %>%
  select(-Minuten)


oeffnungszeiten <- tribble(
  ~Parkhaus, ~Montag, ~Dienstag, ~Mittwoch, ~Donnerstag, ~Freitag, ~Samstag, ~Sonntag,
  "PH Cineplex", "00:00-24:00", "00:00-24:00", "00:00-24:00", "00:00-24:00", "00:00-24:00", "00:00-24:00", "00:00-24:00",
  "PH Stadthaus 3", "00:00-24:00", "00:00-24:00", "00:00-24:00", "00:00-24:00", "00:00-24:00", "00:00-24:00", "00:00-24:00",
  "PH Coesfelder Kreuz", "geschlossen", "geschlossen", "geschlossen", "geschlossen", "geschlossen", "geschlossen", "geschlossen",
  "PH Alter Steinweg", "00:00-24:00", "00:00-24:00", "00:00-24:00", "00:00-24:00", "00:00-24:00", "00:00-24:00", "00:00-24:00",
  "PP Hörsterplatz", "07:00-22:00", "07:00-22:00", "07:00-22:00", "07:00-22:00", "07:00-22:00", "07:00-22:00", "geschlossen",
  "PH Theater", "07:00-24:00", "07:00-24:00", "07:00-24:00", "07:00-24:00", "07:00-24:00", "07:00-24:00", "09:00-24:00",
  "PH Aegidii", "07:00-24:00", "07:00-24:00", "07:00-24:00", "07:00-24:00", "07:00-24:00", "07:00-24:00", "09:00-24:00",
  "PP Georgskommende", "07:00-21:00", "07:00-21:00", "07:00-21:00", "07:00-21:00", "07:00-21:00", "07:00-21:00", "geschlossen",
  "Busparkplatz", "07:00-21:00", "07:00-21:00", "07:00-21:00", "07:00-21:00", "07:00-21:00", "07:00-21:00", "09:00-21:00",
  "PP Schlossplatz Nord", "07:00-21:00", "07:00-21:00", "07:00-21:00", "07:00-21:00", "07:00-21:00", "07:00-21:00", "09:00-21:00",
  "PP Schlossplatz Süd", "07:00-21:00", "07:00-21:00", "07:00-21:00", "07:00-21:00", "07:00-21:00", "07:00-21:00", "09:00-21:00",
  "PH Bahnhofstraße", "06:00-24:00", "06:00-24:00", "06:00-24:00", "06:00-24:00", "06:00-24:00", "06:00-24:00", "06:00-24:00",
  "PH Bremer Platz", "00:00-24:00", "00:00-24:00", "00:00-24:00", "00:00-24:00", "00:00-24:00", "00:00-24:00", "00:00-24:00",
  "PH Engelenschanze", "07:00-24:00", "07:00-24:00", "07:00-24:00", "07:00-24:00", "07:00-24:00", "07:00-24:00", "07:00-24:00",
  "PH Karstadt", "07:30-20:30", "07:30-20:30", "07:30-20:30", "07:30-20:30", "07:30-20:30", "07:30-20:30", "geschlossen",
  "PH Münster Arkaden", "08:00-23:00", "08:00-23:00", "08:00-23:00", "08:00-23:00", "08:00-23:00", "08:00-23:00", "10:00-23:00",
  "PH Stubengasse", "07:00-24:00", "07:00-24:00", "07:00-24:00", "07:00-24:00", "07:00-24:00", "07:00-24:00", "09:00-24:00"
)

# Funktion zum Prüfen, ob eine Uhrzeit innerhalb der Öffnungszeiten liegt
innerhalb_oeffnungszeiten <- function(parkhaus, uhrzeit, wochentag, wert) {
  zeiten <- oeffnungszeiten %>% filter(Parkhaus == parkhaus) %>% pull(wochentag)
  
  # Falls das Parkhaus 00:00-24:00 geöffnet ist, keine Änderungen notwendig
  if (zeiten == "00:00-24:00") return(wert)
  
  # Falls das Parkhaus an diesem Tag komplett geschlossen ist, immer "ges"
  if (zeiten == "geschlossen") return("ges")  
  
  zeiten <- strsplit(zeiten, "-")[[1]]
  start <- hms::as_hms(paste0(zeiten[1], ":00"))
  ende <- hms::as_hms(paste0(zeiten[2], ":00"))
  aktuelle_zeit <- hms::as_hms(paste0(uhrzeit, ":00"))
  
  # Bedingung: Falls Zeitpunkte innerhalb der Öffnung liegen oder genau auf Öffnungs-/Schlusszeit, bleibt der Wert erhalten
  if (aktuelle_zeit == start | aktuelle_zeit == ende | (aktuelle_zeit > start & aktuelle_zeit < ende)) {
    return(wert)  
  } else {
    return("ges")  # Falls außerhalb der Öffnungszeiten, wird "ges" eingetragen
  }
}

# Öffnungszeiten auf `average_data` anwenden
for (parkhaus in colnames(average_data)[-(1:3)]) {  # Alle Parkhaus-Spalten
  average_data[[parkhaus]] <- mapply(innerhalb_oeffnungszeiten, 
                                     parkhaus, 
                                     average_data$Uhrzeit, 
                                     average_data$Wochentag, 
                                     average_data[[parkhaus]])
}

korrektur_werte <- function(spalte) {
  # Durchlaufe alle Zeilen
  for (i in seq_along(spalte)) {
    # Wenn der aktuelle Wert 0 ist und der vorherige "ges", dann nimm den nächsten gültigen Wert
    if (i > 1 && spalte[i - 1] == "ges" && spalte[i] == 0) {
      # Suche den nächsten gültigen Wert (kein "ges" oder 0)
      naechster_wert <- spalte[(i + 1):length(spalte)][which(spalte[(i + 1):length(spalte)] != "ges" & spalte[(i + 1):length(spalte)] != 0)[1]]
      
      # Aktualisiere den aktuellen Wert, wenn ein gültiger Wert gefunden wurde
      if (!is.na(naechster_wert)) {
        spalte[i] <- naechster_wert
      }
    }
  }
  return(spalte)
}

# Auf alle relevanten Spalten in average_data anwenden
for (parkhaus in colnames(average_data)[-(1:3)]) {  # Überspringe Datum/Uhrzeit-Spalten
  average_data[[parkhaus]] <- korrektur_werte(average_data[[parkhaus]])
}

print(average_data)

calculate_differences <- function(df, parkhaus_columns) {
  # Initialisiere Differenzen-DataFrame
  df_with_diff <- df
  
  for (parkhaus in parkhaus_columns) {
    # Differenz berechnen, wobei "ges" ignoriert wird
    df_with_diff[[paste0(parkhaus, "_Diff")]] <- 0  # Standardwert für Differenzen ist 0
    
    # Schleife über alle Zeilen
    for (i in seq_along(df[[parkhaus]])) {
      # Berechne Differenzen nur, wenn es sich um gültige Werte handelt
      if (i > 1 && 
          df[[parkhaus]][i] != "ges" && df[[parkhaus]][i - 1] != "ges" &&
          !is.na(df[[parkhaus]][i]) && !is.na(df[[parkhaus]][i - 1])) {
        
        # Berechne Differenz
        df_with_diff[[paste0(parkhaus, "_Diff")]][i] <- as.numeric(df[[parkhaus]][i]) - as.numeric(df[[parkhaus]][i - 1])
      }
    }
  }
  
  return(df_with_diff)
}

# Spalten mit den Parkhäusern identifizieren
parkhaus_columns <- colnames(average_data)[-(1:3)]  # Alle außer Monat, Wochentag, Uhrzeit

# Differenzen berechnen
average_data_with_diff <- calculate_differences(average_data, parkhaus_columns)

write_csv(average_data, "average_per_weekday_per_month.csv")
