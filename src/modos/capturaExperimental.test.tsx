import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PASOS, PESOS, caracteristicas } from '../reconocimiento/experimental/caracteristicas';
import type { ModeloReconocedor } from '../reconocimiento/experimental/clasificador';
import { ReconocedorExperimental } from '../reconocimiento/experimental/reconocedorExperimental';
import type { SecuenciaPuntos } from '../reconocimiento/experimental/puntos';
import { CamaraFalsa } from '../pruebas/camaraFalsa';
import { circulo, linea, quieta, secuencia } from '../pruebas/secuenciasSinteticas';
import { ModoDemostracion } from './modos';

/**
 * Recorrido con el reconocedor EXPERIMENTAL (cámara falsa, MediaPipe sustituido por puntos
 * sintéticos): la pantalla lo marca como «no validado» y lo desconocido no se adivina (RF-05).
 */
function vectores(s: SecuenciaPuntos) {
  const c = caracteristicas(s);
  if (!c.ok) throw new Error(c.motivo);
  return c.vectores;
}

const modelo: ModeloReconocedor = {
  version: 1,
  descripcion: 'prueba',
  pasos: PASOS,
  pesos: PESOS,
  banda: 5,
  umbralDistancia: 0.5,
  umbralMargen: 0.8,
  plantillas: [
    { entrada: 'PAC-S-04', origen: 'sintética', vectores: vectores(secuencia(circulo)) },
    { entrada: 'PAC-S-05', origen: 'sintética', vectores: vectores(secuencia(linea)) },
  ],
};

async function abrir(lo: SecuenciaPuntos) {
  const user = userEvent.setup();
  render(
    <ModoDemostracion
      politica="desarrollo"
      crearCamara={() => new CamaraFalsa()}
      crearReconocedor={(pol, cat) =>
        new ReconocedorExperimental(pol, cat, {
          cargarModelo: async () => modelo,
          extractor: async () => ({ extraer: async () => lo }),
        })
      }
    />,
  );
  const paciente = () => within(screen.getByRole('region', { name: 'Vista del paciente' }));
  const medico = () => within(screen.getByRole('region', { name: 'Vista del personal médico' }));
  await user.click(medico().getByRole('button', { name: 'Iniciar consulta' }));
  await user.click(within(await paciente().findByRole('dialog', { name: 'Alcance de este apoyo' })).getByRole('button', { name: /Entendido/ }));
  await user.click(await paciente().findByRole('button', { name: /Listo/ }));
  return { user, paciente, medico };
}

describe('Captura con el reconocedor experimental', () => {
  it('un caso reconocido queda en revisión, marcado «Reconocedor experimental · no validado», sin simulador', async () => {
    const { paciente, medico } = await abrir(secuencia(circulo));
    expect(await paciente().findByText(/Esto es lo que entendimos de tu seña/)).toBeTruthy();
    expect(paciente().getByText(/Reconocedor experimental · no validado/)).toBeTruthy();
    expect(paciente().getByText(/Distancia .*umbral.*respuesta en/)).toBeTruthy();
    expect(paciente().queryByText(/Resultado simulado/)).toBeNull();
    expect(paciente().queryByRole('region', { name: /Simulador del reconocimiento/ })).toBeNull();
    expect(paciente().getByText('Tengo fiebre.', { selector: 'li' })).toBeTruthy();
    expect(medico().getByText(/Todavía no hay mensajes/)).toBeTruthy();
  });

  it('una expresión desconocida muestra el aviso, la marca experimental y el motivo del rechazo (RF-05)', async () => {
    const { paciente, medico } = await abrir(secuencia(quieta, { abierta: 0.1 }));
    const alerta = await paciente().findByRole('alert');
    expect(within(alerta).getByText('No reconocimos tu seña')).toBeTruthy();
    expect(paciente().getByText(/Reconocedor experimental · no validado/)).toBeTruthy();
    expect(paciente().getByText(/Rechazo: no se parece lo suficiente/)).toBeTruthy();
    expect(medico().getByText(/Todavía no hay mensajes/)).toBeTruthy();
  });
});
