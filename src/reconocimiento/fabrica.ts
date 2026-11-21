import { ReconocedorExperimental } from './experimental/reconocedorExperimental';
import { reconocedorPorPolitica, type FabricaReconocedor } from './reconocedor';
import type { TipoReconocedor } from './tipoReconocedor';

export { leerTipoReconocedor, type TipoReconocedor } from './tipoReconocedor';

/** Fábrica del modo desarrollo según el tipo elegido. En producto, ninguna devuelve reconocedor. */
export function fabricaDeReconocedor(tipo: TipoReconocedor): FabricaReconocedor {
  if (tipo === 'simulado') return reconocedorPorPolitica;
  return (politica, catalogo) => (politica === 'desarrollo' ? new ReconocedorExperimental(politica, catalogo) : null);
}
