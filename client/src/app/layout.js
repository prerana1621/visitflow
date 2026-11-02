import './globals.css';

export const metadata = {
  title: 'VisitFlow | Discover. Ask. Visit.',
  description: 'A calmer way to explore homes and book a site visit.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
