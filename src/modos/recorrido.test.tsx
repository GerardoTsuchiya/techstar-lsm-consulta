import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { PoliticaRecursos } from '../nucleo/tipos';
import { ModoDemostracion } from './modos';

/**
 * Recorridos de la etapa A en el modo «demostración en una pantalla».
 * Usan las vistas reales, el coordinador real y el transporte en memoria.
 */

async function abrir(politica: PoliticaRecursos = 'desarrollo') {
  const user = userEvent.setup();
  render(<ModoDemostracion politica={politica} />);
  const paciente = () => within(screen.getByRole('region', { name: 'Vista del paciente' }));
  const medico = () => within(screen.getByRole('region', { name: 'Vista del personal médico' }));
  await user.click(medico().getByRole('button', { name: 'Iniciar consulta' }));
  return { user, paciente, medico };
}

async function cerrarAviso(user: ReturnType<typeof userEvent.setup>, paciente: () => ReturnType<typeof within>) {
  const aviso = await paciente().findByRole('dialog', { name: 'Alcance de este apoyo' });
  expect(within(aviso).getByText(/no sustituye a un intérprete de LSM/)).toBeTruthy();
  await user.click(within(aviso).getByRole('button', { name: /Entendido/ }));
}

describe('Recorrido de ida y vuelta (etapa A)', () => {
  it('borrador solo en el paciente, envío único, respuesta, «No entendí» vinculado y cierre', async () => {
    const { user, paciente, medico } = await abrir();
    await cerrarAviso(user, paciente);

    // Selección; la intensidad opcional se indica en la revisión, como en el prototipo
    await user.click(paciente().getByRole('button', { name: 'Dolor de cabeza' }));
    await user.click(paciente().getByRole('button', { name: 'Fiebre' }));
    await user.click(paciente().getByRole('button', { name: /Revisar selección/ }));
    await user.click(paciente().getByRole('button', { name: '7 de 10' }));

    // Revisión: el borrador NO aparece en la vista del médico (RF-04)
    expect(paciente().getByText('Tengo dolor de cabeza. Intensidad del dolor: 7 de 10.')).toBeTruthy();
    expect(medico().queryByText(/dolor de cabeza/)).toBeNull();
    expect(medico().getByText(/Todavía no hay mensajes/)).toBeTruthy();

    // Doble toque en confirmar: un solo mensaje (RF-07)
    await user.dblClick(paciente().getByRole('button', { name: /Confirmar mensaje/ }));
    expect(await medico().findByText('Tengo dolor de cabeza.')).toBeTruthy();
    expect(medico().getByText('Intensidad del dolor: 7 de 10')).toBeTruthy();
    expect(medico().getByText('Tengo fiebre.')).toBeTruthy();
    expect(medico().getAllByText('Tengo dolor de cabeza.')).toHaveLength(1);
    expect(await paciente().findByText(/El médico lo recibió/)).toBeTruthy();

    // El médico busca, revisa y envía (RF-14, RF-02)
    await user.type(medico().getByLabelText('Buscar pregunta o respuesta'), 'ALERGIA');
    await user.click(medico().getByRole('button', { name: /Tiene alergia a algún medicamento/ }));
    expect(medico().getByText('Revisar antes de enviar')).toBeTruthy();
    expect(paciente().queryByText('¿Tiene alergia a algún medicamento?')).toBeNull(); // seleccionar no envía
    await user.click(medico().getByRole('button', { name: /Enviar al paciente/ }));

    // Llega al paciente con su recurso
    const textoPregunta = await paciente().findByText('¿Tiene alergia a algún medicamento?');
    const mensajePaciente = textoPregunta.closest('[data-mensaje]')!;
    const idPregunta = mensajePaciente.getAttribute('data-mensaje');
    expect(mensajePaciente.querySelector('[data-recurso="REC-PRUEBA-MED-P-03"]')).toBeTruthy();
    expect(await medico().findByText(/Se mostró en la pantalla del paciente/)).toBeTruthy();

    // «No entendí» señala el mensaje correcto (RF-15)
    await user.click(within(mensajePaciente as HTMLElement).getByRole('button', { name: /No entendí/ }));
    const alerta = await medico().findByText(/El paciente no entendió:/);
    const contenedorAlerta = alerta.closest('[data-aclaracion-de]')!;
    expect(contenedorAlerta.getAttribute('data-aclaracion-de')).toBe(idPregunta);
    expect(contenedorAlerta.textContent).toContain('¿Tiene alergia a algún medicamento?');
    expect(paciente().getByText(/Le avisamos al médico/)).toBeTruthy();

    // El médico elige otra entrada; el aviso queda atendido
    await user.click(medico().getByRole('button', { name: 'Elegir otra entrada' }));
    await user.type(medico().getByLabelText('Buscar pregunta o respuesta'), 'toma');
    await user.click(medico().getByRole('button', { name: /Está tomando algún medicamento/ }));
    await user.click(medico().getByRole('button', { name: /Enviar al paciente/ }));
    expect(await paciente().findByText('¿Está tomando algún medicamento?')).toBeTruthy();
    expect(medico().queryByText(/El paciente no entendió:/)).toBeNull();
    expect(medico().getByText(/respondida con «¿Está tomando algún medicamento\?»/)).toBeTruthy();

    // Cierre: borra ambas vistas y la nueva sesión empieza vacía (RF-18)
    await user.click(medico().getByRole('button', { name: /Finalizar consulta/ }));
    await user.click(medico().getByRole('button', { name: 'Terminar y borrar' }));
    expect((await medico().findAllByText('Consulta finalizada')).length).toBeGreaterThan(0);
    expect(paciente().getByText('Consulta finalizada')).toBeTruthy();
    expect(screen.queryByText(/alergia/)).toBeNull();
    expect(screen.queryByText(/dolor de cabeza/)).toBeNull();

    await user.click(medico().getByRole('button', { name: 'Nueva consulta' }));
    await cerrarAviso(user, paciente);
    expect(medico().getByText(/Todavía no hay mensajes/)).toBeTruthy();
    expect(paciente().getByRole('button', { name: /Conversación \(0\)/ })).toBeTruthy();
    expect(paciente().getByRole('button', { name: 'Dolor de cabeza' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('sin intensidad elegida no se transmite ningún valor (RF-19)', async () => {
    const { user, paciente, medico } = await abrir();
    await cerrarAviso(user, paciente);
    await user.click(paciente().getByRole('button', { name: 'Dolor de estómago' }));
    await user.click(paciente().getByRole('button', { name: /Revisar selección/ }));
    expect(paciente().getByRole('button', { name: 'Sin indicar' }).getAttribute('aria-pressed')).toBe('true');
    await user.click(paciente().getByRole('button', { name: /Confirmar mensaje/ }));
    expect(await medico().findByText('Tengo dolor de estómago.')).toBeTruthy();
    expect(medico().queryByText(/Intensidad/)).toBeNull();
  });

  it('el paciente responde con un síntoma y desde cuándo en un solo mensaje (respuestas breves, §6.3)', async () => {
    const { user, paciente, medico } = await abrir();
    await cerrarAviso(user, paciente);
    await user.click(paciente().getByRole('button', { name: 'Fiebre' }));
    await user.click(paciente().getByRole('button', { name: 'Página siguiente' }));
    await user.click(paciente().getByRole('button', { name: 'Página siguiente' }));
    await user.click(paciente().getByRole('button', { name: 'Desde ayer' }));
    await user.click(paciente().getByRole('button', { name: /Revisar selección/ }));
    await user.click(paciente().getByRole('button', { name: /Confirmar mensaje/ }));
    expect(await medico().findByText('Tengo fiebre.')).toBeTruthy();
    expect(medico().getByText('Desde ayer.')).toBeTruthy();
  });

  it('«Cambiar selección» conserva la selección y «Descartar» la elimina sin enviar (RF-13)', async () => {
    const { user, paciente, medico } = await abrir();
    await cerrarAviso(user, paciente);
    await user.click(paciente().getByRole('button', { name: 'Tos' }));
    await user.click(paciente().getByRole('button', { name: /Revisar selección/ }));
    await user.click(paciente().getByRole('button', { name: /Cambiar selección/ }));
    expect(paciente().getByRole('button', { name: 'Tos' }).getAttribute('aria-pressed')).toBe('true');

    await user.click(paciente().getByRole('button', { name: 'Página siguiente' }));
    await user.click(paciente().getByRole('button', { name: 'Náuseas' }));
    await user.click(paciente().getByRole('button', { name: /Revisar selección/ }));
    expect(paciente().getByText('Tengo náuseas.', { selector: 'li' })).toBeTruthy();
    await user.click(paciente().getByRole('button', { name: /Descartar mensaje/ }));

    expect(paciente().getByRole('button', { name: 'Tos' }).getAttribute('aria-pressed')).toBe('false');
    expect(medico().getByText(/Todavía no hay mensajes/)).toBeTruthy();
  });

  it('bloquea entradas sin recurso en ambas vistas y muestra «Sin resultados»', async () => {
    const { user, paciente, medico } = await abrir();
    await cerrarAviso(user, paciente);

    await user.click(paciente().getByRole('button', { name: 'Mareo' }));
    await user.click(paciente().getByRole('button', { name: /Revisar selección/ }));
    expect(paciente().getByText(/Quita esta opción para poder confirmar/)).toBeTruthy();
    expect((paciente().getByRole('button', { name: /Confirmar mensaje/ }) as HTMLButtonElement).disabled).toBe(true);

    const buscar = medico().getByLabelText('Buscar pregunta o respuesta');
    await user.type(buscar, 'cirugía');
    expect(medico().getByText('Sin resultados')).toBeTruthy();
    await user.clear(buscar);
    await user.type(buscar, 'vomito');
    await user.click(medico().getByRole('button', { name: /Ha tenido vómito/ }));
    expect(medico().getByText(/no tiene recurso en LSM validado/)).toBeTruthy();
    expect((medico().getByRole('button', { name: /Enviar al paciente/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(paciente().queryByText('¿Ha tenido vómito?')).toBeNull();
  });

  it('en el flujo de producto los recursos de prueba no se pueden enviar', async () => {
    const { user, paciente, medico } = await abrir('producto');
    const aviso = await paciente().findByRole('dialog', { name: 'Alcance de este apoyo' });
    expect(within(aviso).getByText(/todavía no tiene un recurso en LSM validado/)).toBeTruthy();
    await user.click(within(aviso).getByRole('button', { name: /Entendido/ }));

    await user.click(paciente().getByRole('button', { name: 'Fiebre' }));
    await user.click(paciente().getByRole('button', { name: /Revisar selección/ }));
    expect((paciente().getByRole('button', { name: /Confirmar mensaje/ }) as HTMLButtonElement).disabled).toBe(true);

    await user.type(medico().getByLabelText('Buscar pregunta o respuesta'), 'desde');
    await user.click(medico().getByRole('button', { name: /Desde cuándo/ }));
    expect(medico().getByText(/no está validado/)).toBeTruthy();
    expect((medico().getByRole('button', { name: /Enviar al paciente/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('el aviso de alcance puede consultarse de nuevo sin perder el mensaje en revisión (RF-16)', async () => {
    const { user, paciente } = await abrir();
    await cerrarAviso(user, paciente);
    await user.click(paciente().getByRole('button', { name: 'Tos' }));
    await user.click(paciente().getByRole('button', { name: /Revisar selección/ }));
    await user.click(paciente().getByRole('button', { name: /Alcance/ }));
    await cerrarAviso(user, paciente);
    expect(paciente().getByText('Mensaje a enviar')).toBeTruthy();
    expect(paciente().getByText('Tengo tos.', { selector: 'li' })).toBeTruthy();
  });

  it('el médico ve preguntas sugeridas por los síntomas y las generales sin buscar (D55)', async () => {
    const { user, paciente, medico } = await abrir();
    await cerrarAviso(user, paciente);

    // Antes de que el paciente diga algo: solo las generales
    const generales = medico().getByRole('list', { name: 'Preguntas generales' });
    expect(within(generales).getByRole('button', { name: /Tiene alergia a algún medicamento/ })).toBeTruthy();
    expect(medico().queryByRole('list', { name: 'Sugeridas por los síntomas' })).toBeNull();

    // El paciente confirma «Tos» y «Fiebre»
    await user.click(paciente().getByRole('button', { name: 'Tos' }));
    await user.click(paciente().getByRole('button', { name: 'Fiebre' }));
    await user.click(paciente().getByRole('button', { name: /Revisar selección/ }));
    await user.click(paciente().getByRole('button', { name: /Confirmar mensaje/ }));
    await medico().findByText('Tengo tos.');

    const sugeridas = medico().getByRole('list', { name: 'Sugeridas por los síntomas' });
    const flemas = within(sugeridas).getByRole('button', { name: /Tiene flemas al toser/ });
    expect(flemas.textContent).toContain('por Tos');
    expect(flemas.textContent).not.toContain('por Tos y Fiebre');
    expect(within(sugeridas).getByRole('button', { name: /Desde cuándo/ }).textContent).toContain('por Tos y Fiebre');

    // Elegirla abre la misma revisión; al enviarla deja de sugerirse
    await user.click(flemas);
    expect(medico().getByText('Revisar antes de enviar')).toBeTruthy();
    await user.click(medico().getByRole('button', { name: /Enviar al paciente/ }));
    expect(await paciente().findByText('¿Tiene flemas al toser?')).toBeTruthy();
    expect(within(medico().getByRole('list', { name: 'Sugeridas por los síntomas' })).queryByRole('button', { name: /Tiene flemas al toser/ })).toBeNull();

    // Al escribir, las sugerencias dan paso a los resultados de la búsqueda
    await user.type(medico().getByLabelText('Buscar pregunta o respuesta'), 'diarrea');
    expect(medico().queryByRole('list', { name: 'Sugeridas por los síntomas' })).toBeNull();
    expect(medico().getByRole('button', { name: /Ha tenido diarrea/ })).toBeTruthy();
  });

  it('una pregunta sugerida sin recurso validado abre la revisión pero no se puede enviar (D55, RF-02)', async () => {
    const { user, paciente, medico } = await abrir();
    await cerrarAviso(user, paciente);

    await user.click(paciente().getByRole('button', { name: 'Dolor de estómago' }));
    await user.click(paciente().getByRole('button', { name: /Revisar selección/ }));
    await user.click(paciente().getByRole('button', { name: /Confirmar mensaje/ }));
    await medico().findByText('Tengo dolor de estómago.');

    const sugeridas = medico().getByRole('list', { name: 'Sugeridas por los síntomas' });
    const vomito = within(sugeridas).getByRole('button', { name: /Ha tenido vómito/ });
    expect(vomito.textContent).toContain('Sin recurso');

    await user.click(vomito);
    expect(medico().getByText('Revisar antes de enviar')).toBeTruthy();
    expect(medico().getByText(/no tiene recurso en LSM validado/)).toBeTruthy();
    expect((medico().getByRole('button', { name: /Enviar al paciente/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(paciente().queryByText('¿Ha tenido vómito?')).toBeNull();
  });
});
