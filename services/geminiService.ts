
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult } from "../types";

// Lazy initialization to avoid top-level crashes if API key is missing
let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. AI features will not work.");
    }
    aiInstance = new GoogleGenAI({ apiKey: apiKey || "MISSING_API_KEY" });
  }
  return aiInstance;
}

export async function extractDataFromDocument(
  base64Data: string,
  mimeType: string,
  fileName: string,
  userInstructions: string
): Promise<ExtractionResult> {
  const ai = getAI();
  const model = "gemini-2.5-flash";

  const prompt = `
    Analiza este documento PDF/Imagen que contiene una o varias declaraciones de importación (DIM/Formularios).
    
    INSTRUCCIONES CRÍTICAS DE EXTRACCIÓN:
    1. Identifica TODAS las declaraciones o formularios diferentes que aparezcan en el archivo. Cada uno debe ser una fila independiente.
    2. Extrae la siguiente información técnica para cada declaración, buscando específicamente por el número de casilla y su etiqueta asociada:
       - ID del documento: Número de declaración o DIM (Casilla 1).
       - Casilla 42: Manifiesto de carga.
       - Casilla 44: Documento de Transporte (Doc T).
       - Casilla 51 (FACTURA): ATENCIÓN - Esta casilla puede contener números y letras (alfanumérico). Extrae TODO el contenido de la casilla 51.
       - Casilla 54 (TRANS/TRANSPORTE): Valor numérico.
       - Casilla 55 (BANDERA): Valor numérico.
       - Casilla 58 (T CAMBIO/TIPO DE CAMBIO): Valor numérico.
       - Casilla 59 (SUB/SUBTOTAL): Valor numérico.
       - Casilla 66 (P ORIGEN/PAÍS ORIGEN): Valor numérico.
       - Casilla 70 (P COMPRA/PAÍS COMPRA): Valor numérico.
       - Casilla 71 (P. BRUTO): Valor numérico.
       - Casilla 72 (P. NETO): Valor numérico.
       - Casilla 73 (EMBALAJE/GASTOS EMBALAJE): Código de texto (ej: PK, BX, CT, UN, etc.).
       - Casilla 74 (BULTO): Valor numérico.
       - Casilla 77 (CANTIDAD): Valor numérico.
       - Casilla 78 (FOB): Valor numérico.
       - Casilla 82 (SUM. G / SUMA GASTOS): Valor numérico.
       - Casilla 134 (LEVANTE): Número de levante o autorización (alfanumérico).
    
    3. REGLAS DE FORMATO:
       - Casillas de texto: Extrae el texto tal cual aparece. Si no se encuentra, deja el campo vacío "".
       - Casillas numéricas: Solo el valor numérico (sin símbolos de moneda ni letras). Si no se encuentra o está vacía, usa 0.
       - Si el documento tiene varias páginas o formularios, procésalos todos.
    
    Notas adicionales: ${userInstructions}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: prompt },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          declarations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                docId: { type: Type.STRING, description: "Número de declaración o DIM" },
                c42: { type: Type.STRING, description: "Manifiesto de carga" },
                c44: { type: Type.STRING, description: "Documento de Transporte" },
                c51: { type: Type.STRING, description: "Factura" },
                c54: { type: Type.NUMBER, description: "Transporte" },
                c55: { type: Type.NUMBER, description: "Bandera" },
                c58: { type: Type.NUMBER, description: "Tipo de cambio" },
                c59: { type: Type.NUMBER, description: "Subtotal" },
                c66: { type: Type.NUMBER, description: "País origen" },
                c70: { type: Type.NUMBER, description: "País compra" },
                c71: { type: Type.NUMBER, description: "Peso bruto" },
                c72: { type: Type.NUMBER, description: "Peso neto" },
                c73: { type: Type.STRING, description: "Embalaje" },
                c74: { type: Type.NUMBER, description: "Bulto" },
                c77: { type: Type.NUMBER, description: "Cantidad" },
                c78: { type: Type.NUMBER, description: "FOB" },
                c82: { type: Type.NUMBER, description: "Suma gastos" },
                c134: { type: Type.STRING, description: "Levante" }
              },
              required: ["docId"]
            }
          },
          summary: { type: Type.STRING }
        },
        required: ["declarations"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || "{}");
    const declarations = (data.declarations || []).map((d: any) => ({
      ...d,
      fileName
    }));
    return { declarations, summary: data.summary };
  } catch (error) {
    console.error("Error parsing Gemini response:", error);
    throw new Error("No se pudo procesar la estructura contable. Verifica la legibilidad del documento.");
  }
}
