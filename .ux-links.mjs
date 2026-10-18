import { chromium } from 'playwright';
const BASE='https://ies-hu.vercel.app';
const slugs='noor-naser qusai-amer tala-samhan omar-omeir ahmed-alhunity raneem-abu-areda ahmad-ayyadi tasneem-mherat shahed-hilal hala-rawashdeh'.split(' ');
const pages=['/','/chapter','/team','/events','/events/jordan-ieee-day-2026','/events/ieee-day-hu-2026','/projects','/projects/pid-duel','/join','/contact','/nope',...slugs.map(s=>'/m/'+s)];
const browser=await chromium.launch();
const ctx=await browser.newContext({viewport:{width:1520,height:900}});
const page=await ctx.newPage();
const internal=new Set(), external=new Map(), badExt=[], hashLinks=new Set();
for(const p of pages){
  await page.goto(BASE+p,{waitUntil:'domcontentloaded'});
  const links=await page.$$eval('a[href]',as=>as.map(a=>({href:a.href,raw:a.getAttribute('href'),target:a.target,rel:a.rel,text:(a.textContent||a.getAttribute('aria-label')||'').trim().slice(0,40),aria:a.getAttribute('aria-label')})));
  for(const l of links){
    if(l.href.startsWith(BASE)){ internal.add(l.href.split('#')[0]); if(l.raw.includes('#')) hashLinks.add(p+' -> '+l.raw); }
    else if(l.href.startsWith('http')){ external.set(l.href,l.text); if(l.target!=='_blank'||!/noopener|noreferrer/.test(l.rel)) badExt.push(p+' '+l.href+' target='+l.target+' rel='+l.rel); }
    else console.log('OTHER',p,l.href,l.text);
    if(!l.text&&!l.aria) console.log('NO TEXT LINK',p,l.raw);
  }
}
console.log('internal',[...internal].join('\n'));
console.log('hash',[...hashLinks].join('\n'));
console.log('BAD EXT',[...new Set(badExt)].join('\n'));
const req=ctx.request;
for(const u of internal){ let s; for(let i=0;i<3;i++){ const r=await req.get(u,{maxRedirects:0}); s=r.status(); if(s!==502)break;} if(s!==200) console.log('INTERNAL',s,u); }
for(const [u,t] of external){ let s; try{ for(let i=0;i<2;i++){ const r=await req.get(u,{timeout:20000}); s=r.status(); if(s!==502)break;} }catch(e){s='ERR '+e.message.slice(0,60)} console.log('EXT',s,u,t); }
for(const r of ['/about','/officers','/membership','/m/qusai-amer/contact.vcf','/m/noor-naser/contact.vcf','/m/unknown','/m/unknown/contact.vcf','/events/nope','/projects/nope','/favicon.ico','/icon.png','/apple-icon.png','/opengraph-image','/robots.txt','/sitemap.xml','/manifest.webmanifest','/team/','/CHAPTER']){
  const resp=await req.get(BASE+r,{maxRedirects:0}); console.log('R',r,resp.status(),resp.headers()['location']||'',resp.headers()['content-type'],resp.headers()['content-disposition']||'');
}
await browser.close();
