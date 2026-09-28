import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Decksmith — AI Presentation Builder', description: 'Agentic presentation editor' };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
