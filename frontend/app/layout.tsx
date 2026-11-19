import type {Metadata} from 'next';
import './styles.css';
export const metadata:Metadata={title:'SGE | Sistema de Gestión Escolar',description:'Plataforma académica de demostración'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
