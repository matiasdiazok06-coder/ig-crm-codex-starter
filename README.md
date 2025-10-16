# IG CRM Codex Starter

Bienvenido a tu bandeja unificada para mensajes de Instagram. Todo el flujo está pensado para que conectes tus cuentas en pocos clics y empieces a responder al instante.

## Empezá en 3 pasos

1. **Hacé clic en “Conectar Instagram” y autorizá.** Se abre la ventana de Meta para que elijas las cuentas a las que querés dar acceso.
2. **Seleccioná tus cuentas y tocá “Guardar selección”.** Desde la misma pantalla podés marcar todas y dejar la conexión lista.
3. **Abrí Inbox para ver y responder mensajes.** Vas a encontrar todas las conversaciones ordenadas y podés contestar sin salir del sitio.

## ¿No ves tus mensajes?

- Revisá que aceptaste todos los permisos al conectar Instagram.
- Desde el Inbox, recargá la vista para traer las últimas conversaciones.
- En Instagram: *Configuración → Privacidad → Mensajes → Herramientas conectadas* debe estar en **Activado**.

## Qué incluye

- **api/**: servidor Express con login de Meta, conexión de cuentas, webhook de mensajes y envío de respuestas.
- **web/**: app Next.js con las pantallas *Conectar Instagram* e *Inbox* con refresco automático.
- **prisma/**: esquema de base de datos para cuentas, conversaciones, mensajes y tokens cifrados.
- `.env.example`: lista de variables necesarias (Meta, Postgres, Redis y claves locales).

## Requisitos básicos

- Node.js 18 o superior.
- Base de datos Postgres y Redis (podés usar el `docker-compose.yml` incluido).
- Crear una app en [Meta for Developers](https://developers.facebook.com/) con los permisos `instagram_manage_messages`, `instagram_basic`, `pages_manage_metadata` y `pages_show_list`.

## Cómo correr el proyecto

```bash
# Backend
cd api
npm install
npm run dev

# Frontend
cd web
npm install
npm run dev
```

- API disponible en `http://localhost:4000`.
- Web disponible en `http://localhost:3000`.

Cuando ambos servicios estén activos, visitá `http://localhost:3000` y seguí los 3 pasos de la sección “Empezá en 3 pasos”.

## Pruebas rápidas

- Enviá un mensaje desde otra cuenta a una de tus cuentas conectadas: debería aparecer en el Inbox en pocos segundos.
- Respondé desde el Inbox con el botón **Responder** y verificá que el mensaje llegue al chat real.

¡Listo! Ya tenés el flujo completo para conectar Instagram y centralizar tus DMs.
