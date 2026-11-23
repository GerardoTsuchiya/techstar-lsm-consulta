import datos from '../../catalogo/ficticio-dev.json';
import type { Catalogo } from '../nucleo/tipos';
import { validarCatalogo, type TextoAvisoAlcance } from './validarCatalogo';

/**
 * CATÁLOGO FICTICIO DE DESARROLLO — NO es el Catálogo V1.
 *
 * Los datos están en `catalogo/ficticio-dev.json` (se editan sin tocar código; ver README,
 * «Editar el catálogo»). Este módulo solo los valida y los entrega a la app.
 *
 * Si el archivo tiene errores, `ERRORES_CATALOGO` los lista, la app muestra una pantalla de error
 * y no abre ninguna sesión. El catálogo queda vacío: nada se puede enviar y nada se sustituye.
 */

const resultado = validarCatalogo(datos);

export const ERRORES_CATALOGO: readonly string[] = resultado.errores;
export const AVISOS_CATALOGO: readonly string[] = resultado.avisos;

const CATALOGO_VACIO: Catalogo = {
  version: 'catalogo-invalido',
  ficticio: true,
  entradas: [],
  recursos: [],
  recursosSistema: {},
  preguntasGenerales: [],
};

export const catalogoFicticio: Catalogo = resultado.cargado?.catalogo ?? CATALOGO_VACIO;

/** Texto del aviso de alcance (RF-16, RC-01). Pendiente de validación. */
export const TEXTO_AVISO_ALCANCE: TextoAvisoAlcance = resultado.cargado?.avisoAlcance ?? {
  titulo: 'Catálogo no disponible',
  parrafos: ['', '', ''],
};
