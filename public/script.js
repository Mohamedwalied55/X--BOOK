const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let state={books:[],teachers:[],settings:{},cart:[],student:null,filters:{q:'',grade:'',subject:'',teacher:'',available:false}};
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money=n=>Number(n||0).toLocaleString('ar-EG',{maximumFractionDigits:0});
function toast(msg){const el=$('#toast');if(!el)return;el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2400)}
function saveCart(){localStorage.xbookCart=JSON.stringify(state.cart)}
function getStudent(){try{return JSON.parse(localStorage.xbookStudent||'null')}catch{return null}}
function getStudentToken(){return localStorage.xbookStudentToken||''}
function setStudent(student,token){localStorage.xbookStudent=JSON.stringify(student);localStorage.xbookStudentToken=token;state.student=student;updateAccountUI()}
function clearStudent(){localStorage.removeItem('xbookStudent');localStorage.removeItem('xbookStudentToken');state.student=null;updateAccountUI()}
function updateAccountUI(){const x=$('#accountLabel');if(x)x.textContent=state.student?`مرحباً ${state.student.name.split(' ')[0]}`:'حساب الطالب'}
function loadCart(){try{state.cart=JSON.parse(localStorage.xbookCart||'[]')}catch{state.cart=[]}}
function applySiteTheme(){const s=state.settings||{},root=document.documentElement;const map={primary_color:'--mint',secondary_color:'--green2',accent_color:'--accent',light_bg:'--bg',dark_bg:'--dark',text_color:'--ink',dark_text_color:'--dark-ink',panel_color:'--panel',dark_panel_color:'--dark-panel'};Object.entries(map).forEach(([k,v])=>{if(s[k])root.style.setProperty(v,s[k])});if(s.secondary_color)root.style.setProperty('--green',s.secondary_color);}
function loadPaymentInfo(){const s=state.settings||{};const i=$('#instapayHint'),v=$('#vodafoneHint');if(i)i.textContent=s.instapay?`رقم InstaPay: ${s.instapay}`:'رقم التحويل غير مضاف حالياً';if(v)v.textContent=s.vodafone_cash?`رقم Vodafone Cash: ${s.vodafone_cash}`:'رقم التحويل غير مضاف حالياً';}
function showPaymentInstructions(){const selected=document.querySelector('input[name="payment_method"]:checked')?.value,box=$('#paymentInstructions'),s=state.settings||{};if(!box)return;if(selected==='انستاباي')box.innerHTML=s.instapay?`حوّل المبلغ على رقم InstaPay: <b>${esc(s.instapay)}</b><br><small>بعد التحويل احتفظ بإثبات الدفع، وسنتواصل معك لتأكيد الطلب.</small>`:'لم يتم إضافة رقم InstaPay بعد. اختر طريقة أخرى أو تواصل معنا.';else if(selected==='فودافون كاش')box.innerHTML=s.vodafone_cash?`حوّل المبلغ على رقم Vodafone Cash: <b>${esc(s.vodafone_cash)}</b><br><small>بعد التحويل احتفظ بإثبات الدفع، وسنتواصل معك لتأكيد الطلب.</small>`:'لم يتم إضافة رقم Vodafone Cash بعد. اختر طريقة أخرى أو تواصل معنا.';else box.innerHTML='الدفع كاش عند الاستلام.'}
async function load(){state.student=getStudent();updateAccountUI();const r=await fetch('/api/public');if(!r.ok)throw Error('تعذر تحميل البيانات');state=Object.assign(state,await r.json(),{filters:state.filters});applySiteTheme();applySettings();buildFilters();renderBooks();renderTeachers();renderCart();renderWhatsApp();loadPaymentInfo()}
function applySettings(){const s=state.settings||{};$('#heroBadge').textContent=s.hero_badge||'CLASSIFIED // XBOOK';$('#heroTitle').innerHTML=(s.hero_title||'رحلتك نحو الثانوية العامة').replace(/(الثانوية العامة|تبدأ من هنا\.?)/,'<em>$1</em>');$('#heroSubtitle').textContent=s.hero_subtitle||'كتبك .. مع أفضل الشروحات من أقوى المدرسين';$('#aboutText').textContent=s.about||'';if(s.hero_image)$('#heroArt').style.backgroundImage=`url('${s.hero_image}')`}
function buildFilters(){const subs=[...new Set(state.books.map(b=>b.subject).filter(Boolean))].sort();$('#subject').innerHTML='<option value="">جميع المواد</option>'+subs.map(x=>`<option>${esc(x)}</option>`).join('');$('#teacher').innerHTML='<option value="">جميع المدرسين</option>'+state.teachers.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}
function filtered(){const f=state.filters,q=f.q.trim().toLowerCase();return state.books.filter(b=>(!q||[b.title,b.subject,b.grade,b.teacher].join(' ').toLowerCase().includes(q))&&(!f.grade||b.grade===f.grade)&&(!f.subject||b.subject===f.subject)&&(!f.teacher||String(b.teacher_id)===String(f.teacher))&&(!f.available||b.available))}
function cover(b){const colors={"فيزياء":"phy","كيمياء":"chem","أحياء":"bio","رياضيات":"math","لغة عربية":"arabic","اللغة الإنجليزية":"eng","إنجليزي":"eng"};const c=colors[b.subject]||'default';return `<div class="cover ${c}"><span>XBOOK</span><b>${esc(b.subject||'BOOK')}</b><strong>${esc(b.title)}</strong><small>${esc(b.grade)}</small><i>CLASSIFIED</i></div>`}
function renderBooks(){const arr=filtered();$('#empty').hidden=arr.length>0;$('#grid').innerHTML=arr.map(b=>`<article class="bookCard"><div class="bookCoverWrap">${cover(b)}${b.featured?'<span class="best">الأكثر مبيعاً</span>':''}</div><div class="bookInfo"><h3>${esc(b.title)}</h3><p class="teacherName">${esc(b.teacher||'مدرس XBOOK')}</p><p class="gradeText">${esc(b.grade)} • ${esc(b.subject)}</p><div class="bookBottom"><strong>${money(b.price)} ج.م</strong><button class="addBtn" data-id="${b.id}" ${b.available?'':'disabled'}>${b.available?'أضف إلى السلة':'غير متوفر'} <span>🛒</span></button></div></div></article>`).join('');$$('.addBtn').forEach(x=>x.onclick=()=>addToCart(Number(x.dataset.id)))}
function renderTeachers(){const list=state.teachers;$('#teachersGrid').innerHTML=list.map(t=>`<article class="teacherCard"><div class="teacherPhoto">${t.has_image?`<img src="/api/media/teacher/${t.id}" alt="${esc(t.name)}">`:'<span>TEACHER</span>'}</div><div><span class="eyebrow">TEACHER FILE</span><h3>${esc(t.name)}</h3><b>${esc(t.subject||'مدرس ثانوي')}</b><p>${esc(t.bio||'متخصص في شرح ومراجعة المادة الدراسية.')}</p><button class="teacherBooks" data-id="${t.id}">عرض كتبه ←</button></div></article>`).join('');$$('.teacherBooks').forEach(b=>b.onclick=()=>{$('#teacher').value=b.dataset.id;state.filters.teacher=b.dataset.id;document.querySelector('#books').scrollIntoView({behavior:'smooth'});renderBooks()})}
function addToCart(id){const b=state.books.find(x=>x.id===id);if(!b?.available)return;const x=state.cart.find(x=>x.id===id);if(x)x.qty=Math.min(20,x.qty+1);else state.cart.push({id,qty:1});saveCart();renderCart();toast('تمت إضافة الكتاب إلى السلة')}
function changeQty(id,delta){const x=state.cart.find(x=>x.id===id);if(!x)return;x.qty=Math.max(0,Math.min(20,x.qty+delta));state.cart=state.cart.filter(x=>x.qty>0);saveCart();renderCart()}
function renderCart(){let total=0,count=0;$('#cart').innerHTML=state.cart.map(x=>{const b=state.books.find(b=>b.id===x.id);if(!b)return '';const sub=Number(b.price)*x.qty;total+=sub;count+=x.qty;return `<div class="cartItem"><div>${cover(b)}</div><div><h4>${esc(b.title)}</h4><small>${money(b.price)} ج.م</small><div class="qty"><button data-id="${b.id}" data-d="-1">−</button><b>${x.qty}</b><button data-id="${b.id}" data-d="1">+</button></div></div></div>`}).join('')||'<div class="emptyCart">السلة فارغة. أضف كتبك لتبدأ المهمة.</div>';$('#total').textContent=money(total);$('#cartCount').textContent=count;$$('.qty button').forEach(b=>b.onclick=()=>changeQty(Number(b.dataset.id),Number(b.dataset.d)))}
function openCart(){$('#drawer').classList.add('open')}function closeCart(){$('#drawer').classList.remove('open')}
function renderWhatsApp(){const nums=[state.settings.whatsapp1,state.settings.whatsapp2].filter(x=>x&&x.length>5);$('#waLinks').innerHTML=nums.map((n,i)=>`<a href="https://wa.me/${encodeURIComponent(n)}" target="_blank" rel="noopener">واتساب ${i+1}<span>↗</span></a>`).join('');$('#floatingWa').onclick=()=>nums.length===1?window.open('https://wa.me/'+encodeURIComponent(nums[0]),'_blank'):toast('اختر رقم الواتساب من قسم التواصل بالأسفل')}
function syncFilters(){state.filters.q=$('#search').value||$('#sideSearch').value;state.filters.grade=$('#grade').value;state.filters.subject=$('#subject').value;state.filters.teacher=$('#teacher').value;state.filters.available=$('#availableOnly').checked;$('#sideSearch').value=$('#search').value;renderBooks()}
$('#search').addEventListener('input',()=>{state.filters.q=$('#search').value;$('#sideSearch').value=$('#search').value;renderBooks()});$('#sideSearch').addEventListener('input',()=>{state.filters.q=$('#sideSearch').value;$('#search').value=$('#sideSearch').value;renderBooks()});['grade','subject','teacher','availableOnly'].forEach(id=>$('#'+id).addEventListener('change',syncFilters));$('#applyFilters').onclick=syncFilters;$('#clearFilters').onclick=()=>{$('#search').value='';$('#sideSearch').value='';$('#grade').value='';$('#subject').value='';$('#teacher').value='';$('#availableOnly').checked=false;syncFilters()};$('#viewAll').onclick=()=>{$('#clearFilters').click()};$$('.categoryCard').forEach(c=>c.onclick=()=>{$('#grade').value=c.dataset.grade;state.filters.grade=c.dataset.grade;document.querySelector('#books').scrollIntoView({behavior:'smooth'});renderBooks()});$('#cartBtn').onclick=openCart;$('#overlay').onclick=closeCart;$('#closeCart').onclick=closeCart;
$('#checkoutBtn').onclick=async()=>{if(!state.cart.length)return toast('أضف كتاباً إلى السلة أولاً');if(!getStudentToken()){closeCart();$('#authGate').classList.add('open');return}try{const r=await fetch('/api/student/me',{headers:{Authorization:'Bearer '+getStudentToken()}});if(!r.ok){clearStudent();closeCart();$('#authGate').classList.add('open');return}const d=await r.json();setStudent(d.student,getStudentToken());const f=$('#orderForm');f.elements.customer_name.value=[d.student.name,d.student.family_name].filter(Boolean).join(' ');f.elements.phone.value=d.student.phone||'';f.elements.governorate.value=d.student.governorate||'';f.elements.address.value=d.student.address||'';loadPaymentInfo();showPaymentInstructions();closeCart();$('#orderModal').classList.add('open')}catch{closeCart();$('#authGate').classList.add('open')}};
$('#closeModal').onclick=()=>$('#orderModal').classList.remove('open');$('#orderModal').onclick=e=>{if(e.target.id==='orderModal')$('#orderModal').classList.remove('open')};
$$('input[name="payment_method"]').forEach(r=>r.addEventListener('change',showPaymentInstructions));
$('#orderForm').onsubmit=async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.target));body.items=state.cart;try{const r=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+getStudentToken()},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error);state.cart=[];saveCart();renderCart();e.target.reset();showPaymentInstructions();$('#orderModal').classList.remove('open');toast('تم إرسال الطلب رقم #'+d.order_id)}catch(err){toast(err.message)}};
$('#closeAuthGate').onclick=()=>$('#authGate').classList.remove('open');$('#continueBrowsing').onclick=()=>$('#authGate').classList.remove('open');$('#authGate').onclick=e=>{if(e.target.id==='authGate')$('#authGate').classList.remove('open')};
$('#theme').onclick=()=>{document.body.classList.toggle('dark');localStorage.xbookDark=document.body.classList.contains('dark')?'1':'0'};if(localStorage.xbookDark==='1')document.body.classList.add('dark');loadCart();load().catch(e=>toast(e.message));
const revealTargets=[...document.querySelectorAll('.categorySection,.booksSection,.trustBar,.teachersSection,.aboutSection,.contactSection')];revealTargets.forEach(el=>el.classList.add('reveal'));if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.12});revealTargets.forEach(el=>io.observe(el))}else revealTargets.forEach(el=>el.classList.add('visible'));


/* =========================================
   XBOOK HEADER ACCOUNT + SHIPMENT TRACKING
========================================= */
function refreshHeaderAccount(){
  const logged=!!getStudentToken() && !!state.student;
  const login=$('#loginBtn'), register=$('#registerBtn'), logout=$('#logoutStudentBtn'), profile=$('#profileBtn');
  if(profile) profile.style.display='inline-flex';
  if(login) login.style.display=logged?'none':'inline-flex';
  if(register) register.style.display=logged?'none':'inline-flex';
  if(logout) logout.style.display=logged?'inline-flex':'none';
}
const oldUpdateAccountUI=updateAccountUI;
updateAccountUI=function(){
  oldUpdateAccountUI();
  refreshHeaderAccount();
};
refreshHeaderAccount();
$('#logoutStudentBtn')?.addEventListener('click',()=>{clearStudent();location.href='/'});

const trackingModal=$('#trackingModal');
$('#trackShipmentBtn')?.addEventListener('click',()=>{
  trackingModal?.classList.add('open');
  $('#trackingOrderId')?.focus();
});
$('#closeTrackingModal')?.addEventListener('click',()=>trackingModal?.classList.remove('open'));
trackingModal?.addEventListener('click',e=>{if(e.target===trackingModal)trackingModal.classList.remove('open')});
$('#trackingForm')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const orderId=$('#trackingOrderId').value.trim();
  const phone=$('#trackingPhone').value.trim();
  const result=$('#trackingResult');
  if(!orderId||!phone)return;
  result.innerHTML='<div class="trackingLoading">جاري البحث عن ملف الشحنة...</div>';
  try{
    const r=await fetch(`/api/orders/track?order_id=${encodeURIComponent(orderId)}&phone=${encodeURIComponent(phone)}`);
    const d=await r.json();
    if(!r.ok)throw Error(d.error||'لم يتم العثور على الطلب');
    const statuses=['جديد','قيد التجهيز','تم الشحن','مكتمل'];
    const current=d.status;
    result.innerHTML=`<div class="trackCard"><div class="trackTop"><b>ORDER #${esc(d.id)}</b><span class="trackStatus">${esc(current)}</span></div><div class="trackTimeline">${statuses.map((st,i)=>{const active=current==='ملغي'?false:(statuses.indexOf(current)>=i);return `<div class="${active?'active':''}">● ${st}</div>`}).join('')}${current==='ملغي'?'<div class="active" style="border-right-color:#c44">✕ تم إلغاء الطلب</div>':''}</div><p class="muted" style="margin:12px 0 0">طريقة الدفع: <b>${esc(d.payment_method||'كاش')}</b> — الإجمالي: <b>${money(d.total)} ج.م</b></p></div>`;
  }catch(err){result.innerHTML=`<div class="error">${esc(err.message)}</div>`}
});
