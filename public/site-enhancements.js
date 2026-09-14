document.addEventListener('DOMContentLoaded',()=>{
 const overlay=document.getElementById('pageTransition');
 if(overlay){requestAnimationFrame(()=>overlay.classList.add('ready'));document.querySelectorAll('a[href]').forEach(a=>{const href=a.getAttribute('href');if(!href||href.startsWith('#')||href.startsWith('javascript:')||a.target==='_blank')return;a.addEventListener('click',e=>{const url=new URL(href,location.href);if(url.origin!==location.origin)return;e.preventDefault();overlay.classList.remove('ready');overlay.classList.add('leaving');setTimeout(()=>location.href=url.href,180)})})}
 document.querySelectorAll('.authVisual,.authCard,.accountCard,.ordersPanel,.profileStrip').forEach((el,i)=>{el.style.animationDelay=Math.min(i*.06,.35)+'s'})
});