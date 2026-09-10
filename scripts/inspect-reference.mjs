import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const source = path.resolve('设计网站落地页');
const target = path.resolve('temp');
if (!fs.existsSync(target)) fs.cpSync(source, target, {recursive:true,filter:(file)=>path.basename(file).toLowerCase() !== 'nul'});
const formatted=path.join(target,'_formatted');fs.mkdirSync(formatted,{recursive:true});
const files={};
for (const name of fs.readdirSync(source)) {
 if (!/\.(html|md|json)$/.test(name)) continue;
 const content=fs.readFileSync(path.join(source,name),'utf8');files[name]=content;
 if(name.endsWith('.html'))fs.writeFileSync(path.join(formatted,name),content.replace(/></g,'>\n<').replace(/}/g,'}\n'));
}
console.log(zlib.gzipSync(JSON.stringify(files)).toString('base64'));
