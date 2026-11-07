import { useCallback, useEffect, useRef, useState } from 'react';
import type { Comando, InstantaneaSesion, Rol } from '../nucleo/tipos';
import type { ConexionCliente } from '../transporte/tipos';

/**
 * Conecta una vista con la sesión a través de cualquier transporte.
 * Mantiene solo la última instantánea en memoria (nada en localStorage: RF-18).
 */
export function useSesion(conexion: ConexionCliente | null) {
  const [instantanea, setInstantanea] = useState<InstantaneaSesion | null>(null);
  const [conectado, setConectado] = useState(false);
  const [ultimaCerrada, setUltimaCerrada] = useState<string | null>(null);

  useEffect(() => {
    if (!conexion) return;
    return conexion.alEvento((evento) => {
      setConectado(true);
      if (evento.tipo === 'estado') {
        setInstantanea(evento.instantanea);
        if (evento.instantanea) setUltimaCerrada(null);
      } else {
        setUltimaCerrada(evento.sesionId);
      }
    });
  }, [conexion]);

  const enviar = useCallback(
    (comando: Comando) =>
      conexion ? conexion.enviar(comando) : Promise.resolve({ ok: false as const, error: 'sin-conexion' as const }),
    [conexion],
  );

  return { instantanea, conectado, ultimaCerrada, enviar };
}

/**
 * Acusa recibo de los mensajes del otro participante una vez mostrados.
 * El emisor solo ve «Recibido» cuando la otra pantalla lo mostró (RF-20).
 */
export function useAcuses(
  instantanea: InstantaneaSesion,
  rol: Rol,
  enviar: (c: Comando) => Promise<unknown>,
) {
  const enviados = useRef(new Set<string>());
  useEffect(() => {
    const origenAjeno = rol === 'paciente' ? 'medico' : 'paciente';
    for (const m of instantanea.mensajes) {
      if (m.origen === origenAjeno && m.recibidoEn === undefined && !enviados.current.has(m.id)) {
        enviados.current.add(m.id);
        void enviar({ tipo: 'acuseRecibo', sesionId: instantanea.sesionId, mensajeId: m.id });
      }
    }
  }, [instantanea, rol, enviar]);
}
