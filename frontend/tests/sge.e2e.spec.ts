import { test, expect, Page } from '@playwright/test';

const DEMO_PASSWORD = process.env.SGE_DEMO_PASSWORD;
const accounts = {
  admin: 'admin@sge.local',
  teacher: 'docente@sge.local',
  student: 'estudiante@sge.local',
};

async function login(page: Page, email: string, password = DEMO_PASSWORD!) {
  await page.goto('/');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

async function adminCreateCourse(page: Page, code: string) {
  await login(page, accounts.admin);
  await expect(page.getByText('Administrador', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cursos', exact: true }).click();
  await page.getByLabel('Código').fill(code);
  await page.getByLabel('Nombre', { exact: true }).fill('Prueba E2E ' + code);
  await page.getByLabel('Cupo máximo').fill('30');
  await page.getByLabel('Docente responsable').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Guardar curso' }).click();
  await expect(page.getByRole('status')).toContainText('Operación guardada correctamente');
  await expect(page.getByRole('table').getByText(code, { exact: true })).toBeVisible();
}

async function fullAcademicFlow(page: Page, grade: string, suffix: string) {
  const code = `E2E-${suffix}`;
  // Primera etapa: administración, creación de curso y matrícula por la interfaz
  await adminCreateCourse(page, code);
  await page.getByRole('button', { name: 'Matrículas', exact: true }).click();
  await page.getByLabel('Estudiante').selectOption({ index: 1 });
  await page.getByLabel('Curso', { exact: true }).selectOption({ label: `${code} · Prueba E2E ${code}` });
  await page.getByRole('button', { name: 'Registrar matrícula' }).click();
  await expect(page.getByRole('status')).toContainText('Operación guardada correctamente');
  // Segunda etapa: docente califica a estudiante de demostración
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await login(page, accounts.teacher);
  await page.getByRole('button', { name: 'Calificaciones', exact: true }).click();
  await page.getByLabel('Mi curso').selectOption({ label: `${code} · Prueba E2E ${code}` });
  await page.getByLabel('Estudiante matriculado').selectOption({ index: 1 });
  await page.getByLabel('Calificación de 0.0 a 5.0').fill(grade);
  await page.getByRole('button', { name: 'Guardar calificación' }).click();
  await expect(page.getByRole('status')).toContainText('Operación guardada correctamente');
  // Tercera etapa: el estudiante consulta el resultado
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await login(page, accounts.student);
  const row = page.getByRole('row').filter({ hasText: code });
  await expect(row).toBeVisible();
  await expect(row).toContainText(grade);
}

test.beforeEach(() => {
  test.skip(!DEMO_PASSWORD, 'Configure SGE_DEMO_PASSWORD en esta terminal; no la escriba en el código.');
});

test('E2E-01: rechaza una contraseña incorrecta', async ({ page }) => {
  await login(page, accounts.teacher, 'ClaveIncorrectaE2E!');
  await expect(page.getByText('Credenciales incorrectas', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
});

test('E2E-02: administrador visualiza panel de gestión', async ({ page }) => {
  await login(page, accounts.admin);

await expect(
  page.getByText('Cargando SGE...', { exact: true })
).toBeHidden({ timeout: 20000 });

await page.screenshot({
  path: 'estado-login-admin.png',
  fullPage: true,
});

  await expect(page.getByText('Administrador', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Estudiantes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Registrar estudiante' })).toBeVisible();
});

test('E2E-03: administrador crea curso desde formulario', async ({ page }) => {
  const code = 'E2E-C-' + Date.now().toString().slice(-8);
  await adminCreateCourse(page, code);
});

test('E2E-04: flujo completo con calificación 4.5', async ({ page }) => {
  const suffix = 'A' + Date.now().toString().slice(-7);
  await fullAcademicFlow(page, '4.5', suffix);
});

test('E2E-05: flujo completo con calificación límite 5.0', async ({ page }) => {
  const suffix = 'B' + Date.now().toString().slice(-7);
  await fullAcademicFlow(page, '5', suffix);
});
