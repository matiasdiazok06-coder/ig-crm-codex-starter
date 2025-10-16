'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { Plus, Send } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '../../components/ui/badge.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Textarea } from '../../components/ui/textarea.jsx';
import { cn } from '../../lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

const fetcher = async (path) => {
  const response = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!response.ok) {
    let message = 'No se pudo cargar la información.';
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
};

function formatTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function initialsFrom(value) {
  if (!value) return '?';
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

export default function InboxPage() {
  const [search, setSearch] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const messagesViewportRef = useRef(null);

  const { data: accountsData, error: accountsError } = useSWR('/accounts', fetcher, {
    refreshInterval: 10000,
  });
  const accountsLoading = !accountsData && !accountsError;
  const accounts = accountsData || [];

  useEffect(() => {
    if (accountsError) {
      setErrorMessage('No pudimos cargar tus cuentas conectadas. Intentá nuevamente en unos segundos.');
    }
  }, [accountsError]);

  useEffect(() => {
    if (!accounts.length) return;
    if (selectedAccountId === 'all') return;
    const stillAvailable = accounts.some((account) => account.igUserId === selectedAccountId);
    if (!stillAvailable) {
      setSelectedAccountId('all');
    }
  }, [accounts, selectedAccountId]);

  const conversationKey = useMemo(() => {
    if (!accounts.length) return null;
    const params = new URLSearchParams();
    if (selectedAccountId && selectedAccountId !== 'all') {
      params.set('igUserId', selectedAccountId);
    }
    if (search) params.set('q', search);
    const query = params.toString();
    return `/conversations${query ? `?${query}` : ''}`;
  }, [accounts.length, selectedAccountId, search]);

  const {
    data: conversationsData,
    mutate: mutateConversations,
  } = useSWR(conversationKey, fetcher, { refreshInterval: 7000, keepPreviousData: true });
  const conversations = conversationsData?.data || [];

  useEffect(() => {
    if (!conversations.length) {
      setSelectedConversationId(null);
      return;
    }
    if (!selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
      return;
    }
    if (!conversations.some((conversation) => conversation.id === selectedConversationId)) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const messageKey = useMemo(() => {
    if (!selectedConversationId) return null;
    const params = new URLSearchParams();
    params.set('conversationId', selectedConversationId);
    return `/messages?${params.toString()}`;
  }, [selectedConversationId]);

  const { data: messagesData, mutate: mutateMessages } = useSWR(messageKey, fetcher, {
    refreshInterval: 7000,
    keepPreviousData: true,
  });
  const messages = messagesData?.data || [];

  useEffect(() => {
    if (!messagesViewportRef.current) return;
    messagesViewportRef.current.scrollTop = messagesViewportRef.current.scrollHeight;
  }, [messages, selectedConversationId]);

  const selectedAccount = selectedAccountId === 'all' ? null : accounts.find((account) => account.igUserId === selectedAccountId) || null;
  const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationId) || null;
  const conversationOwner = selectedConversation?.account || (selectedAccount
    ? {
        igUserId: selectedAccount.igUserId,
        username: selectedAccount.igUsername,
        avatarUrl: selectedAccount.avatarUrl,
      }
    : null);

  const sendMessage = async () => {
    if (!selectedConversation || !draft.trim() || sending) return;
    const igUserId = conversationOwner?.igUserId || selectedAccount?.igUserId;
    if (!igUserId) {
      setErrorMessage('No encontramos la cuenta de origen para este mensaje.');
      return;
    }
    setSending(true);
    setErrorMessage(null);
    const payload = {
      igUserId,
      peerIgUserId: selectedConversation.peerIgUserId,
      text: draft.trim(),
    };
    try {
      const response = await fetch(`${API_BASE}/messages/send`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'No se pudo enviar el mensaje.');
      }
      setDraft('');
      await mutateMessages();
      await mutateConversations();
    } catch (error) {
      setErrorMessage(error.message || 'No pudimos enviar tu respuesta. Intentá nuevamente.');
    } finally {
      setSending(false);
    }
  };

  const accountOptions = accounts.length
    ? [
        {
          igUserId: 'all',
          igUsername: 'Todas',
          avatarUrl: null,
        },
        ...accounts,
      ]
    : [];

  if (!accounts.length && !accountsLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <Card className="max-w-lg border-[#2f2f35]">
          <CardHeader>
            <CardTitle>Conectá tus cuentas de Instagram</CardTitle>
            <CardDescription>
              Necesitamos tu permiso para leer y responder mensajes. Volvé a la pantalla de conexión para seleccionar tus cuentas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-300">
            <p>1. Hacé clic en “Conectar Instagram”.</p>
            <p>2. Elegí las cuentas que quieras gestionar.</p>
            <p>3. Volvé acá para ver tu inbox unificado.</p>
          </CardContent>
          <CardFooter>
            <Button asChild size="lg" variant="primary">
              <Link href="/connect">Ir a Conectar Instagram</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <div className="flex h-screen gap-0 overflow-hidden px-6 py-10">
      <aside className="flex w-24 flex-col items-center rounded-3xl border border-[#1f1f22] bg-[#141419]/80 py-6 backdrop-blur">
        <div className="flex w-full items-center justify-between px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          <span>Cuentas</span>
          <Button asChild size="icon" variant="outline" className="border-transparent bg-[#1d1d25] hover:bg-[#24242f]">
            <Link href="/connect" aria-label="Agregar más cuentas">
              <Plus className="h-5 w-5" />
            </Link>
          </Button>
        </div>
        <nav className="mt-6 flex w-full flex-1 flex-col items-center gap-4 overflow-y-auto px-2">
          {accountOptions.map((accountOption) => {
            const isSelected = selectedAccountId === accountOption.igUserId;
            const label = accountOption.igUsername === 'Todas' ? 'Todas' : `@${accountOption.igUsername || accountOption.igUserId}`;
            return (
              <button
                key={accountOption.igUserId}
                type="button"
                onClick={() => {
                  setSelectedAccountId(accountOption.igUserId);
                  setSelectedConversationId(null);
                }}
                className={cn(
                  'group flex w-full flex-col items-center gap-2 rounded-2xl border border-transparent bg-[#1a1a22] p-3 text-xs font-medium text-zinc-400 transition-all hover:bg-[#23232d] hover:text-white',
                  isSelected && 'border-[#3b3b45] bg-[#262633] text-white shadow-lg shadow-black/30',
                )}
              >
                <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[#2a2b31] bg-[#1f1f27] text-lg text-white">
                  {accountOption.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={accountOption.avatarUrl} alt={label} className="h-full w-full object-cover" />
                  ) : (
                    <span>{initialsFrom(accountOption.igUsername)}</span>
                  )}
                </div>
                <span className="max-w-[72px] truncate text-center">{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="mx-6 flex w-96 flex-col rounded-3xl border border-[#1f1f22] bg-[#141419]/80 px-2 py-6 backdrop-blur">
        <div className="px-4">
          <h1 className="text-lg font-semibold text-white">Inbox unificado</h1>
          <p className="mt-1 text-xs text-zinc-400">Buscá por nombre o mensaje para encontrar conversaciones al instante.</p>
          <div className="mt-4">
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar mensaje o usuario"
            />
          </div>
        </div>
        <div className="mt-6 flex-1 space-y-3 overflow-y-auto px-2 pr-2">
          {conversations.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-[#2a2b31] bg-[#14141c]/50 px-6 text-center text-sm text-zinc-500">
              Todavía no hay conversaciones. Cuando llegue un nuevo mensaje lo vas a ver acá.
            </div>
          ) : (
            conversations.map((conversation) => {
              const isSelected = conversation.id === selectedConversationId;
              const displayName = conversation.peerIgUsername || conversation.peerName || conversation.peerIgUserId;
              const snippet = conversation.lastMessageSnippet || '—';
              const ownerAccount =
                conversation.account ||
                accounts.find(
                  (account) =>
                    account.igUserId === conversation.account?.igUserId ||
                    account.igUserId === conversation.igUserId,
                ) ||
                null;
              const ownerUsername = ownerAccount?.username || ownerAccount?.igUsername;
              const unread = conversation.unreadCount || 0;
              return (
                <button
                  type="button"
                  key={conversation.id}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-3xl border border-transparent bg-[#161621] px-4 py-4 text-left transition-all hover:bg-[#1e1e2a]',
                    isSelected && 'border-[#343445] bg-[#232333] shadow-lg shadow-black/30',
                  )}
                >
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#2a2b31] bg-[#1f1f27] text-sm text-white">
                    {conversation.peerAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={conversation.peerAvatarUrl} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      <span>{initialsFrom(displayName)}</span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{displayName}</span>
                      {ownerUsername && <Badge variant="outline">@{ownerUsername}</Badge>}
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{snippet}</p>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>{formatTime(conversation.lastMessageAt)}</span>
                      {unread > 0 && <Badge className="bg-royalBlue/80 text-white">{unread} sin leer</Badge>}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="flex flex-1 flex-col rounded-3xl border border-[#1f1f22] bg-[#15151f]/85 p-6 backdrop-blur">
        {errorMessage && (
          <div className="mb-4 rounded-3xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
            {errorMessage}
          </div>
        )}
        {selectedConversation ? (
          <>
            <header className="flex items-center justify-between gap-4 border-b border-[#1f1f25] pb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Conversación de @{conversationOwner?.username || selectedAccount?.igUsername || 'tu cuenta'}</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {selectedConversation.peerIgUsername || selectedConversation.peerName || selectedConversation.peerIgUserId}
                </h2>
              </div>
              {conversationOwner?.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={conversationOwner.avatarUrl}
                  alt={`Avatar de @${conversationOwner.username}`}
                  className="h-12 w-12 rounded-full border border-[#2a2b31] object-cover"
                />
              )}
            </header>
            <div ref={messagesViewportRef} className="mt-6 flex-1 space-y-4 overflow-y-auto pr-2">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-[#2a2b31] bg-[#14141c]/40 px-6 text-center text-sm text-zinc-500">
                  Todavía no hay mensajes en este chat. Cuando respondas, la conversación va a quedar guardada acá.
                </div>
              ) : (
                messages.map((message) => {
                  const isOutgoing = message.direction === 'out';
                  return (
                    <div key={message.id} className={cn('flex w-full', isOutgoing ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[70%] rounded-3xl px-5 py-4 text-sm shadow-md transition-all',
                          isOutgoing
                            ? 'bg-royalBlue text-white shadow-blue-900/40'
                            : 'bg-charcoal text-zinc-100 shadow-black/20',
                        )}
                      >
                        <p className="whitespace-pre-line leading-relaxed">{message.text || '(mensaje sin texto)'}</p>
                        <span className="mt-3 block text-right text-[11px] uppercase tracking-wide text-zinc-400">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <footer className="mt-6 space-y-4 border-t border-[#1f1f25] pt-4">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Escribí una respuesta…"
              />
              <div className="flex items-center justify-end gap-3">
                <span className="text-xs text-zinc-500">Usá ⌘+Enter o Ctrl+Enter para enviar más rápido.</span>
                <Button
                  onClick={sendMessage}
                  disabled={!draft.trim() || sending}
                  variant="primary"
                  size="lg"
                  className="min-w-[140px]"
                >
                  <Send className="h-5 w-5" /> Responder
                </Button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-[#2a2b31] bg-[#14141c]/40 px-10 text-center text-sm text-zinc-500">
            Elegí una conversación para ver los mensajes.
          </div>
        )}
      </section>
    </div>
  );
}
