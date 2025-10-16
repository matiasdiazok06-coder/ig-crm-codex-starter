'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    let message = 'No se pudo completar la acción.';
    try {
      const data = await response.json();
      message = data.error || message;
    } catch (error) {
      const text = await response.text();
      if (text) message = text;
    }
    const customError = new Error(message);
    customError.status = response.status;
    throw customError;
  }

  return response.json();
}

export default function ConnectPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageTone, setMessageTone] = useState('info');
  const [warnings, setWarnings] = useState([]);
  const [authMissing, setAuthMissing] = useState(false);

  useEffect(() => {
    loadAccounts({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allSelected = useMemo(() => {
    if (!accounts.length) return false;
    return accounts.every((account) => selectedIds.has(account.igUserId));
  }, [accounts, selectedIds]);

  const login = () => {
    window.location.href = `${API_BASE}/auth/login`;
  };

  const loadAccounts = async ({ silent = false } = {}) => {
    setLoading(true);
    if (!silent) {
      setMessage(null);
    }
    try {
      const data = await apiFetch('/me/accounts');
      setAccounts(data);
      setWarnings([]);
      setSelectedIds(new Set(data.map((item) => item.igUserId)));
      setAuthMissing(false);
      if (!silent) {
        if (data.length === 0) {
          setMessage('No encontramos cuentas de Instagram listas para conectar. Probá actualizar en unos minutos.');
          setMessageTone('info');
        } else {
          setMessage('Seleccioná las cuentas que querés usar y guardá la conexión.');
          setMessageTone('info');
        }
      }
    } catch (error) {
      setAccounts([]);
      setSelectedIds(new Set());
      if (error.status === 401) {
        setAuthMissing(true);
        setMessage('Necesitamos tu permiso para leer y responder mensajes. Tocá "Conectar Instagram".');
        setMessageTone('warning');
      } else {
        setAuthMissing(false);
        setMessage(error.message || 'No pudimos cargar tus cuentas. Intentá de nuevo.');
        setMessageTone('warning');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleAccount = (igUserId) => {
    const next = new Set(selectedIds);
    if (next.has(igUserId)) {
      next.delete(igUserId);
    } else {
      next.add(igUserId);
    }
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(accounts.map((account) => account.igUserId)));
    }
  };

  const connectSelected = async () => {
    if (!selectedIds.size) {
      setMessage('Seleccioná al menos una cuenta para continuar.');
      setMessageTone('warning');
      return;
    }
    setLoading(true);
    setMessage(null);
    setWarnings([]);
    try {
      const payload = accounts
        .filter((account) => selectedIds.has(account.igUserId))
        .map((account) => ({
          igUserId: account.igUserId,
          igUsername: account.igUsername,
          pageId: account.pageId,
        }));
      const response = await apiFetch('/accounts/connect', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setWarnings(response.warnings || []);
      if ((response.connected || []).length > 0) {
        setMessage('Listo, tus cuentas quedan guardadas. Ya podés abrir el Inbox.');
        setMessageTone('success');
      } else {
        setMessage('No pudimos guardar la conexión. Revisá las advertencias debajo.');
        setMessageTone('warning');
      }
      if ((response.warnings || []).length === 0 && (response.connected || []).length > 0) {
        setTimeout(() => router.push('/inbox'), 500);
      }
    } catch (error) {
      setMessage(error.message || 'No se pudo conectar las cuentas seleccionadas.');
      setMessageTone('warning');
    } finally {
      setLoading(false);
    }
  };

  const messageBackground = {
    info: '#e0f2fe',
    warning: '#fef3c7',
    success: '#dcfce7',
  }[messageTone];

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', paddingTop: 32 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Conectá tus cuentas de Instagram</h1>
          <p style={{ margin: '6px 0 0', color: '#4b5563' }}>
            Elegí todas tus cuentas en un solo paso y respondé los mensajes desde el inbox unificado.
          </p>
        </div>
        <button
          onClick={login}
          style={{
            padding: '12px 18px',
            fontSize: 16,
            borderRadius: 12,
            border: 'none',
            background: '#2563eb',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)',
          }}
        >
          Conectar Instagram
        </button>
      </header>

      <section style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <button
          disabled={loading}
          onClick={() => loadAccounts()}
          style={{
            padding: '10px 16px',
            fontSize: 15,
            borderRadius: 12,
            border: '1px solid #2563eb',
            background: '#fff',
            color: '#2563eb',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {loading ? 'Cargando…' : 'Mostrar mis cuentas'}
        </button>
        <a href="/inbox" style={{ fontSize: 15, fontWeight: 600, color: '#1f2937' }}>
          Ir al Inbox
        </a>
      </section>

      {message && (
        <div
          style={{
            marginBottom: 16,
            padding: '14px 18px',
            borderRadius: 12,
            background: messageBackground,
            fontSize: 15,
          }}
        >
          {message}
        </div>
      )}

      {accounts.length > 0 ? (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 200px 1fr 220px',
              fontWeight: 600,
              padding: '12px 16px',
              background: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              Seleccionar todas
            </label>
            <span>Cuenta de Instagram</span>
            <span>Nombre de la página</span>
            <span>Estado</span>
          </div>
          {accounts.map((account) => {
            const selected = selectedIds.has(account.igUserId);
            return (
              <div
                key={account.igUserId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 200px 1fr 220px',
                  padding: '12px 16px',
                  borderBottom: '1px solid #f3f4f6',
                  alignItems: 'center',
                  background: selected ? '#eff6ff' : '#fff',
                }}
              >
                <input type="checkbox" checked={selected} onChange={() => toggleAccount(account.igUserId)} />
                <div>
                  <strong>@{account.igUsername}</strong>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{account.igUserId}</div>
                </div>
                <div>
                  <div>{account.pageName}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{account.pageId}</div>
                </div>
                <div style={{ fontSize: 13 }}>
                  {account.isMessageAccessEnabled === false ? (
                    <span style={{ color: '#dc2626' }}>
                      Activá el acceso a mensajes en Instagram → Privacidad → Mensajes → Herramientas conectadas.
                    </span>
                  ) : account.isMessageAccessEnabled === true ? (
                    <span style={{ color: '#059669' }}>Lista para conectar</span>
                  ) : (
                    <span style={{ color: '#d97706' }}>Verificá la configuración antes de guardar</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ color: '#6b7280', fontSize: 15 }}>
          {authMissing
            ? 'Necesitamos tu permiso antes de mostrar las cuentas. Tocá "Conectar Instagram" y aceptá el acceso.'
            : 'Todavía no mostramos tus cuentas. Tocá "Mostrar mis cuentas" para traer la lista actualizada.'}
        </p>
      )}

      <div style={{ marginTop: 24 }}>
        <button
          onClick={connectSelected}
          disabled={loading || !selectedIds.size}
          style={{
            padding: '14px 24px',
            fontSize: 16,
            borderRadius: 12,
            border: 'none',
            background: loading || !selectedIds.size ? '#9ca3af' : '#111827',
            color: '#fff',
            fontWeight: 600,
            cursor: loading || !selectedIds.size ? 'not-allowed' : 'pointer',
            boxShadow: '0 10px 30px rgba(17, 24, 39, 0.25)',
          }}
        >
          Guardar selección
        </button>
      </div>

      {warnings.length > 0 && (
        <div
          style={{
            marginTop: 24,
            background: '#fff7ed',
            border: '1px solid #f59e0b',
            padding: 16,
            borderRadius: 12,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Revisá estas cuentas</h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {warnings.map((warning) => (
              <li key={`${warning.igUserId}-${warning.reason}`} style={{ marginBottom: 6 }}>
                @{accounts.find((account) => account.igUserId === warning.igUserId)?.igUsername || warning.igUserId}:{' '}
                {warning.reason === 'message_access_disabled'
                  ? 'Activá el acceso a mensajes en Instagram → Privacidad → Mensajes → Herramientas conectadas.'
                  : 'No pudimos confirmar la autorización. Volvé a conectarla.'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
