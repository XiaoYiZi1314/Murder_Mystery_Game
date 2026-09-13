import { test,expect } from './fixtures';
import { randomUUID } from 'node:crypto';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { BASE_URL,uniquePhone,trackPhone,cleanupTestUsers } from '../integration/helpers';
import { prisma } from '../../src/server/db/prisma';
import { createSession,revokeUserSessions } from '../../src/server/auth/session';
import { hashPassword } from '../../src/server/auth/password';
import { getSessionConfig } from '../../src/server/config';
import { uploadImage } from '../../src/server/media/service';
import { LocalStorage } from '../../src/server/media/local-storage';

test.use({channel:process.env.PLAYWRIGHT_CHANNEL});

test('C2 browser: login return, real editor save/conflict, reciprocal links and 390/820/1440 layouts',async({page,context,browser})=>{
 test.setTimeout(180000);page.setDefaultTimeout(15000);
 process.env.UPLOAD_PUBLIC_DIR='var/test-uploads';process.env.UPLOAD_PRIVATE_DIR='var/test-private-media';
 const token=randomUUID().slice(0,8),slug=`browser-${token}`,title=`海雾来信-${token}`,password='c2-browser-password';
 const mediaIds:bigint[]=[],scriptIds:bigint[]=[],costumeIds:bigint[]=[];
 const userIds:bigint[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const evidence='test-results/c2-browser';await mkdir(evidence,{recursive:true});
 try{
  const manager=await prisma.user.create({data:{phone:trackPhone(uniquePhone()),nickname:'浏览器测试店长',passwordHash:await hashPassword(password),role:'manager',status:'active'}});
  const customer=await prisma.user.create({data:{phone:trackPhone(uniquePhone()),nickname:'浏览器测试顾客',passwordHash:await hashPassword(password),role:'customer',status:'active'}});
  const dmUser=await prisma.user.create({data:{phone:trackPhone(uniquePhone()),nickname:'浏览器测试DM',passwordHash:await hashPassword(password),role:'dm',status:'active'}});
  userIds.push(manager.id,customer.id,dmUser.id);
  const dm=await prisma.dm.create({data:{userId:dmUser.id,slug:`dm-${token}`,bio:'用恰到好处的留白，让每一次选择都被听见。'}});
  const session=await createSession(manager.id.toString(),'manager');
  const headers={Cookie:`${getSessionConfig().cookieName}=${session.token}`,Origin:new URL(BASE_URL).origin,'X-CSRF-Token':session.csrfToken,'Content-Type':'application/json'};
  const request=async(path:string,method='GET',body?:unknown)=>{const r=await fetch(BASE_URL+path,{method,headers:{...headers,'Idempotency-Key':randomUUID()},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();expect(r.ok,JSON.stringify(data)).toBeTruthy();return data.data;};
  const bytes=await readFile('public/43947e6d13429e6e24ef2f82a3ac0265.jpg');
  const covers=[];for(const purpose of ['script_cover','costume']){const m=await uploadImage({userId:manager.id.toString(),role:'manager'},bytes,'image/jpeg',purpose,'browser-test');mediaIds.push(BigInt(m.id));covers.push(m.url);}
  const c=await request('/api/admin/costumes','POST',{name:`雾港旧衣-${token}`,slug:`costume-${token}`,cover:covers[1],images:[covers[1]],description:'灰蓝色的衣襟，藏着一封没有寄出的信。',status:'on'});costumeIds.push(BigInt(c.id));
  const s=await request('/api/admin/scripts','POST',{title,slug,cover:covers[0],synopsis:'只向已登录用户展示的角色背景与故事。',tagline:'一封迟到的信，把六个人带回雾里的码头。',price:'168.00',duration_minutes:240,player_min:5,player_max:6,status:'on',featured:true,costume_ids:[c.id],dm_ids:[dm.id.toString()],characters:[{name:'林舟',bio:'在港口长大，对每一条潮汐都熟悉。',sort:0}]});scriptIds.push(BigInt(s.id));
  await page.goto(`${BASE_URL}/scripts/${slug}`);await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel('手机号',{exact:true}).first().fill(customer.phone);await page.getByLabel('密码',{exact:true}).first().fill(password);
  await page.getByRole('button',{name:'登录十三雾',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/scripts/${slug}$`));await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  await page.getByRole('link',{name:`雾港旧衣-${token}`}).click();await expect(page).toHaveURL(new RegExp(`/costumes/costume-${token}$`));
  await page.getByRole('link',{name:title}).click();await expect(page).toHaveURL(new RegExp(`/scripts/${slug}$`));
  const checks:unknown[]=[];
  for(const width of [390,820,1440]){
   await page.setViewportSize({width,height:900});
   for(const [name,path] of [['scripts',`/scripts?q=${encodeURIComponent(title)}`],['script-detail',`/scripts/${slug}`],['costume-detail',`/costumes/costume-${token}`],['dm-detail',`/dms/dm-${token}`],['home','/']] as const){
    await page.goto(BASE_URL+path);await page.locator('h1').first().waitFor();await page.evaluate(()=>document.fonts.ready);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);expect(overflow,`${name} ${width} overflows`).toBeFalsy();
    await page.screenshot({path:`${evidence}/${name}-${width}.png`,fullPage:true});checks.push({page:name,width,overflow});
   }
   const original=await page.goto(`${BASE_URL}/dev/reference/scripts.html`);
   if(original?.ok())await page.screenshot({path:`${evidence}/reference-scripts-${width}.png`,fullPage:true});
  }
  const admin=await browser.newContext();await admin.addCookies([{name:getSessionConfig().cookieName,value:session.token,url:BASE_URL}]);const editor=await admin.newPage();editor.setDefaultTimeout(15000);editor.on('pageerror',e=>errors.push(e.message));
  await editor.goto(`${BASE_URL}/admin/scripts`);await editor.getByPlaceholder('搜索名称').fill(title);await editor.getByPlaceholder('搜索名称').press('Enter');
  await editor.getByRole('button',{name:/^编\s*辑$/}).click();await expect(editor.getByRole('dialog')).toBeVisible();
  await editor.getByLabel('剧本名称',{exact:true}).fill(title+' 已编辑');await editor.getByRole('button',{name:'保存到数据库',exact:true}).click();await expect(editor.getByRole('dialog')).toBeHidden();
  expect((await request(`/api/admin/scripts/${s.id}`)).title).toBe(title+' 已编辑');
  await editor.getByRole('button',{name:/^编\s*辑$/}).click();
  const current=await request(`/api/admin/scripts/${s.id}`);await request(`/api/admin/scripts/${s.id}`,'PATCH',{updated_at:current.updated_at,tagline:'另一位员工的修改'});
  await editor.getByLabel('剧本名称',{exact:true}).fill(title+' 陈旧覆盖');await editor.getByRole('button',{name:'保存到数据库',exact:true}).click();
  await expect(editor.getByText('内容已被他人更新，请重新加载',{exact:true})).toBeVisible();
  await editor.getByRole('button',{name:'重新加载（放弃当前修改）'}).click();await expect(editor.getByLabel('剧本名称',{exact:true})).toHaveValue(title+' 已编辑');
  for(const width of [390,820,1440]){await editor.setViewportSize({width,height:900});await editor.screenshot({path:`${evidence}/editor-${width}.png`,fullPage:true});expect(await editor.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)).toBeFalsy();}
  await editor.keyboard.press('Escape');await expect(editor.getByRole('dialog')).toBeHidden();
  await admin.close();
  expect(errors).toEqual([]);
  await writeFile(`${evidence}/checks.json`,JSON.stringify({checks,runtime_errors:errors,login_return:true,reciprocal_links:true,editor_persistence:true,stale_conflict:true,escape_closes:true},null,2));
  console.log('C2 browser evidence:',evidence);
 }finally{
  await context.clearCookies().catch(()=>{});
  await prisma.mediaReference.deleteMany({where:{assetId:{in:mediaIds}}});
  await prisma.script.deleteMany({where:{id:{in:scriptIds}}});await prisma.costume.deleteMany({where:{id:{in:costumeIds}}});
  const assets=await prisma.mediaAsset.findMany({where:{id:{in:mediaIds}}});await prisma.mediaAsset.deleteMany({where:{id:{in:mediaIds}}});
  const store=new LocalStorage('var/test-uploads','var/test-private-media');for(const a of assets){await store.delete(a.key,a.visibility);await store.delete(a.key.replace('.webp','-thumb.webp'),a.visibility);}
  for(const [entity,ids] of [['script',scriptIds],['costume',costumeIds]] as const)for(const id of ids)await prisma.eventOutbox.deleteMany({where:{type:'catalog.changed',AND:[{payloadJson:{path:'$.entity',equals:entity}},{payloadJson:{path:'$.id',equals:id.toString()}}]}});
  for(const id of userIds)await revokeUserSessions(id.toString());
  await cleanupTestUsers();
 }
});
