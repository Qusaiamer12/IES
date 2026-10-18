import { chromium } from 'playwright';
const OUT='/tmp/claude-0/-home-user-IES/30d3cc1b-3ed1-52b5-b6f6-c7bfa56d838c/scratchpad/ux/nav';
const BASE='https://ies-hu.vercel.app';
const browser=await chromium.launch();
async function go(page,u){ for(let i=0;i<3;i++){ const r=await page.goto(BASE+u,{waitUntil:'networkidle'}); if(r.status()!==502) return r; } }
// 404 page link to /nope
{ const ctx=await browser.newContext({viewport:{width:1520,height:900}}); const page=await ctx.newPage(); await go(page,'/nope');
  console.log('404 links to nope:', await page.$$eval('a',as=>as.filter(a=>a.href.includes('nope')).map(a=>a.outerHTML.slice(0,200))));
  await ctx.close(); }
// breakpoints
for(const w of [859,860,861,862,1119,1120,1121,1122]){
  const ctx=await browser.newContext({viewport:{width:w,height:800}}); const page=await ctx.newPage(); await go(page,'/');
  const info=await page.evaluate(()=>{
    const de=document.documentElement; const cs=getComputedStyle(de);
    const burger=[...document.querySelectorAll('header button')].map(b=>({label:b.getAttribute('aria-label'),vis:getComputedStyle(b).display!=='none'&&b.getBoundingClientRect().width>0, exp:b.getAttribute('aria-expanded'), controls:b.getAttribute('aria-controls')}));
    const navLinks=[...document.querySelectorAll('header nav a')].filter(a=>a.getBoundingClientRect().width>0 && getComputedStyle(a).visibility!=='hidden').map(a=>a.textContent.trim());
    const h=document.querySelector('header'); const hr=h.getBoundingClientRect();
    const h1=document.querySelector('h1'); 
    return {fs:cs.fontSize, zoom:cs.zoom, burger, navLinks, headerH:Math.round(hr.height), headerPos:getComputedStyle(h).position, h1fs:getComputedStyle(h1).fontSize, sw:de.scrollWidth};
  });
  console.log('BP',w,JSON.stringify(info));
  await page.screenshot({path:`${OUT}/bp_${w}.png`});
  await ctx.close();
}
// sticky header check on scroll + mobile menu
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const page=await ctx.newPage(); await go(page,'/chapter');
await page.evaluate(()=>window.scrollTo(0,1500)); await page.waitForTimeout(500);
console.log('header after scroll', await page.evaluate(()=>{const h=document.querySelector('header');const r=h.getBoundingClientRect();return {top:r.top,h:r.height,pos:getComputedStyle(h).position}}));
await page.screenshot({path:`${OUT}/m_scrolled_390.png`});
await page.evaluate(()=>window.scrollTo(0,0));
const burger=page.locator('header button[aria-expanded]').first();
console.log('burger label', await burger.getAttribute('aria-label'), await burger.getAttribute('aria-expanded'));
await burger.click(); await page.waitForTimeout(600);
const st=await page.evaluate(()=>({exp:document.querySelector('header button[aria-expanded]').getAttribute('aria-expanded'), label:document.querySelector('header button[aria-expanded]').getAttribute('aria-label'), bodyOverflow:getComputedStyle(document.body).overflow, htmlOverflow:getComputedStyle(document.documentElement).overflow, active:document.activeElement.outerHTML.slice(0,150), dialog:!!document.querySelector('[role=dialog]'), ariaModal:document.querySelector('[aria-modal]')?.getAttribute('aria-modal')}));
console.log('menu open',JSON.stringify(st));
await page.screenshot({path:`${OUT}/menu_open_390.png`});
// scroll lock test
await page.mouse.wheel(0,800); await page.evaluate(()=>window.scrollBy(0,0)); await page.waitForTimeout(300);
console.log('scrollY after wheel while open', await page.evaluate(()=>scrollY));
// tab through menu
const tabs=[];
for(let i=0;i<14;i++){ await page.keyboard.press('Tab'); tabs.push(await page.evaluate(()=>{const a=document.activeElement; const r=a.getBoundingClientRect(); return (a.textContent||a.getAttribute('aria-label')||a.tagName).trim().slice(0,25)+'@'+Math.round(r.top)})); }
console.log('tab in menu',tabs.join(' | '));
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
console.log('after esc', await page.evaluate(()=>({exp:document.querySelector('header button[aria-expanded]').getAttribute('aria-expanded'),active:document.activeElement.outerHTML.slice(0,100), bodyOverflow:getComputedStyle(document.body).overflow})));
await burger.click(); await page.waitForTimeout(500);
await burger.click(); await page.waitForTimeout(500);
console.log('after button close', await burger.getAttribute('aria-expanded'));
await burger.click(); await page.waitForTimeout(500);
await page.screenshot({path:`${OUT}/menu_open_390_b.png`});
const menuLinks=await page.evaluate(()=>[...document.querySelectorAll('a')].filter(a=>{const r=a.getBoundingClientRect();return r.width>0&&r.top>=0&&r.top<844&&getComputedStyle(a).visibility!=='hidden'}).map(a=>a.textContent.trim()+(a.getAttribute('aria-current')?'[current]':'')));
console.log('visible links in menu',menuLinks.join(' | '));
await page.getByRole('link',{name:'Events',exact:true}).filter({visible:true}).first().click();
await page.waitForURL('**/events'); await page.waitForTimeout(600);
console.log('after link click', page.url(), await burger.getAttribute('aria-expanded'), await page.evaluate(()=>({bodyOverflow:getComputedStyle(document.body).overflow,scrollY, active:document.activeElement.tagName+':'+document.activeElement.textContent.trim().slice(0,30)})));
await page.screenshot({path:`${OUT}/after_menu_nav_390.png`});
// active state desktop
const d=await browser.newContext({viewport:{width:1520,height:900}}); const dp=await d.newPage();
for(const u of ['/','/chapter','/team','/m/qusai-amer','/events/ieee-day-hu-2026','/projects/pid-duel','/join','/contact']){ if(u==='/projects/pid-duel') continue; await go(dp,u); console.log('active',u, await dp.evaluate(()=>[...document.querySelectorAll('header a')].filter(a=>a.getAttribute('aria-current')||/active/.test(a.className)).map(a=>a.textContent.trim()+':'+a.getAttribute('aria-current')).join(','))); }
await browser.close();
