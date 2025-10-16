'use client';
import useSWR from 'swr';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

const fetcher = (url) => fetch(url, { credentials: 'include' }).then(r => {
  if (!r.ok) throw new Error('error');
  return r.json();
});

export default function Home() {
  const { data, error, mutate } = useSWR(null, null); // lazy

  const login = () => {
    window.location.href = `${API_BASE}/auth/login`;
  };

  const loadAccounts = async () => {
    try {
      const res = await fetch(`${API_BASE}/me/accounts`, { credentials: 'include' });
      const json = await res.json();
      (window).__ACCOUNTS__ = json;
      alert('Cuentas cargadas; revisá la consola.');
      console.log('Accounts+IG:', json);
    } catch (e) {
      alert('Error cargando cuentas (¿hiciste login?)');
    }
  };

  return (
    <main>
      <h1>IG CRM — Starter</h1>
      <p>Conectá tu Meta y listá todas tus IG vinculadas para tildarlas en masa.</p>
      <div style={{ display:'flex', gap:12, marginTop: 12 }}>
        <button onClick={login}>Conectar Meta</button>
        <button onClick={loadAccounts}>Listar IG</button>
      </div>

      <hr style={{ margin: '24px 0' }} />

      <h2>Inbox unificado (placeholder)</h2>
      <p>Acá va tu UI de conversaciones y mensajes. Pedile a Codex que la construya a partir del endpoint del webhook y la DB.</p>
    </main>
  );
}
