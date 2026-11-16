import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Raíz del repositorio (los scripts se ejecutan desde cualquier carpeta). */
export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Catálogo que carga la app (`src/catalogo/catalogoFicticio.ts`) y del que sale el inventario. */
export const CATALOGO_APP = 'catalogo/ficticio-dev.json';
export const DOCUMENTO = 'Docs/RECURSOS_LSM.md';
export const CARPETA_PUBLICA = 'public/recursos';

export type Lectura = { ok: true; datos: unknown } | { ok: false; error: string };

/** Lee un JSON y explica en español un error de sintaxis (línea y columna). */
export function leerJson(relativo: string): Lectura {
  let texto: string;
  try {
    texto = readFileSync(path.join(RAIZ, relativo), 'utf8').replace(/^﻿/, '');
  } catch {
    return { ok: false, error: `No se encontró ${relativo}.` };
  }
  try {
    return { ok: true, datos: JSON.parse(texto) };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    const pos = /position (\d+)/.exec(mensaje);
    let donde = '';
    if (pos) {
      const antes = texto.slice(0, Number(pos[1]));
      const linea = antes.split('\n').length;
      const columna = antes.length - antes.lastIndexOf('\n');
      donde = ` cerca de la línea ${linea}, columna ${columna}`;
    }
    return {
      ok: false,
      error: `${relativo} no es un JSON válido${donde}. Revisa comas sobrantes o faltantes, comillas dobles y llaves. (Detalle: ${mensaje})`,
    };
  }
}

/** Notas de las entradas (campo opcional `nota`) para el inventario. */
export function notasDeEntradas(datos: unknown): Record<string, string> {
  const notas: Record<string, string> = {};
  const entradas = (datos as { entradas?: unknown }).entradas;
  if (!Array.isArray(entradas)) return notas;
  for (const e of entradas as { id?: unknown; nota?: unknown }[]) {
    if (typeof e?.id === 'string' && typeof e.nota === 'string') notas[e.id] = e.nota;
  }
  return notas;
}

/** Nombres de archivo presentes en `public/recursos/` (con sus mayúsculas exactas). */
export function archivosPublicos(): string[] {
  try {
    return readdirSync(path.join(RAIZ, CARPETA_PUBLICA), { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

/**
 * Lee un recurso de `public/recursos/`. Exige el nombre exacto: Windows no distingue mayúsculas,
 * pero otros sistemas sí, y el archivo no se encontraría en otra laptop.
 */
export function leerRecurso(archivo: string, presentes: string[]): Uint8Array | null {
  if (!presentes.includes(archivo)) return null;
  return readFileSync(path.join(RAIZ, CARPETA_PUBLICA, archivo)).subarray(0, 64);
}
