import { useEffect, useRef, useState, type Dispatch } from 'react';
import { esFalloCamara, type AdaptadorCamara, type EstadoCamara } from '../../camara/adaptador';
import { generarId } from '../../nucleo/ids';
import type { AccionTurno, EstadoTurno } from '../../nucleo/turnoPaciente';
import type { Catalogo } from '../../nucleo/tipos';
import { entradasDelPaciente, type Reconocedor } from '../../reconocimiento/reconocedor';

/** Por qué no se pudo usar la cámara o interpretar la seña (se explica en pantalla). */
export type AvisoCaptura = 'denegada' | 'no-disponible' | 'ocupada' | 'error' | 'sin-clip' | 'fallo-reconocimiento';

interface Opciones {
  turno: EstadoTurno;
  despachar: Dispatch<AccionTurno>;
  camara: AdaptadorCamara;
  reconocedor: Reconocedor | null;
  catalogo: Catalogo;
}

/**
 * Une la cámara y el reconocedor con los estados del turno del paciente (etapa C).
 * La vista no toca la cámara: solo llama a estas acciones.
 *
 * - «Captura en LSM»: enciende la cámara y pasa a «capturando».
 * - «Listo»: termina el clip, apaga la cámara y pide el reconocimiento (RF-17, RF-01).
 * - «Cancelar»: apaga la cámara y descarta el clip SIN pedir reconocimiento; durante el procesamiento,
 *   además deja de esperar el resultado (RF-17).
 * - Al cerrar la sesión (la vista se desmonta) o al salir de la página: cámara liberada y
 *   reconocimiento abortado (RF-18). Un resultado que llegue después se descarta.
 */
export function useCaptura({ turno, despachar, camara, reconocedor, catalogo }: Opciones) {
  const [estadoCamara, setEstadoCamara] = useState<EstadoCamara>(camara.estado);
  const [aviso, setAviso] = useState<AvisoCaptura | null>(null);
  /** Captura en curso. Se fija al momento (no espera al siguiente render) para descartar lo tardío. */
  const activa = useRef<string | null>(null);
  const control = useRef<AbortController | null>(null);

  useEffect(() => camara.alCambiar(setEstadoCamara), [camara]);

  // Liberar la cámara y abortar el reconocimiento al cerrar la sesión o salir de la página (RF-18).
  useEffect(() => {
    const salir = () => {
      activa.current = null;
      control.current?.abort();
      control.current = null;
      camara.liberar();
    };
    window.addEventListener('pagehide', salir);
    return () => {
      window.removeEventListener('pagehide', salir);
      salir();
    };
  }, [camara]);

  // Permiso negado, cámara ocupada o desconectada mientras se capturaba: se cancela y se explica.
  useEffect(() => {
    if (turno.fase === 'capturando' && esFalloCamara(estadoCamara)) {
      activa.current = null;
      despachar({ tipo: 'cancelarCaptura', capturaId: turno.capturaId });
      setAviso(estadoCamara);
    }
  }, [turno, estadoCamara, despachar]);

  const puedeIniciar =
    reconocedor !== null &&
    ((turno.fase === 'seleccion' && turno.selecciones.length === 0) || turno.fase === 'no-reconocido');

  function iniciar() {
    if (!puedeIniciar) return;
    setAviso(null);
    const capturaId = generarId('cap');
    activa.current = capturaId;
    despachar({ tipo: 'iniciarCaptura', capturaId });
    void camara.iniciar(capturaId);
  }

  async function listo() {
    if (turno.fase !== 'capturando' || camara.estado !== 'activa' || !reconocedor) return;
    const { capturaId } = turno;
    despachar({ tipo: 'capturaLista' });

    const clip = await camara.listo(); // también apaga la cámara
    if (activa.current !== capturaId) return; // se canceló o se cerró mientras tanto
    if (!clip) {
      activa.current = null;
      despachar({ tipo: 'cancelarCaptura', capturaId });
      setAviso('sin-clip');
      return;
    }

    const ctl = new AbortController();
    control.current = ctl;
    let entradaId: string | null;
    try {
      const r = await reconocedor.reconocer(clip, ctl.signal);
      // Solo una entrada que el paciente puede expresar; cualquier otra cosa cuenta como desconocida.
      entradaId = r.tipo === 'reconocido' && entradasDelPaciente(catalogo).includes(r.entradaId) ? r.entradaId : null;
    } catch {
      if (ctl.signal.aborted || activa.current !== capturaId) return;
      activa.current = null;
      despachar({ tipo: 'cancelarCaptura', capturaId });
      setAviso('fallo-reconocimiento');
      return;
    } finally {
      if (control.current === ctl) control.current = null;
    }
    if (ctl.signal.aborted || activa.current !== capturaId) return; // resultado tardío: se descarta
    activa.current = null;
    despachar({ tipo: 'resultadoReconocimiento', capturaId, entradaId, envioId: generarId('env') });
  }

  function cancelar() {
    activa.current = null;
    control.current?.abort();
    control.current = null;
    camara.cancelar();
    despachar({ tipo: 'cancelarCaptura' });
    setAviso(null);
  }

  function irAlCatalogo() {
    activa.current = null;
    despachar({ tipo: 'irAlCatalogo' });
  }

  return {
    estadoCamara,
    aviso,
    cerrarAviso: () => setAviso(null),
    puedeIniciar,
    iniciar,
    listo,
    cancelar,
    irAlCatalogo,
  };
}
