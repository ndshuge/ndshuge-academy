/* ============================================================
   芯片学院 · 真实引擎核心（键兼容线上：chip_* 前缀 / daily_goal 全站共享）
   本段替换样张 demo 数据；渲染器与动效 100% 沿用样张。
   ============================================================ */
/* ---------- 工具 ---------- */
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function store(k,v){ try{ localStorage.setItem((k==='sb_session'||k==='profile'?'academy_':'chip_')+k, JSON.stringify(v)); }catch(e){} }
function load(k,d){ try{ var v=JSON.parse(localStorage.getItem((k==='sb_session'||k==='profile'?'academy_':'chip_')+k)); return v===null?d:v; }catch(e){ return d; } }
/* 迷你公式渲染（题干里极少出现；主要防 XSS 与转义） */
function parseMath(s){
  if(s===undefined||s===null) return '';
  return esc(s).replace(/\*\*/g,'^').replace(/(^|[^*])\*([^*]|$)/g,'$1·$2');
}
function numEq(a,b){
  function val(x){
    if(typeof x==='number') return x;
    var s=String(x).replace(/×/g,'*').replace(/√/g,'Math.sqrt(').replace(/π/g,'Math.PI').trim();
    if(/[a-zA-Z]/.test(s.replace(/Math\./g,''))) return NaN;
    try{ return eval(s); }catch(e){ return NaN; }
  }
  var A=val(a),B=val(b);
  if(isNaN(A)||isNaN(B)) return String(a).replace(/\s/g,'').toLowerCase()===String(b).replace(/\s/g,'').toLowerCase();
  return Math.abs(A-B)<1e-6;
}
/* ---------- 每日目标（全站共享键 daily_goal，4:00 为界）：l=学完一章 e=做完一份卷 ---------- */
function todayStr(){ var d=new Date(); if(d.getHours()<4) d.setDate(d.getDate()-1); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function dailyGoal(act){
  try{
    var d=todayStr();
    var g=JSON.parse(localStorage.getItem('daily_goal')||'{}');
    g[d]=g[d]||{}; g[d].chip=g[d].chip||{}; g[d].chip[act]=Date.now();
    localStorage.setItem('daily_goal',JSON.stringify(g));
  }catch(e){}
}
function clearDailyGoal(id){
  try{
    var g=JSON.parse(localStorage.getItem('daily_goal')||'{}'), chg=false;
    Object.keys(g).forEach(function(d){ if(g[d]&&g[d][id]){ delete g[d][id]; chg=true; if(!Object.keys(g[d]).length) delete g[d]; } });
    if(chg) localStorage.setItem('daily_goal',JSON.stringify(g));
  }catch(e){}
}
function acadDaySet(){
  try{
    var g=JSON.parse(localStorage.getItem('daily_goal')||'{}'), out={};
    Object.keys(g).forEach(function(d){ if(g[d]&&Object.keys(g[d]).length) out[d]=1; });
    var leg=load('checkin',[]);
    if(leg&&leg.length) leg.forEach(function(x){ out[x]=1; });
    return out;
  }catch(e){ return {}; }
}
function calcStreak(){
  var set=acadDaySet(), streak=0, d=new Date();
  if(!set[todayStr()]) d.setDate(d.getDate()-1);
  while(set[d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()]){ streak++; d.setDate(d.getDate()-1); }
  return streak;
}
function doCheckin(){ /* 打卡统一走 dailyGoal('l'|'e') */ }
/* ---------- 状态（键与线上一致） ---------- */
function keyOk(k){ var p=String(k).split('_'); if(p.length<2) return false; var c=CHAPTERS[+p[0]-1]; return !!(c&&c.quiz&&c.quiz.length&&p[1]>=0&&p[1]<c.quiz.length); }
function ekeyOk(k){ var p=String(k).split('_'); if(p[0][0]!=='e') return false; var id=+p[0].slice(1); var c=CHAPTERS[id-1]; return !!(c&&c.exam&&p[1]>=0&&p[1]<c.exam.length); }
var chDone = (load('ch',[])||[]).filter(function(x){ return CHAPTERS[x-1]; });
var hallDone = load('hall',[]);
var quizStat = load('quizStat',{});
var quizPick = load('quizPick',{});
var studyLog = load('log',[]);
var settleStore = load('settle',{});
var todayStat = load('tstat',{d:'',done:0,correct:0});
var stat = load('stat',null);
var wrongPool = load('wrong',null);
var fixedPool = load('fixed',[]);
if(wrongPool===null){ wrongPool=[]; Object.keys(quizStat).forEach(function(k){ if(keyOk(k)&&quizStat[k]===0) wrongPool.push(k); }); store('wrong',wrongPool); }
wrongPool=wrongPool.filter(keyOk); fixedPool=fixedPool.filter(keyOk);
function poolMove(key,correct){
  var iw=wrongPool.indexOf(key), ifx=fixedPool.indexOf(key);
  if(correct){ if(iw>-1){ wrongPool.splice(iw,1); fixedPool.push(key); } }
  else { if(ifx>-1){ fixedPool.splice(ifx,1); wrongPool.push(key); } else if(iw===-1){ wrongPool.push(key); } }
  store('wrong',wrongPool); store('fixed',fixedPool);
}
/* 学习足迹：30 分钟内同一章连续活动并作一次 */
function logStudy(type,chId,chTitle){
  var now=Date.now(), _d=new Date(now), _p=function(x){ return (x<10?'0':'')+x; };
  var cat=_d.getFullYear()+'-'+_p(_d.getMonth()+1)+'-'+_p(_d.getDate())+' '+_p(_d.getHours())+':'+_p(_d.getMinutes())+':'+_p(_d.getSeconds());
  var last=studyLog.length?studyLog[studyLog.length-1]:null;
  if(last&&now-last.end<30*60*1000&&last.ch===chId){ last.end=now; last.completed_at=cat; last.quizN=(last.quizN||0)+1; }
  else studyLog.push({start:now,end:now,ch:chId,title:chTitle,lessonN:0,quizN:type==='quiz'?1:0,completed_at:cat});
  if(studyLog.length>3000) studyLog=studyLog.slice(-3000);
  store('log',studyLog);
}
function sessionAcc(qs){ var c2=0,n=0; qs.forEach(function(k){ var v=quizStat[k]; if(v!==undefined){ n++; if(v===1) c2++; } }); return n?Math.round(c2/n*100):null; }
function sessionLog(ty,c,key,ok){
  var now=Date.now();
  var last=studyLog.length?studyLog[studyLog.length-1]:null;
  if(last&&last.questions&&last.ty===ty&&last.ch===c.id&&(now-last.end)<30*60*1000){
    if(last.questions.indexOf(key)===-1) last.questions.push(key);
    last.end=now; last.ms=last.end-last.start; last.acc=sessionAcc(last.questions);
  } else {
    studyLog.push({ty:ty,ch:c.id,title:c.title,questions:[key],start:now,end:now,ms:0,acc:null});
    if(studyLog.length>3000) studyLog=studyLog.slice(-3000);
  }
  store('log',studyLog);
}
/* ---------- 章节进度 ---------- */
function chIsDone(c){ return chDone.indexOf(c.id)>-1; }
function chQuizCount(c){ return c.quiz?c.quiz.length:0; }
function chQuizDone(c){ var n=0; if(c.quiz) c.quiz.forEach(function(q,i){ if(quizStat[c.id+'_'+i]!==undefined) n++; }); return n; }
function chCorrect(c){ var n=0; if(c.quiz) c.quiz.forEach(function(q,i){ if(quizStat[c.id+'_'+i]===1) n++; }); return n; }
function chSummary(c){ var a=chQuizDone(c), t=chQuizCount(c); return {answered:a,total:t,correct:chCorrect(c),allDone:t>0&&a>=t,allCorrect:a>0&&chCorrect(c)>=t&&a>=t}; }
function nextChapter(){ for(var i=0;i<CHAPTERS.length;i++){ if(!chIsDone(CHAPTERS[i])) return CHAPTERS[i]; } return null; }
/* ---------- 卷状态 ---------- */
function examStatus(c){
  if(!c.exam||!c.exam.length) return {answered:0,correct:0,full:false,total:0};
  var answered=0,correct=0;
  c.exam.forEach(function(q,i){ var st=quizStat['e'+c.id+'_'+i]; if(st!==undefined){ answered++; if(st===1) correct++; } });
  return {answered:answered,correct:correct,full:answered>=c.exam.length,total:c.exam.length};
}
/* ---------- 称号 / 徽章 / 统计 ---------- */
var RANKS=[[0,'初入晶圆厂'],[10,'材料学徒'],[18,'开关手'],[25,'集成匠'],[32,'光刻学徒'],[40,'代工学徒'],[48,'海峡观察员'],[58,'断供老兵'],[70,'芯片战争史官'],[85,'晶圆领主'],[100,'芯片传人']];
function curRank(pct){
  var name=RANKS[0][1],next=null,nextAt=null;
  for(var i=0;i<RANKS.length;i++){ if(pct>=RANKS[i][0]){ name=RANKS[i][1]; nextAt=(i+1<RANKS.length)?RANKS[i+1][0]:null; next=(i+1<RANKS.length)?RANKS[i+1][1]:null; } }
  return {name:name,next:next,nextAt:nextAt,remain:nextAt!==null?(nextAt-pct):0};
}
function calcStats(){
  var totalC=CHAPTERS.length;
  var doneC=chDone.length;
  var examTotal=CHAPTERS.filter(function(c){ return c.exam&&c.exam.length; }).length;
  var examFull=CHAPTERS.filter(function(c){ return c.exam&&c.exam.length&&examStatus(c).full; }).length;
  var wrongN=fixedPool.length+wrongPool.length;
  var base=doneC/totalC*0.5+(examTotal?examFull/examTotal*0.3:0);
  var pct;
  if(wrongN){ pct=Math.round((base+fixedPool.length/wrongN*0.2)*100); }
  else { pct=Math.round(base/0.8*100); }
  return {doneC:doneC,totalC:totalC,examTotal:examTotal,examFull:examFull,wrongN:wrongN,fixedPool:fixedPool.length,wrongPool:wrongPool.length,pct:Math.min(100,pct),studyCount:studyLog.length};
}
var BADGES=[
  {n:'材料学徒',d:'完成第一部分 · 达第 5 章',c:function(s){ return s.doneC>=5; }},
  {n:'开关手',d:'完成第二部分 · 达第 10 章',c:function(s){ return s.doneC>=10; }},
  {n:'集成匠',d:'完成第三部分 · 达第 15 章',c:function(s){ return s.doneC>=15; }},
  {n:'起飞乘客',d:'完成第四部分 · 达第 20 章',c:function(s){ return s.doneC>=20; }},
  {n:'光刻学徒',d:'完成第五部分 · 达第 25 章',c:function(s){ return s.doneC>=25; }},
  {n:'代工学徒',d:'完成第六部分 · 达第 30 章',c:function(s){ return s.doneC>=30; }},
  {n:'断供老兵',d:'完成第七部分 · 达第 35 章',c:function(s){ return s.doneC>=35; }},
  {n:'芯片史官',d:'完成第八部分 · 全书 36 章通关',c:function(s){ return s.doneC>=36; }},
  {n:'卷子初满',d:'任意一章小卷已做（答完即结算）',c:function(s){ return s.examFull>=1; }},
  {n:'卷子全满',d:'全部小卷已做',c:function(s){ return s.examTotal>0&&s.examFull>=s.examTotal; }},
  {n:'错题清零',d:'错题全部订正',c:function(s){ return s.wrongPool===0&&s.fixedPool>0; }},
  {n:'学习启航',d:'累计学习 5 次',c:function(s){ return s.studyCount>=5; }},
  {n:'今日打卡',d:'今日完成一章练习或一份卷（四院共通）',c:function(s){ try{ var g=JSON.parse(localStorage.getItem('daily_goal')||'{}'); var d0=g[todayStr()]; return !!(d0&&d0.chip&&(d0.chip.l||d0.chip.e)); }catch(e){ return false; } }},
  {n:'毕业学士',d:'全册通关（全书章节全通）',c:function(s){ return s.doneC>=s.totalC; }}
];
function badgeState(s){ return BADGES.map(function(b){ return {n:b.n,d:b.d,got:b.c(s)}; }); }
/* ---------- 今日答题统计 ---------- */
function statTodayKey(){ return new Date().toDateString(); }
function initStat(){
  var k=statTodayKey();
  if(!stat||stat.day!==k){
    var base=stat||{};
    stat={ totalQ:base.totalQ||0,totalCorrect:base.totalCorrect||0,totalMs:base.totalMs||0,
      todayQ:0,todayCorrect:0,todayMs:0,todayReal:0,accQ:0,accC:0,day:k };
  }
  if(!stat._migrated){
    var qkeys=Object.keys(quizStat||{});
    stat.totalQ=qkeys.length; stat.accQ=qkeys.length;
    var cc=0; qkeys.forEach(function(kk){ if(quizStat[kk]===1) cc++; });
    stat.accC=cc; stat.totalCorrect=cc; stat._migrated=true;
  }
  storeStat();
}
function storeStat(){ store('stat',stat); }
function statRecordQ(ok){
  if(!stat) return;
  stat.totalQ++; stat.todayQ++; stat.todayReal++; stat.accQ++;
  if(ok) stat.accC++;
  if(ok){ stat.totalCorrect++; stat.todayCorrect++; }
  storeStat();
}
function todayRecord(ok){
  var d=new Date().toDateString();
  if(todayStat.d!==d){ todayStat={d:d,done:0,correct:0}; }
  todayStat.done++; if(ok) todayStat.correct++;
  store('tstat',todayStat);
}
function studyTimerEnter(){ if(window._studyStart===null||window._studyStart===undefined) window._studyStart=Date.now(); }
function studyTimerLeave(){
  if(window._studyStart){ if(stat){ stat.totalMs+=Date.now()-window._studyStart; stat.todayMs+=Date.now()-window._studyStart; storeStat(); } window._studyStart=null; }
}
/* ---------- 作答主流程（写库语义与线上一致） ---------- */
function answerQuestion(c,i,oi){
  var q=c.quiz[i], k=c.id+'_'+i;
  var ok = q.type==='fill' ? (q.accept||[]).some(function(a){ return numEq(a,oi); }) : (oi===q.answer);
  quizPick[k]=oi; store('quizPick',quizPick);
  quizStat[k]=ok?1:0; store('quizStat',quizStat);
  poolMove(k,ok);
  todayRecord(ok);
  statRecordQ(ok);
  if(hallDone.indexOf(k)===-1){ hallDone.push(k); store('hall',hallDone); }
  logStudy('quiz',c.id,c.title);
  sessionLog('lesson',c,k,ok);
  return ok;
}
function answerVol(c,i,oi){
  var q=c.exam[i], k='e'+c.id+'_'+i;
  var ok = q.type==='fill' ? (q.accept||[]).some(function(a){ return numEq(a,oi); }) : (oi===q.answer);
  quizPick[k]=oi; store('quizPick',quizPick);
  quizStat[k]=ok?1:0; store('quizStat',quizStat);
  poolMove(k,ok);
  todayRecord(ok); statRecordQ(ok);
  logStudy('quiz',c.id,c.title);
  return ok;
}
/* ---------- 结算：全答即通过（不要求全对），首次点亮打卡与完成 ---------- */
function settleChapter(c, mode){
  var sm=chSummary(c);
  if(!sm.allDone){ toast('还有 '+(sm.total-sm.answered)+' 题没做完，做完才能结算'); return false; }
  var first = chDone.indexOf(c.id)===-1;
  if(first){
    chDone.push(c.id); store('ch',chDone);
    dailyGoal('l');
    settleStore['settle_'+c.id]={ts:Date.now(),pct:Math.round(sm.correct/sm.total*100),allCorrect:sm.allCorrect};
    store('settle',settleStore);
    stopTimer();
    $('#cTitle').textContent='第 '+c.id+' 章完成！';
    $('#cSub').textContent=(sm.allCorrect?'随堂全对通关 · ':'答完即结算 · ')+'今日打卡 +1';
    $('#celebrate').classList.add('show');
    tap();
    return true;
  }
  toast('本章已结算过，可去下一章');
  return false;
}
function settleVol(c){
  var st=examStatus(c);
  if(!st.full){ toast('还有 '+(st.total-st.answered)+' 题没做完'); return false; }
  var k='vol_'+c.id;
  var first = !settleStore[k];
  if(first){
    dailyGoal('e');
    settleStore[k]={ts:Date.now(),correct:st.correct};
    store('settle',settleStore);
    stopTimer();
    $('#cTitle').textContent='第 '+c.id+' 章小卷完成！';
    $('#cSub').textContent='卷子已点亮 · 今日打卡 +1';
    $('#celebrate').classList.add('show');
    tap();
    return true;
  }
  toast('这份卷子已结算过');
  return false;
}
/* ---------- 清除（游客初始态） ---------- */
function wipeAll(){
  ['ch','hall','quizStat','quizPick','log','settle','tstat','stat','wrong','fixed','checkin','navfold','sidefold'].forEach(function(k){ try{ localStorage.removeItem('chip_'+k); }catch(e){} });
  clearDailyGoal('chip');
}
/* 从历史 quizStat 归位错题池（进入练习页时兜底一次） */
function resyncWrong(){
  Object.keys(quizStat).forEach(function(k){
    if(keyOk(k)&&quizStat[k]===0&&wrongPool.indexOf(k)===-1) wrongPool.push(k);
    if(keyOk(k)&&quizStat[k]===1&&fixedPool.indexOf(k)===-1&&wrongPool.indexOf(k)>-1) poolMove(k,true);
  });
  store('wrong',wrongPool); store('fixed',fixedPool);
}
