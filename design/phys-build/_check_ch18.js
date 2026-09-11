const fs = require('fs');
const p = 'E:/Hanako/学习计划/四学院/design/phys-build/content/phys-ch18.js';
const src = fs.readFileSync(p, 'utf8');

const issues = [];
if (src.includes('**')) issues.push('出现 markdown 加粗 **');
const starCount = (src.match(/\*/g) || []).length;
if (starCount) issues.push('出现裸露星号 x' + starCount);

let CH18;
try { eval(src.replace('var CH18', 'CH18')); } catch (e) { issues.push('解析失败: ' + e.message); }

const out = [];
out.push('id=' + CH18.id + ' no=' + CH18.no + ' title=' + CH18.title + ' weeks=' + CH18.weeks + ' diff=' + CH18.diff);
out.push('sections=' + CH18.sections.length + ' traps=' + CH18.traps.length + ' map=' + CH18.map.length + ' keys=' + CH18.dialogue.keys.length);
out.push('quiz=' + CH18.quiz.length + ' exam=' + CH18.exam.length);

const dist = [0,0,0,0];
const all = CH18.quiz.concat(CH18.exam);
all.forEach((q, i) => {
  if (q.options.length !== 4) issues.push('第' + (i+1) + '题选项数=' + q.options.length);
  if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) issues.push('第' + (i+1) + '题 answer 越界');
  else dist[q.answer]++;
  const ex = q.explain.length;
  if (ex < 60 || ex > 160) issues.push('第' + (i+1) + '题 explain 长度=' + ex);
});
out.push('answer 分布 0/1/2/3 = ' + dist.join('/'));

function norm(s){ return s.replace(/[\s，。：；？、（）()]/g,''); }
for (let i=0;i<CH18.quiz.length;i++){
  for (let j=0;j<CH18.exam.length;j++){
    if (norm(CH18.quiz[i].q) === norm(CH18.exam[j].q)) issues.push('quiz'+(i+1)+' 与 exam'+(j+1)+' 题干相同');
  }
}

const rawStrings = src.match(/"(?:[^"\\]|\\.)*"/g) || [];
rawStrings.forEach(s => {
  const body = s.slice(1,-1);
  if (body.includes('"')) issues.push('字符串内部含英文双引号');
});

out.push('fact=' + CH18.story.fact.length + ' story=' + CH18.story.story.length);
out.push('sections p=' + CH18.sections.map(s=>s.p.length).join(','));
out.push('example.s=' + CH18.example.s.length + ' model=' + CH18.dialogue.model.length);
out.push('末尾=' + JSON.stringify(src.trim().slice(-2)));

console.log('===== 结构 =====');
console.log(out.join('\n'));
console.log('===== issues =====');
console.log(issues.length ? issues.join('\n') : '无');
