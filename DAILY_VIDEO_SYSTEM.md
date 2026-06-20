# Sistema de Videos Diarios - Documentación

## 🎯 Objetivo
Mostrar un video motivacional diario a las 5 AM mediante notificaciones push locales, asegurando que el usuario lo vea antes de continuar con la app.

## 📋 Flujo Completo del Sistema

### 1️⃣ Configuración Inicial (Primera Vez)
```
App inicia → setupNotifications()
  ↓
Solicitar permisos de notificaciones
  ↓
Programar notificación diaria a las 5:00 AM
  ↓
Estado: Notificación programada ✅
```

### 2️⃣ Cada Día a las 5 AM
```
⏰ 5:00 AM → Sistema Android/iOS dispara notificación
  ↓
Notificación aparece en el dispositivo:
  📱 Título: "🎯 Tu video motivacional te espera"
  📱 Mensaje: "Comienza tu día con inspiración. ¡Abre la app ahora!"
  
Estado: Esperando interacción del usuario
```

### 3️⃣ Usuario Toca la Notificación

#### Caso A: App cerrada (Cold Start)
```
Usuario toca notificación
  ↓
App se abre desde cero
  ↓
getLastNotificationResponseAsync() detecta la notificación
  ↓
setShouldShowVideo(true)
  ↓
Modal de video se muestra ✅
```

#### Caso B: App en Background
```
Usuario toca notificación
  ↓
App vuelve al foreground
  ↓
addNotificationResponseReceivedListener() detecta el tap
  ↓
setShouldShowVideo(true)
  ↓
Modal de video se muestra ✅
```

#### Caso C: App en Foreground (usuario ya está en la app)
```
Notificación aparece como banner
  ↓
Usuario toca el banner
  ↓
addNotificationResponseReceivedListener() detecta el tap
  ↓
setShouldShowVideo(true)
  ↓
Modal de video se muestra ✅
```

### 4️⃣ Usuario Abre la App SIN Tocar la Notificación

```
Usuario abre la app directamente (después de las 5 AM)
  ↓
loadData() se ejecuta
  ↓
Verifica: ¿Existe video de hoy? ¿Está marcado como visto?
  ↓
Si NO existe o NO está visto:
  setShouldShowVideo(true)
  ↓
Modal de video se muestra ✅
```

**O si la app ya estaba abierta:**

```
App en background → Usuario vuelve a la app
  ↓
AppState listener detecta foreground
  ↓
checkPendingVideo() se ejecuta
  ↓
Verifica AsyncStorage: ¿Video de hoy visto?
  ↓
Si NO está visto:
  setShouldShowVideo(true)
  ↓
Modal de video se muestra ✅
```

### 5️⃣ Usuario Ve el Video

```
Modal abierto → Usuario reproduce video
  ↓
VideoView monitorea progreso cada 500ms
  ↓
Al alcanzar 50%:
  - Guarda progreso en AsyncStorage
  - hasReachedThreshold = true
  ↓
Al alcanzar 90%:
  - setHasWatched(true)
  - Habilita botón "Completar"
  ↓
Usuario presiona "Completar"
  ↓
markVideoAsWatched(videoId) se ejecuta:
  - Actualiza video.watched = true
  - Guarda en AsyncStorage
  - Actualiza LAST_VIDEO_CHECK = today
  - setShouldShowVideo(false)
  ↓
Modal se cierra
  ↓
Usuario continúa navegando en la app ✅
```

### 6️⃣ Si Usuario Salta el Video

```
Usuario presiona X (cerrar)
  ↓
handleSkip() se ejecuta
  ↓
useEffect de DailyVideoModal guarda progreso actual
  ↓
setShouldShowVideo(false)
  ↓
Modal se cierra
  ↓
IMPORTANTE: Video NO marcado como visto
  ↓
Si vuelve a abrir la app o vuelve de background:
  checkPendingVideo() detecta video pendiente
  setShouldShowVideo(true)
  Modal se muestra nuevamente 🔄
```

### 7️⃣ Al Día Siguiente

```
Nueva fecha detectada
  ↓
loadData() verifica:
  - today = "2025-11-15" (nuevo día)
  - lastCheck = "2025-11-14" (ayer)
  ↓
No existe video para hoy
  ↓
setShouldShowVideo(true)
  ↓
getTodayVideo() crea nuevo video:
  - Selecciona video aleatorio (evitando repetir el de ayer)
  - watched = false
  ↓
Ciclo se repite desde paso 2️⃣
```

## 🔧 Componentes Clave

### AppContext.tsx
**Responsabilidades:**
- Configurar notificaciones diarias (5 AM)
- Listeners para interacciones con notificaciones
- Verificar video pendiente al abrir app
- Verificar video pendiente al volver de background
- Gestionar estado `shouldShowVideo`

**Funciones principales:**
- `setupNotifications()`: Programa notificación diaria
- `checkPendingVideo()`: Verifica si hay video pendiente
- `loadData()`: Carga datos y verifica video del día
- `markVideoAsWatched()`: Marca video como visto
- `getTodayVideo()`: Obtiene o crea video del día

### DailyVideoModal.tsx
**Responsabilidades:**
- Mostrar el video en pantalla completa
- Monitorear progreso de reproducción
- Guardar progreso para reanudar después
- Auto-marcar como visto al 90%
- Restaurar progreso guardado

**Características:**
- Usa `expo-video` (VideoView + useVideoPlayer)
- Monitoreo de progreso cada 500ms
- Guarda en AsyncStorage al desmontar
- Resume desde última posición guardada

### app/(tabs)/_layout.tsx
**Responsabilidades:**
- Montar el modal de video de forma persistente
- Escuchar cambios en `shouldShowVideo`
- Pasar datos del video al modal

**Por qué está aquí:**
- El layout de tabs siempre está montado
- Garantiza que el modal esté disponible en cualquier tab
- Evita problemas de redirección

## 📊 Estados del Sistema

### Estados de Notificación
- ✅ **Programada**: Notificación configurada para 5 AM
- 📨 **Enviada**: Notificación visible en dispositivo
- 👆 **Interactuada**: Usuario tocó la notificación
- ⏭️ **Ignorada**: Usuario abrió app sin tocar notificación

### Estados del Video
- 🆕 **No existe**: No hay video para hoy (se crea uno nuevo)
- ⏸️ **En progreso**: Video existe, parcialmente visto (<90%)
- ✅ **Completado**: Video visto al 90%+
- 📼 **Guardado**: Progreso guardado en AsyncStorage

### Estados del Modal
- 🚫 **Cerrado**: shouldShowVideo = false
- 📺 **Abierto**: shouldShowVideo = true
- ▶️ **Reproduciendo**: player.playing = true
- ⏸️ **Pausado**: player.playing = false

## 🔍 Debugging

### Logs Importantes
```
📅 Today: 2025-11-15
📹 Today video: {id, date, videoUrl, watched}
🕐 Last check: 2025-11-14
✨ No video for today, will show modal
📺 Video exists but not watched, will show modal
✅ Video already watched today
📱 Notification response received
🚀 App opened from notification (cold start)
📲 App has come to the foreground
🔔 Pending video detected, showing modal
✅ Video marked as watched, shouldShowVideo set to false
⏭️ User skipped video, closing modal
```

### Verificar en AsyncStorage
Claves a revisar:
- `@apex_daily_videos`: Array de videos
- `@apex_last_video_check`: Fecha del último check
- `@apex_video_progress`: Progreso de videos

### Comandos de Prueba
```bash
# Ver notificaciones programadas
# En código:
const notifications = await Notifications.getAllScheduledNotificationsAsync();
console.log('Scheduled:', notifications);

# Limpiar storage para reiniciar
await AsyncStorage.multiRemove([
  '@apex_daily_videos',
  '@apex_last_video_check',
  '@apex_video_progress'
]);

# Programar notificación de prueba (5 segundos)
await Notifications.scheduleNotificationAsync({
  content: {
    title: '🧪 Test Video',
    body: 'Test notification',
    data: { type: 'daily-video' },
  },
  trigger: { seconds: 5 },
});
```

## ⚠️ Casos Edge

### 1. Usuario cambia la hora del dispositivo
- ✅ El sistema usa `Date.now()` y fechas ISO
- ✅ Las notificaciones se basan en hora local del sistema
- ✅ Cambiar hora podría activar notificación inmediatamente

### 2. App desinstalada y reinstalada
- ⚠️ Se pierde historial de videos
- ✅ Notificaciones se reconfiguran al iniciar
- ✅ Sistema funciona como primera vez

### 3. Permisos de notificación denegados
- ⚠️ No se envían notificaciones
- ✅ Sistema sigue funcionando al abrir app manualmente
- ✅ checkPendingVideo() muestra modal de todos modos

### 4. Usuario ve múltiples veces el mismo día
- ✅ Una vez marcado como visto, no vuelve a aparecer
- ✅ LAST_VIDEO_CHECK previene re-mostrar
- ✅ Verificación en loadData() y checkPendingVideo()

### 5. Usuario salta video repetidamente
- ✅ El video vuelve a aparecer hasta que lo vea
- ✅ Progreso guardado permite reanudar
- ✅ No hay límite de saltos

## 🎨 Mejoras Futuras

### Posibles Funcionalidades
- [ ] Permitir cambiar hora de notificación
- [ ] Recordatorio si no ha visto video después de X horas
- [ ] Estadísticas de videos vistos
- [ ] Racha de días consecutivos viendo videos
- [ ] Categorías de videos (motivación, meditación, etc.)
- [ ] Videos locales (no solo URLs)
- [ ] Compartir video del día
- [ ] Sistema de favoritos

### Optimizaciones Técnicas
- [ ] Caché de videos para reproducción offline
- [ ] Pre-carga del video del día siguiente
- [ ] Mejor manejo de errores de red
- [ ] Analytics de visualización
- [ ] Compresión de videos
- [ ] Subtítulos opcionales
