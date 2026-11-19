import {Body,Controller,Get,Param,Patch,Post,Req,UseGuards} from '@nestjs/common';
import {Role} from '@prisma/client';
import {AppService} from './service';
import {JwtAuthGuard,Roles,AuthUser} from './security';
import {LoginDto,StudentDto,TeacherDto,UpdateStudentDto,UpdateTeacherDto,CourseDto,EnrollmentDto,GradeDto} from './dto';
@Controller()
export class AppController {
 constructor(private svc:AppService){}
 @Get('health') health(){return {status:'ok',service:'SGE'};}
 @Post('auth/login') login(@Body() dto:LoginDto){return this.svc.login(dto);}
 @Get('auth/me') @UseGuards(JwtAuthGuard) me(@Req() req:{user:AuthUser}){return this.svc.me(req.user);}
 @Get('students') @UseGuards(JwtAuthGuard) @Roles(Role.ADMIN) students(){return this.svc.students();}
 @Post('students') @UseGuards(JwtAuthGuard) @Roles(Role.ADMIN) createStudent(@Body() dto:StudentDto){return this.svc.createStudent(dto);}
 @Patch('students/:id') @UseGuards(JwtAuthGuard) @Roles(Role.ADMIN) updateStudent(@Param('id') id:string,@Body() dto:UpdateStudentDto){return this.svc.updateStudent(id,dto);}
 @Get('teachers') @UseGuards(JwtAuthGuard) @Roles(Role.ADMIN) teachers(){return this.svc.teachers();}
 @Post('teachers') @UseGuards(JwtAuthGuard) @Roles(Role.ADMIN) createTeacher(@Body() dto:TeacherDto){return this.svc.createTeacher(dto);}
 @Patch('teachers/:id') @UseGuards(JwtAuthGuard) @Roles(Role.ADMIN) updateTeacher(@Param('id') id:string,@Body() dto:UpdateTeacherDto){return this.svc.updateTeacher(id,dto);}
 @Get('courses') @UseGuards(JwtAuthGuard) @Roles(Role.ADMIN) courses(){return this.svc.courses();}
 @Post('courses') @UseGuards(JwtAuthGuard) @Roles(Role.ADMIN) createCourse(@Body() dto:CourseDto){return this.svc.createCourse(dto);}
 @Post('enrollments') @UseGuards(JwtAuthGuard) @Roles(Role.ADMIN) enroll(@Body() dto:EnrollmentDto){return this.svc.enroll(dto);}
 @Get('teacher/courses') @UseGuards(JwtAuthGuard) @Roles(Role.DOCENTE) teacherCourses(@Req() req:{user:AuthUser}){return this.svc.teacherCourses(req.user);}
 @Post('teacher/grades') @UseGuards(JwtAuthGuard) @Roles(Role.DOCENTE) saveGrade(@Req() req:{user:AuthUser},@Body() dto:GradeDto){return this.svc.saveGrade(req.user,dto);}
 @Get('student/panel') @UseGuards(JwtAuthGuard) @Roles(Role.ESTUDIANTE) studentPanel(@Req() req:{user:AuthUser}){return this.svc.studentPanel(req.user);}
}
