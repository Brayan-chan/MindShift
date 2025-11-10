# Arquitectura de la Aplicación - APEX Mental

## 🎯 Descripción General

**APEX Mental** es una aplicación móvil diseñada para ayudar a los usuarios a salir del ciclo de procrastinación, dopamina instantánea y malos hábitos, conduciéndolos hacia la mentalidad y disciplina del 1% más exitoso del mundo.

### Nombre y Marca
- **Nombre**: APEX Mental
- **Slogan**: "De la procrastinación a la disciplina del 1%"
- **Identidad**: Productividad minimalista, enfoque en transformación personal

---

## 🏗️ Arquitectura Técnica

### Stack Tecnológico
- **Frontend**: React Native + Expo SDK 54
- **Router**: Expo Router (file-based routing)
- **Gestión de Estado**: 
  - `@nkzw/create-context-hook` para estado global
  - `@tanstack/react-query` para estado del servidor
  - `AsyncStorage` para persistencia local
- **UI/UX**: StyleSheet nativo + Dark Mode minimalista
- **Iconos**: lucide-react-native
- **Internacionalización**: Sistema personalizado con persistencia

### Estructura de Carpetas
```
/
├── app/                          # Routing (Expo Router)
│   ├── _layout.tsx              # Root layout con providers
│   ├── index.tsx                # Pantalla inicial/splash
│   ├── onboarding.tsx           # Onboarding de identidad
│   └── (tabs)/                  # Tab navigation
│       ├── _layout.tsx          # Tab layout con i18n
│       ├── dashboard.tsx        # Panel principal
│       ├── habits.tsx           # Gestión de hábitos
│       ├── focus.tsx            # Sesiones de enfoque
│       └── stats.tsx            # Estadísticas + Configuración
│
├── components/                   # Componentes reutilizables
│   └── LanguageSelector.tsx     # Selector de idioma
│
├── contexts/                     # Contexts globales
│   ├── AppContext.tsx           # Estado principal de la app
│   └── LanguageContext.tsx      # Estado de idioma con i18n
│
├── constants/                    # Constantes
│   ├── colors.ts                # Paleta de colores
│   └── translations.ts          # Traducciones ES/EN
│
└── types/                        # TypeScript types
    └── index.ts                 # Tipos de datos de la app
```

---

## 📊 Modelos de Datos

### 1. **Habit** - Seguimiento de Hábitos
```typescript
{
  id: string
  title: string
  description?: string
  type: 'good' | 'bad'
  category: 'physical' | 'mental' | 'productivity' | 'social'
  streak: number
  completedToday: boolean
  history: Record<string, boolean>
  createdAt: number
  targetDays?: number
  reminder?: { enabled: boolean, time: string }
}
```

### 2. **FocusSession** - Sesiones de Enfoque/Trabajo Profundo
```typescript
{
  id: string
  startTime: number
  endTime?: number
  duration: number
  distractions: number
  completed: boolean
  type: 'deep-work' | 'study' | 'exercise' | 'meditation' | 'custom'
  notes?: string
}
```

### 3. **Distraction** - Registro de Tentaciones/Distracciones
```typescript
{
  id: string
  timestamp: number
  trigger: string
  emotion: string
  action: 'resisted' | 'gave-in'
  notes?: string
}
```

### 4. **Reflection** - Reflexión Diaria
```typescript
{
  id: string
  date: string
  wins: string
  improvements: string
  tomorrowGoals: string
  energy: number (1-10)
  mood: number (1-10)
  gratitude?: string
  identityAffirmation?: string
}
```

### 5. **Goal** - Metas y Objetivos
```typescript
{
  id: string
  title: string
  description: string
  category: 'health' | 'career' | 'relationships' | 'personal-growth' | 'financial'
  deadline: string
  milestones: Milestone[]
  progress: number
  createdAt: number
}
```

### 6. **PhysicalTracking** - Seguimiento Físico
```typescript
{
  date: string
  water: number (vasos/litros)
  sleep: number (horas)
  exercise: boolean
  exerciseDuration?: number (minutos)
  energy: number (1-10)
  notes?: string
}
```

### 7. **WarMode** - Modo Guerra (Bloqueo Total)
```typescript
{
  active: boolean
  startTime?: number
  duration: number (minutos)
  blockedApps: string[]
}
```

### 8. **UserIdentity** - Identidad del Usuario
```typescript
{
  currentIdentity: string
  targetIdentity: string
  whyTransform: string
  setupComplete: boolean
  coreValues: string[]
}
```

### 9. **AppSettings** - Configuración de la App
```typescript
{
  language: 'es' | 'en'
  darkMode: boolean
  notifications: {
    habits: boolean
    reflections: boolean
    focusSessions: boolean
    motivational: boolean
  }
  focusMode: {
    defaultDuration: number
    breakDuration: number
    longBreakAfter: number
  }
}
```

---

## 🌐 Sistema de Internacionalización

### Idiomas Soportados
- **Español (es)** - Idioma por defecto
- **English (en)**

### Características
- ✅ Persistencia automática en AsyncStorage
- ✅ Hook personalizado `useLanguage()` con función `t(key)`
- ✅ Cambio en tiempo real sin reiniciar la app
- ✅ Selector de idioma integrado en pantalla de Stats
- ✅ Traducciones para todos los módulos principales

### Uso
```typescript
import { useLanguage } from '@/contexts/LanguageContext';

function MyComponent() {
  const { t, language, setLanguage } = useLanguage();
  
  return (
    <Text>{t('dashboard.greeting')}</Text>
  );
}
```

---

## 📱 Módulos y Pantallas Principales

### 1. **Onboarding**
- Bienvenida y presentación
- Definición de identidad actual vs. identidad objetivo
- Establecimiento del "por qué" de la transformación
- Valores fundamentales

### 2. **Dashboard** (Panel Principal)
- Saludo personalizado según hora del día
- Racha actual de hábitos
- Tiempo de enfoque del día
- Acciones rápidas: Iniciar enfoque, registrar distracción, reflexión
- Resumen de hábitos del día

### 3. **Habits** (Hábitos)
- Lista de hábitos positivos y negativos
- Toggle para marcar como completados
- Visualización de rachas
- Agregar/editar/eliminar hábitos
- Categorización por tipo (físico, mental, productividad, social)

### 4. **Focus** (Enfoque)
- Iniciar sesiones de enfoque con temporizador
- Tipos de sesión: trabajo profundo, estudio, ejercicio, meditación
- Contador de distracciones
- Registro detallado de tentaciones (trigger, emoción, acción)
- Historial de sesiones

### 5. **Stats** (Estadísticas y Configuración)
- Estadísticas generales (racha, tiempo total, tasa de completación)
- Análisis de distracciones
- Puntuación de disciplina
- **Selector de Idioma** (ES/EN)
- Configuración de notificaciones (futuro)

---

## 🔄 Flujo de Usuario

### Primera Vez (Onboarding)
1. Usuario abre la app
2. Pantalla de bienvenida con propuesta de valor
3. Definición de identidad actual
4. Definición de identidad objetivo
5. Establecer el "por qué" (motivación profunda)
6. Guardar y redirigir a Dashboard

### Uso Diario
1. **Mañana**: 
   - Ver dashboard con saludo
   - Revisar hábitos del día
   - Iniciar sesión de enfoque matutina

2. **Durante el Día**:
   - Marcar hábitos completados
   - Registrar distracciones/tentaciones
   - Ejecutar sesiones de enfoque

3. **Noche**:
   - Completar reflexión diaria
   - Revisar estadísticas
   - Planificar día siguiente

---

## 🚀 MVP vs. Funcionalidades Futuras

### ✅ MVP (Implementado)
- [x] Sistema de tipos completo
- [x] Gestión de hábitos básica
- [x] Sesiones de enfoque
- [x] Reflexiones diarias
- [x] Estadísticas básicas
- [x] Internacionalización (ES/EN)
- [x] Persistencia en AsyncStorage
- [x] UI/UX minimalista dark mode

### 🔮 Funcionalidades Futuras (Expansión)
- [ ] **Modo Guerra**: Bloqueo real de apps nativas
- [ ] **Seguimiento Físico**: Agua, sueño, ejercicio
- [ ] **Sistema de Metas**: Con milestones y progreso
- [ ] **Notificaciones Inteligentes**: Basadas en neuropsicología
- [ ] **Gráficas Avanzadas**: Visualización de progreso temporal
- [ ] **Exportar/Importar Datos**: Backup y migración
- [ ] **Comunidad**: Accountability partners
- [ ] **Gamificación Madura**: Logros, niveles (sin ser infantil)
- [ ] **IA Coach**: Recomendaciones personalizadas
- [ ] **Integración con Calendario**: Google Calendar, Apple Calendar
- [ ] **Widgets**: Acceso rápido desde home screen
- [ ] **Sistema de videos de inspiración**: Sistema de notificación diaria para ingresar a la app a visualizar el video diario de motivación para no perder el enfoque, cada día el video es diferente, la notificación debe ejecutarse al amanecer, se debe registrar que se vio el video completamente y asi poder seguir usando la app con normalidad hasta el siguiente día con un video diferente. 

---

## 🎨 Diseño UI/UX

### Paleta de Colores (Dark Mode)
```typescript
{
  background: '#0A0A0A'       // Fondo principal
  surface: '#1A1A1A'          // Tarjetas
  surfaceElevated: '#252525'  // Elementos elevados
  surfaceHover: '#222222'     // Hover state
  
  text: '#FFFFFF'             // Texto principal
  textSecondary: '#A0A0A0'    // Texto secundario
  textTertiary: '#6B6B6B'     // Texto terciario
  
  primary: '#0EA5E9'          // Acción principal (cyan/blue)
  success: '#10B981'          // Éxito/positivo (green)
  danger: '#EF4444'           // Peligro/negativo (red)
  warning: '#F59E0B'          // Advertencia (orange)
  
  border: '#2A2A2A'           // Bordes
}
```

### Principios de Diseño
- **Minimalismo**: Clean, sin elementos innecesarios
- **Enfoque**: Diseño que ayuda a concentrarse
- **Motivación**: Sin gamificación infantil, recompensas maduras
- **Claridad**: Información fácil de entender
- **Mobile-First**: Optimizado para pantallas táctiles

---

## 💾 Persistencia de Datos

### AsyncStorage Keys
```typescript
{
  '@apex_habits': Habit[]
  '@apex_sessions': FocusSession[]
  '@apex_reflections': Reflection[]
  '@apex_identity': UserIdentity
  '@apex_language': Language
  '@apex_distractions': Distraction[]
  '@apex_goals': Goal[]
  '@apex_physical': PhysicalTracking[]
}
```

### Estrategia de Persistencia
- Guardado automático en cada cambio
- Carga inicial al abrir la app
- Sin backend por ahora (futuro: Supabase/Firebase)
- Datos locales en el dispositivo

---

## 🧠 Fundamentos en Neurociencia y Psicología

### Principios Aplicados

1. **Reprogramación de Identidad**
   - Enfoque en "quién eres" vs "qué haces"
   - Afirmaciones diarias de identidad objetivo
   - Reflexión constante sobre valores

2. **Sistema de Dopamina Saludable**
   - Recompensas basadas en progreso real
   - Visualización de rachas (sin exageración)
   - Sin notificaciones spam ni gamificación adictiva

3. **Conciencia de Patrones**
   - Registro de distracciones (trigger → emoción → acción)
   - Reflexión diaria estructurada
   - Análisis de tendencias

4. **Consistencia > Intensidad**
   - Énfasis en rachas y hábitos diarios
   - Sesiones de enfoque regulares
   - Pequeños pasos sostenibles

5. **Modo Guerra (Futuro)**
   - Bloqueo temporal radical de distracciones
   - Para momentos de máxima necesidad
   - Basado en "friction design"

---

## 🔒 Privacidad y Seguridad

- ✅ Todos los datos se almacenan localmente
- ✅ Sin tracking de terceros
- ✅ Sin recolección de datos personales
- ✅ Open source (futuro)

---

## 💰 Estrategia de Monetización (Futuro)

### Modelo Freemium
- **Free Tier**:
  - Seguimiento de hasta 5 hábitos
  - Sesiones de enfoque ilimitadas
  - Reflexiones diarias
  - Estadísticas básicas

- **Premium ($9.99/mes)**:
  - Hábitos ilimitados
  - Modo Guerra
  - Estadísticas avanzadas con gráficas
  - Seguimiento físico completo
  - Exportar datos
  - IA Coach (recomendaciones)
  - Sin anuncios

### Modelo Alternativo: Pago Único
- $29.99 de por vida
- Todas las funciones premium
- Actualizaciones incluidas

---

## 🛠️ Instrucciones de Desarrollo

### Instalación
```bash
# Clonar repositorio
git clone [repo]
cd apex-mental

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm start

# Iniciar en web
npm run start-web
```

### Scripts Disponibles
```json
{
  "start": "expo start",
  "start-web": "expo start --web",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "lint": "expo lint"
}
```

### Agregar Nuevo Idioma
1. Agregar código en `types/index.ts`: `type Language = 'es' | 'en' | 'fr'`
2. Agregar traducciones en `constants/translations.ts`
3. Agregar opción en `components/LanguageSelector.tsx`

---

## 📚 Recursos y Referencias

### Psicología del Comportamiento
- James Clear - Atomic Habits
- Dr. Andrew Huberman - Neuroscience protocols
- Cal Newport - Deep Work
- BJ Fogg - Behavior Design

### Diseño de Productividad
- Things 3
- Notion
- Streaks
- Forest

---

## 🎯 Objetivos de la App

**Misión**: Convertir a cualquier persona promedio en alguien disciplinado, enfocado, mentalmente fuerte y con hábitos del 1%.

**Visión**: Ser la herramienta #1 para transformación personal basada en ciencia, sin trucos ni manipulación, solo sistemas probados y diseño centrado en el usuario.

---

## 📞 Contacto y Soporte

- **GitHub**: [repo link]
- **Email**: support@apexmental.app
- **Twitter**: @apexmental

---

**Última actualización**: 2025-09-11
**Versión**: 1.0.0 MVP
