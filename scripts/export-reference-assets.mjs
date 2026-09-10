import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';
const files=['assets/shisanwu-logo.jpg','assets/wugang-laixin-cover.svg','43947e6d13429e6e24ef2f82a3ac0265.jpg'];const data={};
for(const name of files){const bytes=fs.readFileSync(path.join('设计网站落地页',name));data[name]=bytes.toString('base64');const dest=path.join('public',name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);}
console.log(zlib.gzipSync(JSON.stringify(data)).toString('base64'));
