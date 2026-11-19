import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException,UnauthorizedException} from '@nestjs/common';
import {PrismaClient,Role} from '@prisma/client';
import {JwtService} from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import {LoginDto,StudentDto,TeacherDto,CourseDto,EnrollmentDto,GradeDto,UpdateStudentDto,UpdateTeacherDto} from './dto';
import {AuthUser} from './security';
@Injectable()
export class AppService {
 constructor(private db:PrismaClient,private jwt:JwtService){}
 async login(dto:LoginDto){
  const user=await this.db.user.findUnique({where:{email:dto.email.toLowerCase().trim()}});
  if(!user || !(await bcrypt.compare(dto.password,user.passwordHash))){console.warn('LOGIN_REJECTED');throw new UnauthorizedException('Credenciales incorrectas');}
  console.log('LOGIN_SUCCESS',user.role);
  return {token:await this.jwt.signAsync({sub:user.id,email:user.email,role:user.role}),user:{id:user.id,name:user.name,email:user.email,role:user.role}};
 }
 async me(auth:AuthUser){const u=await this.db.user.findUnique({where:{id:auth.sub},select:{id:true,name:true,email:true,role:true}});if(!u)throw new UnauthorizedException();return u;}
 async students(){return this.db.student.findMany({include:{user:{select:{name:true,email:true}}},orderBy:{user:{name:'asc'}}});}
 async teachers(){return this.db.teacher.findMany({include:{user:{select:{name:true,email:true}}},orderBy:{user:{name:'asc'}}});}
 async courses(){return this.db.course.findMany({include:{teacher:{include:{user:{select:{name:true}}}},_count:{select:{enrollments:true}}},orderBy:{code:'asc'}});}
 async createStudent(dto:StudentDto){
  try{return await this.db.$transaction(async tx=>{const u=await tx.user.create({data:{name:dto.name,email:dto.email.toLowerCase().trim(),passwordHash:await bcrypt.hash(dto.password,12),role:Role.ESTUDIANTE}});return tx.student.create({data:{identification:dto.identification,program:dto.program,userId:u.id},include:{user:{select:{name:true,email:true}}}});});}
  catch(e){this.constraint(e);throw e;}
 }
 async createTeacher(dto:TeacherDto){
  try{return await this.db.$transaction(async tx=>{const u=await tx.user.create({data:{name:dto.name,email:dto.email.toLowerCase().trim(),passwordHash:await bcrypt.hash(dto.password,12),role:Role.DOCENTE}});return tx.teacher.create({data:{identification:dto.identification,userId:u.id},include:{user:{select:{name:true,email:true}}}});});}
  catch(e){this.constraint(e);throw e;}
 }
 async updateStudent(id:string,dto:UpdateStudentDto){const record=await this.db.student.findUnique({where:{id}});if(!record)throw new NotFoundException('Estudiante inexistente');try{return await this.db.$transaction(async tx=>{if(dto.name||dto.email)await tx.user.update({where:{id:record.userId},data:{name:dto.name,email:dto.email?.toLowerCase().trim()}});return tx.student.update({where:{id},data:{program:dto.program},include:{user:{select:{name:true,email:true}}}});});}catch(e){this.constraint(e);throw e;}}
 async updateTeacher(id:string,dto:UpdateTeacherDto){const record=await this.db.teacher.findUnique({where:{id}});if(!record)throw new NotFoundException('Docente inexistente');try{return await this.db.user.update({where:{id:record.userId},data:{name:dto.name,email:dto.email?.toLowerCase().trim()},select:{id:true,name:true,email:true}});}catch(e){this.constraint(e);throw e;}}
 async createCourse(dto:CourseDto){if(!(await this.db.teacher.findUnique({where:{id:dto.teacherId}})))throw new NotFoundException('Docente no encontrado');try{return await this.db.course.create({data:dto});}catch(e){this.constraint(e);throw e;}}
 async enroll(dto:EnrollmentDto){
  // Transacción Serializable evita exceder cupos en solicitudes concurrentes; índice único evita duplicados.
  try{return await this.db.$transaction(async tx=>{
   const course=await tx.course.findUnique({where:{id:dto.courseId},include:{_count:{select:{enrollments:true}}}});
   if(!course)throw new NotFoundException('Curso no encontrado');
   if(!(await tx.student.findUnique({where:{id:dto.studentId}})))throw new NotFoundException('Estudiante no encontrado');
   if(course._count.enrollments>=course.capacity)throw new BadRequestException('Cupo completo');
   return tx.enrollment.create({data:dto});
  },{isolationLevel:'Serializable'});}catch(e){this.constraint(e);throw e;}
 }
 async teacherCourses(auth:AuthUser){const teacher=await this.db.teacher.findUnique({where:{userId:auth.sub}});if(!teacher)throw new ForbiddenException();return this.db.course.findMany({where:{teacherId:teacher.id},include:{enrollments:{include:{student:{include:{user:{select:{name:true}}}}}},grades:true}});}
 async saveGrade(auth:AuthUser,dto:GradeDto){
  const teacher=await this.db.teacher.findUnique({where:{userId:auth.sub}});
  const course=await this.db.course.findUnique({where:{id:dto.courseId}});
  if(!teacher||!course||course.teacherId!==teacher.id)throw new ForbiddenException('El docente no es responsable del curso');
  const enrollment=await this.db.enrollment.findUnique({where:{studentId_courseId:{studentId:dto.studentId,courseId:dto.courseId}}});
  if(!enrollment)throw new BadRequestException('El estudiante no está matriculado');
  const grade=await this.db.grade.upsert({where:{studentId_courseId:{studentId:dto.studentId,courseId:dto.courseId}},update:{value:dto.value},create:dto});
  console.log('GRADE_SAVED',{courseId:dto.courseId,gradeId:grade.id});return grade;
 }
 async studentPanel(auth:AuthUser){const student=await this.db.student.findUnique({where:{userId:auth.sub}});if(!student)throw new ForbiddenException();return this.db.enrollment.findMany({where:{studentId:student.id},include:{course:{include:{teacher:{include:{user:{select:{name:true}}}},grades:{where:{studentId:student.id}}}}}});}
 private constraint(e:unknown){if(typeof e==='object'&&e&&'code' in e){if(e.code==='P2002')throw new ConflictException('Ya existe un registro con esa identificación, correo o relación');if(e.code==='P2034')throw new ConflictException('Conflicto de concurrencia; vuelve a intentar');}}
}
