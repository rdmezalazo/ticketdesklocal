# TicketDesk

Sistema moderno de gestión de tickets, soporte técnico y atención de incidencias desarrollado para optimizar la administración de requerimientos internos y soporte operativo.

---

## 🌐 Demo en Producción

Aplicación desplegada en Vercel:

[https://ticketdesklocal.vercel.app/](https://ticketdesklocal.vercel.app/)

> Reemplazar la URL si el dominio final cambia.

---

## 🚀 Características Principales

### 🎫 Gestión de Tickets

* Creación y seguimiento de tickets
* Estados de atención
* Priorización de incidencias
* Historial de actividades
* Asignación de responsables
* Seguimiento en tiempo real

### 👥 Gestión de Usuarios

* Registro y autenticación
* Roles y permisos
* Gestión de perfiles
* Control de accesos

### 🏢 Gestión Operativa

* Administración de áreas
* Clasificación de incidencias
* Tipificación de requerimientos
* Gestión documental

### 📊 Dashboard y Reportes

* Indicadores de atención
* Estadísticas de tickets
* Reportes operativos
* Métricas de desempeño

### 🔔 Notificaciones

* Alertas de tickets
* Seguimiento de estados
* Actualizaciones automáticas
* Comunicación interna

---

## 🛠️ Tecnologías Utilizadas

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui

### Backend & Servicios

* Supabase
* PostgreSQL
* API REST

### Librerías Principales

* React Router
* React Query
* React Hook Form
* date-fns
* Lucide React

---

## 📂 Estructura del Proyecto

```bash
src/
├── components/
├── pages/
├── hooks/
├── services/
├── integrations/
├── lib/
├── utils/
└── assets/
```

---

## ⚙️ Instalación Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/rdmezalazo/ticketdesklocal.git
```

### 2. Ingresar al directorio

```bash
cd ticketdesklocal
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Configurar variables de entorno

Crear archivo `.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Ejecutar en modo desarrollo

```bash
npm run dev
```

---

## 🏗️ Build de Producción

```bash
npm run build
```

Vista previa local:

```bash
npm run preview
```

---

## ☁️ Despliegue

El proyecto se encuentra preparado para despliegue en:

* Vercel
* Netlify
* Render

### Variables necesarias en producción

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## 🔐 Seguridad

* Autenticación de usuarios
* Gestión de sesiones
* Roles y permisos
* Variables de entorno protegidas
* Integración con Supabase Auth

---

## 📈 Funcionalidades del Sistema

| Módulo                     | Estado |
| -------------------------- | ------ |
| Gestión de Tickets         | ✅      |
| Dashboard                  | ✅      |
| Usuarios y Roles           | ✅      |
| Reportes                   | ✅      |
| Seguimiento de Incidencias | ✅      |
| Notificaciones             | ✅      |
| Configuración del Sistema  | ✅      |

---

## 📌 Scripts Disponibles

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

---

## 🤝 Flujo de Trabajo Git

```bash
git add .
git commit -m "descripcion del cambio"
git push
```

---

## 📄 Licencia

Este proyecto es de uso privado y confidencial.

---

## 👨‍💻 Autor

**Ronald Meza Lazo**

* GitHub: [https://github.com/rdmezalazo](https://github.com/rdmezalazo)
* LinkedIn: [https://www.linkedin.com](https://www.linkedin.com/in/ronald-meza-lazo-2791a155/)

---

## ⭐ Estado del Proyecto

Proyecto en desarrollo activo orientado a la optimización de procesos de soporte técnico, atención operativa y gestión eficiente de incidencias.
