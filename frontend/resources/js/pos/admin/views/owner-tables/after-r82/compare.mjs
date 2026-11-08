import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { PNG } from 'pngjs';

const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const before=path.join(os.tmpdir(),'food-pos-r82-c-tables-before');
const after=path.join(os.tmpdir(),'food-pos-r82-c-tables-after');
const baselineExpected={
'manifest.json':'1fc84f0c5ead36f379c284d5a687794aea0b6b47979bb248ad34a6e565a42458',
'edge-manifest.json':'e4cf963d7a3968f3ccec2939bf3c2d5d4f497b3f6f025043f5c58f2f1793df2e',
'index.json':'496814b9e415c4663b86a18eb61b06e277267c691917e69a74dbe2d8fe79dee6'
};
for(const [name,h] of Object.entries(baselineExpected)){
if(sha(fs.readFileSync(path.join(before,name)))!==h)throw Error('BEFORE manifest drift '+name);
}
const B=JSON.parse(fs.readFileSync(path.join(before,'index.json')));
const A1=JSON.parse(fs.readFileSync(path.join(after,'manifest.json')));
const A2=JSON.parse(fs.readFileSync(path.join(after,'edge-manifest.json')));
const refs=[...A1.screenshots,...A2.screenshots];
if(refs.length!==44||B.screenshots.length!==44)throw Error('Missing 44 PNG pairs');
const map=new Map(refs.map(x=>[x.filename,x]));
const pairs=[];
for(const old of B.screenshots){
const curr=map.get(old.filename);
if(!curr)throw Error('AFTER missing '+old.filename);
const bp=fs.readFileSync(path.join(before,old.filename)),ap=fs.readFileSync(path.join(after,curr.filename));
if(sha(bp)!==old.sha256||sha(ap)!==curr.sha256)throw Error('PNG SHA drift '+old.filename);
const b=PNG.sync.read(bp),a=PNG.sync.read(ap);
if(b.width!==a.width||b.height!==a.height||a.width!==curr.width||a.height!==900)throw Error('dimensions mismatch '+old.filename);
let pixels=0,bounds={left:b.width,top:b.height,right:-1,bottom:-1},maxChannelDelta=0,totalChannelDelta=0;
for(let p=0;p<a.data.length;p+=4){
const d0=Math.abs(a.data[p]-b.data[p]),d1=Math.abs(a.data[p+1]-b.data[p+1]),d2=Math.abs(a.data[p+2]-b.data[p+2]),d3=Math.abs(a.data[p+3]-b.data[p+3]);const max=Math.max(d0,d1,d2,d3);
if(max){
pixels++;const k=p/4,x=k%a.width,y=Math.floor(k/a.width);
bounds.left=Math.min(bounds.left,x);bounds.top=Math.min(bounds.top,y);bounds.right=Math.max(bounds.right,x);bounds.bottom=Math.max(bounds.bottom,y);
maxChannelDelta=Math.max(maxChannelDelta,max);
totalChannelDelta+=d0+d1+d2+d3;
}}
pairs.push({file:old.filename,width:old.width,state:old.state,beforeSha:old.sha256,afterSha:curr.sha256,shaEqual:old.sha256===curr.sha256,changedPixels:pixels,totalPixels:a.width*a.height,boundingBox:pixels?bounds:null,maxChannelDelta,sumChannelDelta:totalChannelDelta,beforeOverflow:old.metrics.overflow,afterOverflow:curr.metrics.overflow,beforePageErrors:old.pageErrors.length,afterPageErrors:curr.pageErrors.length,beforeConsoleErrors:old.consoleErrors.length,afterConsoleErrors:curr.consoleErrors.length});
}
const counts={exactSha:pairs.filter(x=>x.shaEqual).length,exactRgba:pairs.filter(x=>x.changedPixels===0).length,changed:pairs.filter(x=>x.changedPixels>0).length,maxDelta:Math.max(...pairs.map(x=>x.maxChannelDelta)),totalChangedPixels:pairs.reduce((s,x)=>s+x.changedPixels,0)};
const diff={schema:'r82-after-full-rgba-comparison-v1',generatedAt:new Date().toISOString(),beforeManifestHashes:baselineExpected,afterManifestHashes:{'manifest.json':sha(fs.readFileSync(path.join(after,'manifest.json'))),'edge-manifest.json':sha(fs.readFileSync(path.join(after,'edge-manifest.json')))},beforeCompiledCss:B.manifestFiles[0].cssFingerprint,afterCompiledCss:[A1.compiledCss.sha256,A2.compiledCss.sha256],counts,pairs};
fs.writeFileSync(path.join(after,'full-pixel-comparison.json'),JSON.stringify(diff,null,2));
console.log('FULL_RGBA',JSON.stringify({...counts,comparisonSha:sha(fs.readFileSync(path.join(after,'full-pixel-comparison.json'))),topChanged:pairs.filter(x=>x.changedPixels).sort((a,b)=>b.changedPixels-a.changedPixels).slice(0,14).map(x=>({file:x.file,changedPixels:x.changedPixels,maxChannelDelta:x.maxChannelDelta,box:x.boundingBox})),allChanged:pairs.filter(x=>x.changedPixels).map(x=>({file:x.file,pixels:x.changedPixels,delta:x.maxChannelDelta}))}));
