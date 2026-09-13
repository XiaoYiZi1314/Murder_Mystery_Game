import sharp from 'sharp';
import { unprocessable } from '../http/errors';
export const MAX_IMAGE_BYTES=5*1024*1024;
export async function processImage(input:Buffer,mime:string,purpose:string) {
 if(!input.length||input.length>MAX_IMAGE_BYTES)throw unprocessable('图片大小必须为 1 字节至 5MB');
 const format = input.subarray(0,3).equals(Buffer.from([255,216,255]))?'jpeg':
  input.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':
  input.toString('ascii',0,4)==='RIFF'&&input.toString('ascii',8,12)==='WEBP'?'webp':null;
 if(!format||mime!==`image/${format}`)throw unprocessable('仅接收 MIME 与签名一致的 JPEG、PNG、WebP');
 try {
  const decoder=sharp(input,{limitInputPixels:24_000_000,failOn:'warning'});
  const meta=await decoder.metadata();
  if(meta.format!==format||(meta.pages??1)>1)throw new Error('Unsupported image');
  const size=purpose==='script_character'?{width:900,height:1200}:purpose==='dm_photo'?{width:1200,height:1500}:{width:1600,height:1600};
  const out=await decoder.rotate().resize({...size,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toBuffer({resolveWithObject:true});
  const thumbnail=await sharp(out.data).resize({width:480,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:80}).toBuffer();
  return {bytes:out.data,thumbnail,width:out.info.width,height:out.info.height};
 }catch{throw unprocessable('图片损坏、像素超限或无法解码');}
}
