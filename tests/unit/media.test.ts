import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { processImage } from '../../src/server/media/process-image';
import { authorizeUpload } from '../../src/server/media/authorization';
import { LocalStorage } from '../../src/server/media/local-storage';

test('JPEG/PNG/WebP are reencoded with bounded thumbnails and no EXIF', async () => {
 for (const format of ['jpeg','png','webp'] as const) {
  const input = await sharp({create:{width:900,height:1200,channels:3,background:'#ffcc99'}}).withMetadata({exif:{IFD0:{Artist:'private-test'}}})[format]().toBuffer();
  const out = await processImage(input, `image/${format}`, 'script_cover');
  const meta = await sharp(out.bytes).metadata();
  assert.equal(meta.format,'webp'); assert.equal(meta.exif,undefined);
  assert.ok(out.width <= 1600); assert.ok((await sharp(out.thumbnail).metadata()).width! <= 480);
 }
});
test('reject forged MIME, SVG, corrupt images and >5MB', async () => {
 for (const [bytes,mime] of [[Buffer.from('<svg/>'),'image/svg+xml'],[Buffer.from('text'),'image/png'],[Buffer.alloc(5*1024*1024+1),'image/png']] as const) {
  await assert.rejects(()=>processImage(bytes,mime,'script_cover'));
 }
 const png=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer();
 await assert.rejects(()=>processImage(png,'image/jpeg','script_cover'));
 await assert.rejects(()=>processImage(png.subarray(0,20),'image/png','script_cover'));
});
test('upload purpose matrix and private separation', async () => {
 assert.throws(()=>authorizeUpload({userId:'1',role:'customer'},'script_cover'));
 assert.throws(()=>authorizeUpload({userId:'1',role:'dm'},'costume'));
 assert.equal(authorizeUpload({userId:'1',role:'dm'},'dm_photo'),'public');
 assert.equal(authorizeUpload({userId:'1',role:'customer'},'report_evidence'),'private');
 const store=new LocalStorage('/tmp/c2-public','/tmp/c2-private');
 await assert.rejects(()=>store.read('../secret','public'));
 assert.throws(()=>new LocalStorage('/tmp/a','/tmp/a/private'));
});

test('pixel limit is enforced during sharp decoding', async()=>{
 const bomb=await sharp({create:{width:6000,height:5000,channels:3,background:'white'}}).png().toBuffer();
 await assert.rejects(()=>processImage(bomb,'image/png','script_cover'));
});
