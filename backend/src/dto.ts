import {IsEmail,IsIn,IsInt,IsNotEmpty,IsNumber,IsOptional,IsString,Max,MaxLength,Min,MinLength} from 'class-validator';
export class LoginDto { @IsEmail() email!:string; @IsString() @IsNotEmpty() password!:string; }
export class StudentDto { @IsString() @MinLength(2) name!:string; @IsString() @IsNotEmpty() identification!:string; @IsEmail() email!:string; @IsString() @IsNotEmpty() program!:string; @IsString() @MinLength(8) password!:string; }
export class TeacherDto { @IsString() @MinLength(2) name!:string; @IsString() @IsNotEmpty() identification!:string; @IsEmail() email!:string; @IsString() @MinLength(8) password!:string; }
export class UpdateStudentDto { @IsOptional() @IsString() @MinLength(2) name?:string; @IsOptional() @IsEmail() email?:string; @IsOptional() @IsString() @IsNotEmpty() program?:string; }
export class UpdateTeacherDto { @IsOptional() @IsString() @MinLength(2) name?:string; @IsOptional() @IsEmail() email?:string; }
export class CourseDto { @IsString() @IsNotEmpty() code!:string; @IsString() @IsNotEmpty() name!:string; @IsString() @IsNotEmpty() teacherId!:string; @IsInt() @Min(1) @Max(500) capacity!:number; }
export class EnrollmentDto { @IsString() @IsNotEmpty() studentId!:string; @IsString() @IsNotEmpty() courseId!:string; }
export class GradeDto { @IsString() @IsNotEmpty() studentId!:string; @IsString() @IsNotEmpty() courseId!:string; @IsNumber() @Min(0) @Max(5) value!:number; }
