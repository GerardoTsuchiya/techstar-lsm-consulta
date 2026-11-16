import { type SubmitEvent, useEffect, useMemo, useState } from 'react';
import { catalogoFicticio } from '../catalogo/catalogoFicticio';
import { generarId } from '../nucleo/ids';
import type { Catalogo, PoliticaRecursos } from '../nucleo/tipos';
import { normalizarCodigo } from '../transporte/canalSeguro';
import { conectarPorIpc } from '../transporte/ipcElectron';
import { MOTIVOS_RECHAZO, urlDeDireccion } from '../transporte/protocoloRed';
import { type EstadoVinculacion, type InfoEquipo, puente, type PuenteMedico } from '../transporte/puente';
import { type ConexionRed, conectarPorWebSocket, type EstadoRed } from '../transporte/websocket';
import { BandaModo } from '../vistas/comunes/BandaModo';
import { Dialogo } from '../vistas/comunes/Dialogo';
import { IconoLaptop, IconoSinWifi, IconoVincular, IconoWifi } from '../vistas/comunes/Iconos';
import { VistaMedico } from '../vistas/medico/VistaMedico';
import { VistaPaciente } from '../vistas/paciente/VistaPaciente';

/**
 * Modos de la etapa B: dos laptops por Wi-Fi local.
 * Las vistas (VistaMedico, VistaPaciente) son las mismas de la etapa A; aquí solo se elige
 * el transporte y se añaden la vinculación y el estado de la conexión.
 */

function Equipo({ equipo }: { equipo: InfoEquipo | undefined }) {
  if (!equipo) return null;
  return (
    <span className="vinculo__equipo" title={`Electron ${equipo.electron} · Chromium ${equipo.chrome} · Node ${equipo.node}`}>
      <IconoLaptop /> Este equipo: {equipo.sistema} · {equipo.arquitectura}
    </span>
  );
}

// ---------------------------------------------------------------- médico

const RECHAZOS_CORTOS: Record<string, string> = {
  'codigo-incorrecto': 'código incorrecto',
  'rol-no-permitido': 'rol no permitido',
  'pareja-ocupada': 'ya había una laptop vinculada',
  'version-incompatible': 'versión distinta',
  desvinculado: 'vinculación anterior',
};

function PanelVinculacion({ medico, equipo }: { medico: PuenteMedico; equipo: InfoEquipo | undefined }) {
  const [v, setV] = useState<EstadoVinculacion | null>(null);
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => {
    let vigente = true;
    void medico.vinculacion().then((e) => vigente && setV(e));
    const baja = medico.alVinculacion(setV);
    return () => {
      vigente = false;
      baja();
    };
  }, [medico]);

  if (!v) return null;

  if (!v.escuchando) {
    return (
      <div className="vinculo vinculo--error" role="alert">
        <span className="vinculo__estado">
          <IconoSinWifi /> Sin conexión de red
        </span>
        <span>{v.error ?? 'No se pudo abrir la conexión para la laptop del paciente.'}</span>
        <Equipo equipo={equipo} />
      </div>
    );
  }

  return (
    <div
      className={`vinculo ${v.vinculado ? (v.conectado ? 'vinculo--conectado' : 'vinculo--caido') : ''}`}
      data-vinculado={v.vinculado}
      data-conectado={v.conectado}
    >
      {!v.vinculado ? (
        <>
          <span className="vinculo__estado">
            <IconoVincular /> Vincular la laptop del paciente
          </span>
          <span className="vinculo__dato">
            Dirección{' '}
            <strong data-prueba="direccion">{v.direcciones.length ? v.direcciones.join('  ·  ') : 'sin red local'}</strong>
          </span>
          <span className="vinculo__dato">
            Código <strong className="vinculo__codigo" data-prueba="codigo">{v.codigo}</strong>
          </span>
        </>
      ) : (
        <>
          <span className="vinculo__estado" role="status">
            {v.conectado ? <IconoWifi /> : <IconoSinWifi />}
            {v.conectado
              ? `Laptop del paciente conectada (equipo ${v.dispositivo})`
              : `Laptop del paciente desconectada · esperando que se reconecte (equipo ${v.dispositivo})`}
          </span>
          {!v.conectado && v.codigo && (
            <span className="vinculo__dato">
              Si la laptop del paciente se reinició o recargó, vuelve a escribir {v.direcciones[0] ?? ''} y el código{' '}
              <strong className="vinculo__codigo">{v.codigo}</strong>
            </span>
          )}
          <button type="button" className="boton boton--chico boton--claro" onClick={() => setConfirmar(true)}>
            Desvincular
          </button>
        </>
      )}
      {v.rechazados > 0 && (
        <span className="vinculo__rechazos" data-prueba="rechazados">
          Equipos rechazados: {v.rechazados}
          {v.ultimoRechazo ? ` (último: ${RECHAZOS_CORTOS[v.ultimoRechazo] ?? v.ultimoRechazo})` : ''}
        </span>
      )}
      {v.soloLocal && <span className="vinculo__rechazos">Solo esta computadora (127.0.0.1)</span>}
      <Equipo equipo={equipo} />

      {confirmar && (
        <Dialogo
          titulo="¿Desvincular la laptop del paciente?"
          onCerrar={() => setConfirmar(false)}
          acciones={
            <>
              <button type="button" className="boton boton--secundario" onClick={() => setConfirmar(false)} data-autofoco>
                Cancelar
              </button>
              <button
                type="button"
                className="boton boton--peligro"
                onClick={() => {
                  setConfirmar(false);
                  void medico.desvincular().then(setV);
                }}
              >
                Desvincular y crear código nuevo
              </button>
            </>
          }
        >
          <p>
            La laptop del paciente se desconectará y deberá escribir el código nuevo. La consulta en curso no se borra.
          </p>
        </Dialogo>
      )}
    </div>
  );
}

/** Modo médico de la app de escritorio: el coordinador vive en el proceso principal. */
export function ModoMedicoRed({ politica, catalogo = catalogoFicticio }: { politica: PoliticaRecursos; catalogo?: Catalogo }) {
  const p = puente();
  const medico = p?.medico;
  const conexion = useMemo(() => (medico ? conectarPorIpc(medico) : null), [medico]);
  useEffect(() => () => conexion?.desconectar(), [conexion]);

  if (!medico) {
    return (
      <main className="inicio">
        <p className="nota nota--alerta" role="alert">
          Este modo solo funciona en la app de escritorio: <code>npm run electron:medico</code>.
        </p>
      </main>
    );
  }

  return (
    <div className="solo">
      <BandaModo politica={politica} ficticio={catalogo.ficticio} />
      <PanelVinculacion medico={medico} equipo={p.equipo} />
      <div className="solo__contenido marco marco--medico">
        <VistaMedico conexion={conexion} catalogo={catalogo} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- paciente

function BandaRed({ estado }: { estado: EstadoRed }) {
  const caida = estado.fase !== 'conectado';
  return (
    <div className={`vinculo ${caida ? 'vinculo--caido' : 'vinculo--conectado'}`} role="status" data-fase={estado.fase}>
      <span className="vinculo__estado">
        {caida ? <IconoSinWifi /> : <IconoWifi />}
        {caida
          ? 'Se perdió la conexión con la computadora del médico. Reintentando…'
          : 'Conectado con la computadora del médico'}
      </span>
      {caida && <span>Lo que envíes espera unos segundos; si no llega, verás un aviso y podrás intentar de nuevo.</span>}
    </div>
  );
}

/**
 * Modo paciente por red: lo prepara el personal escribiendo la dirección y el código que
 * muestra la laptop del médico. Funciona en la app de escritorio y en el navegador.
 */
export function ModoPacienteRed({ catalogo = catalogoFicticio }: { catalogo?: Catalogo }) {
  const p = puente();
  const [idVentana] = useState(() => generarId('disp'));
  const dispositivoId = p?.dispositivoId ?? idVentana;
  const [direccion, setDireccion] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [conexion, setConexion] = useState<ConexionRed | null>(null);
  const [estado, setEstado] = useState<EstadoRed | null>(null);
  const [vinculado, setVinculado] = useState(false);

  useEffect(() => {
    if (!conexion) return;
    const baja = conexion.alEstado(setEstado);
    return () => {
      baja();
      conexion.desconectar();
    };
  }, [conexion]);

  useEffect(() => {
    if (estado?.fase === 'conectado') setVinculado(true);
    if (estado?.fase === 'rechazado') {
      setError(estado.motivo ? MOTIVOS_RECHAZO[estado.motivo] : 'La conexión fue rechazada.');
      setConexion(null);
      setEstado(null);
      setVinculado(false);
    }
  }, [estado]);

  function vincular(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const url = urlDeDireccion(direccion);
    const cod = normalizarCodigo(codigo);
    if (!url) return setError('Escribe la dirección que muestra la laptop del médico, por ejemplo 192.168.1.20:47100.');
    if (!cod) return setError('El código tiene 10 letras o números, por ejemplo 7KQ2M-9XD4T.');
    setError(null);
    setVinculado(false);
    setConexion(conectarPorWebSocket({ url, codigo: cod, dispositivoId }));
  }

  if (conexion && vinculado && estado) {
    return (
      <div className="solo solo--paciente">
        <BandaRed estado={estado} />
        <div className="solo__contenido marco marco--paciente">
          <VistaPaciente conexion={conexion} catalogo={catalogo} />
        </div>
      </div>
    );
  }

  return (
    <main className="inicio vincular">
      <header className="inicio__cabecera">
        <p className="inicio__equipo">TechStar · Pinkies</p>
        <h1 className="inicio__titulo">Conectar con la laptop del médico</h1>
        <p className="inicio__lema">
          Preparación a cargo del personal. Escribe la dirección y el código que aparecen en la parte superior de la
          pantalla del médico. Las dos laptops deben estar en la misma red Wi-Fi.
        </p>
      </header>

      {conexion ? (
        <div className="tarjeta-crema vincular__tarjeta" role="status">
          <p>
            Conectando con <strong>{direccion}</strong>…
          </p>
          <p className="buscador__nota">
            Si tarda, revisa que la laptop del médico esté abierta en el modo médico, que ambas estén en la misma red y
            que el firewall permita la conexión.
          </p>
          <button type="button" className="boton boton--secundario" onClick={() => setConexion(null)}>
            Cancelar
          </button>
        </div>
      ) : (
        <form className="tarjeta-crema vincular__tarjeta" onSubmit={vincular} noValidate>
          <label className="buscador__etiqueta" htmlFor="direccion">
            Dirección de la laptop del médico
          </label>
          <input
            id="direccion"
            className="buscador__campo"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="192.168.1.20:47100"
            autoComplete="off"
            spellCheck={false}
            inputMode="url"
          />
          <label className="buscador__etiqueta" htmlFor="codigo">
            Código de vinculación
          </label>
          <input
            id="codigo"
            className="buscador__campo vinculo__codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="XXXXX-XXXXX"
            autoComplete="off"
            spellCheck={false}
            maxLength={14}
          />
          {error && (
            <p className="nota nota--alerta" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="boton boton--primario boton--alto">
            <IconoVincular /> Vincular
          </button>
        </form>
      )}

      {p?.equipo && (
        <p className="inicio__nota">
          <Equipo equipo={p.equipo} />
        </p>
      )}
    </main>
  );
}
