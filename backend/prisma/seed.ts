import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
const db = new PrismaClient();
async function main(){
 const passwordHash = await bcrypt.hash('SgeDemo123!',12);
 const admin = await db.user.upsert({where:{email:'admin@sge.local'},update:{},create:{email:'admin@sge.local',name:'Administrador Demo',role:Role.ADMIN,passwordHash}});
 const teacherUser = await db.user.upsert({where:{email:'docente@sge.local'},update:{},create:{email:'docente@sge.local',name:'Docente Demo',role:Role.DOCENTE,passwordHash}});
 const studentUser = await db.user.upsert({where:{email:'estudiante@sge.local'},update:{},create:{email:'estudiante@sge.local',name:'Estudiante Demo',role:Role.ESTUDIANTE,passwordHash}});
 const teacher=await db.teacher.upsert({where:{userId:teacherUser.id},update:{},create:{identification:'D-0001',userId:teacherUser.id}});
 const student=await db.student.upsert({where:{userId:studentUser.id},update:{},create:{identification:'E-0001',program:'Ingeniería de Sistemas',userId:studentUser.id}});
 const course=await db.course.upsert({where:{code:'SGE-101'},update:{},create:{code:'SGE-101',name:'Curso de demostración',capacity:30,teacherId:teacher.id}});
 await db.enrollment.upsert({where:{studentId_courseId:{studentId:student.id,courseId:course.id}},update:{},create:{studentId:student.id,courseId:course.id}});
 console.log('Datos de prueba preparados:',admin.email);
}
main().finally(()=>db.$disconnect());
