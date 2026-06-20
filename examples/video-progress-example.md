# Sistema de Guardado de Progreso de Videos

## 📋 Descripción

Este sistema permite que el progreso de visualización de videos se guarde automáticamente, de modo que si el usuario cierra la app mientras ve un video, puede retomarlo desde donde lo dejó.

## ✨ Características Implementadas

### 1. **Guardado Automático al 50%**
- Cuando el usuario alcanza el 50% del video, el progreso se guarda automáticamente
- Esto garantiza que incluso si la app se cierra, el progreso no se pierde

### 2. **Restauración de Posición**
- Al abrir el video nuevamente, se restaura automáticamente desde la posición guardada
- Muestra un banner indicando desde qué porcentaje se reanudará

### 3. **Auto-Completado al 90%**
- Si el usuario ve más del 90% del video, se marca automáticamente como "visto"
- El botón "Marcar como visto" se habilita

### 4. **Limpieza Automática**
- Los progresos guardados se eliminan después de 7 días
- Los progresos de videos completados se eliminan inmediatamente

### 5. **Guardado al Salir**
- Si el usuario presiona "Omitir" o cierra el modal, el progreso se guarda automáticamente

## 🔧 Implementación Técnica

### Estructura de Datos

```typescript
type VideoProgress = {
  videoId: string;        // ID único del video
  position: number;       // Posición en milisegundos
  duration: number;       // Duración total en milisegundos
  percentWatched: number; // Porcentaje visto (0-100)
  lastUpdated: number;    // Timestamp de última actualización
};
```

### Storage Key

```typescript
const STORAGE_KEY = '@apex_video_progress';
```

### Umbrales Configurables

```typescript
const PROGRESS_THRESHOLD = 50;      // Guardar automáticamente al 50%
const AUTO_COMPLETE_THRESHOLD = 90; // Marcar como visto al 90%
```

## 📱 Flujo de Usuario

### Escenario 1: Usuario Ve 30% y Cierra la App

1. Usuario abre video y empieza a ver
2. Ve hasta el 30% y cierra la app
3. **NO se guarda** (aún no alcanzó el 50%)
4. Al reabrir, el video empieza desde el inicio

### Escenario 2: Usuario Ve 60% y Cierra la App

1. Usuario abre video y empieza a ver
2. Ve hasta el 60% → **Progreso guardado automáticamente**
3. Cierra la app o presiona "Omitir"
4. Al reabrir el video:
   - Muestra banner: "📼 Continuar desde 60%"
   - Video se posiciona automáticamente en ese punto

### Escenario 3: Usuario Ve 95% del Video

1. Usuario ve hasta el 95%
2. **Automáticamente** se marca como visto
3. Botón "Marcar como visto" se habilita
4. Al presionar el botón:
   - Progreso guardado se elimina
   - Video se registra como completado
   - Usuario puede acceder a la app

### Escenario 4: Usuario Ve Video Completo

1. Video llega al final
2. Se marca automáticamente como visto
3. Usuario presiona "Marcar como visto"
4. Progreso se elimina de AsyncStorage
5. Usuario continúa a la app

## 🎨 Interfaz de Usuario

### Banner de Progreso

Cuando hay progreso guardado:

```
┌─────────────────────────────────────┐
│ 📼 Continuar desde 67%              │
└─────────────────────────────────────┘
```

- Color: Naranja/Warning
- Aparece debajo del banner de racha
- Solo se muestra si el progreso es < 90%

## 🧪 Testing

### Test 1: Guardar Progreso al 50%

```bash
1. Abrir video
2. Avanzar hasta el 50%
3. Verificar en logs: "Video progress saved"
4. Cerrar app
5. Verificar AsyncStorage con:
   await AsyncStorage.getItem('@apex_video_progress')
```

### Test 2: Restaurar Progreso

```bash
1. Tener progreso guardado
2. Abrir video nuevamente
3. Verificar que:
   - Banner muestra "Continuar desde X%"
   - Video se posiciona automáticamente
```

### Test 3: Auto-Completado al 90%

```bash
1. Avanzar video hasta el 90%
2. Verificar que botón "Marcar como visto" se habilite
3. Presionar botón
4. Verificar que progreso se elimine
```

### Test 4: Limpieza de Progresos Antiguos

```bash
1. Crear progresos con fechas antiguas (>7 días)
2. Guardar nuevo progreso
3. Verificar que progresos antiguos se eliminaron
```

## 🔍 Debugging

### Ver Progreso Guardado

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const checkProgress = async () => {
  const stored = await AsyncStorage.getItem('@apex_video_progress');
  if (stored) {
    const progress = JSON.parse(stored);
    console.log('Saved progress:', progress);
  }
};
```

### Limpiar Todo el Progreso (Testing)

```typescript
await AsyncStorage.removeItem('@apex_video_progress');
```

## 📊 Ejemplo de Datos Guardados

```json
[
  {
    "videoId": "1731506400000",
    "position": 125000,
    "duration": 180000,
    "percentWatched": 69.44,
    "lastUpdated": 1731506500000
  },
  {
    "videoId": "1731420000000",
    "position": 90000,
    "duration": 150000,
    "percentWatched": 60.0,
    "lastUpdated": 1731420100000
  }
]
```

## 🚀 Mejoras Futuras

### 1. Sincronización en la Nube
- Guardar progreso en backend
- Permitir retomar en otro dispositivo

### 2. Analytics
- Trackear tiempo promedio de visualización
- Identificar videos más vistos
- Detectar puntos donde usuarios abandonan

### 3. Offline Mode
- Descargar videos para verlos sin internet
- Guardar progreso localmente y sincronizar después

### 4. Capítulos
- Dividir videos largos en capítulos
- Permitir saltar a capítulos específicos
- Guardar progreso por capítulo

## 💡 Notas Importantes

### Performance

- El guardado de progreso no impacta el rendimiento
- Se guarda solo cuando se alcanza el threshold (50%)
- Limpieza automática previene acumulación de datos

### Privacy

- Todo se guarda localmente en el dispositivo
- No se envía información a servidores externos
- Usuario tiene control total de sus datos

### Limitaciones

- **Expo Go**: Puede tener limitaciones con AsyncStorage
- **Web**: Video playback limitado, pero progreso se guarda
- **iOS/Android**: Funcionalidad completa

## 📞 Troubleshooting

### Progreso No Se Guarda

```typescript
// Verificar que AsyncStorage esté funcionando
try {
  await AsyncStorage.setItem('test', 'value');
  const value = await AsyncStorage.getItem('test');
  console.log('AsyncStorage working:', value === 'value');
} catch (error) {
  console.error('AsyncStorage error:', error);
}
```

### Video No Se Restaura

```typescript
// Verificar que el videoRef esté disponible
useEffect(() => {
  if (savedProgress && videoRef.current) {
    console.log('Restoring to position:', savedProgress.position);
    videoRef.current.setPositionAsync(savedProgress.position);
  }
}, [savedProgress]);
```

### Progreso Se Pierde al Cerrar App

- Asegúrate de que el componente tenga tiempo de guardar
- Verifica que `saveCurrentProgress()` se llame en `handleSkip`
- Revisa que el `useEffect` con cleanup se ejecute correctamente

---

**Última actualización**: 13 de noviembre de 2025
**Versión**: 1.0.0
