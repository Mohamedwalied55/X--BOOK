const express=require('express');
const path=require('path');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcryptjs');
const multer=require('multer');
const {Pool}=require('pg');
require('dotenv').config();
const app=express();
const PORT=process.env.PORT||3000;
const JWT_SECRET=process.env.JWT_SECRET||'dev-only-change-me';
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL&&!process.env.DATABASE_URL.includes('localhost')?{rejectUnauthorized:false}:false});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024}});
app.use(express.json({limit:'3mb'}));app.use(express.urlencoded({extended:true}));app.use(express.static(path.join(__dirname,'public')));
const db=(q,p=[])=>pool.query(q,p);
async function init(){
 await db(`CREATE TABLE IF NOT EXISTS admins(id SERIAL PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT now());
 CREATE TABLE IF NOT EXISTS students(id SERIAL PRIMARY KEY,name TEXT NOT NULL,phone TEXT UNIQUE NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT now());
 ALTER TABLE students ADD COLUMN IF NOT EXISTS family_name TEXT DEFAULT '';
 ALTER TABLE students ADD COLUMN IF NOT EXISTS alternate_phone TEXT DEFAULT '';
 ALTER TABLE students ADD COLUMN IF NOT EXISTS governorate TEXT DEFAULT '';
 ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
 CREATE TABLE IF NOT EXISTS teachers(id SERIAL PRIMARY KEY,name TEXT NOT NULL,subject TEXT DEFAULT '',bio TEXT DEFAULT '',image_data BYTEA,image_type TEXT,created_at TIMESTAMPTZ DEFAULT now());
 CREATE TABLE IF NOT EXISTS books(id SERIAL PRIMARY KEY,title TEXT NOT NULL,teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL,subject TEXT NOT NULL,grade TEXT NOT NULL,price NUMERIC(10,2) DEFAULT 0,available BOOLEAN DEFAULT true,featured BOOLEAN DEFAULT false,description TEXT DEFAULT '',cover_data BYTEA,cover_type TEXT,created_at TIMESTAMPTZ DEFAULT now());
 CREATE TABLE IF NOT EXISTS orders(id SERIAL PRIMARY KEY,customer_name TEXT NOT NULL,phone TEXT NOT NULL,governorate TEXT NOT NULL,address TEXT NOT NULL,notes TEXT DEFAULT '',status TEXT DEFAULT 'جديد',total NUMERIC(10,2) DEFAULT 0,created_at TIMESTAMPTZ DEFAULT now());
 ALTER TABLE orders ADD COLUMN IF NOT EXISTS student_id INT REFERENCES students(id) ON DELETE SET NULL;
 ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'كاش';
 CREATE TABLE IF NOT EXISTS order_items(id SERIAL PRIMARY KEY,order_id INT REFERENCES orders(id) ON DELETE CASCADE,book_id INT REFERENCES books(id) ON DELETE SET NULL,title TEXT NOT NULL,price NUMERIC(10,2) NOT NULL,qty INT NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS site_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS site_media(key TEXT PRIMARY KEY,data BYTEA NOT NULL,mime_type TEXT NOT NULL,updated_at TIMESTAMPTZ DEFAULT now());`);
 const email=process.env.ADMIN_EMAIL||'admin@xbook.local',pass=process.env.ADMIN_PASSWORD||'ChangeMe123!';
 await db('INSERT INTO admins(email,password_hash) VALUES($1,$2) ON CONFLICT(email) DO NOTHING',[email,await bcrypt.hash(pass,10)]);
 const tc=await db('SELECT count(*)::int c FROM teachers');
 if(tc.rows[0].c===0){for(const t of [['أحمد سامي','فيزياء'],['محمد علي','كيمياء'],['محمود حسن','أحياء']])await db('INSERT INTO teachers(name,subject,bio) VALUES($1,$2,$3)',[t[0],t[1],'مدرس متخصص — يمكن تعديل الملف من Control Room.'])}
 const bc=await db('SELECT count(*)::int c FROM books');
 if(bc.rows[0].c===0){const t=(await db('SELECT id FROM teachers ORDER BY id')).rows;const demo=[['كتاب الفيزياء المتقدم',t[0]?.id,'فيزياء','الثالث الثانوي',250,true,true],['مراجعة الكيمياء الشاملة',t[1]?.id,'كيمياء','الثالث الثانوي',230,true,true],['بنك أسئلة الأحياء',t[2]?.id,'أحياء','الثالث الثانوي',220,true,true],['الرياضيات الشاملة',t[0]?.id,'رياضيات','الثالث الثانوي',200,true,true],['English Mastery',t[1]?.id,'اللغة الإنجليزية','الثالث الثانوي',180,true,true],['النحو واللغة العربية',t[2]?.id,'لغة عربية','الثالث الثانوي',160,true,true]];for(const b of demo)await db('INSERT INTO books(title,teacher_id,subject,grade,price,available,featured) VALUES($1,$2,$3,$4,$5,$6,$7)',b)}
 const defaults={hero_badge:'CLASSIFIED // XBOOK',hero_title:'رحلتك نحو الثانوية العامة',hero_subtitle:'كتبك .. مع أفضل الشروحات من أقوى المدرسين',about:'كل كتاب خطوة أقرب لهدفك. XBOOK منصة تعليمية منظمة تجمع كتب الثانوية العامة في مكان واحد، مع تجربة تصفح وطلب سهلة وبروح الملفات السرية.',whatsapp1:'201000000000',whatsapp2:'201100000000',instapay:'',vodafone_cash:'',primary_color:'#83f0ad',secondary_color:'#0d533c',accent_color:'#3cacae',light_bg:'#f7faf8',dark_bg:'#06110d',text_color:'#0b2119',dark_text_color:'#effff4',panel_color:'#ffffff',dark_panel_color:'#0b1914',account_bg:'#f7faf8',account_dark_bg:'#06110d',account_panel:'#ffffff',account_dark_panel:'#0b1914',account_heading:'#0b2119',account_dark_heading:'#effff4',account_text:'#24483a',account_dark_text:'#d9eee4',account_muted:'#6c8278',account_dark_muted:'#9fb7ac',account_accent:'#0d533c',account_dark_accent:'#83f0ad'};
 for(const [k,v] of Object.entries(defaults))await db('INSERT INTO site_settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO NOTHING',[k,v]);
}

function signUser(user,role){return jwt.sign({id:user.id,email:user.email,role},JWT_SECRET,{expiresIn:'7d'})}
function studentAuth(req,res,next){const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return res.status(401).json({error:'يجب تسجيل الدخول أولاً'});try{const u=jwt.verify(h.slice(7),JWT_SECRET);if(u.role!=='student')throw Error();req.student=u;next()}catch{return res.status(401).json({error:'انتهت الجلسة، سجل الدخول مرة أخرى'})}}
function normalizePhone(v){let p=String(v||'').replace(/[^\d+]/g,'');if(p.startsWith('+'))p=p.slice(1);if(p.startsWith('00'))p=p.slice(2);if(p.startsWith('01'))p='20'+p.slice(1);return p}
async function sendWhatsAppStatus(orderId,status){
 const token=process.env.WHATSAPP_TOKEN,phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID;
 if(!token||!phoneId)return;
 const r=await db('SELECT customer_name,phone FROM orders WHERE id=$1',[orderId]);
 if(!r.rowCount)return;
 const to=normalizePhone(r.rows[0].phone); if(!to)return;
 const version=process.env.WHATSAPP_API_VERSION||'v23.0';
 const template=process.env.WHATSAPP_TEMPLATE_NAME;
 const lang=process.env.WHATSAPP_TEMPLATE_LANG||'ar';
 let payload;
 if(template){
   payload={messaging_product:'whatsapp',to,type:'template',template:{name:template,language:{code:lang},components:[{type:'body',parameters:[{type:'text',text:String(orderId)},{type:'text',text:status}]}]}}
 }else{
   payload={messaging_product:'whatsapp',to,type:'text',text:{preview_url:false,body:`مرحباً ${r.rows[0].customer_name} 👋\nتحديث طلبك #${orderId} في XBOOK:\nحالة الطلب: ${status}\nشكراً لثقتك بنا.`}}
 }
 const resp=await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
 if(!resp.ok)console.error('WhatsApp notification failed',orderId,await resp.text());
}
function auth(req,res,next){const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return res.status(401).json({error:'غير مصرح'});try{req.admin=jwt.verify(h.slice(7),JWT_SECRET);next()}catch{return res.status(401).json({error:'انتهت الجلسة'})}}

app.post('/api/student/register',async(req,res)=>{
 try{
  const {name,family_name,phone,alternate_phone,governorate,address,email,password}=req.body||{};
  if(!name||!family_name||!phone||!governorate||!address||!email||!password)return res.status(400).json({error:'أكمل كل بيانات إنشاء الحساب'});
  if(String(password).length<6)return res.status(400).json({error:'كلمة المرور يجب أن تكون 6 أحرف على الأقل'});
  const cleanPhone=normalizePhone(phone), cleanEmail=String(email).trim().toLowerCase();
  const exists=await db('SELECT id FROM students WHERE email=$1 OR phone=$2',[cleanEmail,cleanPhone]);
  if(exists.rowCount)return res.status(409).json({error:'البريد الإلكتروني أو رقم الهاتف مستخدم بالفعل'});
  const hash=await bcrypt.hash(password,10);
  const alt=normalizePhone(alternate_phone||'');
  const r=await db('INSERT INTO students(name,family_name,phone,alternate_phone,governorate,address,email,password_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,name,family_name,phone,alternate_phone,governorate,address,email',[String(name).trim(),String(family_name).trim(),cleanPhone,alt,String(governorate).trim(),String(address).trim(),cleanEmail,hash]);
  res.json({ok:true,student:r.rows[0],token:signUser(r.rows[0],'student')});
 }catch(e){res.status(500).json({error:'تعذر إنشاء الحساب'})}
});
app.post('/api/student/login',async(req,res)=>{
 const email=String(req.body?.email||'').trim().toLowerCase(),password=String(req.body?.password||'');
 const r=await db('SELECT * FROM students WHERE email=$1',[email]);
 if(!r.rowCount||!(await bcrypt.compare(password,r.rows[0].password_hash)))return res.status(401).json({error:'البريد الإلكتروني أو كلمة المرور غير صحيحة'});
 const u=r.rows[0];res.json({ok:true,student:{id:u.id,name:u.name,family_name:u.family_name,phone:u.phone,alternate_phone:u.alternate_phone,governorate:u.governorate,address:u.address,email:u.email},token:signUser(u,'student')});
});
app.get('/api/student/me',studentAuth,async(req,res)=>{
 const r=await db('SELECT id,name,family_name,phone,alternate_phone,governorate,address,email,created_at FROM students WHERE id=$1',[req.student.id]);
 if(!r.rowCount)return res.status(404).json({error:'الحساب غير موجود'});
 res.json({student:r.rows[0]});
});
app.get('/api/student/orders',studentAuth,async(req,res)=>{
 const r=await db(`SELECT o.*,COALESCE(json_agg(json_build_object('title',oi.title,'price',oi.price,'qty',oi.qty)) FILTER (WHERE oi.id IS NOT NULL),'[]') items
 FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id WHERE o.student_id=$1 GROUP BY o.id ORDER BY o.id DESC`,[req.student.id]);
 res.json({orders:r.rows});
});
app.get('/api/orders/track',async(req,res)=>{try{const orderId=Number(req.query.order_id);const phone=String(req.query.phone||'').replace(/\D/g,'');if(!orderId||!phone)return res.status(400).json({error:'أدخل رقم الطلب ورقم الهاتف'});const r=await db(`SELECT id,status,created_at,total,payment_method,phone FROM orders WHERE id=$1 AND regexp_replace(phone,'\\D','','g')=$2`,[orderId,phone]);if(!r.rowCount)return res.status(404).json({error:'لم يتم العثور على الطلب. تأكد من البيانات'});res.json(r.rows[0])}catch(e){console.error(e);res.status(500).json({error:'تعذر تتبع الطلب'})}});
app.get('/api/public',async(req,res)=>{try{const [b,t,s,m]=await Promise.all([db(`SELECT b.id,b.title,b.subject,b.grade,b.price,b.available,b.featured,b.description,b.teacher_id,t.name teacher FROM books b LEFT JOIN teachers t ON t.id=b.teacher_id ORDER BY b.featured DESC,b.id DESC`),db('SELECT id,name,subject,bio,(image_data IS NOT NULL) has_image FROM teachers ORDER BY id'),db('SELECT key,value FROM site_settings'),db("SELECT key FROM site_media")]);const settings=Object.fromEntries(s.rows.map(x=>[x.key,x.value]));if(m.rows.some(x=>x.key==='hero'))settings.hero_image='/api/media/site/hero';res.json({books:b.rows,teachers:t.rows,settings})}catch(e){console.error(e);res.status(500).json({error:'تعذر تحميل بيانات الموقع'})}});
app.get('/api/media/:type/:id',async(req,res)=>{try{if(req.params.type==='site'){const r=await db('SELECT data,mime_type FROM site_media WHERE key=$1',[req.params.id]);if(!r.rowCount)return res.sendStatus(404);res.set('Content-Type',r.rows[0].mime_type);return res.send(r.rows[0].data)}const table=req.params.type==='book'?'books':req.params.type==='teacher'?'teachers':null;if(!table)return res.sendStatus(404);const fields=req.params.type==='book'?'cover_data data,cover_type mime_type':'image_data data,image_type mime_type';const r=await db(`SELECT ${fields} FROM ${table} WHERE id=$1`,[req.params.id]);if(!r.rowCount||!r.rows[0].data)return res.sendStatus(404);res.set('Content-Type',r.rows[0].mime_type||'image/jpeg');res.send(r.rows[0].data)}catch(e){res.sendStatus(404)}});
app.post('/api/login',async(req,res)=>{const {email,password}=req.body;const r=await db('SELECT * FROM admins WHERE email=$1',[email]);if(!r.rowCount||!(await bcrypt.compare(password||'',r.rows[0].password_hash)))return res.status(401).json({error:'بيانات الدخول غير صحيحة'});res.json({token:jwt.sign({id:r.rows[0].id,email:r.rows[0].email},JWT_SECRET,{expiresIn:'8h'})})});
app.get('/api/admin/data',auth,async(req,res)=>{try{const [b,t,o,s,m,st]=await Promise.all([db(`SELECT b.*,t.name teacher FROM books b LEFT JOIN teachers t ON t.id=b.teacher_id ORDER BY b.id DESC`),db('SELECT id,name,subject,bio,(image_data IS NOT NULL) has_image FROM teachers ORDER BY id DESC'),db(`SELECT o.*,COALESCE(json_agg(json_build_object('title',oi.title,'price',oi.price,'qty',oi.qty)) FILTER (WHERE oi.id IS NOT NULL),'[]') items FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id GROUP BY o.id ORDER BY o.id DESC`),db('SELECT key,value FROM site_settings'),db('SELECT key FROM site_media'),db('SELECT id,name,family_name,phone,alternate_phone,governorate,address,email,created_at FROM students ORDER BY id DESC')]);res.json({books:b.rows,teachers:t.rows,orders:o.rows,students:st.rows,settings:Object.fromEntries(s.rows.map(x=>[x.key,x.value])),media:m.rows.map(x=>x.key)})}catch(e){res.status(500).json({error:e.message})}});
app.post('/api/admin/books',auth,upload.single('cover'),async(req,res)=>{try{const {id,title,teacher_id,subject,grade,price,description}=req.body,available=['true','on','1'].includes(req.body.available),featured=['true','on','1'].includes(req.body.featured),f=req.file;if(!title||!subject||!grade)return res.status(400).json({error:'أكمل بيانات الكتاب'});if(id){const vals=[title,teacher_id||null,subject,grade,Number(price)||0,available,featured,description||''];let sql='UPDATE books SET title=$1,teacher_id=$2,subject=$3,grade=$4,price=$5,available=$6,featured=$7,description=$8';if(f){vals.push(f.buffer,f.mimetype);sql+=',cover_data=$9,cover_type=$10'}vals.push(id);await db(sql+' WHERE id=$'+vals.length,vals)}else{const vals=[title,teacher_id||null,subject,grade,Number(price)||0,available,featured,description||''];let sql='INSERT INTO books(title,teacher_id,subject,grade,price,available,featured,description';if(f){vals.push(f.buffer,f.mimetype);sql+=',cover_data,cover_type'}await db(sql+') VALUES('+vals.map((_,i)=>'$'+(i+1)).join(',')+')',vals)}res.json({ok:true})}catch(e){res.status(500).json({error:e.message})}});
app.delete('/api/admin/books/:id',auth,async(req,res)=>{await db('DELETE FROM books WHERE id=$1',[req.params.id]);res.json({ok:true})});
app.post('/api/admin/teachers',auth,upload.single('image'),async(req,res)=>{try{const {id,name,subject,bio}=req.body,f=req.file;if(!name)return res.status(400).json({error:'اكتب اسم المدرس'});if(id){const vals=[name,subject||'',bio||''];let sql='UPDATE teachers SET name=$1,subject=$2,bio=$3';if(f){vals.push(f.buffer,f.mimetype);sql+=',image_data=$4,image_type=$5'}vals.push(id);await db(sql+' WHERE id=$'+vals.length,vals)}else{const vals=[name,subject||'',bio||''];let sql='INSERT INTO teachers(name,subject,bio';if(f){vals.push(f.buffer,f.mimetype);sql+=',image_data,image_type'}await db(sql+') VALUES('+vals.map((_,i)=>'$'+(i+1)).join(',')+')',vals)}res.json({ok:true})}catch(e){res.status(500).json({error:e.message})}});
app.delete('/api/admin/teachers/:id',auth,async(req,res)=>{await db('DELETE FROM teachers WHERE id=$1',[req.params.id]);res.json({ok:true})});
app.put('/api/admin/settings',auth,async(req,res)=>{for(const [k,v] of Object.entries(req.body||{}))await db('INSERT INTO site_settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',[k,String(v)]);res.json({ok:true})});
app.post('/api/admin/hero',auth,upload.single('hero'),async(req,res)=>{if(!req.file)return res.status(400).json({error:'اختر صورة'});await db('INSERT INTO site_media(key,data,mime_type) VALUES($1,$2,$3) ON CONFLICT(key) DO UPDATE SET data=EXCLUDED.data,mime_type=EXCLUDED.mime_type,updated_at=now()',['hero',req.file.buffer,req.file.mimetype]);res.json({ok:true})});
app.delete('/api/admin/hero',auth,async(req,res)=>{await db('DELETE FROM site_media WHERE key=$1',['hero']);res.json({ok:true})});
app.post('/api/orders',studentAuth,async(req,res)=>{const {customer_name,phone,governorate,address,notes,items,payment_method}=req.body;
 const allowedPayments=['كاش','انستاباي','فودافون كاش'];
 if(payment_method && !allowedPayments.includes(payment_method))return res.status(400).json({error:'طريقة دفع غير صالحة'});if(!customer_name||!phone||!governorate||!address||!Array.isArray(items)||!items.length)return res.status(400).json({error:'أكمل بيانات الطلب'});const client=await pool.connect();try{await client.query('BEGIN');let total=0,clean=[];for(const item of items){const r=await client.query('SELECT id,title,price,available FROM books WHERE id=$1',[item.id]);if(!r.rowCount||!r.rows[0].available)continue;const qty=Math.max(1,Math.min(20,Number(item.qty)||1));total+=Number(r.rows[0].price)*qty;clean.push({...r.rows[0],qty})}if(!clean.length)throw Error('لا توجد كتب متاحة');const studentId=req.student.id;
const selectedPayment=payment_method||'كاش';
 const o=await client.query('INSERT INTO orders(customer_name,phone,governorate,address,notes,total,student_id,payment_method) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',[customer_name,phone,governorate,address,notes||'',total,studentId,selectedPayment]);for(const i of clean)await client.query('INSERT INTO order_items(order_id,book_id,title,price,qty) VALUES($1,$2,$3,$4,$5)',[o.rows[0].id,i.id,i.title,i.price,i.qty]);await client.query('COMMIT');res.json({ok:true,order_id:o.rows[0].id,total})}catch(e){await client.query('ROLLBACK');res.status(400).json({error:e.message})}finally{client.release()}});
app.put('/api/admin/orders/:id',auth,async(req,res)=>{const allowed=['جديد','قيد التجهيز','تم الشحن','مكتمل','ملغي'];if(!allowed.includes(req.body.status))return res.status(400).json({error:'حالة غير صالحة'});const r=await db('UPDATE orders SET status=$1 WHERE id=$2 RETURNING id,status',[req.body.status,req.params.id]);if(!r.rowCount)return res.status(404).json({error:'الطلب غير موجود'});sendWhatsAppStatus(r.rows[0].id,r.rows[0].status).catch(e=>console.error('WhatsApp error',e));res.json({ok:true,whatsapp:!!(process.env.WHATSAPP_TOKEN&&process.env.WHATSAPP_PHONE_NUMBER_ID)});});
app.delete('/api/admin/students/:id',auth,async(req,res)=>{await db('DELETE FROM students WHERE id=$1',[req.params.id]);res.json({ok:true})});
app.delete('/api/admin/orders/:id',auth,async(req,res)=>{await db('DELETE FROM orders WHERE id=$1',[req.params.id]);res.json({ok:true})});
app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
app.get('/account',(req,res)=>res.sendFile(path.join(__dirname,'public','account.html')));
app.get('/login',(req,res)=>res.sendFile(path.join(__dirname,'public','login.html')));
app.get('/register',(req,res)=>res.sendFile(path.join(__dirname,'public','register.html')));
init().then(()=>app.listen(PORT,()=>console.log('XBOOK running on '+PORT))).catch(e=>{console.error(e);process.exit(1)});
