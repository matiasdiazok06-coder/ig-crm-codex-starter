# IG CRM Codex Starter

Monorepo mínimo para construir un **CRM de DMs de Instagram** con ayuda de *Codex* (asistente de código). 
Incluye:
- `api/`: servidor Express (Node.js) con rutas de OAuth de Meta, listado masivo de IG y webhook de mensajes.
- `web/`: app Next.js con botón **Conectar Meta** + bandeja unificada (placeholder) que consume `api/`.
- `prisma/`: esquema base para Postgres (cuentas, conversaciones, mensajes, tokens).
- `.env.example`: variables requeridas.

> Pensado para que se lo des a Codex y te autogenere/complete lo que falta.

---

## Requisitos

- Node 18+
- Postgres 14+ (opcional por ahora)
- Una App en **Meta for Developers** con los scopes: 
  `instagram_manage_messages`, `instagram_basic`, `pages_manage_metadata`, `pages_show_list`.

> Si vas a usar el inbox con muchas cuentas, deberás pasar la app a **Live** y el permiso `instagram_manage_messages` a **Advanced**.

## Variables de entorno

Copia `.env.example` a `api/.env` y `web/.env.local` (si aplica) y completa:

```env
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=http://localhost:4000/auth/callback
META_APP_VERIFY_TOKEN=tu_token_de_verificacion_webhook
META_API_VERSION=v20.0
SESSION_SECRET=cualquier_string_seguro
# Opcional DB
DATABASE_URL=postgresql://user:pass@localhost:5432/igcrm
```

## Cómo correr local

En una terminal (API):
```bash
cd api
npm i
npm run dev
```

En otra terminal (Web):
```bash
cd web
npm i
npm run dev
```

- API corre en `http://localhost:4000`
- Web corre en `http://localhost:3000`

Abrí `http://localhost:3000` y tocá **Conectar Meta**.

## Endpoints clave del API

- `GET /auth/login` → abre el diálogo de permisos de Meta (multi-selección de Páginas).
- `GET /auth/callback` → intercambia `code` por token y guarda en DB (a completar si querés DB).
- `GET /me/accounts` → lista Páginas + IG vinculadas (`/me/accounts?fields=...,instagram_business_accountEllipsis`).
- `GET /webhooks/meta` → verificación `hub.challenge` del webhook.
- `POST /webhooks/meta` → recepción de DMs (`object: instagram`, `field: messages`).

## Push a GitHub (o "HipHub")

1) Creá un repo vacío en GitHub.
2) Desde la carpeta raíz de este proyecto:

```bash
git init
git add .
git commit -m "IG CRM Codex starter"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/ig-crm-codex-starter.git
git push -u origin main
```

## Qué pedirle a Codex (prompt ejemplo)

> *“Actuá como arquitecto y generador de código. Completá este repo Next.js + Express para un CRM de mensajes de Instagram. Objetivos:*
> *1) Implementar el intercambio de `code` por `access_token` en `/auth/callback` y guardar tokens en Postgres (tablas del prisma/schema).*
> *2) Implementar `GET /me/accounts` que devuelva todas mis Páginas y sus `instagram_business_account` con `username` e `id` para mostrarlas en checkboxes en `web/`. *
> *3) Implementar el webhook `POST /webhooks/meta` para eventos de `messages` con idempotencia (dedupe por `message.id`) y persistencia en `messages` y `conversations`. *
> *4) En `web/`, crear una UI de Inbox Unificado (lista de conversaciones, panel de mensajes, filtro por cuenta) llamando a `api/`. *
> *5) Manejar rate limits con backoff exponencial y colas (BullMQ).*
> *6) Agregar tests unitarios en API y e2e simples en web.”*

¡Listo para iterar!
