const d=JSON.parse(require('fs').readFileSync('detect.json','utf8'));const n=d.filter(x=>!x.advisory);
const g={};n.forEach(x=>{const k=x.antipattern+' | '+x.file.split(/[\/]/).slice(-2).join('/')+' | '+x.snippet.slice(0,120);g[k]=(g[k]||0)+1});
console.log(n.length,d.length);Object.entries(g).forEach(([k,v])=>console.log(v,k));
