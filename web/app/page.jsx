export default function Home() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        paddingTop: 80,
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: 36, marginBottom: 16 }}>Empezá a responder tus DMs</h1>
      <p style={{ fontSize: 18, margin: '0 auto 32px', maxWidth: 520 }}>
        Conectá tus cuentas de Instagram una vez y gestioná todos los mensajes desde un solo inbox.
      </p>
      <a
        href="/connect"
        style={{
          display: 'inline-block',
          background: '#2563eb',
          color: '#ffffff',
          padding: '18px 36px',
          borderRadius: 999,
          fontSize: 18,
          fontWeight: 600,
          textDecoration: 'none',
          boxShadow: '0 10px 30px rgba(37, 99, 235, 0.25)',
        }}
      >
        Conectar Instagram
      </a>
      <div style={{ marginTop: 48, display: 'flex', justifyContent: 'center', gap: 24 }}>
        <div style={{ maxWidth: 180 }}>
          <strong>1. Autorizá</strong>
          <p style={{ marginTop: 8, fontSize: 14, color: '#4b5563' }}>
            Iniciá sesión con Meta y aceptá el acceso a tus cuentas de Instagram.
          </p>
        </div>
        <div style={{ maxWidth: 180 }}>
          <strong>2. Guardá</strong>
          <p style={{ marginTop: 8, fontSize: 14, color: '#4b5563' }}>
            Elegí todas tus cuentas y guardá la conexión en un solo paso.
          </p>
        </div>
        <div style={{ maxWidth: 180 }}>
          <strong>3. Respondé</strong>
          <p style={{ marginTop: 8, fontSize: 14, color: '#4b5563' }}>
            Abrí el inbox y respondé mensajes sin salir de esta pantalla.
          </p>
        </div>
      </div>
    </main>
  );
}
