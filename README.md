# SGE — MVP inicial (desarrollo local)

Software web académico de CORHUILA. Esta entrega es una **versión inicial de desarrollo**, no un producto liberado ni un conjunto de pruebas aprobadas.

## Requisitos previos
- Node.js 20 o superior (recomendado 22 LTS)
- PostgreSQL 15 o superior
- Dos terminales de PowerShell, dentro de `backend` y `frontend`

## 1. Configurar PostgreSQL
1. Crear una base de datos vacía llamada `sge` (por pgAdmin o `CREATE DATABASE sge;`).
2. Copiar `backend/.env.example` como `backend/.env` y cambiar `DATABASE_URL` según la contraseña de tu usuario de PostgreSQL.
3. El archivo `.env` **no se debe subir a GitHub**.

## 2. Preparar el backend
```powershell
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run start:dev
```
El backend escuchará en `http://localhost:3001`. Verifica `http://localhost:3001/health`.

## 3. Preparar el frontend (en otra terminal)
```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```
Abrir `http://localhost:3000`.

## Usuarios de demostración (solo local)
- Administrador: `admin@sge.local` / `SgeDemo123!`
- Docente: `docente@sge.local` / `SgeDemo123!`
- Estudiante: `estudiante@sge.local` / `SgeDemo123!`

**Atención:** estos usuarios son ficticios para el ambiente de desarrollo. Cambiar contraseñas y claves antes de cualquier despliegue; no utilizarlos en producción.

## Alcance implementado en el código inicial
- SWR-01: inicio de sesión con correo y contraseña; JWT; protección de endpoints por rol.
- SWR-02 / SWR-07: registrar estudiantes y docentes como administrador.
- SWR-03: crear cursos asignados a un docente.
- SWR-04: matricular estudiantes; detectar duplicados y verificar cupo.
- SWR-05 / SWR-09: crear o modificar calificación de estudiantes matriculados (únicamente docente del curso).
- SWR-06 / SWR-10: consultar cursos y notas del estudiante autenticado.
- SWR-08: actualizar datos de estudiantes y docentes desde el backend.
- Interfaz web con panel por rol. Operaciones de actualización SWR-08 están en la API pero aún no tienen formulario de edición.

## Arquitectura
Next.js + React + TypeScript → API NestJS → Prisma → PostgreSQL.

## Diseño / identidad
Este diseño de interfaz es **provisional** y original. La guía exige seleccionar y documentar una plantilla de dashboard Next.js disponible en línea, con URL y captura. Pendiente adaptar una plantilla seleccionada y registrar la identidad final (logo, colores, fuente).

## Decisiones provisionales / pendientes
- Una sola nota por estudiante y curso; el SRS no define componentes o cortes de evaluación.
- RN-04 cupos y RN-05 privacidad son propuestas que requieren validación formal.
- La primera cuenta del administrador se crea mediante semilla local (no hay registro público).
- Crear cuentas docentes y estudiantiles utiliza una contraseña provisional configurable mediante solicitud de administrador; el frontend usa la predeterminada solo en el desarrollo. Cambiar proceso de aprovisionamiento antes de producción.
- No hay aún resultados de pruebas verificadas, evidencia de cobertura, despliegue, validación ISO 25010 ni CI/CD. Son fases posteriores.

## Seguridad
Tokens almacenados en sessionStorage en la versión local, no aptos para uso productivo de alto riesgo. En producción migrar a cookies HttpOnly, CSRF, límite de intentos, rotación de secretos, auditoría y control de sesiones. Nunca registrar credenciales ni JWT en logs.

## Relación con la guía
El código presenta una base para realizar las pruebas BB, UNIT, RTL, Postman y E2E; **no equivale a haberlas ejecutado**. Las pruebas y sus evidencias deben obtenerse en el entorno de ejecución real.
