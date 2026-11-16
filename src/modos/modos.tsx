import { useEffect, useMemo, useState } from 'react';
import { catalogoFicticio } from '../catalogo/catalogoFicticio';
import { CoordinadorSesion } from '../nucleo/coordinador';
import type { AdaptadorCamara } from '../camara/adaptador';
import type { Catalogo, PoliticaRecursos } from '../nucleo/tipos';
import type { FabricaReconocedor } from '../reconocimiento/reconocedor';
import { conectarPorBroadcastChannel, servirPorBroadcastChannel } from '../transporte/broadcastChannel';
import { conectarLocal } from '../transporte/local';
import type { ConexionCliente } from '../transporte/tipos';
import { BandaModo } from '../vistas/comunes/BandaModo';
import { VistaMedico } from '../vistas/medico/VistaMedico';
import { VistaPaciente } from '../vistas/paciente/VistaPaciente';

interface PropsModo {
  politica: PoliticaRecursos;
  catalogo?: Catalogo;
}

/** Solo para pruebas automáticas: cámara y reconocedor falsos en lugar de los del equipo. */
interface PropsCaptura {
  crearCamara?: () => AdaptadorCamara;
  crearReconocedor?: FabricaReconocedor;
}

function useCoordinador(catalogo: Catalogo, politica: PoliticaRecursos) {
  // Un coordinador por ventana y por arranque; vive solo en memoria.
  const [coordinador] = useState(() => new CoordinadorSesion({ catalogo, politica }));
  return coordinador;
}

/**
 * Modo «demostración en una pantalla» (respaldo de la entrega).
 * Las dos vistas usan el mismo coordinador mediante el transporte en memoria.
 */
export function ModoDemostracion({ politica, catalogo = catalogoFicticio, crearCamara, crearReconocedor }: PropsModo & PropsCaptura) {
  const coordinador = useCoordinador(catalogo, politica);
  const paciente = useMemo(() => conectarLocal(coordinador, 'paciente'), [coordinador]);
  const medico = useMemo(() => conectarLocal(coordinador, 'medico'), [coordinador]);

  return (
    <div className="demo">
      <BandaModo politica={politica} ficticio={catalogo.ficticio} />
      <div className="demo__escenario">
        <div className="demo__lado">
          <span className="demo__rotulo">
            Pantalla del paciente
          </span>
          <div className="marco marco--paciente">
            <VistaPaciente
              conexion={paciente}
              catalogo={catalogo}
              crearCamara={crearCamara}
              crearReconocedor={crearReconocedor}
            />
          </div>
        </div>
        <div className="demo__lado">
          <span className="demo__rotulo">
            Pantalla del personal médico · coordina la sesión
          </span>
          <div className="marco marco--medico">
            <VistaMedico conexion={medico} catalogo={catalogo} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Modo «médico»: esta ventana aloja el coordinador y lo ofrece a otra ventana
 * del mismo navegador. En la etapa B lo ofrecerá a la laptop del paciente por Wi-Fi.
 */
export function ModoMedico({ politica, catalogo = catalogoFicticio }: PropsModo) {
  const coordinador = useCoordinador(catalogo, politica);
  const conexion = useMemo(() => conectarLocal(coordinador, 'medico'), [coordinador]);
  useEffect(() => servirPorBroadcastChannel(coordinador), [coordinador]);

  return (
    <div className="solo">
      <BandaModo politica={politica} ficticio={catalogo.ficticio} />
      <div className="solo__contenido marco marco--medico">
        <VistaMedico conexion={conexion} catalogo={catalogo} />
      </div>
    </div>
  );
}

/** Modo «paciente»: se conecta al coordinador de la ventana del médico. */
export function ModoPaciente({ catalogo = catalogoFicticio }: { catalogo?: Catalogo }) {
  const [conexion, setConexion] = useState<ConexionCliente | null>(null);
  useEffect(() => {
    const c = conectarPorBroadcastChannel('paciente');
    setConexion(c);
    return () => c.desconectar();
  }, []);

  return (
    <div className="solo solo--paciente">
      <div className="solo__contenido marco marco--paciente">
        <VistaPaciente conexion={conexion} catalogo={catalogo} />
      </div>
    </div>
  );
}
