/**
 * Iconos de la interfaz. Lucide (licencia ISC) con trazo uniforme; el logotipo de hojas
 * reproduce el del prototipo Pinkies V2. Decorativos: siempre van con texto.
 */
import {
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock,
  FlaskConical,
  HeartPulse,
  Info,
  Laptop,
  Link,
  LogOut,
  MessageSquare,
  MessagesSquare,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  Video,
  VideoOff,
  LoaderCircle,
  RotateCcw,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';

const trazo = { strokeWidth: 2, 'aria-hidden': true } as const;

export function IconoHojas() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32" width="28" height="28" className="icono-hojas">
      <path d="M15 29C9 25 6 18 9 8c5 5 8 12 6 21Z" fill="#395443" />
      <path d="M16 29c1-8 5-14 12-17-1 9-6 15-12 17Z" fill="#AEB6A9" />
      <path d="M14 29C9 27 4 23 3 16c5 1 9 6 11 13Z" fill="#DDA78B" />
    </svg>
  );
}

export const IconoSalir = () => <LogOut size={17} {...trazo} />;
export const IconoCorazon = () => <HeartPulse size={28} strokeWidth={1.75} aria-hidden />;
export const IconoPortapapeles = () => <ClipboardList size={28} strokeWidth={1.75} aria-hidden />;
export const IconoCheck = () => <Check size={16} strokeWidth={3} aria-hidden />;
export const IconoDobleCheck = () => <CheckCheck size={15} {...trazo} />;
export const IconoX = () => <X size={15} strokeWidth={2.5} aria-hidden />;
export function IconoChevron({ direccion = 'derecha' }: { direccion?: 'derecha' | 'izquierda' }) {
  return direccion === 'izquierda' ? <ChevronLeft size={22} {...trazo} /> : <ChevronRight size={22} {...trazo} />;
}
export const IconoGlobo = () => <MessageSquare size={17} {...trazo} />;
export const IconoVideo = () => <Video size={20} {...trazo} />;
export const IconoVideoApagado = ({ tamano = 20 }: { tamano?: number }) => <VideoOff size={tamano} {...trazo} />;
export const IconoCargando = () => <LoaderCircle size={34} strokeWidth={1.75} className="girar" aria-hidden />;
export const IconoReintentar = () => <RotateCcw size={18} {...trazo} />;
export const IconoReproducir = ({ tamano = 18 }: { tamano?: number }) => (
  <Play size={tamano} strokeWidth={0} fill="currentColor" aria-hidden />
);
export const IconoInfo = () => <Info size={16} {...trazo} />;
export const IconoConversacion = () => <MessagesSquare size={16} {...trazo} />;
export const IconoPregunta = ({ tamano = 18 }: { tamano?: number }) => <CircleHelp size={tamano} {...trazo} />;
export const IconoEnviado = () => <Send size={15} {...trazo} />;
export const IconoReloj = () => <Clock size={40} strokeWidth={1.5} aria-hidden />;
export const IconoListo = () => <Sparkles size={40} strokeWidth={1.5} aria-hidden />;
export const IconoMatraz = () => <FlaskConical size={15} {...trazo} />;
export const IconoEscudo = () => <ShieldCheck size={15} {...trazo} />;
export const IconoWifi = () => <Wifi size={16} {...trazo} />;
export const IconoSinWifi = () => <WifiOff size={16} {...trazo} />;
export const IconoVincular = () => <Link size={16} {...trazo} />;
export const IconoLaptop = () => <Laptop size={16} {...trazo} />;
