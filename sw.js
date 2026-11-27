/* خدمة التخزين للعمل بدون إنترنت — ضعها بجانب index.html */
const VER='ludo-v1',
  PAGES=['./','./index.html'],
  LIBS=['https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'],
  HOSTS=['cdn.jsdelivr.net','cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com'];

self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(VER);
    await Promise.all(PAGES.map(u=>fetch(u,{cache:'reload'}).then(r=>r.ok&&c.put(u,r)).catch(()=>{})));
    await Promise.all(LIBS.map(u=>fetch(u,{mode:'no-cors'}).then(r=>c.put(u,r)).catch(()=>{})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    for(const k of await caches.keys())if(k!==VER)await caches.delete(k);
    await self.clients.claim();
  })());
});

const timeout=(p,ms)=>new Promise((ok,no)=>{const t=setTimeout(()=>no('timeout'),ms);p.then(v=>{clearTimeout(t);ok(v)},e=>{clearTimeout(t);no(e)})});

self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  /* صفحة اللعبة: الشبكة أولاً (3 ثوان) وإلا النسخة المحفوظة */
  if(r.mode==='navigate'&&u.origin===location.origin){
    e.respondWith((async()=>{
      const c=await caches.open(VER);
      try{
        const res=await timeout(fetch(r),3000);
        if(res&&res.ok)c.put('./index.html',res.clone());
        return res;
      }catch(err){
        return (await c.match('./index.html'))||(await c.match('./'))||Response.error();
      }
    })());
    return;
  }
  /* الملفات الثابتة: المحفوظ أولاً ثم تحديثه بالخلفية */
  if(u.origin===location.origin||HOSTS.includes(u.hostname)){
    e.respondWith((async()=>{
      const c=await caches.open(VER),hit=await c.match(r);
      const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque'))c.put(r,res.clone());return res}).catch(()=>null);
      if(hit){e.waitUntil(net);return hit}
      return (await net)||Response.error();
    })());
  }
});
