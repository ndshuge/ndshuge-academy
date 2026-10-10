'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const files=['c.html','calculus.html','chip.html','phys.html','python.html'];
const valid=[
 ['1+2*3',7],['(1+2)*3',9],['2**3',8],['2^3',8],['-2**2',-4],
 ['2**-3',0.125],['-(-5)',5],['Math.sqrt(9)',3],['√(9)',3],
 ['π',Math.PI],['Math.PI',Math.PI],['2×3',6],['4÷2',2],
 ['1e3',1000],['2.5e-2',0.025],[' 1 + 2 ',3],['(2+3)/(2-1)',5],
 ['.5 + .25',0.75],['Math.sqrt(4+5)',3],['3−2',1],[0,0]
];
const invalid=[
 '','[]','[1][0]','{}','(()=>1)()','globalThis','this','process',
 'Math.constructor','1;1','1,2','1+',
 '1/0','√(-1)','5%2','1+(2','2)(', 'foo','2**10000',
 'Math.sqrt.constructor','console.log(1)', '1'.repeat(200),
 '<img onerror=alert(1)>', '1+1\nprocess.exit()'
];
let template;
for(const f of files){
 const s=fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 const a=s.indexOf('function val(x){'),b=s.indexOf('var A=val(a),B=val(b);',a);
 assert(a>=0&&b>a,'grader exists: '+f);
 const source=s.slice(a,b).trim();
 assert(!source.includes('eval('),'eval is absent: '+f);
 assert(!source.includes('Function('),'dynamic Function absent: '+f);
 if(template)assert.equal(source,template,'parser stays in sync: '+f);else template=source;
 const val=new vm.Script('('+source+')',{filename:f}).runInNewContext(Object.create(null),{timeout:1000});
 for(const [input,expected] of valid){
   let value=val(input);
   assert(Math.abs(value-expected)<1e-10,f+': valid '+String(input)+' expected '+expected+' got '+value);
 }
 for(const input of invalid)assert(Number.isNaN(val(input)),f+': must reject '+JSON.stringify(input));
 assert(Number.isNaN(val('('.repeat(100))),f+': bounded recursion');
 console.log('PASS '+f+': '+valid.length+' valid, '+(invalid.length+1)+' invalid/complex inputs');
}
console.log('ALL FIVE ACADEMIES PASS');