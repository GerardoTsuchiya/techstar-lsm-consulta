import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { EstadoCamara } from '../camara/adaptador';
import type { PoliticaRecursos } from '../nucleo/tipos';
import { CamaraFalsa } from '../pruebas/camaraFalsa';
import { reconocedorPorPolitica, type Reconocedor } from '../reconocimiento/reconocedor';
import type { ReconocedorSimulado } from '../reconocimiento/reconocedorSimulado';
import { ModoDemostracion } from './modos';

/**
 * Recorridos de la etapa C (cámara y reconocimiento limitado) con las vistas reales, el
 * coordinador real, una cámara FALSA y el reconocedor SIMULADO (el operador elige el resultado).
 */

async function abrir(politica: PoliticaRecursos = 'desarrollo', respuestaInicio: EstadoCamara = 'activa') {
  const user = userEvent.setup();
  const camaras: CamaraFalsa[] = [];
  const reconocedores: Reconocedor[] = [];
  const reconocer = vi.fn();
  render(
    <ModoDemostracion
      politica={politica}
      crearCamara={() => {
        const c = new CamaraFalsa();
        c.respuestaInicio = respuestaInicio;
        camaras.push(c);
        return c;
      }}
      crearReconocedor={(pol, cat) => {
        const r = reconocedorPorPolitica(pol, cat);
        if (r) {
          const original = r.reconocer.bind(r);
          r.reconocer = (clip, senal) => {
            reconocer(clip.capturaId);
            return original(clip, senal);
          };
          reconocedores.push(r);
        }
        return r;
      }}
    />,
  );
  const paciente = () => within(screen.getByRole('region', { name: 'Vista del paciente' }));
  const medico = () => within(screen.getByRole('region', { name: 'Vista del personal médico' }));
  await user.click(medico().getByRole('button', { name: 'Iniciar consulta' }));
  const aviso = await paciente().findByRole('dialog', { name: 'Alcance de este apoyo' });
  await user.click(within(aviso).getByRole('button', { name: /Entendido/ }));
  return {
    user,
    paciente,
    medico,
    reconocer,
    camara: () => camaras.at(-1)!,
    camaras,
    simulador: () => reconocedores.at(-1) as ReconocedorSimulado,
  };
}

describe('Captura en LSM (etapa C)', () => {
  it('inicio, «Listo» y un caso reconocido que queda pendiente de revisión y llega con via «camara» (RF-17, RF-01)', async () => {
    const { user, paciente, medico, camara, reconocer } = await abrir();

    await user.click(paciente().getByRole('button', { name: /Captura en LSM/ }));
    expect(await paciente().findByText('Cámara activa')).toBeTruthy();
    expect(camara().llamadas).toEqual(expect.arrayContaining(['iniciar', 'mostrarEn']));
    expect(camara().encendida).toBe(true);

    await user.click(paciente().getByRole('button', { name: /Listo/ }));
    expect(await paciente().findByText('Interpretando tu seña…')).toBeTruthy();
    expect(paciente().getByText(/La cámara ya está apagada/)).toBeTruthy();
    expect(camara().encendida).toBe(false); // «Listo» apaga la cámara
    expect(reconocer).toHaveBeenCalledTimes(1);

    // El simulador está claramente identificado como NO real
    const sim = paciente().getByRole('region', { name: /Simulador del reconocimiento/ });
    expect(within(sim).getByText(/no es reconocimiento real/i)).toBeTruthy();
    await user.selectOptions(within(sim).getByLabelText('Reconocido como'), 'PAC-S-04');
    await user.click(within(sim).getByRole('button', { name: /Simular «reconocido»/ }));

    // Candidato pendiente: solo en la pantalla del paciente (RF-01, RF-04)
    expect(await paciente().findByText(/Esto es lo que entendimos de tu seña/)).toBeTruthy();
    expect(paciente().getByText(/Resultado simulado · no es reconocimiento real/)).toBeTruthy();
    expect(paciente().getByText('Tengo fiebre.', { selector: 'li' })).toBeTruthy();
    expect(paciente().queryByRole('button', { name: /Cambiar selección/ })).toBeNull();
    expect(medico().getByText(/Todavía no hay mensajes/)).toBeTruthy();

    await user.dblClick(paciente().getByRole('button', { name: /Confirmar mensaje/ }));
    expect(await medico().findByText('Tengo fiebre.')).toBeTruthy();
    expect(medico().getAllByText('Tengo fiebre.')).toHaveLength(1);
    expect(medico().getByText(/confirmado .* · cámara/)).toBeTruthy();
    // El clip no viaja: el médico solo recibe el texto revisado.
    expect(camara().clipsEntregados).toHaveLength(1);
  });

  it('expresión desconocida: aviso accesible con recurso, reintento o catálogo (RF-05)', async () => {
    const { user, paciente, medico, camara } = await abrir();
    await user.click(paciente().getByRole('button', { name: /Captura en LSM/ }));
    await user.click(await paciente().findByRole('button', { name: /Listo/ }));
    await user.click(await paciente().findByRole('button', { name: /Simular «desconocido»/ }));

    const alerta = await paciente().findByRole('alert');
    expect(within(alerta).getByText('No reconocimos tu seña')).toBeTruthy();
    expect(paciente().getByRole('img', { name: /No reconocimos tu seña/ }).getAttribute('data-recurso')).toBe(
      'REC-PRUEBA-SIS-DESCONOCIDA',
    );
    expect(medico().getByText(/Todavía no hay mensajes/)).toBeTruthy();

    // Reintento: otra captura con la cámara encendida de nuevo
    await user.click(paciente().getByRole('button', { name: /Intentar de nuevo/ }));
    expect(await paciente().findByText('Cámara activa')).toBeTruthy();
    expect(camara().llamadas.filter((l) => l === 'iniciar')).toHaveLength(2);
    await user.click(paciente().getByRole('button', { name: /Listo/ }));
    await user.click(await paciente().findByRole('button', { name: /Simular «desconocido»/ }));

    // «Elegir lo que sientes» lleva al catálogo
    await user.click(await paciente().findByRole('button', { name: /Elegir lo que sientes/ }));
    expect(paciente().getByRole('button', { name: 'Fiebre' })).toBeTruthy();
    expect(camara().encendida).toBe(false);
  });

  it('«Cancelar» detiene la cámara y descarta el clip sin pedir reconocimiento; el catálogo sigue disponible (RF-17)', async () => {
    const { user, paciente, medico, camara, reconocer } = await abrir();
    await user.click(paciente().getByRole('button', { name: /Captura en LSM/ }));
    await paciente().findByText('Cámara activa');
    await user.click(paciente().getByRole('button', { name: /Cancelar/ }));

    expect(reconocer).not.toHaveBeenCalled();
    expect(camara().llamadas).toContain('cancelar');
    expect(camara().llamadas).not.toContain('listo');
    expect(camara().clipsEntregados).toHaveLength(0);
    expect(camara().encendida).toBe(false);
    expect(paciente().queryByText('Cámara activa')).toBeNull();
    await user.click(paciente().getByRole('button', { name: 'Fiebre' }));
    expect(paciente().getByRole('button', { name: 'Fiebre' }).getAttribute('aria-pressed')).toBe('true');
    expect(medico().getByText(/Todavía no hay mensajes/)).toBeTruthy();
  });

  it('«Elegir lo que sientes» durante la captura apaga la cámara, descarta el clip y abre el catálogo', async () => {
    const { user, paciente, medico, camara, reconocer } = await abrir();
    await user.click(paciente().getByRole('button', { name: /Captura en LSM/ }));
    await paciente().findByText('Cámara activa');
    await user.click(paciente().getByRole('button', { name: /Elegir lo que sientes/ }));

    expect(reconocer).not.toHaveBeenCalled();
    expect(camara().llamadas).not.toContain('listo');
    expect(camara().clipsEntregados).toHaveLength(0);
    expect(camara().encendida).toBe(false);
    expect(paciente().queryByText('Cámara activa')).toBeNull();
    expect(paciente().getByRole('button', { name: 'Fiebre' })).toBeTruthy();
    expect(medico().getByText(/Todavía no hay mensajes/)).toBeTruthy();
  });

  it('«Cancelar» durante el procesamiento deja de esperar y un resultado tardío no aparece', async () => {
    const { user, paciente, simulador } = await abrir();
    await user.click(paciente().getByRole('button', { name: /Captura en LSM/ }));
    await user.click(await paciente().findByRole('button', { name: /Listo/ }));
    await paciente().findByText('Interpretando tu seña…');
    const capturaId = simulador().capturaPendiente!;
    expect(capturaId).toBeTruthy();

    await user.click(paciente().getByRole('button', { name: /Cancelar/ }));
    expect(simulador().capturaPendiente).toBeNull();
    expect(simulador().elegir(capturaId, { tipo: 'reconocido', entradaId: 'PAC-S-04' })).toBe(false);
    expect(paciente().queryByText(/Esto es lo que entendimos/)).toBeNull();
    expect(paciente().getByRole('button', { name: 'Fiebre' })).toBeTruthy();
  });

  it('cámara denegada: aviso y catálogo disponible, sin reconocimiento', async () => {
    const { user, paciente, reconocer, camara } = await abrir('desarrollo', 'denegada');
    await user.click(paciente().getByRole('button', { name: /Captura en LSM/ }));

    const alerta = await paciente().findByRole('alert');
    expect(alerta.textContent).toMatch(/No hay permiso para usar la cámara/);
    expect(alerta.textContent).toMatch(/elegir lo que sientes en el catálogo/);
    expect(reconocer).not.toHaveBeenCalled();
    expect(camara().encendida).toBe(false);
    await user.click(paciente().getByRole('button', { name: 'Tos' }));
    await user.click(paciente().getByRole('button', { name: /Revisar selección/ }));
    expect(paciente().getByText('Tengo tos.', { selector: 'li' })).toBeTruthy();
  });

  it('si la cámara se desconecta durante la captura, se descarta y se avisa', async () => {
    const { user, paciente, camara, reconocer } = await abrir();
    await user.click(paciente().getByRole('button', { name: /Captura en LSM/ }));
    await paciente().findByText('Cámara activa');
    camara().desconectar();
    expect((await paciente().findByRole('alert')).textContent).toMatch(/La cámara dejó de responder/);
    expect(reconocer).not.toHaveBeenCalled();
  });

  it('cierre durante el procesamiento: cámara liberada, reconocimiento abortado y la nueva sesión empieza vacía (RF-18)', async () => {
    const { user, paciente, medico, camara, camaras, simulador } = await abrir();
    await user.click(paciente().getByRole('button', { name: /Captura en LSM/ }));
    await user.click(await paciente().findByRole('button', { name: /Listo/ }));
    await paciente().findByText('Interpretando tu seña…');
    const capturaId = simulador().capturaPendiente!;
    const primera = camara();

    await user.click(medico().getByRole('button', { name: /Finalizar consulta/ }));
    await user.click(medico().getByRole('button', { name: 'Terminar y borrar' }));
    expect(await paciente().findByText('Consulta finalizada')).toBeTruthy();
    expect(primera.llamadas.at(-1)).toBe('liberar');
    expect(primera.encendida).toBe(false);
    expect(simulador().capturaPendiente).toBeNull();
    // Resultado tardío: no tiene a dónde llegar
    expect(simulador().elegir(capturaId, { tipo: 'reconocido', entradaId: 'PAC-S-04' })).toBe(false);

    await user.click(medico().getByRole('button', { name: 'Nueva consulta' }));
    await user.click(within(await paciente().findByRole('dialog', { name: 'Alcance de este apoyo' })).getByRole('button', { name: /Entendido/ }));
    expect(camaras).toHaveLength(2); // cámara nueva para la sesión nueva
    expect(paciente().queryByText(/Interpretando/)).toBeNull();
    expect(paciente().queryByText(/Tengo fiebre/)).toBeNull();
    expect(paciente().getByRole('button', { name: /Captura en LSM/ })).toBeTruthy();
    expect(medico().getByText(/Todavía no hay mensajes/)).toBeTruthy();
  });

  it('un mensaje del médico durante la captura se anuncia sin ocultar la cámara activa', async () => {
    const { user, paciente, medico } = await abrir();
    await user.click(paciente().getByRole('button', { name: /Captura en LSM/ }));
    await paciente().findByText('Cámara activa');
    await user.type(medico().getByLabelText('Buscar pregunta o respuesta'), 'desde');
    await user.click(medico().getByRole('button', { name: /Desde cuándo/ }));
    await user.click(medico().getByRole('button', { name: /Enviar al paciente/ }));

    expect(await paciente().findByText(/Llegó un mensaje del médico: «¿Desde cuándo tiene este síntoma\?»/)).toBeTruthy();
    expect(paciente().getByText('Cámara activa')).toBeTruthy();
    await user.click(paciente().getByRole('button', { name: /Cancelar/ }));
    expect(paciente().getByText('Mensaje del médico')).toBeTruthy();
  });

  it('con opciones elegidas la cámara no se inicia (no se pierde la selección)', async () => {
    const { user, paciente, camara } = await abrir();
    await user.click(paciente().getByRole('button', { name: 'Fiebre' }));
    const boton = paciente().getByRole('button', { name: /Captura en LSM/ }) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(paciente().getByText(/Quita las opciones elegidas para usar la cámara/)).toBeTruthy();
    expect(camara().llamadas).not.toContain('iniciar');
  });

  it('en el flujo de producto no hay simulador: la captura queda deshabilitada con su explicación', async () => {
    const { paciente, camara } = await abrir('producto');
    const boton = paciente().getByRole('button', { name: /Captura en LSM/ }) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(paciente().getByText(/El reconocimiento en LSM todavía no está disponible/)).toBeTruthy();
    expect(screen.queryByText(/Simulador/)).toBeNull();
    expect(camara().llamadas).not.toContain('iniciar');
  });
});
