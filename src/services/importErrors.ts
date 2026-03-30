export function getImportErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    switch (error.message) {
      case "UNSUPPORTED_FORMAT":
        return "Format non supporté. Merci d'importer un fichier .csv ou .xlsx";

      case "XLSX_UNAVAILABLE":
        return "Import XLSX indisponible : la librairie Excel n'est pas chargée.";

      case "EMPTY_FILE":
      case "FILE_READ_ERROR":
        return "Erreur de lecture du fichier.";

      default:
        return "Impossible de lire ce fichier.";
    }
  }

  return "Impossible de lire ce fichier.";
}
