/**
 * Se muestra en lugar de cualquier modo cuando `catalogo/*.json` tiene errores.
 * No se abre sesión: un catálogo dudoso podría entregar un mensaje con un recurso equivocado.
 */
export function CatalogoInvalido({ errores }: { errores: readonly string[] }) {
  return (
    <main className="inicio" role="alert">
      <header className="inicio__cabecera">
        <h1 className="inicio__titulo">El catálogo tiene errores</h1>
        <p className="inicio__lema">
          La aplicación no abre ninguna consulta hasta corregirlos. Ejecuta <code>npm run validar-catalogo</code> para
          ver el detalle y revisa la sección «Editar el catálogo» del README.
        </p>
      </header>
      <ul className="nota nota--alerta catalogo-invalido">
        {errores.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </main>
  );
}
