import { useState } from 'react';
import type { PoliticaRecursos } from '../nucleo/tipos';
import { IconoHojas } from '../vistas/comunes/Iconos';

/** Pantalla de arranque: elegir modo y política de recursos. */
export function Inicio() {
  const [politica, setPolitica] = useState<PoliticaRecursos>('desarrollo');
  const url = (modo: string) => `?modo=${modo}&recursos=${politica}`;

  return (
    <main className="inicio">
      <header className="inicio__cabecera">
        <p className="inicio__equipo">TechStar · Pinkies</p>
        <div className="inicio__marca">
          <IconoHojas />
          <h1 className="inicio__titulo">LSM - Consulta</h1>
        </div>
        <p className="inicio__lema">
          Apoyo a la comunicación entre personas Sordas y personal médico en consultas generales.
          <br />
          <strong>Etapa A</strong> · primera conversación en escritorio.
        </p>
      </header>

      <fieldset className="inicio__politica">
        <legend>Recursos en LSM</legend>
        <label className={politica === 'desarrollo' ? 'activa' : ''}>
          <input type="radio" name="politica" checked={politica === 'desarrollo'} onChange={() => setPolitica('desarrollo')} />
          <span>
            <strong>Modo desarrollo</strong>
            Permite recursos de prueba, marcados con franjas. Sirve para recorrer el flujo.
          </span>
        </label>
        <label className={politica === 'producto' ? 'activa' : ''}>
          <input type="radio" name="politica" checked={politica === 'producto'} onChange={() => setPolitica('producto')} />
          <span>
            <strong>Flujo de producto</strong>
            Solo envía entradas con recurso validado. Hoy no hay ninguno: todo queda bloqueado.
          </span>
        </label>
      </fieldset>

      <ol className="inicio__modos">
        <li>
          <a className="modo modo--principal" href={url('demo')}>
            <span className="modo__num">01</span>
            <span className="modo__nombre">Demostración en una pantalla</span>
            <span className="modo__desc">Las dos interfaces lado a lado. Respaldo de la entrega.</span>
          </a>
        </li>
        <li>
          <a className="modo" href={url('medico')} target="_blank" rel="noopener">
            <span className="modo__num">02</span>
            <span className="modo__nombre">Médico</span>
            <span className="modo__desc">Coordina la sesión. Abre esta ventana primero.</span>
          </a>
        </li>
        <li>
          <a className="modo" href="?modo=paciente" target="_blank" rel="noopener">
            <span className="modo__num">03</span>
            <span className="modo__nombre">Paciente</span>
            <span className="modo__desc">Se conecta a la ventana del médico en esta computadora.</span>
          </a>
        </li>
      </ol>

      <p className="inicio__nota">
        Catálogo ficticio de desarrollo. Ningún recurso está validado en LSM. Los modos 02 y 03 funcionan en
        dos ventanas del mismo navegador; la conexión entre dos laptops llega en la etapa B.
      </p>
    </main>
  );
}
