const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);}
const pages=walk('public').filter(f=>f.endsWith('.html'));
for(const f of pages){const s=fs.readFileSync(f,'utf8');assert.match(s,/<head>[\s\S]*?<meta name="google-adsense-account" content="ca-pub-6781139210059469">[\s\S]*?<\/head>/,f);assert.doesNotMatch(s,/published industry RPM ranges|free for any use|typical fair use|Every Category Compared|meaningfully raises revenue/i,f);assert.doesNotMatch(s,/pagead2.googlesyndication.com\/pagead\/js\/adsbygoogle.js/,f);}
assert.match(fs.readFileSync('public/terms.html','utf8'),/illustrative estimates from unverified RPM assumptions/);
assert.match(fs.readFileSync('public/thumbnail-backgrounds.html','utf8'),/cannot do is resell or redistribute/);
console.log('Readiness checks passed for '+pages.length+' pages');
