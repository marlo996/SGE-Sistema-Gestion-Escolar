import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from './page';

type Role = 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';
type MockResponse = { ok: boolean; json: () => Promise<unknown> };

const users = {
  ADMIN: { id: 'u-admin', name: 'Administrador Demo', email: 'admin@sge.local', role: 'ADMIN' as Role },
  DOCENTE: { id: 'u-docente', name: 'Docente Demo', email: 'docente@sge.local', role: 'DOCENTE' as Role },
  ESTUDIANTE: { id: 'u-estudiante', name: 'Estudiante Demo', email: 'estudiante@sge.local', role: 'ESTUDIANTE' as Role },
};

const teachers = [{ id: 't1', identification: 'D-01', user: { name: 'Docente Demo', email: 'docente@sge.local' } }];
const students = [{ id: 's1', identification: 'E-01', program: 'Ingeniería', user: { name: 'Estudiante Demo', email: 'estudiante@sge.local' } }];
const courses = [{ id: 'c1', code: 'SGE-101', name: 'Matemáticas', capacity: 30, teacher: { user: { name: 'Docente Demo' } }, _count: { enrollments: 1 } }];
const teacherPanel = [{ id: 'c1', code: 'SGE-101', name: 'Matemáticas', enrollments: [{ student: { id: 's1', user: { name: 'Estudiante Demo' } } }], grades: [{ id: 'g1', studentId: 's1', value: 4.5 }] }];
const studentPanel = [{ id: 'e1', course: { code: 'SGE-101', name: 'Matemáticas', teacher: { user: { name: 'Docente Demo' } }, grades: [{ value: 4.5 }] } }];

function response(data: unknown, status = 200): MockResponse {
  return { ok: status >= 200 && status < 300, json: async () => data };
}

function mockApi(role: Role = 'ADMIN', options: { empty?: boolean; loginError?: boolean; createError?: boolean } = {}) {
  const user = users[role];
  const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit): Promise<MockResponse> => {
    const path = new URL(String(input)).pathname;
    const method = init?.method ?? 'GET';
    if (path === '/auth/me') return response(user);
    if (path === '/auth/login') {
      return options.loginError ? response({ message: 'Credenciales incorrectas' }, 401) : response({ token: 'token-prueba', user });
    }
    if (method === 'POST') {
      if (options.createError) return response({ message: 'No se pudo guardar' }, 400);
      return response({ id: 'nuevo' }, 201);
    }
    if (path === '/students') return response(options.empty ? [] : students);
    if (path === '/teachers') return response(options.empty ? [] : teachers);
    if (path === '/courses') return response(options.empty ? [] : courses);
    if (path === '/teacher/courses') return response(options.empty ? [] : teacherPanel);
    if (path === '/student/panel') return response(options.empty ? [] : studentPanel);
    throw new Error(`Endpoint no simulado: ${method} ${path}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function login(role: Role = 'ADMIN') {
  const user = userEvent.setup();
  await screen.findByRole('heading', { name: 'Bienvenido al SGE' });
  await user.clear(screen.getByLabelText('Correo electrónico'));
  await user.type(screen.getByLabelText('Correo electrónico'), users[role].email);
  await user.type(screen.getByLabelText('Contraseña'), 'SgeDemo123!');
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  await screen.findByText(users[role].name);
  return user;
}

beforeEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe('SGE - 12 pruebas de frontend (Vitest + RTL)', () => {
  // RTL-01: Loading durante validación de sesión.
  it('RTL-01 muestra estado de carga al recuperar una sesión', async () => {
    sessionStorage.setItem('sge_token', 'token-prueba');
    let resolve!: (value: MockResponse) => void;
    const pending = new Promise<MockResponse>(r => { resolve = r; });
    vi.stubGlobal('fetch', vi.fn((input: string) => new URL(String(input)).pathname === '/auth/me' ? pending : Promise.resolve(response([]))));
    render(<Home />);
    expect(screen.getByText('Cargando SGE...')).toBeInTheDocument();
    resolve(response(users.ADMIN));
    await screen.findByText('Administrador Demo');
  });

  // RTL-02: Formulario sin sesión.
  it('RTL-02 muestra formulario de acceso cuando no hay token', async () => {
    mockApi();
    render(<Home />);
    expect(await screen.findByRole('heading', { name: 'Bienvenido al SGE' })).toBeVisible();
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
  });

  // RTL-03: Login fallido.
  it('RTL-03 muestra error al iniciar sesión con credenciales incorrectas', async () => {
    mockApi('ADMIN', { loginError: true });
    render(<Home />);
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Bienvenido al SGE' });
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales incorrectas');
    expect(screen.getByRole('heading', { name: 'Bienvenido al SGE' })).toBeInTheDocument();
  });

  // RTL-04: Login correcto y tablero.
  it('RTL-04 inicia sesión de administrador y muestra su tablero', async () => {
    mockApi();
    render(<Home />);
    await login();
    expect(screen.getByText('Administrador Demo')).toBeVisible();
    expect(screen.getByText('Gestión académica centralizada')).toBeInTheDocument();
  });

  // RTL-05: Listado sin datos.
  it('RTL-05 presenta aviso de lista vacía en estudiantes', async () => {
    mockApi('ADMIN', { empty: true });
    render(<Home />);
    const user = await login();
    await user.click(screen.getByRole('button', { name: 'Estudiantes' }));
    expect(screen.getByText('No hay registros para mostrar.')).toBeVisible();
  });

  // RTL-06: Navegación.
  it('RTL-06 permite navegar a la pantalla de cursos', async () => {
    mockApi();
    render(<Home />);
    const user = await login();
    await user.click(screen.getByRole('button', { name: 'Cursos' }));
    expect(screen.getByText('Crear curso')).toBeInTheDocument();
    expect(screen.getByText('Matemáticas')).toBeInTheDocument();
  });

  // RTL-07: Validación nativa required.
  it('RTL-07 impide enviar un curso con campos obligatorios vacíos', async () => {
    const fetchMock = mockApi();
    render(<Home />);
    const user = await login();
    await user.click(screen.getByRole('button', { name: 'Cursos' }));
    expect(screen.getByLabelText('Código')).toBeRequired();
    await user.click(screen.getByRole('button', { name: 'Guardar curso' }));
    expect(fetchMock.mock.calls.filter(([input, init]) => new URL(String(input)).pathname === '/courses' && init?.method === 'POST')).toHaveLength(0);
  });

  // RTL-08: Creación y notificación.
  it('RTL-08 muestra mensaje de éxito al crear un curso', async () => {
    const fetchMock = mockApi();
    render(<Home />);
    const user = await login();
    await user.click(screen.getByRole('button', { name: 'Cursos' }));
    await user.type(screen.getByLabelText('Código'), 'SGE-102');
    await user.type(screen.getByLabelText('Nombre'), 'Física');
    await user.type(screen.getByLabelText('Cupo máximo'), '30');
    await user.selectOptions(screen.getByLabelText('Docente responsable'), 't1');
    await user.click(screen.getByRole('button', { name: 'Guardar curso' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Operación guardada correctamente.');
    expect(fetchMock.mock.calls.some(([input, init]) => new URL(String(input)).pathname === '/courses' && init?.method === 'POST')).toBe(true);
  });

  // RTL-09: Error al guardar.
  it('RTL-09 presenta mensaje de error si el servidor rechaza guardar', async () => {
    mockApi('ADMIN', { createError: true });
    render(<Home />);
    const user = await login();
    await user.click(screen.getByRole('button', { name: 'Cursos' }));
    await user.type(screen.getByLabelText('Código'), 'SGE-103');
    await user.type(screen.getByLabelText('Nombre'), 'Química');
    await user.type(screen.getByLabelText('Cupo máximo'), '20');
    await user.selectOptions(screen.getByLabelText('Docente responsable'), 't1');
    await user.click(screen.getByRole('button', { name: 'Guardar curso' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar');
  });

  // RTL-10: Salida y token.
  it('RTL-10 cierra sesión y elimina el token', async () => {
    mockApi();
    render(<Home />);
    const user = await login();
    expect(sessionStorage.getItem('sge_token')).toBe('token-prueba');
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByRole('heading', { name: 'Bienvenido al SGE' })).toBeInTheDocument();
    expect(sessionStorage.getItem('sge_token')).toBeNull();
  });

  // RTL-11: Permisos visuales y calificaciones del docente.
  it('RTL-11 muestra cursos y notas al docente sin menú de administración', async () => {
    mockApi('DOCENTE');
    render(<Home />);
    const user = await login('DOCENTE');
    expect(screen.queryByRole('button', { name: 'Estudiantes' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Calificaciones' }));
    expect(screen.getByText('Registrar o actualizar nota')).toBeVisible();
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  // RTL-12: Consulta de cursos y notas del estudiante.
  it('RTL-12 permite al estudiante consultar sus cursos y notas', async () => {
    mockApi('ESTUDIANTE');
    render(<Home />);
    await login('ESTUDIANTE');
    expect(screen.getByText('Matemáticas')).toBeVisible();
    expect(screen.getByText('4.5')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Cursos' })).not.toBeInTheDocument();
  });
});
