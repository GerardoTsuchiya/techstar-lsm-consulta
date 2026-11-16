import { generarId as generarIdPorDefecto, type GeneradorId } from './ids';
import { componerItems, intensidadValida, textoDeItem } from './mensajes';
import { buscarEntrada, recursoDeEntrada, recursoDeSistema, sePuedeEnviar } from './recursos';
import type {
  Catalogo,
  CodigoError,
  Comando,
  Evento,
  InstantaneaSesion,
  MensajeMedico,
  MensajePaciente,
  PoliticaRecursos,
  Resultado,
  Rol,
  SolicitudAclaracion,
} from './tipos';

interface OpcionesCoordinador {
  catalogo: Catalogo;
  politica: PoliticaRecursos;
  generarId?: GeneradorId;
  ahora?: () => number;
}

interface SesionInterna extends InstantaneaSesion {
  /** Resultados por `envioId`: un reintento devuelve el mismo resultado sin duplicar. */
  envios: Map<string, Resultado>;
}

/** Qué comandos acepta cada rol. */
const PERMISOS: Record<Comando['tipo'], readonly Rol[]> = {
  iniciarSesion: ['medico'],
  confirmarMensajePaciente: ['paciente'],
  enviarEntradaMedico: ['medico'],
  solicitarAclaracion: ['paciente'],
  acuseRecibo: ['paciente', 'medico'],
  cerrarSesion: ['paciente', 'medico'],
};

const fallo = (error: CodigoError): Resultado => ({ ok: false, error });

/**
 * Autoridad de la sesión compartida (RF-20).
 * Vive en la computadora del médico. Solo recibe contenido confirmado:
 * los borradores del paciente nunca llegan aquí (RF-04).
 * Todo se guarda en memoria y se borra al cerrar (RF-18).
 */
export class CoordinadorSesion {
  private readonly catalogo: Catalogo;
  private readonly politica: PoliticaRecursos;
  private readonly generarId: GeneradorId;
  private readonly ahora: () => number;
  private sesion: SesionInterna | null = null;
  /** Solo identificadores (sin contenido) para rechazar envíos tardíos. */
  private readonly sesionesCerradas = new Set<string>();
  private readonly suscriptores = new Set<(e: Evento) => void>();

  constructor(opciones: OpcionesCoordinador) {
    this.catalogo = opciones.catalogo;
    this.politica = opciones.politica;
    this.generarId = opciones.generarId ?? generarIdPorDefecto;
    this.ahora = opciones.ahora ?? Date.now;
  }

  suscribir(fn: (e: Evento) => void): () => void {
    this.suscriptores.add(fn);
    return () => this.suscriptores.delete(fn);
  }

  instantanea(): InstantaneaSesion | null {
    if (!this.sesion) return null;
    const { envios: _envios, ...publica } = this.sesion;
    return structuredClone(publica);
  }

  procesar(rol: Rol, comando: Comando): Resultado {
    if (!PERMISOS[comando.tipo].includes(rol)) return fallo('rol-no-autorizado');

    if (comando.tipo === 'iniciarSesion') return this.iniciar();

    const errorSesion = this.validarSesion(comando.sesionId);
    if (errorSesion) return fallo(errorSesion);
    const sesion = this.sesion!;

    switch (comando.tipo) {
      case 'confirmarMensajePaciente':
        return this.unaVez(sesion, comando.envioId, () => this.confirmarPaciente(sesion, comando));
      case 'enviarEntradaMedico':
        return this.unaVez(sesion, comando.envioId, () => this.enviarMedico(sesion, comando.entradaId));
      case 'solicitarAclaracion':
        return this.unaVez(sesion, comando.envioId, () => this.aclarar(sesion, comando.mensajeId));
      case 'acuseRecibo':
        return this.acusar(sesion, rol, comando.mensajeId);
      case 'cerrarSesion':
        return this.cerrar(sesion);
    }
  }

  // ------------------------------------------------------------ comandos

  private iniciar(): Resultado {
    if (this.sesion) return fallo('sesion-abierta');
    this.sesion = {
      sesionId: this.generarId('ses'),
      catalogoVersion: this.catalogo.version,
      politica: this.politica,
      mensajes: [],
      aclaraciones: [],
      envios: new Map(),
    };
    this.emitirEstado();
    return { ok: true, id: this.sesion.sesionId };
  }

  private confirmarPaciente(
    sesion: SesionInterna,
    c: Extract<Comando, { tipo: 'confirmarMensajePaciente' }>,
  ): Resultado {
    // La vía se revisa aunque el tipo la limite: por la red o el IPC llegan datos sin tipos.
    if (c.via !== 'catalogo' && c.via !== 'camara') return fallo('comando-invalido');
    if (c.selecciones.length === 0) return fallo('seleccion-vacia');
    // Un reconocimiento produce una sola entrada (RF-01). Por la cámara no se aceptan varias a la vez.
    if (c.via === 'camara' && c.selecciones.length !== 1) return fallo('comando-invalido');
    const vistos = new Set<string>();
    for (const s of c.selecciones) {
      if (vistos.has(s.entradaId)) return fallo('seleccion-repetida');
      vistos.add(s.entradaId);
      const entrada = buscarEntrada(this.catalogo, s.entradaId);
      if (!entrada) return fallo('entrada-desconocida');
      if (entrada.tipo !== 'sintoma' && entrada.tipo !== 'respuesta-paciente') return fallo('tipo-no-permitido');
      if (!sePuedeEnviar(recursoDeEntrada(this.catalogo, entrada, this.politica))) {
        return fallo('recurso-no-disponible');
      }
      if (s.intensidad !== undefined) {
        if (!entrada.esDolor || !intensidadValida(s.intensidad)) return fallo('intensidad-invalida');
        if (!sePuedeEnviar(recursoDeSistema(this.catalogo, 'intensidadDolor', this.politica))) {
          return fallo('recurso-no-disponible');
        }
      }
    }

    const items = componerItems(this.catalogo, c.selecciones);
    const textos = items.map(textoDeItem);
    // Se entrega exactamente lo que el paciente revisó (RF-07).
    if (textos.length !== c.textosRevisados.length || textos.some((t, i) => t !== c.textosRevisados[i])) {
      return fallo('contenido-no-coincide');
    }

    const mensaje: MensajePaciente = {
      id: this.generarId('msg'),
      sesionId: sesion.sesionId,
      origen: 'paciente',
      via: c.via,
      items,
      confirmadoEn: this.ahora(),
    };
    sesion.mensajes.push(mensaje);
    return { ok: true, id: mensaje.id };
  }

  private enviarMedico(sesion: SesionInterna, entradaId: string): Resultado {
    const entrada = buscarEntrada(this.catalogo, entradaId);
    if (!entrada) return fallo('entrada-desconocida');
    if (entrada.tipo !== 'pregunta-medico' && entrada.tipo !== 'respuesta-medico') return fallo('tipo-no-permitido');
    const recurso = recursoDeEntrada(this.catalogo, entrada, this.politica);
    // Sin recurso validado no se envía ni se sustituye por otro (RF-02, RI-01).
    if (recurso.estado === 'bloqueado') return fallo('recurso-no-disponible');

    const mensaje: MensajeMedico = {
      id: this.generarId('msg'),
      sesionId: sesion.sesionId,
      origen: 'medico',
      entradaId: entrada.id,
      texto: entrada.texto,
      recursoId: recurso.recurso.id,
      enviadoEn: this.ahora(),
    };
    sesion.mensajes.push(mensaje);
    for (const a of sesion.aclaraciones) if (!a.atendidaCon) a.atendidaCon = mensaje.id;
    return { ok: true, id: mensaje.id };
  }

  private aclarar(sesion: SesionInterna, mensajeId: string): Resultado {
    const mensaje = sesion.mensajes.find((m) => m.id === mensajeId);
    // Sin un mensaje recibido del médico no se habilita la solicitud (RF-15).
    if (!mensaje || mensaje.origen !== 'medico') return fallo('mensaje-no-encontrado');
    const pendiente = sesion.aclaraciones.find((a) => a.mensajeId === mensajeId && !a.atendidaCon);
    if (pendiente) return { ok: true, id: pendiente.id, duplicado: true };

    const solicitud: SolicitudAclaracion = {
      id: this.generarId('acl'),
      sesionId: sesion.sesionId,
      mensajeId,
      creadaEn: this.ahora(),
    };
    sesion.aclaraciones.push(solicitud);
    return { ok: true, id: solicitud.id };
  }

  /** La vista destinataria confirma que mostró el mensaje (RF-20: no se informa entrega sin recepción). */
  private acusar(sesion: SesionInterna, rol: Rol, mensajeId: string): Resultado {
    const mensaje = sesion.mensajes.find((m) => m.id === mensajeId);
    if (!mensaje) return fallo('mensaje-no-encontrado');
    const destinatario: Rol = mensaje.origen === 'paciente' ? 'medico' : 'paciente';
    if (rol !== destinatario) return fallo('rol-no-autorizado');
    if (mensaje.recibidoEn === undefined) {
      mensaje.recibidoEn = this.ahora();
      this.emitirEstado();
    }
    return { ok: true, id: mensaje.id };
  }

  private cerrar(sesion: SesionInterna): Resultado {
    const id = sesion.sesionId;
    // Borrado de mensajes, avisos y registro de envíos (RF-18).
    sesion.mensajes.length = 0;
    sesion.aclaraciones.length = 0;
    sesion.envios.clear();
    this.sesion = null;
    this.sesionesCerradas.add(id);
    this.emitir({ tipo: 'sesionCerrada', sesionId: id });
    this.emitirEstado();
    return { ok: true, id };
  }

  // ------------------------------------------------------------ apoyo

  private validarSesion(sesionId: string): CodigoError | null {
    if (this.sesionesCerradas.has(sesionId)) return 'sesion-cerrada';
    if (!this.sesion) return 'sin-sesion';
    if (this.sesion.sesionId !== sesionId) return 'sesion-incorrecta';
    return null;
  }

  /** Aplica un envío una sola vez por `envioId` (doble toque, reintento). */
  private unaVez(sesion: SesionInterna, envioId: string, aplicar: () => Resultado): Resultado {
    const previo = sesion.envios.get(envioId);
    if (previo) return previo.ok ? { ...previo, duplicado: true } : previo;
    const resultado = aplicar();
    // Solo se memorizan los éxitos: un fallo puede corregirse y reintentarse.
    if (resultado.ok) {
      sesion.envios.set(envioId, resultado);
      this.emitirEstado();
    }
    return resultado;
  }

  private emitirEstado(): void {
    this.emitir({ tipo: 'estado', instantanea: this.instantanea() });
  }

  private emitir(evento: Evento): void {
    for (const fn of [...this.suscriptores]) fn(structuredClone(evento));
  }
}
