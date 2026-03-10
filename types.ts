
export interface DeclarationRow {
  docId: string; // ID de la declaración
  fileName: string;
  c42: string; // Manifiesto
  c44: string; // Doc T
  c51: string; // FACTURA
  c54: number;
  c55: number;
  c58: number;
  c59: number;
  c66: number;
  c70: number;
  c71: number; // P.BRUTO
  c72: number; // P.NETO
  c73: string; // EMBALAJE (Código de texto)
  c74: number;
  c77: number; // CANT.
  c78: number; // FOB
  c82: number; // SUM.G
  c134: string; // LEVANTE
  preview?: string;
}

export interface ExtractionResult {
  declarations: DeclarationRow[];
  summary: string;
}

export interface DocFile {
  file: File;
  preview: string;
  base64: string;
  mimeType: string;
}
