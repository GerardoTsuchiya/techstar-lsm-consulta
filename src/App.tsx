import { ERRORES_CATALOGO } from './catalogo/catalogoFicticio';
import { Inicio } from './modos/Inicio';
import { CatalogoInvalido } from './vistas/comunes/CatalogoInvalido';
import { ModoDemostracion, ModoMedico, ModoPaciente } from './modos/modos';
import { ModoMedicoRed, ModoPacienteRed } from './modos/modosRed';
import type { PoliticaRecursos } from './nucleo/tipos';
import { fabricaDeReconocedor, leerTipoReconocedor, type TipoReconocedor } from './reconocimiento/fabrica';

/**
 * Lee el modo desde la dirección: ?modo=demo|medico|paciente|medico-red|paciente-red&recursos=desarrollo|producto
 * &reconocedor=simulado|experimental (solo cuenta en modo desarrollo; por omisión, el simulador).
 * `medico-red` y `paciente-red` son los de la etapa B (dos laptops); Electron los abre con `--modo`.
 */
export function leerConfiguracion(search: string): { modo: string | null; politica: PoliticaRecursos; reconocedor: TipoReconocedor } {
  const p = new URLSearchParams(search);
  return {
    modo: p.get('modo'),
    // Ante un valor desconocido se elige la opción estricta.
    politica: p.get('recursos') === 'desarrollo' ? 'desarrollo' : 'producto',
    reconocedor: leerTipoReconocedor(p.get('reconocedor')),
  };
}

export function App({ erroresCatalogo = ERRORES_CATALOGO }: { erroresCatalogo?: readonly string[] }) {
  if (erroresCatalogo.length > 0) return <CatalogoInvalido errores={erroresCatalogo} />;
  const { modo, politica, reconocedor } = leerConfiguracion(window.location.search);
  if (modo === 'demo') return <ModoDemostracion politica={politica} crearReconocedor={fabricaDeReconocedor(reconocedor)} />;
  if (modo === 'medico') return <ModoMedico politica={politica} />;
  if (modo === 'paciente') return <ModoPaciente />;
  if (modo === 'medico-red') return <ModoMedicoRed politica={politica} />;
  if (modo === 'paciente-red') return <ModoPacienteRed crearReconocedor={fabricaDeReconocedor(reconocedor)} />;
  return <Inicio />;
}
