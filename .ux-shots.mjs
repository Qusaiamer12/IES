import { chromium } from 'playwright';
const OUT='/tmp/claude-0/-home-user-IES/30d3cc1b-3ed1-52b5-b6f6-c7bfa56d838c/scratchpad/ux/shots';
const BASE='https://ies-hu.vercel.app';
const slugs='noor-naser qusai-amer tala-samhan'.split(' ');
const pages=(process.argv[3]||'/,/chapter,/team,/events,/events/jordan-ieee-day-2026,/events/ieee-day-hu-2026,/projects,/join,/contact,/nope,/m/noor-naser,/m/qusai-amer,/m/tala-samhan,/m/hala-rawashdeh').split(',');
const widths=(process.argv[2]||'390,1520').split(',').map(Number);
const browser=await chromium.launch();
for(const w of widths){
  const mobile=w<800; const dsf=w==390?3:w==1520?1.25:1;
  const ctx=await browser.newContext({viewport:{width:w,height:mobile?844:900},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile});
  for(const p of pages){
    const page=await ctx.newPage();
    for(let i=0;i<3;i++){ const r=await page.goto(BASE+p,{waitUntil:'networkidle'}); if(r.status()!==502) break; }
    const h=await page.evaluate(()=>document.documentElement.scrollHeight);
    for(let y=0;y<h;y+=400){ await page.evaluate(y=>window.scrollTo(0,y),y); await page.waitForTimeout(120); }
    await page.evaluate(()=>window.scrollTo(0,0)); await page.waitForTimeout(800);
    const name=(p==='/'?'home':p.replace(/\//g,'_').slice(1))+'_'+w;
    await page.screenshot({path:`${OUT}/${name}.png`,fullPage:true});
    console.log(name);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
