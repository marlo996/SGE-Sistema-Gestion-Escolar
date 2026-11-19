'use client';
import {FormEvent,useCallback,useEffect,useState} from 'react';
type Role='ADMIN'|'DOCENTE'|'ESTUDIANTE';
type User={id:string;name:string;email:string;role:Role};
type RecordData=Record<string,any>;
const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:3001';
const labels:Record<Role,string>={ADMIN:'Administrador',DOCENTE:'Docente',ESTUDIANTE:'Estudiante'};
async function request(path:string,method='GET',body?:RecordData){
 const token=typeof window!=='undefined'?sessionStorage.getItem('sge_token'):null;
 const r=await fetch(`${API}${path}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
 const data=await r.json().catch(()=>({message:'No fue posible leer la respuesta'}));
 if(!r.ok)throw new Error(Array.isArray(data.message)?data.message.join('; '):(data.message||'Error en la operación'));
 return data;
}
export default function Home(){
 const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[tab,setTab]=useState('Resumen');
 const [students,setStudents]=useState<RecordData[]>([]),[teachers,setTeachers]=useState<RecordData[]>([]),[courses,setCourses]=useState<RecordData[]>([]),[panel,setPanel]=useState<RecordData[]>([]);
 const [email,setEmail]=useState('admin@sge.local'),[password,setPassword]=useState('');
 const [form,setForm]=useState<RecordData>({});
 const refresh=useCallback(async(u:User)=>{
  try{
   if(u.role==='ADMIN'){
    const [s,t,c]=await Promise.all([request('/students'),request('/teachers'),request('/courses')]);setStudents(s);setTeachers(t);setCourses(c);
   }else if(u.role==='DOCENTE')setPanel(await request('/teacher/courses'));
   else setPanel(await request('/student/panel'));
  }catch(e){setError(String((e as Error).message));}
 },[]);
 useEffect(()=>{const token=sessionStorage.getItem('sge_token');if(!token){setLoading(false);return;}
 request('/auth/me').then(u=>{setUser(u);refresh(u);}).catch(()=>{sessionStorage.removeItem('sge_token');}).finally(()=>setLoading(false));},[refresh]);
 async function login(e:FormEvent){e.preventDefault();setError('');setLoading(true);try{const res=await request('/auth/login','POST',{email,password});sessionStorage.setItem('sge_token',res.token);setUser(res.user);setPassword('');await refresh(res.user);}catch(e){setError((e as Error).message);}finally{setLoading(false);}}
 function logout(){sessionStorage.removeItem('sge_token');setUser(null);setPanel([]);setTab('Resumen');setNotice('');setError('');}
 async function submit(e:FormEvent,path:string){e.preventDefault();setError('');setNotice('');try{
  const data={...form};if(path==='/students'||path==='/teachers'){data.password='SgeDemo123!';}
  if(path==='/courses')data.capacity=Number(data.capacity);
  if(path==='/teacher/grades')data.value=Number(data.value);
  await request(path,'POST',data);setNotice('Operación guardada correctamente.');setForm({});if(user)await refresh(user);
 }catch(e){setError((e as Error).message);}}
 function field(key:string,label:string,type='text',span=false){return <div className={span?'span2':''}><label htmlFor={key}>{label}</label><input id={key} type={type} step={type==='number'?'any':undefined} value={form[key]??''} required onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}/></div>}
 function optionField(key:string,label:string,options:{id:string;label:string}[]){return <div className="span2"><label htmlFor={key}>{label}</label><select id={key} value={form[key]??''} required onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}><option value="">Selecciona una opción</option>{options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></div>}
 function table(headers:string[],rows:(string|number|undefined)[][]){return <div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((x,j)=><td key={j}>{x??'—'}</td>)}</tr>)}</tbody></table>{!rows.length&&<p className="placeholder">No hay registros para mostrar.</p>}</div>}
 if(loading&&!user)return <div className="login"><div className="login-card">Cargando SGE...</div></div>;
 if(!user)return <div className="login"><form className="login-card" onSubmit={login}><span className="logo">SGE</span><h1>Bienvenido al SGE</h1><p className="muted">Sistema de Gestión Escolar · Acceso académico</p>{error&&<p className="error" role="alert">{error}</p>}<label htmlFor="email">Correo electrónico</label><input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><label htmlFor="password">Contraseña</label><input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/><button style={{width:'100%',marginTop:20}} disabled={loading}>Iniciar sesión</button><p className="muted">Entorno local de desarrollo. Las cuentas de prueba están en README.md.</p></form></div>;
 const adminTabs=['Resumen','Estudiantes','Docentes','Cursos','Matrículas'];
 const tabs=user.role==='ADMIN'?adminTabs:user.role==='DOCENTE'?['Resumen','Calificaciones']:['Mis cursos','Mis notas'];
 const studentOptions=students.map(s=>({id:s.id,label:`${s.user.name} · ${s.identification}`}));
 const teacherOptions=teachers.map(t=>({id:t.id,label:t.user.name}));
 const courseOptions=courses.map(c=>({id:c.id,label:`${c.code} · ${c.name}`}));
 const teacherCourseOptions=panel.map(c=>({id:c.id,label:`${c.code} · ${c.name}`}));
 const activeCourse=panel.find(c=>c.id===form.courseId);
 return <div className="app"><aside className="sidebar"><span className="logo">SGE</span><h2>Sistema Escolar</h2><div className="small" style={{opacity:.75}}>Panel académico · MVP</div><p style={{marginTop:36,opacity:.7,fontSize:12}}>NAVEGACIÓN</p>{tabs.map(t=><button key={t} className={tab===t?'active':''} onClick={()=>{setTab(t);setError('');setNotice('');setForm({});}}>{t}</button>)}<button className="logout" onClick={logout}>Cerrar sesión</button></aside><main className="main"><header className="top"><div><div className="muted">SGE / {tab}</div><h1>{tab}</h1></div><div><span className="pill">{labels[user.role]}</span><p className="small muted">{user.name}</p></div></header>{error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="success" role="status">{notice}</div>}
 {user.role==='ADMIN'&&<>
 {tab==='Resumen'&&<><div className="stats">{[['Estudiantes',students.length],['Docentes',teachers.length],['Cursos',courses.length]].map(([x,n])=><div className="card" key={x}><div className="muted">{x}</div><div className="stat-number">{n}</div></div>)}</div><div className="card"><h3>Gestión académica centralizada</h3><p className="muted">Registra estudiantes y docentes, crea cursos y realiza matrículas. Los docentes registran notas y los estudiantes pueden consultarlas.</p><p><strong>Flujo principal:</strong> Administrador → Curso y matrícula → Docente → Nota → Estudiante.</p></div></>}
 {tab==='Estudiantes'&&<div className="panel-grid"><form className="card" onSubmit={e=>submit(e,'/students')}><h3 className="panel-title">Registrar estudiante</h3><div className="form-grid">{field('name','Nombre completo')}{field('identification','Identificación')}{field('email','Correo','email')}{field('program','Programa académico')}</div><p className="muted">Contraseña de demostración asignada: SgeDemo123! (solo local).</p><button>Guardar estudiante</button></form><section className="card"><h3 className="panel-title">Estudiantes registrados</h3>{table(['Nombre','Identificación','Programa','Correo'],students.map(s=>[s.user.name,s.identification,s.program,s.user.email]))}</section></div>}
 {tab==='Docentes'&&<div className="panel-grid"><form className="card" onSubmit={e=>submit(e,'/teachers')}><h3 className="panel-title">Registrar docente</h3><div className="form-grid">{field('name','Nombre completo')}{field('identification','Identificación')}{field('email','Correo','email')}</div><p className="muted">Contraseña de demostración asignada: SgeDemo123! (solo local).</p><button>Guardar docente</button></form><section className="card"><h3 className="panel-title">Docentes registrados</h3>{table(['Nombre','Identificación','Correo'],teachers.map(t=>[t.user.name,t.identification,t.user.email]))}</section></div>}
 {tab==='Cursos'&&<div className="panel-grid"><form className="card" onSubmit={e=>submit(e,'/courses')}><h3 className="panel-title">Crear curso</h3><div className="form-grid">{field('code','Código')}{field('name','Nombre')}{field('capacity','Cupo máximo','number')}{optionField('teacherId','Docente responsable',teacherOptions)}</div><button>Guardar curso</button></form><section className="card"><h3 className="panel-title">Cursos registrados</h3>{table(['Código','Curso','Docente','Cupos ocupados'],courses.map(c=>[c.code,c.name,c.teacher.user.name,`${c._count.enrollments}/${c.capacity}`]))}</section></div>}
 {tab==='Matrículas'&&<div className="panel-grid"><form className="card" onSubmit={e=>submit(e,'/enrollments')}><h3 className="panel-title">Asignar estudiante a curso</h3><div className="form-grid">{optionField('studentId','Estudiante',studentOptions)}{optionField('courseId','Curso',courseOptions)}</div><button>Registrar matrícula</button><p className="muted">Se validan duplicados y capacidad máxima.</p></form><section className="card"><h3 className="panel-title">Disponibilidad de cursos</h3>{table(['Curso','Matriculados','Capacidad'],courses.map(c=>[c.name,c._count.enrollments,c.capacity]))}</section></div>}
 </>}
 {user.role==='DOCENTE'&&<>{tab==='Resumen'&&<div className="stats"><div className="card"><p className="muted">Cursos asignados</p><div className="stat-number">{panel.length}</div></div><div className="card"><p className="muted">Estudiantes matriculados</p><div className="stat-number">{panel.reduce((n,c)=>n+c.enrollments.length,0)}</div></div><div className="card"><p className="muted">Notas registradas</p><div className="stat-number">{panel.reduce((n,c)=>n+c.grades.length,0)}</div></div></div>}{tab==='Calificaciones'&&<div className="panel-grid"><form className="card" onSubmit={e=>submit(e,'/teacher/grades')}><h3 className="panel-title">Registrar o actualizar nota</h3>{optionField('courseId','Mi curso',teacherCourseOptions)}{optionField('studentId','Estudiante matriculado',(activeCourse?.enrollments||[]).map((x:RecordData)=>({id:x.student.id,label:x.student.user.name})))}{field('value','Calificación de 0.0 a 5.0','number')}<button>Guardar calificación</button></form><section className="card"><h3>Mis cursos y notas</h3>{panel.map(c=><div key={c.id}><strong>{c.name}</strong>{table(['Estudiante','Nota'],c.enrollments.map((e:RecordData)=>[e.student.user.name,c.grades.find((g:RecordData)=>g.studentId===e.student.id)?.value]))}</div>)}</section></div>}</>}
 {user.role==='ESTUDIANTE'&&<section className="card"><h3 className="panel-title">{tab==='Mis notas'?'Calificaciones registradas':'Mis cursos matriculados'}</h3>{table(['Código','Curso','Docente','Nota'],panel.map(e=>[e.course.code,e.course.name,e.course.teacher.user.name,e.course.grades[0]?.value]))}</section>}
 <p className="muted" style={{marginTop:26}}>SGE · Entorno local de desarrollo · Requisitos SWR-01 a SWR-10 · No utilizar con datos reales</p></main></div>
}
