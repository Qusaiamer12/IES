import { chromium } from 'playwright';
import fs from 'fs';
const OUT='/tmp/claude-0/-home-user-IES/30d3cc1b-3ed1-52b5-b6f6-c7bfa56d838c/scratchpad/ux';
const BASE='https://ies-hu.vercel.app';
const slugs='noor-naser qusai-amer tala-samhan omar-omeir ahmed-alhunity raneem-abu-areda ahmad-ayyadi tasneem-mherat shahed-hilal hala-rawashdeh'.split(' ');
const pages=['/','/chapter','/team','/events','/events/jordan-ieee-day-2026','/events/ieee-day-hu-2026','/projects','/projects/pid-duel','/join','/contact','/nope',...slugs.map(s=>'/m/'+s)];
const widths=[[360,1,true],[390,3,true],[768,1,false],[1024,1,false],[1280,1,false],[1520,1.25,false],[1920,1,false]];
const browser=await chromium.launch();
const results=[];
for(const [w,dsf,mobile] of widths){
  const ctx=await browser.newContext({viewport:{width:w,height:w<800?844:900},deviceScaleFactor:dsf,isMobile:mobile,hasTouch:mobile});
  for(const p of pages){
    const page=await ctx.newPage();
    const errs=[],failed=[];let bytes=0;const big=[];
    page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
    page.on('pageerror',e=>errs.push('PAGEERROR '+e.message.slice(0,200)));
    page.on('requestfailed',r=>failed.push(r.url()+' '+(r.failure()?.errorText)));
    page.on('response',async r=>{const st=r.status(); if(st>=400) failed.push(st+' '+r.url()); try{const b=await r.body(); bytes+=b.length; if(b.length>150000) big.push([r.url(),b.length]);}catch{}});
    let status;
    for(let i=0;i<2;i++){ try{ const resp=await page.goto(BASE+p,{waitUntil:'networkidle',timeout:45000}); status=resp.status(); if(status!==502) break;}catch(e){status='ERR '+e.message.slice(0,80)} }
    await page.waitForTimeout(500);
    const m=await page.evaluate(()=>{
      const de=document.documentElement;
      const vw=de.clientWidth;
      const off=[];
      for(const el of document.querySelectorAll('body *')){
        const r=el.getBoundingClientRect(); const cs=getComputedStyle(el);
        if(cs.display==='none'||cs.visibility==='hidden'||r.width===0) continue;
        if(r.right>vw+1 || r.left< -1){
          // check if within clipped ancestor
          let a=el.parentElement, clipped=false;
          while(a&&a!==document.body){const c=getComputedStyle(a); if(c.overflowX!=='visible'||c.overflow==='hidden'){const ar=a.getBoundingClientRect(); if(ar.right<=vw+1&&ar.left>=-1){clipped=true;break;}} a=a.parentElement;}
          if(!clipped) off.push((el.tagName+'.'+(el.className&&el.className.baseVal===undefined?el.className:'')).slice(0,60)+' '+Math.round(r.left)+'..'+Math.round(r.right));
        }
      }
      // tiny text
      const tiny=new Set();
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
      let n; while(n=walker.nextNode()){ if(!n.textContent.trim()) continue; const el=n.parentElement; const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden') continue; const r=el.getBoundingClientRect(); if(r.width===0) continue; const fs=parseFloat(cs.fontSize); if(fs<12) tiny.add(fs.toFixed(1)+'px:'+n.textContent.trim().slice(0,30)); }
      const imgs=[...document.images].map(i=>({src:i.currentSrc.slice(-60),alt:i.getAttribute('alt'),nw:i.naturalWidth,nh:i.naturalHeight,w:Math.round(i.getBoundingClientRect().width),h:Math.round(i.getBoundingClientRect().height),fit:getComputedStyle(i).objectFit,complete:i.complete}));
      const meta=n=>document.querySelector(`meta[name="${n}"],meta[property="${n}"]`)?.content;
      return {sw:de.scrollWidth,vw,sh:de.scrollHeight,title:document.title,desc:meta('description'),ogimg:meta('og:image'),ogtitle:meta('og:title'),icons:[...document.querySelectorAll('link[rel*=icon]')].map(l=>l.rel+':'+l.href.replace(location.origin,'')),off:off.slice(0,10),tiny:[...tiny].slice(0,15),imgs,h1:[...document.querySelectorAll('h1')].map(h=>h.textContent.trim().slice(0,60)),zoom:getComputedStyle(de).zoom||'', fs:getComputedStyle(de).fontSize, canonical:document.querySelector('link[rel=canonical]')?.href, lang:de.lang};
    });
    const cls=await page.evaluate(()=>new Promise(res=>{let v=0;new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput) v+=e.value}).observe({type:'layout-shift',buffered:true});setTimeout(()=>res(v),300)}));
    const name=(p==='/'?'home':p.replace(/\//g,'_').slice(1))+'_'+w;
    await page.screenshot({path:`${OUT}/sweep/${name}.png`,fullPage:true});
    results.push({w,p,status,errs,failed,bytes,big,cls,...m});
    console.log(w,p,status,'sw',m.sw,'vw',m.vw,'cls',cls.toFixed(3),'errs',errs.length,'failed',failed.length,'KB',Math.round(bytes/1024));
    await page.close();
  }
  await ctx.close();
}
fs.writeFileSync(OUT+'/sweep.json',JSON.stringify(results,null,1));
await browser.close();
