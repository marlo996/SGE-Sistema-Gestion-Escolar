import * as bcrypt from 'bcryptjs';
import {
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { AppService } from './service';
import { AuthUser } from './security';

describe('SGE - Pruebas unitarias', () => {
  let service: AppService;
  let db: any;

  const auth = {
    sub: 'usuario-1',
    email: 'docente@sge.local',
    role: 'DOCENTE',
  } as AuthUser;

  beforeEach(() => {
    db = {
      user: {
        findUnique: jest.fn(),
      },
      teacher: {
        findUnique: jest.fn(),
      },
      student: {
        findUnique: jest.fn(),
      },
      course: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      enrollment: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      grade: {
        upsert: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    db.$transaction.mockImplementation(
      async (callback: any) => callback(db),
    );

    const jwt = {
      signAsync: jest.fn(),
    };

    service = new AppService(
      db as PrismaClient,
      jwt as unknown as JwtService,
    );
  });

  // UNIT-01: Usuario válido
  it('permite consultar un usuario existente', async () => {
    const usuario = {
      id: 'usuario-1',
      name: 'Docente Demo',
      role: 'DOCENTE',
    };

    db.user.findUnique.mockResolvedValue(usuario);

    const resultado = await service.me(auth);

    expect(resultado).toEqual(usuario);
  });

  // UNIT-02: Usuario inexistente
  it('rechaza un usuario inexistente', async () => {
    db.user.findUnique.mockResolvedValue(null);

    await expect(service.me(auth))
      .rejects.toThrow(UnauthorizedException);
  });

  // UNIT-03: Docente inexistente
  it('rechaza crear un curso sin docente válido', async () => {
    db.teacher.findUnique.mockResolvedValue(null);

    const curso = {
      code: 'SGE-200',
      name: 'Física',
      capacity: 30,
      teacherId: 'inexistente',
    };

    await expect(service.createCourse(curso))
      .rejects.toThrow(NotFoundException);
  });

  // UNIT-04: Crear curso válido
  it('permite crear un curso con docente válido', async () => {
    db.teacher.findUnique.mockResolvedValue({
      id: 'docente-1',
    });

    const curso = {
      code: 'SGE-200',
      name: 'Física',
      capacity: 30,
      teacherId: 'docente-1',
    };

    db.course.create.mockResolvedValue({
      id: 'curso-1',
      ...curso,
    });

    const resultado = await service.createCourse(curso);

    expect(resultado.name).toBe('Física');
    expect(db.course.create).toHaveBeenCalledWith({
      data: curso,
    });
  });

  // UNIT-05: Curso inexistente
  it('rechaza matrícula en curso inexistente', async () => {
    db.course.findUnique.mockResolvedValue(null);

    const matricula = {
      studentId: 'estudiante-1',
      courseId: 'curso-inexistente',
    };

    await expect(service.enroll(matricula))
      .rejects.toThrow(NotFoundException);
  });

  // UNIT-06: Cupo lleno
  it('rechaza matrícula cuando no hay cupos', async () => {
    db.course.findUnique.mockResolvedValue({
      id: 'curso-1',
      capacity: 30,
      _count: { enrollments: 30 },
    });

    db.student.findUnique.mockResolvedValue({
      id: 'estudiante-1',
    });

    const matricula = {
      studentId: 'estudiante-1',
      courseId: 'curso-1',
    };

    await expect(service.enroll(matricula))
      .rejects.toThrow(BadRequestException);
  });

  // UNIT-07: Docente no autorizado
  it('rechaza calificar un curso ajeno', async () => {
    db.teacher.findUnique.mockResolvedValue({
      id: 'docente-1',
    });

    db.course.findUnique.mockResolvedValue({
      id: 'curso-1',
      teacherId: 'otro-docente',
    });

    const nota = {
      studentId: 'estudiante-1',
      courseId: 'curso-1',
      value: 4.5,
    };

    await expect(service.saveGrade(auth, nota))
      .rejects.toThrow(ForbiddenException);
  });

  // UNIT-08: Estudiante no matriculado
  it('rechaza nota de estudiante no matriculado', async () => {
    db.teacher.findUnique.mockResolvedValue({
      id: 'docente-1',
    });

    db.course.findUnique.mockResolvedValue({
      id: 'curso-1',
      teacherId: 'docente-1',
    });

    db.enrollment.findUnique.mockResolvedValue(null);

    const nota = {
      studentId: 'estudiante-1',
      courseId: 'curso-1',
      value: 4.5,
    };

    await expect(service.saveGrade(auth, nota))
      .rejects.toThrow(BadRequestException);
  });

  // CB-01: Estudiante inexistente
  it('rechaza matricular estudiante inexistente', async () => {
    db.course.findUnique.mockResolvedValue({
      id: 'curso-1',
      capacity: 30,
      _count: { enrollments: 5 },
    });

    db.student.findUnique.mockResolvedValue(null);

    await expect(service.enroll({
      studentId: 'inexistente',
      courseId: 'curso-1',
    })).rejects.toThrow(NotFoundException);
  });

  // CB-01: Matrícula válida
  it('permite matricular si hay cupos', async () => {
    db.course.findUnique.mockResolvedValue({
      id: 'curso-1',
      capacity: 30,
      _count: { enrollments: 29 },
    });

    db.student.findUnique.mockResolvedValue({
      id: 'estudiante-1',
    });

    db.enrollment.create.mockResolvedValue({
      id: 'matricula-1',
    });

    await service.enroll({
      studentId: 'estudiante-1',
      courseId: 'curso-1',
    });

    expect(db.enrollment.create).toHaveBeenCalled();
  });

  // CB-02: Calificación autorizada
  it('permite calificar a un estudiante matriculado', async () => {
    db.teacher.findUnique.mockResolvedValue({
      id: 'docente-1',
    });

    db.course.findUnique.mockResolvedValue({
      id: 'curso-1',
      teacherId: 'docente-1',
    });

    db.enrollment.findUnique.mockResolvedValue({
      id: 'matricula-1',
    });

    db.grade.upsert.mockResolvedValue({
      id: 'nota-1',
      value: 4.5,
    });

    const resultado = await service.saveGrade(auth, {
      studentId: 'estudiante-1',
      courseId: 'curso-1',
      value: 4.5,
    });

    expect(resultado.value).toBe(4.5);
    expect(db.grade.upsert).toHaveBeenCalled();
  });


  // CB-03: Contraseña incorrecta
  it('rechaza contraseña incorrecta', async () => {
    const passwordHash = bcrypt.hashSync('ClaveCorrecta123!', 4);

    db.user.findUnique.mockResolvedValue({
      id: 'usuario-1',
      name: 'Docente Demo',
      email: 'docente@sge.local',
      role: 'DOCENTE',
      passwordHash,
    });

    await expect(service.login({
      email: 'docente@sge.local',
      password: 'ClaveIncorrecta',
    })).rejects.toThrow(UnauthorizedException);
  });


  // CB-03: Inicio de sesión correcto
  it('permite login con credenciales válidas', async () => {
    const passwordHash = bcrypt.hashSync('Clave123!', 4);

    db.user.findUnique.mockResolvedValue({
      id: 'usuario-1',
      name: 'Docente Demo',
      email: 'docente@sge.local',
      role: 'DOCENTE',
      passwordHash,
    });

    const jwtMock = {
      signAsync: jest.fn().mockResolvedValue('token-prueba'),
    };

    const servicioLogin = new AppService(
      db as PrismaClient,
      jwtMock as unknown as JwtService,
    );

    const resultado = await servicioLogin.login({
      email: 'docente@sge.local',
      password: 'Clave123!',
    });

    expect(resultado.token).toBe('token-prueba');
    expect(resultado.user.role).toBe('DOCENTE');
    expect(jwtMock.signAsync).toHaveBeenCalled();
  });

});
