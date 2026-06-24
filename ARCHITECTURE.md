# Arquitectura profesional de MindShift con Node.js, Supabase y Prisma

> Documento de diseño para migrar MindShift desde persistencia local a un backend
> profesional basado en una API Node.js/Express, pnpm, Supabase Auth,
> PostgreSQL, Prisma, Row Level Security, jobs de backend y Expo Push
> Notifications.

## 1. Objetivo

MindShift no debe usar el dispositivo como fuente de verdad para:

- Perfil e identidad del usuario.
- Hábitos y completaciones.
- Sesiones de enfoque.
- Videos asignados y progreso de reproducción.
- XP, nivel, metas diarias y rachas.
- Recordatorios y preferencias.
- Historial, estadísticas y logros.
- Tokens de notificaciones.

PostgreSQL debe ser la fuente de verdad. El teléfono solo debe conservar:

- La sesión de autenticación.
- Estado efímero de interfaz.
- Caché descartable de React Query.
- Acciones pendientes de sincronización, únicamente si se implementa modo offline.

Nunca deben persistirse localmente como datos autoritativos el XP, las rachas,
las completaciones o las estadísticas.

## 2. Principios no negociables

1. **El servidor calcula XP y rachas.** El frontend no envía cantidades de XP.
2. **Cada mutación es idempotente.** Repetir una petición no duplica recompensas.
3. **Cada usuario solo accede a sus filas.** Todas las tablas expuestas usan RLS.
4. **Las operaciones relacionadas son transaccionales.** Completar un hábito,
   registrar XP y actualizar el progreso diario ocurre en una misma transacción.
5. **El historial importante es append-only.** XP, recompensas y auditoría no se
   sobrescriben sin dejar evidencia.
6. **Las fechas diarias respetan la zona horaria del usuario.** No se calcula el
   día usando UTC en el cliente.
7. **Las notificaciones son observables.** Se registran envío, ticket, receipt,
   error, reintento y desactivación de tokens inválidos.
8. **El backend acepta clientes antiguos.** Los cambios incompatibles requieren
   versión de API o feature flag.
9. **No se expone una secret key en Expo.** El cliente usa la API de Node.js y,
   cuando sea necesario para Auth, solamente variables públicas de Supabase.
10. **La base de datos valida reglas de negocio.** No se confía en validaciones
    hechas únicamente en React Native.
11. **Prisma es el acceso principal a datos desde backend.** Las consultas y
    transacciones de aplicación viven en Node.js; SQL raw queda reservado para
    operaciones que Prisma no modele bien.
12. **Supabase no reemplaza la API de producto.** Supabase Auth, Postgres y RLS
    sostienen la plataforma, pero el contrato estable para Expo es la API
    versionada de MindShift.

## 3. Arquitectura recomendada

```text
┌──────────────────────────────────────────────────────────────┐
│ Expo / React Native                                         │
│                                                              │
│ React Query + repositorios HTTP por dominio                  │
│ UI optimista controlada + caché descartable                  │
│ Supabase Auth client opcional para sesión pública            │
└───────────────────────────────┬──────────────────────────────┘
                                │ HTTPS / JSON
┌───────────────────────────────▼──────────────────────────────┐
│ Mindshift-Backend                                            │
│                                                              │
│ Node.js + Express + pnpm                                     │
│ Middlewares: Helmet, CORS, Morgan, Zod, JWT/Supabase Auth    │
│ Servicios de dominio + Prisma Client + Supabase Admin        │
│ Jobs: notificaciones, receipts, reconciliación, limpieza     │
└───────────────┬───────────────────────┬──────────────────────┘
                │ Prisma                │ supabase-js admin
┌───────────────▼───────────────────────▼──────────────────────┐
│ Supabase                                                     │
│                                                              │
│ Auth ─ PostgreSQL ─ RLS ─ Triggers/SQL Functions ─ Realtime  │
│                     │                                        │
│                     ├─ Storage                               │
│                     └─ Backups                               │
└───────────────────────────────┬──────────────────────────────┘
                                │
                         Expo Push Service
                                │
                         APNs / FCM / dispositivo
```

### Responsabilidad de cada capa

**Supabase Auth**

- Registro, inicio de sesión, recuperación y renovación de sesión.
- Identidad única mediante `auth.users.id`.
- Proveedores futuros: Apple y Google.

**Node.js / Express**

- Contrato HTTP estable para el frontend.
- Validación de payloads con Zod.
- Autorización por JWT y contexto de usuario.
- Orquestación de casos de uso de hábitos, enfoque, videos, progreso,
  recordatorios y cuenta.
- Adaptación entre el modelo móvil y el modelo relacional.

**Prisma**

- Cliente tipado para PostgreSQL.
- Migraciones versionadas del esquema de la aplicación.
- Transacciones de negocio desde servicios de dominio.
- Uso puntual de `$queryRaw` o `$executeRaw` para funciones SQL, locks y
  operaciones específicas de Postgres.

**PostgreSQL**

- Fuente de verdad.
- Reglas de negocio y transacciones.
- Ledger de XP, progreso diario, rachas y estadísticas.

**Supabase Admin**

- Operaciones privilegiadas de Auth que no puede hacer el cliente.
- Verificación de usuario cuando aplique.
- Storage y tareas administrativas.
- Nunca se usa desde Expo.

**Jobs del backend**

- Detectar recordatorios vencidos.
- Cerrar o recalcular días.
- Procesar receipts de Expo.
- Limpieza y mantenimiento.

**Queues**

- Envíos de notificaciones desacoplados y reintentables. Pueden iniciar con
  jobs en base de datos y evolucionar a pgmq, BullMQ u otra cola si el volumen
  lo exige.
- Trabajos de exportación, borrado y mantenimiento.

**Realtime**

- Sincronización entre varios dispositivos.
- Actualización inmediata del dashboard tras una mutación.
- No debe sustituir React Query ni ser necesario para el funcionamiento básico.

## 4. Estructura de repositorio objetivo

```text
MindShift/
├── app/
├── components/
├── features/
│   ├── auth/
│   ├── habits/
│   ├── focus/
│   ├── videos/
│   ├── gamification/
│   ├── reminders/
│   └── profile/
├── lib/
│   ├── supabase.ts
│   ├── query-client.ts
│   ├── errors.ts
│   └── secure-storage.ts
├── services/
│   ├── auth.repository.ts
│   ├── habits.repository.ts
│   ├── focus.repository.ts
│   ├── videos.repository.ts
│   ├── progress.repository.ts
│   └── reminders.repository.ts
├── providers/
│   ├── AuthProvider.tsx
│   └── RealtimeProvider.tsx
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   ├── seed.sql
│   ├── tests/
│   └── functions/
│       ├── register-device/
│       ├── notification-worker/
│       ├── notification-receipts/
│       ├── export-user-data/
│       └── delete-account/
├── types/
│   ├── database.generated.ts
│   └── domain.ts
├── .env.example
└── ARCHITECTURE.md

Mindshift-Backend/
├── package.json
├── pnpm-lock.yaml
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app.js
│   ├── index.js
│   ├── config/
│   │   ├── env.js
│   │   ├── prisma.js
│   │   └── supabase.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   └── validate.middleware.js
│   ├── routes/
│   │   ├── index.routes.js
│   │   ├── auth.routes.js
│   │   ├── bootstrap.routes.js
│   │   ├── habits.routes.js
│   │   ├── focus.routes.js
│   │   ├── videos.routes.js
│   │   ├── progress.routes.js
│   │   └── reminders.routes.js
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── jobs/
│   └── utils/
├── .env.example
└── README.md
```

## 5. Autenticación

### Métodos mínimos

- Email y contraseña.
- Magic link opcional.
- Recuperación de contraseña.
- Cierre de sesión en este dispositivo.
- Cierre de todas las sesiones.
- Eliminación de cuenta.

### Métodos recomendados antes de producción

- Sign in with Apple para iOS.
- Google Sign-In para Android.
- Verificación de email.
- CAPTCHA o protección contra abuso en registro.
- MFA opcional para acciones sensibles.

### Configuración del cliente

Variables públicas:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Variables que nunca deben entrar al bundle:

```env
SUPABASE_SECRET_KEY=sb_secret_...
EXPO_ACCESS_TOKEN=...
```

En móvil, la sesión puede almacenarse mediante un adaptador de
`expo-secure-store`. Este almacenamiento local contiene credenciales de sesión,
no progreso del usuario. En web se utiliza el mecanismo compatible con
Supabase Auth.

### Flujo inicial

```text
Abrir app
  → restaurar sesión
  → si no existe: mostrar Auth
  → si existe: GET bootstrap
  → si profile.onboarding_completed = false: onboarding
  → si es true: tabs
```

## 6. Modelo de datos PostgreSQL

Todas las claves primarias deben usar `uuid`. Todas las tablas mutables deben
tener `created_at`, `updated_at` y, cuando aplique, `deleted_at`.

### 6.1 `profiles`

Extiende `auth.users`.

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | `uuid` | PK y FK a `auth.users(id)` |
| `display_name` | `text` | 1-80 caracteres |
| `locale` | `text` | `es` o `en` |
| `timezone` | `text` | IANA, por ejemplo `America/Merida` |
| `current_identity` | `text` | máximo 1000 |
| `target_identity` | `text` | máximo 1000 |
| `why_transform` | `text` | máximo 2000 |
| `core_values` | `text[]` | máximo recomendado: 10 |
| `onboarding_completed` | `boolean` | default `false` |
| `daily_xp_goal` | `integer` | default `50`, rango 10-500 |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | trigger |

Crear el perfil mediante un trigger `handle_new_user()` después del registro.

### 6.2 `habit_templates`

Catálogo administrado por MindShift.

| Columna | Tipo |
|---|---|
| `id` | `uuid` |
| `slug` | `text unique` |
| `title_i18n` | `jsonb` |
| `description_i18n` | `jsonb` |
| `category` | enum |
| `habit_type` | `good` o `bad` |
| `routine_period` | `morning`, `afternoon`, `evening`, `anytime` |
| `default_xp` | `smallint` |
| `sort_order` | `integer` |
| `active` | `boolean` |

Los hábitos predeterminados actuales pasan a esta tabla. El frontend no debe
identificarlos con IDs como `"1"` o `"12"`.

### 6.3 `user_habits`

Instancia editable del hábito para cada usuario.

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK a profile |
| `template_id` | `uuid null` | FK opcional |
| `custom_title` | `text null` | para hábitos personalizados |
| `category` | enum | snapshot |
| `habit_type` | enum | snapshot |
| `routine_period` | enum | |
| `target_per_week` | `smallint` | 1-7 |
| `xp_reward` | `smallint` | servidor, no editable por cliente |
| `position` | `integer` | orden |
| `is_active` | `boolean` | |
| `archived_at` | `timestamptz null` | soft delete |

Índices:

```sql
create index user_habits_user_active_idx
on public.user_habits (user_id, is_active)
where archived_at is null;
```

### 6.4 `habit_completions`

Una fila por hábito y fecha local.

| Columna | Tipo |
|---|---|
| `id` | `uuid` |
| `user_id` | `uuid` |
| `user_habit_id` | `uuid` |
| `local_date` | `date` |
| `completed_at` | `timestamptz` |
| `timezone` | `text` |
| `source` | `mobile`, `web`, `admin`, `migration` |
| `client_event_id` | `uuid` |
| `revoked_at` | `timestamptz null` |

Restricciones:

```sql
unique (user_id, user_habit_id, local_date);
unique (user_id, client_event_id);
```

### 6.5 `focus_sessions`

| Columna | Tipo |
|---|---|
| `id` | `uuid` |
| `user_id` | `uuid` |
| `session_type` | enum |
| `planned_duration_seconds` | `integer` |
| `active_duration_seconds` | `integer` |
| `started_at` | `timestamptz` |
| `ended_at` | `timestamptz null` |
| `status` | `active`, `paused`, `completed`, `cancelled`, `expired` |
| `distraction_count` | `integer` |
| `client_event_id` | `uuid` |
| `completed_local_date` | `date null` |
| `timezone` | `text` |

No se aceptan duraciones negativas ni superiores a límites razonables.

### 6.6 `focus_session_events`

Historial de inicio, pausa, reanudación, distracción y terminación.

| Columna | Tipo |
|---|---|
| `id` | `uuid` |
| `user_id` | `uuid` |
| `focus_session_id` | `uuid` |
| `event_type` | enum |
| `occurred_at` | `timestamptz` |
| `client_event_id` | `uuid unique` |
| `metadata` | `jsonb` |

Permite reconstruir y auditar sesiones.

### 6.7 `motivational_videos`

Reemplaza el catálogo hardcodeado en `constants/videos.ts`.

| Columna | Tipo |
|---|---|
| `id` | `uuid` |
| `title_i18n` | `jsonb` |
| `video_url` | `text` |
| `thumbnail_url` | `text null` |
| `duration_seconds` | `integer null` |
| `category` | `text` |
| `active` | `boolean` |
| `sort_weight` | `integer` |
| `content_version` | `integer` |

Solo administradores pueden escribir esta tabla. Usuarios autenticados pueden
leer filas activas.

### 6.8 `daily_video_assignments`

| Columna | Tipo |
|---|---|
| `id` | `uuid` |
| `user_id` | `uuid` |
| `video_id` | `uuid` |
| `local_date` | `date` |
| `assigned_at` | `timestamptz` |
| `watched_at` | `timestamptz null` |
| `progress_percent` | `numeric(5,2)` |
| `position_seconds` | `integer` |
| `timezone` | `text` |

Restricción:

```sql
unique (user_id, local_date);
```

La asignación se crea en backend y evita repetir el video anterior.

### 6.9 `activity_events`

Registro canónico de acciones recompensables.

| Columna | Tipo |
|---|---|
| `id` | `uuid` |
| `user_id` | `uuid` |
| `event_type` | enum |
| `source_id` | `uuid` |
| `local_date` | `date` |
| `client_event_id` | `uuid` |
| `occurred_at` | `timestamptz` |
| `metadata` | `jsonb` |

Ejemplos:

- `habit_completed`
- `habit_revoked`
- `focus_completed`
- `video_completed`
- `daily_goal_reached`
- `achievement_unlocked`
- `admin_adjustment`

Restricciones:

```sql
unique (user_id, client_event_id);
unique (user_id, event_type, source_id);
```

### 6.10 `xp_ledger`

Ledger append-only. Nunca se modifica XP acumulado directamente desde el cliente.

| Columna | Tipo |
|---|---|
| `id` | `uuid` |
| `user_id` | `uuid` |
| `activity_event_id` | `uuid unique` |
| `local_date` | `date` |
| `amount` | `integer` |
| `reason` | enum |
| `created_at` | `timestamptz` |
| `metadata` | `jsonb` |

Una reversión se representa con una nueva fila negativa, no editando la original.

### 6.11 `daily_progress`

Snapshot materializado para lecturas rápidas.

| Columna | Tipo |
|---|---|
| `user_id` | `uuid` |
| `local_date` | `date` |
| `xp_earned` | `integer` |
| `xp_goal` | `integer` |
| `goal_reached_at` | `timestamptz null` |
| `habits_completed` | `integer` |
| `focus_seconds` | `integer` |
| `videos_completed` | `integer` |
| `updated_at` | `timestamptz` |

PK compuesta:

```sql
primary key (user_id, local_date);
```

`daily_progress` se actualiza únicamente desde funciones internas.

### 6.12 `user_streaks`

| Columna | Tipo |
|---|---|
| `user_id` | `uuid primary key` |
| `current_streak` | `integer` |
| `longest_streak` | `integer` |
| `last_goal_date` | `date null` |
| `freeze_balance` | `smallint` |
| `freezes_used` | `integer` |
| `updated_at` | `timestamptz` |

No implementar “streak freeze” hasta tener reglas de producto aprobadas. La
estructura queda preparada, pero inicialmente `freeze_balance = 0`.

### 6.13 `achievements`

Catálogo administrado:

| Columna | Tipo |
|---|---|
| `id` | `uuid` |
| `slug` | `text unique` |
| `title_i18n` | `jsonb` |
| `description_i18n` | `jsonb` |
| `criteria` | `jsonb` |
| `xp_reward` | `integer` |
| `active` | `boolean` |

### 6.14 `user_achievements`

```sql
unique (user_id, achievement_id);
```

Incluye `unlocked_at`, `progress` y `metadata`.

### 6.15 `reminder_preferences`

| Columna | Tipo |
|---|---|
| `id` | `uuid` |
| `user_id` | `uuid` |
| `reminder_type` | enum |
| `enabled` | `boolean` |
| `local_time` | `time` |
| `days_of_week` | `smallint[]` |
| `timezone` | `text` |
| `quiet_hours_start` | `time null` |
| `quiet_hours_end` | `time null` |
| `tone` | `supportive`, `direct`, `playful` |

Restricción:

```sql
unique (user_id, reminder_type);
```

### 6.16 `user_devices`

| Columna | Tipo |
|---|---|
| `id` | `uuid` |
| `user_id` | `uuid` |
| `expo_push_token` | `text unique` |
| `platform` | `ios`, `android` |
| `device_name` | `text null` |
| `app_version` | `text` |
| `locale` | `text` |
| `timezone` | `text` |
| `notifications_enabled` | `boolean` |
| `last_seen_at` | `timestamptz` |
| `disabled_at` | `timestamptz null` |

### 6.17 `notification_jobs`

Auditoría del trabajo que se desea enviar.

| Columna | Tipo |
|---|---|
| `id` | `uuid` |
| `user_id` | `uuid` |
| `reminder_type` | enum |
| `scheduled_for` | `timestamptz` |
| `local_date` | `date` |
| `payload` | `jsonb` |
| `status` | enum |
| `attempt_count` | `integer` |
| `next_attempt_at` | `timestamptz` |
| `last_error` | `text null` |

Evitar duplicados:

```sql
unique (user_id, reminder_type, local_date, scheduled_for);
```

### 6.18 `push_deliveries`

| Columna | Tipo |
|---|---|
| `id` | `uuid` |
| `notification_job_id` | `uuid` |
| `user_device_id` | `uuid` |
| `expo_ticket_id` | `text null` |
| `ticket_status` | `text null` |
| `receipt_status` | `text null` |
| `error_code` | `text null` |
| `error_message` | `text null` |
| `sent_at` | `timestamptz null` |
| `receipt_checked_at` | `timestamptz null` |

### 6.19 `idempotency_keys`

Opcional si cada tabla ya tiene `client_event_id`, pero útil para Edge Functions.

| Columna | Tipo |
|---|---|
| `user_id` | `uuid` |
| `key` | `uuid` |
| `operation` | `text` |
| `request_hash` | `text` |
| `response` | `jsonb` |
| `expires_at` | `timestamptz` |

### 6.20 `audit_log`

Solo backend y administradores.

Registra:

- Cambios administrativos.
- Ajustes manuales de XP.
- Borrados.
- Errores de integridad.
- Accesos privilegiados.

No guardar contraseñas, access tokens ni contenido sensible completo.

### 6.21 `reflections`

| Columna | Tipo |
|---|---|
| `id` | `uuid` |
| `user_id` | `uuid` |
| `local_date` | `date` |
| `wins` | `text` |
| `improvements` | `text` |
| `tomorrow_goals` | `text` |
| `energy` | `smallint` |
| `mood` | `smallint` |
| `gratitude` | `text null` |
| `identity_affirmation` | `text null` |
| `client_event_id` | `uuid` |
| `created_at` | `timestamptz` |
| `updated_at` | `timestamptz` |
| `deleted_at` | `timestamptz null` |

Restricciones:

```sql
unique (user_id, local_date);
check (energy between 1 and 5);
check (mood between 1 and 5);
```

### 6.22 `privacy_consents`

| Columna | Tipo |
|---|---|
| `id` | `uuid` |
| `user_id` | `uuid` |
| `document_type` | `terms`, `privacy`, `marketing`, `analytics` |
| `document_version` | `text` |
| `granted` | `boolean` |
| `occurred_at` | `timestamptz` |
| `locale` | `text` |
| `source` | `mobile`, `web` |

No sobrescribir consentimientos anteriores; registrar cada cambio.

### 6.23 `notification_interactions`

| Columna | Tipo |
|---|---|
| `id` | `uuid` |
| `user_id` | `uuid` |
| `notification_job_id` | `uuid` |
| `interaction` | `received`, `opened`, `dismissed`, `action` |
| `action_id` | `text null` |
| `occurred_at` | `timestamptz` |
| `client_event_id` | `uuid` |

Restricción:

```sql
unique (user_id, client_event_id);
```

### 6.24 `gamification_config`

Configuración versionada y administrada por backend.

| Columna | Tipo |
|---|---|
| `id` | `uuid` |
| `version` | `integer unique` |
| `effective_from` | `timestamptz` |
| `habit_xp` | `smallint` |
| `focus_xp` | `smallint` |
| `video_xp` | `smallint` |
| `video_completion_percent` | `numeric(5,2)` |
| `minimum_focus_seconds` | `integer` |
| `level_curve` | `jsonb` |
| `active` | `boolean` |

Los eventos y ledger deben guardar la versión aplicada para poder explicar y
recalcular resultados históricos.

## 7. Reglas profesionales de XP

Configuración inicial recomendada:

| Acción | XP |
|---|---:|
| Hábito positivo completado | 10 |
| Sesión de enfoque válida | 25 |
| Video visto al 90% | 10 |
| Meta diaria alcanzada | 0 |
| Logro desbloqueado | variable |

La meta inicial es 50 XP, pero se guarda en `profiles.daily_xp_goal`.

### Reglas

- Un hábito solo otorga XP una vez por fecha local.
- Marcar y desmarcar repetidamente no genera XP adicional.
- Desmarcar el mismo día genera una reversión.
- Después de un periodo de gracia, los días anteriores son inmutables para el
  usuario.
- Una sesión de enfoque debe cumplir una duración mínima.
- Solo sesiones `completed` otorgan XP.
- El video solo otorga XP al alcanzar el porcentaje configurado.
- Un administrador puede ajustar XP con motivo y auditoría.
- El nivel se calcula desde XP acumulado; no se actualiza desde el cliente.

### Curva de nivel

No usar `500 XP = un nivel` indefinidamente. Una curva más sostenible:

```text
xp_required_for_level(n) = 250 × n × (n + 1)
```

Ejemplo:

| Nivel | XP acumulado requerido |
|---:|---:|
| 1 | 0 |
| 2 | 500 |
| 3 | 1500 |
| 4 | 3000 |
| 5 | 5000 |

Mantener la fórmula versionada en una tabla `gamification_config`.

## 8. Sistema profesional de rachas

### Definición

Un día cuenta para la racha cuando:

```text
daily_progress.xp_earned >= daily_progress.xp_goal
```

La fecha evaluada es la fecha local en la zona horaria guardada en el perfil.

### Reglas de borde

- Si hoy aún no se completa la meta, se muestra la racha conseguida hasta ayer.
- La racha no se incrementa dos veces por la misma fecha.
- Al alcanzar la meta se bloquea transaccionalmente `user_streaks`.
- Si el usuario cambia de zona horaria, el cambio tiene efecto desde el siguiente
  día local para evitar duplicados.
- No se aceptan zonas horarias enviadas libremente en cada evento; se usa la del
  perfil o una actualización validada.
- Los cambios retroactivos requieren un job de reconciliación.

### Función interna

`internal.apply_daily_goal(user_id, local_date)`:

1. Bloquea `daily_progress` y `user_streaks`.
2. Verifica que la meta se cruzó por primera vez.
3. Compara `local_date` con `last_goal_date`.
4. Incrementa, reinicia o conserva la racha.
5. Actualiza la mejor racha.
6. Inserta `daily_goal_reached` en `activity_events`.
7. Evalúa logros.

### Reconciliación

Crear `internal.reconcile_user_progress(user_id, from_date, to_date)` para:

- Reparar snapshots.
- Recalcular rachas después de migraciones.
- Investigar discrepancias.
- Ejecutar pruebas de integridad.

No exponerla al usuario normal.

## 9. Endpoints y contratos

El frontend consume la API versionada de MindShift. En este documento:

- `API` significa endpoint HTTP de `Mindshift-Backend` bajo `/api/v1`.
- `SQL` significa función, trigger o transacción ejecutada desde Prisma en
  PostgreSQL.
- `JOB` significa proceso programado o worker ejecutado por el backend.
- `SUPABASE_ADMIN` significa operación privilegiada mediante `supabase-js` en
  servidor.

PostgREST, RPC y Edge Functions pueden seguir existiendo para tareas puntuales,
pero no son el contrato principal de la app móvil. El frontend no debe depender
de tablas expuestas directamente para mutaciones de producto.

Todas las mutaciones importantes reciben:

```json
{
  "client_event_id": "uuid-v4",
  "client_occurred_at": "2026-06-19T14:32:00.000Z"
}
```

`client_event_id` se genera una vez en el dispositivo y se reutiliza en reintentos.

### 9.1 Auth

#### Registro

```text
API POST /api/v1/auth/register
```

Resultado:

- El backend valida payload y crea usuario en Supabase Auth.
- Trigger crea `profiles`.
- Trigger crea hábitos predeterminados y recordatorios iniciales.
- Devuelve sesión/token o instrucciones de verificación según configuración.

#### Inicio de sesión

```text
API POST /api/v1/auth/login
```

#### Renovación

```text
API POST /api/v1/auth/refresh
```

Si el cliente usa sesión de Supabase directamente, `supabase-js` puede manejar
auto refresh. La API debe aceptar el JWT vigente en `Authorization: Bearer`.

#### Recuperación

```text
API POST /api/v1/auth/password/recovery
```

#### Cerrar sesión

```text
API POST /api/v1/auth/logout
```

### 9.2 Bootstrap

#### `API GET /api/v1/bootstrap`

Devuelve en una llamada:

```json
{
  "profile": {},
  "today": {
    "local_date": "2026-06-19",
    "xp": 30,
    "xp_goal": 50,
    "goal_reached": false
  },
  "streak": {
    "current": 8,
    "longest": 21
  },
  "habits": [],
  "today_completions": [],
  "today_video": {},
  "active_focus_session": null,
  "reminders": [],
  "level": {},
  "server_time": "2026-06-19T20:00:00Z"
}
```

Uso:

- Arranque de la aplicación.
- Pull-to-refresh.
- Recuperación después de perder conectividad.

### 9.3 Perfil

#### `API GET /api/v1/profile`

Lectura del perfil propio.

#### `API PATCH /api/v1/profile`

Campos editables:

- `display_name`
- `locale`
- `timezone`
- identidad
- `daily_xp_goal`

Campos no editables por cliente:

- `id`
- flags administrativos
- XP
- racha

#### `API POST /api/v1/onboarding/complete`

Transacción que:

- Valida textos.
- Actualiza perfil.
- Inserta hábitos iniciales si faltan.
- Inserta recordatorios predeterminados.
- Marca onboarding completo.

### 9.4 Hábitos

#### `API GET /api/v1/habits`

Filtros:

```text
?active=true&order=position.asc
```

#### `API POST /api/v1/habits`

Crear hábito personalizado. El servidor fija `user_id` desde el JWT y valida
límites con Zod y reglas de dominio.

#### `API PATCH /api/v1/habits/:habitId`

Editar título, orden, categoría, periodo y objetivo semanal.

#### `API DELETE /api/v1/habits/:habitId`

Soft delete. No elimina historial.

#### `API POST /api/v1/habits/:habitId/completions`

Entrada:

```json
{
  "client_event_id": "uuid",
  "client_occurred_at": "2026-06-19T12:00:00Z"
}
```

Transacción:

1. Obtiene `user_id` desde el JWT validado por middleware.
2. Valida propiedad y estado del hábito.
3. Calcula fecha local en servidor.
4. Inserta completion con `ON CONFLICT`.
5. Inserta activity event.
6. Inserta XP ledger.
7. Actualiza daily progress.
8. Aplica meta y racha si corresponde.
9. Evalúa logros.
10. Devuelve snapshot actualizado.

Respuesta:

```json
{
  "completion": {},
  "xp_awarded": 10,
  "daily_progress": {},
  "streak": {},
  "new_achievements": []
}
```

#### `API DELETE /api/v1/habits/:habitId/completions/:localDate`

Solo permite el día local actual dentro del periodo de gracia.

Devuelve una reversión de XP y el nuevo estado diario.

#### `API GET /api/v1/habits/completions`

Ejemplos:

```text
?from=2026-06-01&to=2026-06-30
```

### 9.5 Enfoque

#### `API POST /api/v1/focus/sessions`

Entrada:

```json
{
  "session_type": "deep_work",
  "planned_duration_seconds": 1500,
  "client_event_id": "uuid"
}
```

Reglas:

- Solo una sesión activa por usuario.
- Duraciones permitidas configuradas en servidor.
- Devuelve tiempo del servidor.

#### `API POST /api/v1/focus/sessions/:sessionId/events`

Para `pause`, `resume` y `distraction`.

```json
{
  "event_type": "pause",
  "client_event_id": "uuid",
  "client_occurred_at": "timestamp"
}
```

#### `API POST /api/v1/focus/sessions/:sessionId/complete`

Entrada:

```json
{
  "client_event_id": "uuid"
}
```

El servidor calcula duración válida desde eventos. No acepta una duración
premiada enviada por el cliente.

Respuesta:

```json
{
  "session": {},
  "xp_awarded": 25,
  "daily_progress": {},
  "streak": {},
  "new_achievements": []
}
```

#### `API POST /api/v1/focus/sessions/:sessionId/cancel`

Finaliza sin XP y conserva historial.

#### `API GET /api/v1/focus/sessions`

Historial paginado por cursor o fecha.

### 9.6 Videos

#### `API GET /api/v1/videos/daily`

Garantiza exactamente una asignación por usuario y fecha local.

Selección:

- Solo videos activos.
- Evita el video anterior.
- Permite pesos y categorías.
- Es idempotente.

#### `API PATCH /api/v1/videos/daily/progress`

Entrada:

```json
{
  "assignment_id": "uuid",
  "position_seconds": 42,
  "progress_percent": 58.2,
  "client_event_id": "uuid"
}
```

Validaciones:

- Progreso entre 0 y 100.
- No decrecer salvo reinicio explícito.
- Rate limit para no guardar cada 500 ms.
- Guardar cada 10-15 segundos, al pausar y al cerrar.

#### `API POST /api/v1/videos/daily/complete`

El servidor requiere el umbral configurado, por ejemplo 90%.

Devuelve XP, progreso diario, racha y logros.

#### `API GET /api/v1/videos/assignments`

Historial del usuario.

### 9.7 Gamificación

#### `API GET /api/v1/progress/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`

Devuelve:

- XP diario.
- Racha actual y máxima.
- Nivel y progreso al siguiente nivel.
- Calendario de actividad.
- Desglose por hábitos, enfoque y video.

#### `API GET /api/v1/progress/xp-ledger`

Solo lectura propia, paginada.

No permitir `INSERT`, `UPDATE` ni `DELETE` al cliente.

#### `API GET /api/v1/progress/achievements`

Logros desbloqueados.

#### `API GET /api/v1/achievements?active=true`

Catálogo visible.

#### `API PATCH /api/v1/profile/daily-xp-goal`

Valida rango y evita manipulación retroactiva. El nuevo objetivo se aplica desde
el siguiente día local.

### 9.8 Recordatorios

#### `API GET /api/v1/reminders`

Devuelve todos los recordatorios.

#### `API PUT /api/v1/reminders/:reminderType`

Entrada:

```json
{
  "enabled": true,
  "local_time": "07:00",
  "days_of_week": [1, 2, 3, 4, 5, 6, 7],
  "tone": "supportive"
}
```

El servidor toma la zona horaria del perfil.

#### `API POST /api/v1/reminders/disable-all`

Para preferencias de privacidad y desactivación rápida.

### 9.9 Dispositivos y push

#### `API POST /api/v1/devices`

Auth: JWT de usuario.

Entrada:

```json
{
  "expo_push_token": "ExponentPushToken[...]",
  "platform": "ios",
  "device_name": "iPhone",
  "app_version": "1.2.0",
  "locale": "es",
  "timezone": "America/Merida"
}
```

Hace upsert del token y actualiza `last_seen_at`.

#### `API DELETE /api/v1/devices/:deviceId`

Desactiva el token al cerrar sesión.

#### `JOB notification-worker`

Auth: secret key para service-to-service.

Responsabilidades:

1. Lee lotes de `notification_jobs` o de la cola configurada.
2. Busca dispositivos activos.
3. Renderiza contenido según idioma y tono.
4. Envía lotes de hasta 100 mensajes a Expo.
5. Guarda tickets.
6. Reintenta errores temporales con backoff.
7. No reintenta payloads inválidos.

#### `JOB notification-receipts`

Auth: secret key.

- Consulta receipts.
- Marca `DeviceNotRegistered`.
- Desactiva tokens inválidos.
- Guarda errores.

#### `API POST /api/v1/notifications/interactions`

Registra:

- Entregada en foreground, si el dispositivo puede detectarlo.
- Abierta.
- Descartada, cuando la plataforma lo permita.
- Acción o deep link utilizado.

Entrada:

```json
{
  "notification_job_id": "uuid",
  "interaction": "opened",
  "client_event_id": "uuid",
  "occurred_at": "timestamp"
}
```

### 9.10 Cuenta y privacidad

#### `API POST /api/v1/account/export`

Genera exportación JSON/CSV en Storage mediante Queue.

#### `API DELETE /api/v1/account`

Flujo:

1. Reautenticación reciente.
2. Periodo de gracia opcional.
3. Revoca dispositivos.
4. Borra o anonimiza datos.
5. Elimina usuario Auth.
6. Registra auditoría no identificable.

#### `API POST /api/v1/privacy/consents`

Versiona términos, privacidad y consentimiento de notificaciones.

### 9.11 Salud

#### `API GET /api/health`

Endpoint público sin datos sensibles:

```json
{
  "status": "ok",
  "version": "2026.06.1"
}
```

### 9.12 Reflexiones

Las reflexiones contienen información personal y deben tratarse como datos
sensibles.

#### `API GET /api/v1/reflections`

Filtros por fecha y paginación:

```text
?from=2026-06-01&to=2026-06-30&order=desc
```

#### `API PUT /api/v1/reflections/:localDate`

Entrada:

```json
{
  "wins": "text",
  "improvements": "text",
  "tomorrow_goals": "text",
  "energy": 4,
  "mood": 3,
  "gratitude": "text",
  "identity_affirmation": "text",
  "client_event_id": "uuid"
}
```

Restricción:

```sql
unique (user_id, local_date);
```

No otorgar XP por escribir información emocional extensa. Si se decide premiar
la reflexión, premiar la acción de completar el formulario una sola vez, no la
cantidad de texto.

#### `API DELETE /api/v1/reflections/:reflectionId`

Soft delete con periodo de recuperación opcional.

### 9.13 Migración de datos legacy

#### `API POST /api/v1/migrations/local-data`

Auth: JWT del usuario.

Entrada:

```json
{
  "migration_id": "mindshift-local-v1",
  "client_event_id": "uuid",
  "identity": {},
  "habits": [],
  "sessions": [],
  "reflections": [],
  "daily_videos": [],
  "reminders": []
}
```

Reglas:

- Límite estricto de payload.
- Validación de esquema.
- Una importación por `migration_id`.
- No aceptar XP, nivel ni rachas calculadas por el cliente.
- Recalcular recompensas desde eventos importados.
- Guardar resultado y respuesta idempotente.
- Marcar filas importadas con `source = migration`.

Respuesta:

```json
{
  "migration_id": "mindshift-local-v1",
  "status": "completed",
  "imported": {
    "habits": 12,
    "completions": 83,
    "focus_sessions": 9,
    "reflections": 4,
    "videos": 7
  },
  "rejected": [],
  "progress_summary": {}
}
```

### 9.14 Administración

La aplicación móvil de usuario no debe contener endpoints administrativos.
Inicialmente se puede administrar contenido desde Supabase Dashboard. Antes de
tener un equipo de contenido, crear una aplicación web administrativa separada.

Operaciones administrativas necesarias:

- CRUD de `habit_templates`.
- CRUD de `motivational_videos`.
- CRUD de `achievements`.
- Activar o retirar contenido.
- Ajustes de XP con motivo obligatorio.
- Consulta de jobs y notificaciones fallidas.
- Reprocesamiento de jobs.
- Bloqueo o soporte de cuenta.

Todas las operaciones:

- Requieren rol administrativo en `raw_app_meta_data`.
- Requieren MFA.
- Generan `audit_log`.
- No usan la publishable key como autorización suficiente.

## 10. Respuestas y errores

Formato uniforme para la API:

```json
{
  "data": null,
  "error": {
    "code": "HABIT_ALREADY_COMPLETED",
    "message": "This habit is already completed for the current local date.",
    "request_id": "uuid",
    "retryable": false
  }
}
```

Códigos HTTP:

| Código | Uso |
|---:|---|
| 200 | lectura o mutación idempotente exitosa |
| 201 | recurso creado |
| 400 | payload inválido |
| 401 | no autenticado |
| 403 | sin permiso |
| 404 | recurso inexistente |
| 409 | conflicto de estado |
| 422 | regla de negocio |
| 429 | rate limit |
| 500 | error interno |
| 503 | dependencia temporalmente no disponible |

Los servicios de dominio deben lanzar errores con códigos estables. El
middleware global los mapea al formato anterior para que el frontend no dependa
de detalles de Prisma, Supabase o PostgreSQL.

## 11. RLS y seguridad

Activar RLS en tablas que puedan ser consultadas por roles de Supabase. Aunque
la API use Prisma como acceso principal, RLS sigue siendo una defensa adicional
si se usan clientes Supabase, dashboards, jobs o herramientas internas.

Política base de propiedad:

```sql
create policy "Users read own rows"
on public.user_habits
for select
to authenticated
using ((select auth.uid()) = user_id);
```

Para inserts:

```sql
create policy "Users insert own rows"
on public.user_habits
for insert
to authenticated
with check ((select auth.uid()) = user_id);
```

### Tablas con CRUD del usuario

- `profiles`
- `user_habits`
- `reminder_preferences`
- `user_devices`

### Tablas de solo lectura para el usuario

- `habit_completions`
- `focus_sessions`
- `activity_events`
- `xp_ledger`
- `daily_progress`
- `user_streaks`
- `daily_video_assignments`
- `user_achievements`
- `push_deliveries`, únicamente si se desea mostrar estado.

### Tablas públicas de catálogo

Solo lectura de filas activas:

- `habit_templates`
- `motivational_videos`
- `achievements`
- configuración pública versionada.

### Tablas sin acceso directo

Mover a esquema `internal` o revocar grants:

- `audit_log`
- colas.
- jobs.
- configuración privada.
- idempotency keys.

### SQL Functions

- Usar `security invoker` por defecto.
- Si una función requiere `security definer`, fijar `search_path = ''`.
- Referenciar tablas con esquema explícito.
- Revocar `execute` de `public` y `anon`.
- Otorgar ejecución solo a `authenticated` o al rol interno requerido.

### Secret keys

- Solamente en backend Node.js, CI o infraestructura segura.
- Nunca en variables `EXPO_PUBLIC_*`.
- Rotación programada.
- Claves separadas por entorno.

## 12. Procesamiento de notificaciones

Las notificaciones locales actuales deben reemplazarse por notificaciones
servidor-driven para poder:

- Sincronizar preferencias entre dispositivos.
- Evitar notificaciones si el hábito ya fue completado.
- Enviar rescates de racha contextuales.
- Medir entrega y errores.
- Cambiar contenido sin publicar una nueva app.

### Pipeline

```text
Cron cada minuto
  → internal.enqueue_due_notifications()
  → crea notification_job idempotente
  → publica mensaje en Queue
  → notification-worker consume mensaje
  → Expo Push API
  → guarda ticket
  → Cron + notification-receipts después de ~15 minutos
  → guarda receipt y desactiva tokens inválidos
```

### Lógica contextual

**Mañana**

Enviar si:

- Recordatorio activo.
- Hora local alcanzada.
- Quedan hábitos de mañana.

**Tarde**

Enviar si:

- Quedan hábitos o XP pendiente.
- No existe envío equivalente ese día.

**Noche**

Enviar antes de quiet hours.
- Priorizar desconexión digital, higiene y sueño.

**Rescate de racha**

Enviar si:

- `daily_progress.xp_earned < xp_goal`.
- Existe racha activa hasta ayer.
- No se ha enviado rescate hoy.
- No está en quiet hours.

No usar culpa extrema ni lenguaje dañino. El tono puede ser firme y juguetón,
pero debe respetar la autonomía del usuario.

## 13. Cron Jobs

| Job | Frecuencia | Acción |
|---|---|---|
| `enqueue-due-notifications` | cada minuto | encuentra recordatorios vencidos |
| `process-notification-queue` | cada minuto | invoca worker |
| `check-push-receipts` | cada 5 minutos | consulta tickets antiguos |
| `expire-focus-sessions` | cada 10 minutos | cierra sesiones abandonadas |
| `reconcile-daily-progress` | diario | detecta discrepancias |
| `cleanup-idempotency-keys` | diario | elimina claves expiradas |
| `cleanup-disabled-devices` | semanal | limpia tokens antiguos |
| `backup-integrity-report` | diario | métricas y alertas |

Mantener jobs cortos. Los trabajos pesados deben dividirse en lotes y pasar por
Queue.

## 14. Realtime

Canales privados recomendados:

```text
user:<user_id>:progress
user:<user_id>:habits
user:<user_id>:focus
```

Eventos:

- `daily_progress_updated`
- `streak_updated`
- `achievement_unlocked`
- `habit_completed`
- `focus_session_updated`

Usar Realtime para mejorar UX entre dispositivos. Después de recibir un evento,
invalidar la query correspondiente en React Query en lugar de modificar
manualmente múltiples stores.

## 15. Migración del frontend

### 15.1 Dependencias

Instalar:

```bash
pnpm expo install expo-secure-store
pnpm add @tanstack/react-query
```

Ya existe React Query en el proyecto. `@supabase/supabase-js` solo es necesario
en Expo si se decide manejar sesión de Supabase directamente desde el cliente;
para consumo de datos de producto, usar repositorios HTTP contra
`EXPO_PUBLIC_API_URL`.

### 15.2 Eliminar responsabilidades de `AppContext`

`AppContext` actualmente mezcla:

- Persistencia.
- Notificaciones.
- Gamificación.
- Cálculos de estadísticas.
- Hábitos.
- Enfoque.
- Videos.

Debe dividirse en:

- `AuthProvider`: sesión y usuario.
- React Query: datos remotos.
- Hooks por dominio.
- Estado local de UI dentro de cada pantalla.

Ejemplos:

```text
useBootstrap()
useHabits()
useCompleteHabit()
useFocusSession()
useDailyVideo()
useProgressSummary()
useReminderPreferences()
```

### 15.3 Query keys

```ts
export const queryKeys = {
  bootstrap: ['bootstrap'] as const,
  profile: ['profile'] as const,
  habits: ['habits'] as const,
  completions: (from: string, to: string) =>
    ['habit-completions', from, to] as const,
  focusSessions: (cursor?: string) =>
    ['focus-sessions', cursor] as const,
  dailyVideo: (date: string) => ['daily-video', date] as const,
  progress: (from: string, to: string) =>
    ['progress', from, to] as const,
  reminders: ['reminders'] as const,
};
```

### 15.4 Mutaciones optimistas

Se permite optimismo visual al completar un hábito, pero:

1. Mostrar estado pendiente.
2. Enviar `client_event_id`.
3. Confirmar con respuesta del RPC.
4. Reemplazar XP y racha con valores del servidor.
5. Revertir UI si falla.

Nunca sumar XP localmente como valor definitivo.

### 15.5 Offline

Fase 1 recomendada:

- Lectura de caché.
- Mutaciones requieren conexión.
- Mensajes claros de reconexión.

Fase 2:

- Cola local mínima de eventos con UUID.
- Reintentos idempotentes.
- Indicador “pendiente de sincronizar”.
- Conflictos resueltos por servidor.

No almacenar toda la base de datos en AsyncStorage.

### 15.6 Eliminar persistencia existente

Migrar y después retirar:

- `@apex_habits`
- `@apex_sessions`
- `@apex_reflections`
- `@apex_identity`
- `@apex_daily_videos`
- `@apex_last_video_check`
- `@apex_video_progress`
- `@apex_routine_reminders`

Puede conservarse localmente:

- Idioma antes de iniciar sesión, si se desea.
- Sesión Auth en SecureStore.
- Caché de React Query, solo si es descartable.
- Flags de UI sin valor de negocio.

## 16. Pantallas que faltan para un producto profesional

### Auth

- Bienvenida.
- Registro.
- Inicio de sesión.
- Verificación de email.
- Recuperación de contraseña.
- Apple y Google.

### Dashboard

- Estado de sincronización.
- Meta diaria editable.
- Próxima acción recomendada.
- Desglose de XP.
- Celebración accesible al completar meta.

### Hábitos

- Crear, editar, ordenar, archivar.
- Periodo de rutina.
- Objetivo semanal.
- Detalle con calendario.
- Confirmación para acciones destructivas.
- Estado vacío y estados de error.

### Enfoque

- Restauración de sesión activa desde servidor.
- Pausa y reanudación persistentes.
- Historial.
- Tipos de sesión.
- Notificación al terminar.
- Protección contra dos sesiones activas.

### Videos

- Estado de carga y error.
- Reintento.
- Thumbnail.
- Subtítulos.
- Accesibilidad.
- Progreso remoto con throttling.

### Progreso

- Calendario anual tipo contributions.
- Gráfica semanal.
- XP ledger comprensible.
- Rachas.
- Logros.
- Explicación transparente de reglas.

### Configuración

- Perfil.
- Idioma.
- Zona horaria.
- Meta diaria.
- Recordatorios.
- Quiet hours.
- Privacidad.
- Exportar datos.
- Eliminar cuenta.
- Cerrar sesión.

## 17. UX y psicología responsable

Tomar de Duolingo:

- Recompensa inmediata.
- Meta pequeña y clara.
- Progreso visible.
- Celebraciones.
- Rachas.
- Recordatorios contextuales.
- Recuperación amable después de fallar.

Evitar:

- Culpa excesiva.
- Mensajes amenazantes.
- Dificultar la desactivación de notificaciones.
- Rachas imposibles de reparar por errores técnicos.
- Recompensas que incentiven marcar hábitos falsamente.
- Patrones oscuros en privacidad o cancelación.

La aplicación debe reforzar identidad y autonomía, no dependencia.

## 18. Accesibilidad y calidad de interfaz

- Contraste WCAG AA.
- Dynamic Type.
- Labels para lectores de pantalla.
- Targets táctiles mínimos de 44×44.
- No depender solo del color para estados.
- Reducir animaciones si el sistema lo solicita.
- Feedback háptico opcional.
- Soporte de textos largos en ambos idiomas.
- Skeletons, empty states, error states y retry states.
- Formularios con validación y mensajes específicos.
- Confirmaciones claras para pérdida de datos.

## 19. Observabilidad

### Backend

- Logs estructurados con `request_id`, `user_id` hasheado y operación.
- Métricas de latencia y error por RPC/Edge Function.
- Alertas por fallos de Cron y Queue.
- Ratio de tickets y receipts de push.
- Tokens desactivados.
- Jobs en dead-letter.
- Queries lentas.
- Crecimiento de tablas.

### Frontend

- Error boundary global.
- Sentry o equivalente.
- Eventos analíticos sin datos sensibles.
- Trazas de mutaciones.
- Versión de app y plataforma.

Eventos de producto:

- `onboarding_completed`
- `habit_completed`
- `daily_goal_reached`
- `focus_started`
- `focus_completed`
- `video_completed`
- `streak_extended`
- `streak_lost`
- `reminder_opened`

No enviar texto libre de identidad, reflexiones o notas a analytics.

## 20. Testing

### Base de datos

Usar pgTAP para:

- RLS de cada tabla.
- Idempotencia.
- XP duplicado.
- Reversiones.
- Cambio de zona horaria.
- Límite de día.
- Racha consecutiva.
- Racha rota.
- Meta alcanzada exactamente una vez.
- Usuario A no puede leer o mutar usuario B.

### Backend API y jobs

- JWT ausente o inválido.
- Secret key inválida en endpoints internos o jobs service-to-service.
- Rate limit.
- Retry de Expo 429/5xx.
- `DeviceNotRegistered`.
- Payload mayor al límite.
- Job duplicado.
- Errores de Prisma y conflictos transaccionales.

### Frontend

- Unit tests de repositorios.
- Hooks de React Query.
- Optimistic updates.
- Recuperación de sesión.
- Estados offline.
- E2E de onboarding, hábito, enfoque, video y racha.

### Pruebas obligatorias de fechas

- UTC-12 y UTC+14.
- Cambio de horario de verano.
- Cambio manual de timezone.
- Actividad a las 23:59 y 00:01.
- Viaje entre zonas.

## 21. Entornos y CI/CD

Crear proyectos separados:

- Local.
- Development.
- Staging.
- Production.

Nunca compartir base de datos o claves entre staging y producción.

Pipeline:

```text
Pull Request
  → format
  → lint
  → TypeScript
  → backend lint
  → unit tests
  → Prisma validate
  → Prisma migrations
  → pgTAP
  → API integration tests
  → Expo export
  → preview build opcional

Main
  → migrations staging
  → deploy backend staging
  → smoke tests
  → aprobación
  → migrations production
  → deploy backend production
  → EAS Update o build
```

Las migraciones son forward-only. Nunca editar una migración ya aplicada en
producción.

## 22. Backups, privacidad y retención

- Habilitar backups acordes al plan de Supabase.
- Probar restauración, no solo asumir que el backup funciona.
- Definir RPO y RTO.
- Retener logs operativos el mínimo necesario.
- Permitir exportación y borrado.
- Documentar proveedores: Supabase, Expo, APNs, FCM y analytics.
- Publicar política de privacidad y términos.
- Solicitar permisos de notificación después de explicar el valor.
- No guardar información de salud sensible sin revisar obligaciones legales.

## 23. Plan de implementación

### Fase 0: decisiones de producto

- Aprobar reglas de XP.
- Aprobar meta diaria.
- Definir duración mínima de enfoque.
- Definir grace period.
- Definir si existirán streak freezes.
- Aprobar tono de notificaciones.

### Fase 1: fundamentos

- Crear Supabase local y proyectos remotos.
- Auth.
- Profiles.
- RLS.
- Cliente Supabase.
- AuthProvider.
- Bootstrap.

### Fase 2: hábitos

- Templates.
- User habits.
- Completions.
- Endpoint idempotente para completar y deshacer.
- Migrar UI.

### Fase 3: gamificación

- Activity events.
- XP ledger.
- Daily progress.
- Streaks.
- Progress summary.
- Calendario.

### Fase 4: enfoque y videos

- Sesiones server-authoritative.
- Eventos de sesión.
- Catálogo de videos.
- Asignaciones.
- Progreso remoto.

### Fase 5: notificaciones

- Device registration.
- Reminder preferences.
- Cron.
- Queue.
- Worker.
- Tickets y receipts.

### Fase 6: profesionalización

- Logros.
- Observabilidad.
- Analytics responsable.
- Privacidad.
- Export/delete.
- Accesibilidad.
- E2E.

### Fase 7: migración y retiro de AsyncStorage

- Subir datos existentes una sola vez.
- Validar conteos.
- Guardar versión de migración.
- Cambiar lectura a Supabase.
- Retirar claves locales.
- Mantener rollback temporal.

## 24. Migración de usuarios existentes

En el primer inicio con backend:

1. Usuario crea o inicia sesión.
2. Cliente detecta claves legacy.
3. Llama `API POST /api/v1/migrations/local-data`.
4. Envía payload normalizado con `migration_id`.
5. Backend valida límites y hace import transaccional.
6. Recalcula XP y rachas; no confía en totales enviados.
7. Devuelve resumen.
8. Cliente marca migración completada.
9. Cliente elimina datos legacy solo después de confirmación.

El endpoint debe ser idempotente y ejecutarse una vez por usuario y versión.

## 25. Definition of Done

El backend está listo cuando:

- Ningún progreso depende de AsyncStorage.
- XP y rachas no pueden alterarse desde el cliente.
- Todas las mutaciones de la API son idempotentes cuando pueden reintentarse.
- Todas las tablas expuestas tienen RLS probado.
- Un usuario no puede acceder a otro.
- Las fechas funcionan en zonas horarias extremas.
- Las notificaciones tienen tickets, receipts y reintentos.
- Los tokens inválidos se desactivan.
- Existe staging.
- Existen backups y prueba de restauración.
- Existen pruebas automáticas.
- Existe exportación y eliminación de cuenta.
- El frontend maneja loading, empty, error, retry y offline.
- Los textos funcionan en español e inglés.
- Las reglas de XP y racha están documentadas para el usuario.

## 26. Fuentes oficiales

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Seguridad de Edge Functions](https://supabase.com/docs/guides/functions/auth)
- [Supabase Auth con React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Supabase Queues](https://supabase.com/docs/guides/queues)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Database Webhooks](https://supabase.com/docs/guides/database/webhooks)
- [Testing de PostgreSQL en Supabase](https://supabase.com/docs/guides/database/testing)
- [Push Notifications con Supabase Edge Functions](https://supabase.com/docs/guides/functions/examples/push-notifications)
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Envío y receipts de Expo Push](https://docs.expo.dev/push-notifications/sending-notifications/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
