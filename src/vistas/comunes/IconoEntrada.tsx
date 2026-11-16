import {
  BatteryLow,
  Brain,
  CalendarClock,
  Check,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  Droplets,
  Eye,
  Frown,
  Gauge,
  HandHeart,
  Hourglass,
  Info,
  Orbit,
  Pill,
  PillBottle,
  Pointer,
  Speech,
  Stethoscope,
  Thermometer,
  ThumbsDown,
  ThumbsUp,
  Wind,
  X,
  type LucideProps,
  ScanSearch,
  VideoOff,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { ClaveIcono } from '../../catalogo/validarCatalogo';

/** Estómago dibujado con el mismo trazo que Lucide (no existe en la librería). */
function Estomago({ size = 24, strokeWidth = 2, className }: LucideProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 2v4c0 1.5 1 2.5 2.5 2.5H14a6 6 0 0 1 6 6 7 7 0 0 1-7 7H9.5A4.5 4.5 0 0 1 5 17c0-2 1.5-3 3-3h2.5" />
      <path d="M13 21.5v.5" />
    </svg>
  );
}

/**
 * Iconos provisionales de apoyo visual (no validados con personas Sordas).
 * Lucide (licencia ISC) con trazo uniforme, en lugar de emoji.
 * Las claves deben coincidir con `CLAVES_ICONO` (validador del catálogo): el compilador lo comprueba.
 */
const ICONOS: Record<ClaveIcono, ComponentType<LucideProps>> = {
  cabeza: Brain,
  estomago: Estomago,
  garganta: Speech,
  fiebre: Thermometer,
  tos: Wind,
  mareo: Orbit,
  nauseas: Frown,
  cansancio: BatteryLow,
  si: ThumbsUp,
  no: ThumbsDown,
  'no-se': CircleHelp,
  calendario: CalendarClock,
  senalar: Pointer,
  alergia: Pill,
  medicamento: PillBottle,
  vomito: Droplets,
  revisar: Stethoscope,
  esperar: Hourglass,
  interprete: HandHeart,
  terminar: CircleCheck,
  // Controles y avisos del sistema
  alcance: Info,
  escala: Gauge,
  'ver-mensaje': Eye,
  confirmar: Check,
  descartar: X,
  'no-entendi': CircleHelp,
  desconocida: ScanSearch,
  'cancelar-captura': VideoOff,
};

export function IconoEntrada({ clave, tamano = 24, className }: { clave?: string; tamano?: number; className?: string }) {
  const Icono = (clave && (ICONOS as Partial<Record<string, ComponentType<LucideProps>>>)[clave]) || CircleDashed;
  return <Icono size={tamano} strokeWidth={1.75} className={className} aria-hidden="true" />;
}
