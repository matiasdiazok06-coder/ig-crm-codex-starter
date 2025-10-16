export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: 'system-ui', margin: 0, padding: 20 }}>
        {children}
      </body>
    </html>
  );
}
