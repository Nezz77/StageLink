import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { openSync, closeSync } from 'node:fs';
import { isAbsolute, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { readFile, mkdtemp } from 'node:fs/promises';

// This check may create accounts only in isolated local test services.
const checkout = process.env.STAGELINK_BACKEND_CHECKOUT;
const database = new URL(process.env.DATABASE_URL ?? 'http://invalid');
const redis = new URL(process.env.REDIS_URL ?? 'http://invalid');
if (!checkout || !isAbsolute(checkout) || process.env.NODE_ENV !== 'test' ||
    database.protocol !== 'postgresql:' || !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) || !database.pathname.endsWith('_test') ||
    redis.protocol !== 'redis:' || !['localhost', '127.0.0.1', '[::1]'].includes(redis.hostname)) {
  throw Error('Use a built backend checkout and isolated loopback test services.');
}
assert.equal(JSON.parse(await readFile(join(checkout, 'backend/package.json'), 'utf8')).name, '@stagelink/backend');
const backendModule = relative => import(pathToFileURL(join(checkout, 'backend/dist', relative)).href);
const [{ createApp }, { readConfig }, { resources, ensureRedis }, { hashPassword, unseal }] = await Promise.all([
  backendModule('api/src/app.js'), backendModule('shared/config.js'), backendModule('shared/resources.js'), backendModule('api/src/auth/security.js'),
]);
const playwrightModule = process.env.STAGELINK_PLAYWRIGHT_MODULE;
if (playwrightModule && !isAbsolute(playwrightModule)) throw Error('The optional Playwright module path must be absolute.');
const { chromium } = await import(playwrightModule ? pathToFileURL(playwrightModule).href : 'playwright');
const frontendRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const output = process.env.STAGELINK_QA_OUTPUT ?? await mkdtemp(join(tmpdir(), 'stagelink-auth-ui-'));
if (!isAbsolute(output)) throw Error('The QA output folder must be absolute.');
await mkdir(output,{recursive:true});
const portServer=createServer(); await new Promise(resolve=>portServer.listen(0,'127.0.0.1',resolve)); const port=portServer.address().port; await new Promise(resolve=>portServer.close(resolve));
const frontend='http://127.0.0.1:'+port, runId=randomUUID();
const config=readConfig({...process.env,WEB_ORIGIN:frontend,AUTH_RATE_PREFIX:'auth-browser-'+runId});
const deps=resources(config),{app}=await createApp(config,deps);
const emails=['auth-ui-'+runId+'@stagelink.test','signup-'+runId+'@stagelink.test'];
const password=randomBytes(18).toString('base64url'),newPassword=randomBytes(18).toString('base64url');
const secrets=[password,newPassword],checks=[],pageErrors=[];let browser,context,vite,logFd,passed=false,failure='',remaining=-1;
const screenshots=[]; let foreignToken='';
async function mark(name){checks.push(name);console.log(JSON.stringify({check:name,status:'passed'}));}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(test,ms=20000){const end=performance.now()+ms;while(performance.now()<end){if(await test())return;await delay(100);}throw Error('Condition did not complete');}
async function shot(page,name){await page.waitForTimeout(700);await page.screenshot({path:output+'/'+name+'.png',fullPage:false,animations:'disabled'});screenshots.push(name+'.png');}
async function waitSignIn(page){await page.getByRole('button',{name:'Sign in',exact:true}).waitFor({timeout:30000});}
async function openLogin(page){await waitSignIn(page);await page.getByRole('button',{name:'Sign in',exact:true}).click();return page.getByRole('dialog',{name:'Sign in',exact:true});}
async function fillLogin(dialog,email,pass){await dialog.getByLabel('Sign-in email').fill(email);await dialog.getByLabel('Sign-in password').fill(pass);await dialog.getByRole('button',{name:'SIGN IN',exact:true}).click();}
async function tokenFor(email,purpose){const user=await deps.db.authUser.findUniqueOrThrow({where:{email}});const rows=await deps.db.authMail.findMany({where:{userId:user.id,sealedPayload:{not:null}},orderBy:{createdAt:'desc'}});for(const row of rows){const payload=unseal(config.AUTH_MAIL_KEY,row.sealedPayload);if(payload.purpose===purpose){secrets.push(payload.token);return payload.token;}}throw Error('Fixture email token not found');}
try{
 await app.listen(0,'127.0.0.1');const api=await app.getUrl();
 await deps.db.authUser.create({data:{email:emails[0],displayName:'Jordan Rivera',passwordHash:await hashPassword(password),roles:['customer','artist'],emailVerifiedAt:new Date()}});
 logFd=openSync(output+'/vite.log','w',0o600);
 vite=spawn(process.execPath,[join(frontendRoot, 'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',String(port)],{cwd:frontendRoot,env:{PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,NODE_ENV:'development',VITE_STAGELINK_API_ORIGIN:api,PORT:String(port)},stdio:['ignore',logFd,logFd]});
 await until(async()=>{try{return(await fetch(frontend)).ok;}catch{return false;}});
 await writeFile(output+'/runtime.json',JSON.stringify({frontend,api}));
 browser=await chromium.launch({...(process.env.STAGELINK_CHROME_EXECUTABLE ? { executablePath: process.env.STAGELINK_CHROME_EXECUTABLE } : {}),headless:true});
 context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1'&&!u.pathname.startsWith('/_vercel/'))return route.continue();if(['fonts.googleapis.com','fonts.gstatic.com','images.unsplash.com'].includes(u.hostname))return route.continue();return route.abort();});
 const page=await context.newPage();page.on('pageerror',error=>pageErrors.push(error.message));
 await page.goto(frontend,{waitUntil:'domcontentloaded'});let dialog=await openLogin(page);
 await dialog.getByLabel('Sign-in email').focus();
 for (let i = 0; i < 10; i++) { await page.keyboard.press('Tab'); assert.equal(await dialog.evaluate(n => n.contains(document.activeElement) && !document.activeElement.closest('[inert]')), true); }
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});dialog=await openLogin(page);await mark('keyboard-focus-stays-in-modal-and-escape-closes-it');
 await page.waitForTimeout(500);await shot(page,'desktop-login');
 const metrics=await dialog.evaluate(root=>({dialog:root.querySelector('.sl-auth-dialog').getBoundingClientRect().toJSON(),elements:[...root.querySelectorAll('input,button,h1,p,span,a')].filter(n=>!n.closest('[inert]')&&n.getClientRects().length).map(n=>{const s=getComputedStyle(n);return{tag:n.tagName,text:n.getAttribute('placeholder')??n.textContent?.trim(),rect:n.getBoundingClientRect().toJSON(),font:s.fontFamily,size:s.fontSize,color:s.color,background:s.backgroundColor,radius:s.borderRadius};})}));
 await writeFile(output+'/login-metrics.json',JSON.stringify(metrics,null,2));
 await fillLogin(dialog,emails[0],'This is a wrong fixture password');await dialog.getByRole('alert').waitFor();assert.match(await dialog.getByRole('alert').textContent(),/incorrect/i);await shot(page,'desktop-login-error');await mark('invalid-login-does-not-open-a-dashboard');
 await fillLogin(dialog,emails[0],password);await page.locator('.sl-artist').waitFor();assert.equal(await page.locator('.sl-account strong').textContent(),'Jordan Rivera');assert.match(await page.locator('.mg-workspace-banner').first().textContent(),/simulated/);await shot(page,'desktop-artist');await mark('server-identity-and-preview-status');
 await page.getByRole('button',{name:'Account roles and sign out'}).click();const menu=page.locator('.sl-inline-role .card');await menu.waitFor();assert.equal(await menu.getByRole('button',{name:'Administrator',exact:true}).count(),0);assert.equal(await menu.getByRole('button',{name:'Equipment Renter',exact:true}).count(),0);await shot(page,'desktop-role-menu');
 await menu.getByRole('button',{name:'Customer',exact:true}).click();await page.locator('.sl-customer').waitFor();await mark('role-switch-requires-existing-membership');
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('.sl-customer').waitFor({timeout:30000});assert.equal(await page.locator('.sl-account strong').textContent(),'Jordan Rivera');await mark('http-only-cookie-restores-account');
 const storage=await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));assert.ok(!storage.includes(password));assert.ok(!/accessToken|csrfToken/.test(storage));await mark('credentials-absent-from-browser-storage');
 const other=await context.newPage();other.on('pageerror',e=>pageErrors.push(e.message));await other.goto(frontend,{waitUntil:'domcontentloaded'});await other.locator('.sl-customer').waitFor({timeout:30000});
 await page.getByRole('button',{name:'Account roles and sign out'}).click();await page.locator('.sl-inline-role .card').getByRole('button',{name:'Artist',exact:true}).click();await page.locator('.sl-artist').waitFor();await other.locator('.sl-artist').waitFor({timeout:20000});await mark('role-changes-propagate-between-tabs');
 await page.getByRole('button',{name:'Account roles and sign out'}).click();await page.locator('.sl-inline-role .card').getByRole('button',{name:'Sign out',exact:true}).click();await waitSignIn(page);await waitSignIn(other);await other.reload({waitUntil:'domcontentloaded'});await waitSignIn(other);await other.close();await mark('logout-clears-tabs-and-revokes-restoration');
 await page.setViewportSize({width:390,height:844});dialog=await openLogin(page);await shot(page,'mobile-login');const box=await dialog.locator('.sl-auth-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=391);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await mark('mobile-login-fits-viewport');
 await dialog.getByRole('button',{name:'Create an account',exact:true}).click();dialog=page.getByRole('dialog',{name:'Create account',exact:true});await dialog.getByLabel('Full name').fill('New StageLink Member');await dialog.getByLabel('Registration email').fill(emails[1]);await dialog.getByLabel('Registration password').fill(password);await dialog.getByRole('button',{name:'Artist',exact:true}).click();await shot(page,'mobile-registration');await dialog.getByRole('button',{name:'SIGN UP',exact:true}).click();dialog=page.getByRole('dialog',{name:'Sign in',exact:true});await dialog.getByRole('status').waitFor();assert.equal(await page.locator('.sl-dashboard').count(),0);await shot(page,'mobile-registration-requested');await mark('registration-persists-without-inventing-a-session');
 const verify=await tokenFor(emails[1],'verify_email');await page.goto(frontend+'/#verify='+verify,{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Verify your email',exact:true}).waitFor();assert.equal(new URL(page.url()).hash,'');await shot(page,'mobile-verify');assert.equal(await page.locator('.sl-email-page').evaluate(n=>getComputedStyle(n).color),'rgb(241, 245, 249)');await page.getByRole('button',{name:'Confirm email',exact:true}).click();await page.getByRole('heading',{name:'Email confirmed',exact:true}).waitFor();assert.ok((await deps.db.authUser.findUniqueOrThrow({where:{email:emails[1]}})).emailVerifiedAt);await shot(page,'mobile-verified');await mark('email-link-is-scrubbed-and-server-verified');
 await page.goto(frontend+'/#verify='+verify,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Confirm email',exact:true}).click();await page.getByRole('alert').waitFor();await mark('verification-link-replay-is-rejected');
 await page.goto(frontend,{waitUntil:'domcontentloaded'});dialog=await openLogin(page);await dialog.getByRole('link',{name:'Forgot your password?',exact:true}).click();const recovery=page.getByRole('dialog',{name:'Recover your account',exact:true});await recovery.waitFor();await recovery.getByLabel('Recovery email').fill(emails[0]);await shot(page,'mobile-reset-request');await recovery.getByRole('button',{name:'Send reset email',exact:true}).click();await recovery.getByLabel('Reset token').waitFor();await mark('recovery-uses-a-real-reset-request');
 const device=await fetch(api+'/api/v1/auth/login',{method:'POST',headers:{Origin:frontend,'Content-Type':'application/json'},body:JSON.stringify({email:emails[0],password})});assert.equal(device.status,200);foreignToken=(await device.json()).accessToken;secrets.push(foreignToken);
 const reset=await tokenFor(emails[0],'password_reset');await page.goto(frontend+'/#reset='+reset,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Continue securely',exact:true}).waitFor();assert.equal(new URL(page.url()).hash,'');assert.equal(await page.getByLabel('Reset token').count(),0);await page.getByRole('button',{name:'Continue securely',exact:true}).click();await page.getByLabel('New password',{exact:true}).waitFor();await page.getByLabel('New password',{exact:true}).fill(newPassword);await page.getByLabel('Confirm new password',{exact:true}).fill(newPassword);await shot(page,'mobile-reset-password');await page.getByRole('button',{name:'Update password',exact:true}).click();await page.getByRole('heading',{name:'Password updated',exact:true}).waitFor();await shot(page,'mobile-reset-done');const revoked=await fetch(api+'/api/v1/me',{headers:{Authorization:'Bearer '+foreignToken}});assert.equal(revoked.status,401);await mark('reset-link-updates-password-and-revokes-sessions');
 await page.getByRole('button',{name:'Back to sign in',exact:true}).click();dialog=await openLogin(page);await fillLogin(dialog,emails[0],password);await dialog.getByRole('alert').waitFor();await fillLogin(dialog,emails[0],newPassword);await page.locator('.sl-artist').waitFor();await mark('old-password-rejected-and-new-password-accepted');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await shot(page,'mobile-artist');
 await page.getByRole('button',{name:'Account roles and sign out'}).click();await page.locator('.sl-inline-role .card').waitFor();await shot(page,'mobile-role-menu');await page.getByRole('button',{name:'Account roles and sign out'}).click();await mark('mobile-account-and-membership-menu-fit');
 await page.setViewportSize({width:1440,height:1000});await shot(page,'desktop-restored-artist');
 const theme=page.locator('.sl-theme-toggle').filter({visible:true});await theme.click();await until(async()=>await page.evaluate(()=>document.documentElement.dataset.theme==='light'));await shot(page,'desktop-artist-light');await mark('connected-account-light-theme');
 const changed='changed-'+runId+'@stagelink.test';emails.push(changed);
 const changeDevice=await fetch(api+'/api/v1/auth/login',{method:'POST',headers:{Origin:frontend,'Content-Type':'application/json'},body:JSON.stringify({email:emails[0],password:newPassword})});assert.equal(changeDevice.status,200);const auth=await changeDevice.json();secrets.push(auth.accessToken,auth.csrfToken);
 const change=await fetch(api+'/api/v1/me/email-change',{method:'POST',headers:{Origin:frontend,'Content-Type':'application/json',Authorization:'Bearer '+auth.accessToken,'X-CSRF-Token':auth.csrfToken},body:JSON.stringify({email:changed,password:newPassword})});assert.equal(change.status,202);
 const changedToken=await tokenFor(emails[0],'email_change');await page.goto(frontend+'/#emailchange='+changedToken,{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Confirm your new email',exact:true}).waitFor();assert.equal(new URL(page.url()).hash,'');await shot(page,'desktop-email-change');await page.getByRole('button',{name:'Confirm email',exact:true}).click();await page.getByRole('heading',{name:'Email confirmed',exact:true}).waitFor();const invalidOld=await fetch(api+'/api/v1/me',{headers:{Authorization:'Bearer '+auth.accessToken}});assert.equal(invalidOld.status,401);assert.ok(await deps.db.authUser.findUnique({where:{email:changed}}));await mark('email-change-confirmation-revokes-prior-sessions');
 await page.getByRole('button',{name:'Back to StageLink',exact:true}).click();dialog=await openLogin(page);await page.route(api+'/api/v1/auth/login',r=>r.abort());await fillLogin(dialog,changed,newPassword);await dialog.getByRole('alert').waitFor();assert.match(await dialog.getByRole('alert').textContent(),/could not be reached/i);assert.equal(await page.locator('.sl-dashboard').count(),0);await shot(page,'desktop-login-unavailable');await page.unroute(api+'/api/v1/auth/login');await mark('network-failure-cannot-invent-a-session');
 await page.route(api+'/api/v1/auth/login',async r=>{await delay(1600);await r.continue();});await dialog.getByLabel('Sign-in email').fill(changed);await dialog.getByLabel('Sign-in password').fill(newPassword);await dialog.getByRole('button',{name:'SIGN IN',exact:true}).click();await dialog.getByRole('button',{name:'SIGNING IN…',exact:true}).waitFor();assert.equal(await dialog.getByRole('button',{name:'SIGNING IN…',exact:true}).isDisabled(),true);await shot(page,'desktop-login-loading');await page.locator('.sl-artist').waitFor();await page.unroute(api+'/api/v1/auth/login');await mark('loading-prevents-repeated-sign-in-submission');
 await page.getByRole('button',{name:'Account roles and sign out'}).click();await page.locator('.sl-inline-role .card').getByRole('button',{name:'Sign out',exact:true}).click();await page.setViewportSize({width:844,height:390});dialog=await openLogin(page);await dialog.getByLabel('Sign-in password').focus();await dialog.getByRole('button',{name:'SIGN IN',exact:true}).scrollIntoViewIfNeeded();await shot(page,'landscape-login');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await mark('short-landscape-login-remains-scrollable');

 assert.deepEqual(pageErrors,[]);passed=true;
}catch(error){failure=error.message;for(const secret of secrets)failure=failure.split(secret).join('[redacted]');console.error(JSON.stringify({error:failure}));}
finally{
 await context?.close().catch(()=>{});await browser?.close().catch(()=>{});
 if(vite&&vite.exitCode===null){const ended=once(vite,'exit');vite.kill('SIGTERM');await Promise.race([ended,delay(3000)]);if(vite.exitCode===null)vite.kill('SIGKILL');}
 if(logFd!==undefined)closeSync(logFd);
 try{const users=await deps.db.authUser.findMany({where:{email:{in:emails}},select:{id:true}});const ids=users.map(u=>u.id);await deps.db.profileAudit.deleteMany({where:{OR:[{actorId:{in:ids}},{targetUserId:{in:ids}}]}});await deps.db.authUser.deleteMany({where:{id:{in:ids}}});remaining=await deps.db.authUser.count({where:{id:{in:ids}}});await ensureRedis(deps.redis);let cursor='0';do{const result=await deps.redis.scan(cursor,'MATCH',config.AUTH_RATE_PREFIX+':*','COUNT',100);cursor=result[0];if(result[1].length)await deps.redis.del(...result[1]);}while(cursor!=='0');}finally{await app.close();}
 await writeFile(output+'/report.json',JSON.stringify({passed,checks,screenshots,fixtureAccountsRemaining:remaining,pageErrors,error:failure||null,externalMessagesSent:false,browser:'Playwright Chromium, isolated headless context'},null,2));
 console.log(JSON.stringify({passed,checks:checks.length,fixtureAccountsRemaining:remaining,output}));
}
if(!passed||remaining!==0)process.exitCode=1;
