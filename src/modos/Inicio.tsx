import { useState } from 'react';
import type { PoliticaRecursos } from '../nucleo/tipos';
import type { TipoReconocedor } from '../reconocimiento/tipoReconocedor';
import { IconoHojas } from '../vistas/comunes/Iconos';

/** Pantalla de arranque: elegir modo y política de recursos. */
export function Inicio() {
  const [politica, setPolitica] = useState<PoliticaRecursos>('desarrollo');
  const [reconocedor, setReconocedor] = useState<TipoReconocedor>('simulado');
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
          <strong>Etapa B</strong> · dos laptops por Wi-Fi local (app de escritorio). <strong>Etapa C</strong> · captura
          con cámara y reconocedor simulado o experimental, no validado (solo modo desarrollo).
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

      {politica === 'desarrollo' && (
        <fieldset className="inicio__politica">
          <legend>Reconocedor de la demostración (modo desarrollo)</legend>
          <label className={reconocedor === 'simulado' ? 'activa' : ''}>
            <input type="radio" name="reconocedor" checked={reconocedor === 'simulado'} onChange={() => setReconocedor('simulado')} />
            <span>
              <strong>Simulador</strong>
              No reconoce LSM: quien dirige la prueba elige el resultado.
            </span>
          </label>
          <label className={reconocedor === 'experimental' ? 'activa' : ''}>
            <input
              type="radio"
              name="reconocedor"
              checked={reconocedor === 'experimental'}
              onChange={() => setReconocedor('experimental')}
            />
            <span>
              <strong>Experimental · no validado</strong>
              8 señas con plantillas de videos web. Sin pruebas con personas Sordas.
            </span>
          </label>
        </fieldset>
      )}

      <ol className="inicio__modos">
        <li>
          <a className="modo modo--principal" href={`${url('demo')}&reconocedor=${reconocedor}`}>
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
        <li>
          <a className="modo" href="?modo=paciente-red" target="_blank" rel="noopener">
            <span className="modo__num">04</span>
            <span className="modo__nombre">Paciente por red</span>
            <span className="modo__desc">Se vincula con la app de escritorio del médico (dirección y código).</span>
          </a>
        </li>
      </ol>

      <p className="inicio__nota">
        Catálogo ficticio de desarrollo. Ningún recurso está validado en LSM. Los modos 02 y 03 funcionan en
        dos ventanas del mismo navegador. Para dos laptops se usa la app de escritorio:{' '}
        <code>npm run electron:medico</code> y <code>npm run electron:paciente</code> (ver README).
      </p>
    </main>
  );
}
