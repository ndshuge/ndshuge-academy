/* ============================================================
   渲染器与页面逻辑（真实版）：页面结构/组件/动效沿用样张，数据全真
   ============================================================ */
/* ---------- 导航覆盖：支持带参页面 ---------- */
var META={
  home:{n:'首页',tab:'learn'},plan:{n:'章节课堂',tab:'learn'},chapter:{n:'',tab:'learn'},
  hall:{n:'练习大厅',tab:'drill'},vol:{n:'小卷',tab:'drill'},exam:{n:'',tab:'drill'},
  wrong:{n:'错题集',tab:'drill'},fixed:{n:'已订正',tab:'drill'},
  mine:{n:'我的',tab:'mine'},rank:{n:'排行榜',tab:'mine'},calendar:{n:'打卡日历',tab:'mine'},
  honor:{n:'荣誉墙',tab:'mine'},lab:{n:'实验室',tab:'mine'},about:{n:'关于学院',tab:'mine'},manage:{n:'管理',tab:'mine'},author:{n:'作者与幕后',tab:'mine'}
};
var _lastNav={};
function chById(id){ return CHAPTERS[id-1]; }
var _swapBusy = false; /* 兼容旧调用遗留 */
/* ============================================================
   页面切换动效 = apple-ui-动效实验室 同款（class push/pushBack）
   其余机制不变（导航栈/参数页/守卫/主题）
   ============================================================ */
function renderView(id,isBack){
  var html=renderers[id]?renderers[id]():'<div class="cap">页面不存在</div>';
  var m=META[id]||{n:'微积分学院'};
  var nn=m.n;
  if(id==='chapter'){ var cc=chById(_lastNav.chapter||1); nn=cc?('第 '+cc.id+' 章 · '+cc.title):'章节'; }
  if(id==='exam'){ var ec=chById(_lastNav.exam||1); nn=ec?('第 '+ec.id+' 章 · 小卷'):'小卷'; }
  var v=view;
  v.className='view '+((isBack)?'pushBack':'push');
  v.innerHTML=html;
  scroller.scrollTop=0;
  $('#brandName').textContent=nn;
  var prev=STACK.length?STACK[STACK.length-1]:null;
  if(prev&&META[prev]){ $('#backTxt').textContent=META[prev].n; $('#btnBack').disabled=false; }
  else { $('#backTxt').textContent='返回'; $('#btnBack').disabled=true; }
  window._cur=id;
  paintDock(id);
  setTimeout(function(){ if(v.className.indexOf('push')>=0) v.className='view'; },430);
}
var _navLock=false;
function go(id,p,kind){
  if(_navLock){ return; }
  _navLock=true;
  setTimeout(function(){ _navLock=false; },380);
  if(window._cur===id){ if(p!==undefined) _lastNav[id]=p; return; }
  STACK.push(window._cur||'home');
  if(p!==undefined) _lastNav[id]=p;
  history.pushState({view:id},'');
  renderView(id,false);
}
function goBack(){ if(!STACK.length){ toast('已经在最前面了'); return; } history.back(); }
/* 计时离开守卫 */
function requestNav(action){
  if(window._cur==='chapter'&&timerRunning||window._cur==='exam'&&timerRunning){
    leaveAfter=action;
    $('#confirmMsg').textContent='学习计时还没结束。现在出去本次作答进度已保存，下次进入可继续。';
    $('#confirmBox').classList.add('show');
    return;
  }
  action();
}
function dismissConfirm(){ leaveAfter=null; $('#confirmBox').classList.remove('show'); }
$('#confirmStay').addEventListener('click',dismissConfirm);
$('#confirmLeave').addEventListener('click',function(){ dismissConfirm(); stopTimer(); if(leaveAfter){ var f=leaveAfter; leaveAfter=null; f(); } });
function guardedBack(){ requestNav(function(){ goBack(); }); }
var leaveAfter=null,timerRunning=false;
/* ---------- 倒计时（30 分钟，可挂后台） ---------- */
var TIMER=30*60,timerLeft=TIMER,timerIv=null;
function fmtTime(s){ var m=Math.floor(s/60),r=s%60; return (m<10?'0':'')+m+':'+(r<10?'0':'')+r; }
function startTimer(){
  if(timerIv) return;
  timerLeft=TIMER;
  $('#timerBar').style.display='block';
  $('#timerChip').style.display='flex';
  $('#timerChip').classList.remove('out');
  updateTimerUI();
  timerIv=setInterval(function(){
    timerLeft--; updateTimerUI();
    if(timerLeft<=0){ stopTimer(); toast('30 分钟到，可继续作答，只是不再计时'); }
  },1000);
}
function stopTimer(){
  clearInterval(timerIv); timerIv=null; timerRunning=false;
  $('#timerBar').style.display='none';
  $('#timerChip').classList.add('out');
  setTimeout(function(){ $('#timerChip').style.display='none'; },260);
}
function updateTimerUI(){
  timerRunning=true;
  var el=$('#timerChip');
  el.innerHTML='<span class="tdot"></span>'+fmtTime(timerLeft);
  el.classList.toggle('warn',timerLeft<5*60);
  $('#timerBar i').style.width=(timerLeft/TIMER*100)+'%';
}
document.addEventListener('visibilitychange',function(){
  if(document.hidden&&timerIv){ clearInterval(timerIv); timerIv=null; }
  else if(!document.hidden&&(window._cur==='chapter'||window._cur==='exam')&&timerRunning&&!timerIv){
    timerIv=setInterval(function(){ timerLeft--; updateTimerUI(); if(timerLeft<=0){ stopTimer(); } },1000);
  }
});
/* ---------- 渲染器 ---------- */
var renderers={};

/* ============ 学习 Tab · 主页 ============ */
renderers.home=function(){
  var s=calcStats(), rk=curRank(s.pct), streak=calcStreak();
  var nc=nextChapter();
  var h='<div class="kick">CALCULUS</div><div class="h1">微积分学院</div>'
    +'<div class="sub">大一高数 · 极限导数积分 · 进度 '+s.doneC+'/'+s.totalC+' 章</div>';
  var GEO='<svg viewBox="0 0 96 96" aria-hidden="true"><g class="geo-line"><rect x="28" y="28" width="40" height="40" rx="6"/><rect x="40" y="40" width="16" height="16" rx="3"/><path d="M40 28V20M56 28V20M40 76v-8M56 76v-8M28 40h-8M28 56h-8M68 40h8M68 56h8"/></g><circle class="geo-dot" cx="48" cy="15" r="2.6"/><circle class="geo-dot" cx="81" cy="48" r="2.6"/><circle class="geo-dot" cx="48" cy="81" r="2.4" opacity=".35"/></svg>';
  if(nc){
    h+='<div class="hero-card"><div class="deco">'+GEO+'</div>'
      +'<span class="hk">NEXT · 下一站</span>'
      +'<b class="next">第 '+nc.id+' 章 · '+esc(nc.title)+'<br>'+esc(nc.motto||'打开讲义，做题点亮')+'</b>'
      +'<div class="foot"><span class="pill gold">🔥 '+streak+' 天连签</span>'
      +'<button class="btn-go" data-go-ch="'+nc.id+'">继续读'+IC('arrow-r')+'</button></div></div>';
  } else {
    h+='<div class="hero-card"><div class="deco">'+GEO+'</div>'
      +'<span class="hk">ALL CLEAR · 全书通关</span>'
      +'<b class="next">36 章全部点亮。去荣誉墙领你的毕业称号。</b>'
      +'<div class="foot"><span class="pill green">'+IC('check')+' 章节全通</span>'
      +'<button class="btn-go" data-go="honor">荣誉墙'+IC('arrow-r')+'</button></div></div>';
  }
  h+='<button class="big-entry lift" data-go="plan"><span class="be-ico" style="background:linear-gradient(135deg,#0A84FF,#5E5CE6)">'+IC('bookopen')+'</span>'
    +'<span class="be-body"><b>章节课堂</b>'
    +'<span class="cap">整本讲义 + 随堂题，答完即点亮</span>'
    +'<span class="be-meta"><span class="pill blue">已学 '+s.doneC+' / '+s.totalC+' 章</span></span></span>'
    +'<span class="be-arrow">'+IC('chev-r')+'</span></button>';
  h+='<div class="tutor-card"><img class="tutor-photo" alt="导读人" src="TUTOR_IMG_PLACEHOLDER">'
    +'<div class="tutor-body"><div class="tutor-cap">导读人 · 莱布尼茨</div>'
    +'<div class="tutor-quote">'+pick(TUTOR_QUOTES)+'</div>'
    +'<div class="tutor-name">现代数学的奠基心智 · 无限逼近的思想家</div></div></div>';
  return h;
};
var TUTOR_QUOTES=[
  '「函数是变化的规则，微积分是变化本身的语言。」',
  '「一条曲线，一段斜率，无限逼近，这就是积分的呼吸。」',
  '「先会算，再问为什么；先求导，再问去哪里。」',
  '「极限不是终点，是到达终点的过程。」',
  '「每一个导数都在问：此刻你变化得多快？」',
  '「从变化率到累积量，微积分让动态世界可被书写。」'
];

/* ============ 学习 Tab · 章节课堂（36 章书架） ============ */
renderers.plan=function(){
  var s=calcStats();
  var h='<div class="kick">ROADMAP</div><div class="h1">章节课堂</div>'
    +'<div class="sub">三十六章就是半导体七十年。每章讲义 + 随堂 10 题，答完即结算点亮。已学 '+s.doneC+'/'+s.totalC+'。</div>';
  CHAPTERS.forEach(function(c){
    var done=chIsDone(c);
    var sm=chSummary(c);
    var cap;
    if(done) cap='已学完'+(sm.allCorrect?' · 全对通关':' · 答完即结算');
    else cap=sm.answered>0?('进行中 '+sm.answered+'/'+sm.total+' 题 · 继续 →'):(c.full?'讲义已授 · 待开卷':'待米勒开讲');
    h+='<button class="ch-row'+(done?' done':'')+'" data-go-ch="'+c.id+'">'
      +'<span class="ch-num">'+(done?IC('check'):c.id)+'</span>'
      +'<span class="ch-body"><b>第 '+c.id+' 章 · '+esc(c.title)+'</b>'
      +'<span class="cap">'+cap+' · '+esc(c.weeks||'')+'</span></span>'
      +'<span class="chev">'+IC('chev-r')+'</span></button>';
  });
  return h;
};

/* ============ 学习 Tab · 章节学习（讲义 + 随堂题 + 计时 + 结算） ============ */
function chapterHTML(c,mode){
  var sm=chSummary(c), settled=chIsDone(c);
  var isLesson=mode==='lesson';
  var h='<div class="kick">LESSON '+('0'+c.id).slice(-2)+'</div><div class="h1">'+esc(c.title)+'</div>'
    +'<div class="sub">随堂 '+sm.total+' 题'+(isLesson?' · 30 分钟参考计时 · 答完自动结算点亮打卡':' · 刷题模式：做完即存，可反复重做')+' · 已答 '+sm.answered+'/'+sm.total+'</div>';
  if(settled) h+='<div class="pill green" style="margin-bottom:10px">'+IC('check')+' 本章已点亮 · 可随时回来重做</div>';
  h+='<div class="card" style="border-radius:var(--r-l)"><div class="lesson-body">';
  h+='<div class="quote-box">'+esc(c.motto||'')+(c.mottoWho?'<span class="who" style="display:block;font-size:13px;opacity:.8;margin-top:6px">—— '+esc(c.mottoWho)+'</span>':'')+'</div>';
  (c.sections||[]).forEach(function(sec){
    h+='<p><b style="color:var(--accent)">'+esc(sec.t)+'</b></p><p>'+esc(sec.p)+'</p>';
    if(sec.formula) h+='<div class="q-formula">'+parseMath(sec.formula)+'</div>'; else if(sec.code) h+='<pre class="q-code">'+esc(sec.code)+'</pre>';
  });
  if(c.story){
    h+='<div style="background:var(--gold-soft);border-radius:12px;padding:13px 16px;margin-top:14px;font-size:15px;line-height:1.8">'
      +'<b style="color:#C93400">芯片史话 · '+esc(c.story.tutor||'')+'</b><div style="color:var(--ink2)">'+esc(c.story.story||c.story.fact||'')+'</div></div>';
  }
  if(c.example){
    h+='<details style="margin-top:14px"><summary style="cursor:pointer;color:var(--accent);font-weight:700">例题 · 先试做，再对照米勒的思路</summary>'
      +'<div style="margin-top:8px"><b>'+esc(c.example.q)+'</b>'
      +'<div style="background:var(--fill-soft);border-radius:10px;padding:11px 14px;margin-top:8px;font-size:14.5px;line-height:1.8;color:var(--ink2)">'+esc(c.example.s)+'</div></div></details>';
  }
  if(c.traps&&c.traps.length){
    h+='<details style="margin-top:12px"><summary style="cursor:pointer;color:var(--red);font-weight:700">易错陷阱</summary>'
      +'<ul style="margin:8px 0 0 18px;font-size:14.5px;color:var(--ink2);line-height:1.8">'
      +c.traps.map(function(t){ return '<li>'+esc(t)+'</li>'; }).join('')+'</ul></details>';
  }
  h+='</div></div>';
  h+=quizCardsHTML(c,mode);
  if(sm.allDone&&!settled){
    h+='<div style="margin-top:14px;text-align:center"><button class="btn-go" data-settle="'+c.id+'" style="margin:0">'+IC('check')+' 结算本章</button></div>';
  }
  return h;
}
function quizCardsHTML(c,mode){
  var h='';
  (c.quiz||[]).forEach(function(q,qi){
    var k=c.id+'_'+qi;
    var hist=(mode!=='drill')?(quizStat[k]):undefined;
    h+='<div class="card" style="border-radius:var(--r-l);margin-top:14px">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span class="pill blue">随堂 '+(qi+1)+'</span>'
      +'<span class="cap">'+(q.type==='fill'?'填空':'单选')+' · 答完锁存'+(hist!==undefined?(hist===1?' · 你答对过':' · 上次答错'):'')+'</span></div>'
      +'<div class="q-stem">'+parseMath(q.q)+'</div><div id="qbox'+qi+'" data-k="'+k+'">';
    var keys=q.type==='fill'?'':['A','B','C','D'].slice(0,(q.options||[]).length).join('|');
    if(q.type==='fill'){
      h+='<div style="display:flex;gap:8px;margin-top:10px"><input id="fin'+qi+'" class="fillin" data-fill="'+qi+'" placeholder="输入答案" style="flex:1;border:1.5px solid var(--sep);border-radius:12px;padding:12px 14px;font-size:16px;font-family:inherit;background:var(--card);color:var(--ink)">'
        +'<button class="btn-go" data-fillgo="'+qi+'" style="flex:none">批改</button></div>';
    } else {
      ['A','B','C','D'].slice(0,(q.options||[]).length).forEach(function(k2,i){
        var prev=quizPick[k];
        var cls='opt'+(hist===0&&prev===i?' wrong':'')+(hist===1&&i===q.answer?' correct':(hist===0&&i===q.answer?' correct muted':''));
        h+='<button class="'+cls+'" data-q="'+qi+'" data-i="'+i+'"'+(hist!==undefined?' data-lock="1"':'')+'><span class="k">'+k2+'</span><span>'+parseMath(q.options[i])+'</span><span class="mark">'+IC('check')+'</span></button>';
      });
    }
    h+='</div><div class="why-note'+(hist===1?' why-ok':(hist===0?' why-no':''))+'" id="whyNote'+qi+'">';
    if(hist===1) h+='<div class="why-body"><span class="why-ic">'+IC('check')+'</span><span><b>答对了。</b>'+esc(q.explain||'')+'</span></div>';
    else if(hist===0) h+='<div class="why-body"><span class="why-ic">'+IC('info')+'</span><span><b>上次答错了，正确答案：「'+parseMath(q.options[q.answer])+'」</b><br>'+esc(q.explain||'')+'</span></div>'
      +'<button class="retry-btn" data-retry="'+qi+'">↻ 再答一次</button>';
    h+='</div></div>';
  });
  return h;
}

/* ============ 练习 Tab · 大厅（宫格 + 按章刷题） ============ */
renderers.hall=function(){
  resyncWrong();
  var s=calcStats();
  var h='<div class="kick">DRILL</div><div class="h1">练习大厅</div>'
    +'<div class="sub">按章刷题，错了解析跟上、自动进错题集。答过 '+s.studyCount+' 次 · 总进度 '+s.pct+'%</div>';
  h+='<div class="tiles" style="grid-template-columns:1fr 1fr">';
  h+='<button class="tile lift" data-go="vol"><span class="t-ico" style="background:linear-gradient(135deg,#FF9F0A,#FF7A00)">'+IC('doc')+'</span><b>小卷</b><span class="cap">'+s.examFull+' / '+s.examTotal+' 份</span></button>';
  h+='<button class="tile lift" data-go="wrong"><span class="t-ico" style="background:linear-gradient(135deg,#FF453A,#D70015)">'+IC('bookx')+'</span><b>错题集</b><span class="cap">'+s.wrongPool+' 道待订正</span></button>';
  h+='<button class="tile lift" data-go="fixed"><span class="t-ico" style="background:linear-gradient(135deg,#34C759,#28A745)">'+IC('check')+'</span><b>已订正</b><span class="cap">'+s.fixedPool+' 道已掌握</span></button>';
  h+='<button class="tile lift" data-go="honor"><span class="t-ico" style="background:linear-gradient(135deg,#AF52DE,#7D2AE0)">'+IC('trophy')+'</span><b>荣誉墙</b><span class="cap">'+curRank(s.pct).name+'</span></button>';
  h+='</div>';
  h+='<div class="sec-title">BY CHAPTER 按章刷题</div>';
  CHAPTERS.forEach(function(c){
    var sm=chSummary(c);
    var st, act;
    if(sm.answered>0){ st='已做 '+sm.answered+'/'+sm.total+' 题 · 对 '+sm.correct+' 题'; act='重做'; }
    else if(c.full){ st='随堂 10 题 · 未开始'; act='开刷'; }
    else { st='讲义未授'; act='…'; }
    h+='<button class="ch-row" data-go-drill="'+c.id+'">'
      +'<span class="ch-num">'+c.id+'</span>'
      +'<span class="ch-body"><b class="rt">第 '+c.id+' 章 · '+esc(c.title)+'</b>'
      +'<span class="cap">'+st+'</span></span>'
      +'<span class="pill rta">'+act+'</span>'
      +'<span class="chev">'+IC('chev-r')+'</span></button>';
  });
  return h;
};

/* ============ 练习 Tab · 小卷列表 ============ */
renderers.vol=function(){
  var s=calcStats();
  var h='<div class="kick">MINI EXAM</div><div class="h1">小卷</div>'
    +'<div class="sub">每章一份 10 题卷 · 答完自动结算、点亮打卡 · 已做 '+s.examFull+'/'+s.examTotal+'</div>';
  CHAPTERS.forEach(function(c){
    if(!c.exam||!c.exam.length) return;
    var st=examStatus(c);
    var cap=st.full?'已结算 · 对 '+st.correct+' 题':(st.answered>0?('进行中 '+st.answered+'/'+st.total):('10 题 · 约 20 分钟'));
    h+='<button class="ch-row'+(st.full?' done':'')+'" data-go-exam="'+c.id+'"><span class="ch-num" style="background:linear-gradient(135deg,#FF9F0A,#FF7A00)">'+(st.full?IC('check'):c.id)+'</span>'
      +'<span class="ch-body"><b>第 '+c.id+' 章 · '+esc(c.title)+' 小卷</b><span class="cap">'+cap+'</span></span>'
      +'<span class="chev">'+IC('chev-r')+'</span></button>';
  });
  h+='<div class="card" style="margin-top:12px"><b>卷规</b><div class="cap" style="margin-top:4px;line-height:1.7">· 答完全部题目自动结算，点亮今日打卡<br>· 中途退出已答保留，下次继续<br>· 卷子不计入「已学章节」，但计入总进度与荣誉</div></div>';
  return h;
};

/* ============ 练习 Tab · 错题 / 已订正 ============ */
function poolKeyInfo(k){
  var p=String(k).split('_');
  if(p[0][0]==='e'){ var c2=chById(+p[0].slice(1)); return c2?('第 '+c2.id+' 章小卷 · '+(c2.exam&&c2.exam[+p[1]]?c2.exam[+p[1]].q:'')):k; }
  var c=chById(+p[0]);
  if(!c||!c.quiz) return k;
  var q=c.quiz[+p[1]];
  return '第 '+c.id+' 章 · '+(q?q.q:'Q'+(+p[1]+1));
}
renderers.wrong=function(){
  resyncWrong();
  var h='<div class="kick">MISTAKES</div><div class="h1">错题集</div><div class="sub">'+wrongPool.length+' 道待订正 · 在「按章刷题」里答对即自动移入已订正</div>';
  if(!wrongPool.length){
    h+='<div class="card" style="text-align:center;padding:26px"><span style="font-size:40px">🎉</span><div class="h2" style="margin-top:8px">错题清零</div><div class="cap" style="margin-top:4px">没有待订正的错题。保持住。</div></div>';
    return h;
  }
  wrongPool.slice().reverse().forEach(function(k){
    var p=String(k).split('_'); var c=chById(+p[0]); if(!c) return;
    h+='<button class="ch-row" data-go-drill="'+c.id+'"><span class="ch-num" style="background:var(--red-soft);color:var(--red);font-size:15px">✗</span>'
      +'<span class="ch-body"><b>'+esc(poolKeyInfo(k).replace(/^第 .*章 · /,''))+'</b><span class="cap">'+esc(k.indexOf('e')===0?'第 '+c.id+' 章小卷 · 订正请重做小卷':'第 '+c.id+' 章随堂 · 去刷题重做')+'</span></span>'
      +'<span class="chev">'+IC('chev-r')+'</span></button>';
  });
  return h;
};
renderers.fixed=function(){
  var h='<div class="kick">FIXED</div><div class="h1">已订正</div><div class="sub">'+fixedPool.length+' 道曾经错过、现已掌握的题</div>';
  if(!fixedPool.length){
    h+='<div class="card" style="text-align:center;padding:26px"><span style="font-size:40px">📭</span><div class="cap" style="margin-top:8px">还没有从错题集毕业的题</div></div>';
    return h;
  }
  fixedPool.slice().reverse().forEach(function(k){
    var p=String(k).split('_'); var c=chById(+p[0]); if(!c) return;
    h+='<div class="ch-row" style="cursor:default"><span class="ch-num" style="background:var(--green)">'+IC('check')+'</span>'
      +'<span class="ch-body"><b>'+esc(poolKeyInfo(k).replace(/^第 .*章 · /,''))+'</b><span class="cap">✓ 已掌握 · 第 '+c.id+' 章</span></span></div>';
  });
  return h;
};

/* ============ 练习 Tab · 答题页（随堂 drill / 小卷 exam） ============ */
function examHTML(c){
  var st=examStatus(c);
  var h='<div class="kick">MINI EXAM '+('0'+c.id).slice(-2)+'</div><div class="h1">'+esc(c.title)+' · 小卷</div>'
    +'<div class="sub">'+st.total+' 题 · 30 分钟参考计时 · 答完自动结算 · 已答 '+st.answered+'/'+st.total+(st.full?' · 已结算':(st.answered>0?' · 继续作答':''))+'</div>';
  (c.exam||[]).forEach(function(q,qi){
    var k='e'+c.id+'_'+qi;
    var hist=(q.type!=='fill')?quizStat[k]:undefined;
    h+='<div class="card" style="border-radius:var(--r-l);margin-top:14px">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span class="pill gold">卷 '+(qi+1)+'</span>'
      +'<span class="cap">单选'+(hist!==undefined?(hist===1?' · 已答对':' · 上次答错'):'')+'</span></div>'
      +'<div class="q-stem">'+parseMath(q.q)+'</div><div id="eqbox'+qi+'" data-k="'+k+'">';
    if(q.type==='fill'){
      h+='<div style="display:flex;gap:8px;margin-top:10px"><input class="fillin" data-efill="'+qi+'" placeholder="输入答案" style="flex:1;border:1.5px solid var(--sep);border-radius:12px;padding:12px 14px;font-size:16px;font-family:inherit;background:var(--card);color:var(--ink)">'
        +'<button class="btn-go" data-efillgo="'+qi+'" style="flex:none">批改</button></div>';
    } else {
      ['A','B','C','D'].slice(0,(q.options||[]).length).forEach(function(k2,i){
        var cls='opt'+(hist===0&&quizPick[k]===i?' wrong':'')+(hist===1&&i===q.answer?' correct':(hist===0&&i===q.answer?' correct muted':''));
        h+='<button class="'+cls+'" data-eq="'+qi+'" data-i="'+i+'"'+(hist!==undefined?' data-lock="1"':'')+'><span class="k">'+k2+'</span><span>'+parseMath(q.options[i])+'</span><span class="mark">'+IC('check')+'</span></button>';
      });
    }
    h+='</div><div class="why-note'+(hist===1?' why-ok':(hist===0?' why-no':''))+'" id="ewhyNote'+qi+'">';
    if(hist===1) h+='<div class="why-body"><span class="why-ic">'+IC('check')+'</span><span><b>答对了。</b>'+esc(q.explain||'')+'</span></div>';
    else if(hist===0) h+='<div class="why-body"><span class="why-ic">'+IC('info')+'</span><span><b>上次答错，正确答案：「'+parseMath(q.options[q.answer])+'」</b><br>'+esc(q.explain||'')+'</span></div>'
      +'<button class="retry-btn" data-etry="'+qi+'">↻ 再答一次</button>';
    h+='</div></div>';
  });
  return h;
}

/* ============ 我的 Tab ============ */
renderers.mine=function(){
  var s=calcStats(), streak=calcStreak(), rk=curRank(s.pct);
  var h='<div class="kick">PROFILE</div><div class="h1">我的</div>'
    +'<div class="sub">账号、战果与设置（本版进度存本浏览器）</div>';
  h+='<div class="card" style="display:flex;align-items:center;gap:14px;border-radius:var(--r-l)">'
    +'<div style="width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#0A84FF,#5E5CE6);display:flex;align-items:center;justify-content:center;color:#fff;flex:none;font-size:26px">🐹</div>'
    +'<div style="min-width:0;flex:1"><b style="font-size:18px">芯片学徒</b><div style="font-size:13px;color:var(--ink2);margin-top:2px;line-height:1.5;min-width:0">'+rk.name+' · 已学 '+s.doneC+'/'+s.totalC+' 章 · 小卷 '+s.examFull+' 份</div>'
    +'<div style="font-size:12px;color:var(--muted);margin-top:3px;line-height:1.6;min-width:0">连签 '+streak+' 天 · <span class="pill blue" style="font-size:11px;padding:2px 9px">总进度 '+s.pct+'%</span></div></div></div>';
  h+='<div class="sec-title">ACHIEVE 成就</div><div class="tiles">';
  var MG=[
    {g:'calendar',ico:'calendar',bg:'linear-gradient(135deg,#34C759,#28A745)',t:'打卡日历',c:streak+' 天连签'},
    {g:'rank',ico:'flag',bg:'linear-gradient(135deg,#FFD60A,#FF9500)',t:'排行榜',c:'云端接入中'},
    {g:'honor',ico:'trophy',bg:'linear-gradient(135deg,#AF52DE,#7D2AE0)',t:'荣誉墙',c:rk.name+' · '+s.pct+'%'},
    {g:'lab',ico:'flask',bg:'linear-gradient(135deg,#0A84FF,#5E5CE6)',t:'实验室',c:'动手玩工艺'}
  ];
  MG.forEach(function(x){
    h+='<button class="tile lift" data-go="'+x.g+'"><span class="t-ico" style="background:'+x.bg+'">'+IC(x.ico)+'</span><b>'+x.t+'</b><span class="cap">'+x.c+'</span></button>';
  });
  h+='</div>';
  h+='<div class="sec-title">SYSTEM 设置</div><div class="group">';
  var SETS=[
    {ico:'moon',bg:'linear-gradient(135deg,#5856D6,#AF52DE)',t:'外观',v:themeLabel(),act:'theme'},
    {ico:'phone',bg:'linear-gradient(135deg,#FF9F0A,#FF7A00)',t:'触感反馈',v:canVibrate?'开启':'设备不支持',act:''},
    {ico:'info',bg:'linear-gradient(135deg,#8E8E93,#5A5A5E)',t:'关于学院',v:'样张真版 · '+APP_VER,act:'about'},
    {ico:'person',bg:'linear-gradient(135deg,#0A84FF,#5E5CE6)',t:'作者与幕后',v:'鼠哥 × 拉里·佩奇',act:'author'}
  ];
  SETS.forEach(function(x){
    var attr=x.act?' data-go="'+x.act+'"':'';
    h+='<button class="grow"'+(x.act==='theme'?' id="themeRow"':'')+attr+'>'
      +'<span class="gi" style="background:'+x.bg+'">'+IC(x.ico)+'</span><b>'+x.t+'</b>'
      +'<span class="gv"'+(x.act==='theme'?' id="themeVal"':'')+'>'+x.v+'</span>'
      +'<span class="garr">'+IC('chev-r')+'</span></button>';
  });
  h+='</div>';
  h+='<div class="group">';
  var GROUPS=[
    {ico:'chat',bg:'linear-gradient(135deg,#0A84FF,#5E5CE6)',t:'导出 / 导入进度',v:'备份与恢复',g:'manage'},
    {ico:'trash',bg:'linear-gradient(135deg,#FF453A,#D70015)',t:'清除所有记录',v:'清到初始态',g:'manage'}
  ];
  GROUPS.forEach(function(x){
    h+='<button class="grow" data-go="'+x.g+'"><span class="gi" style="background:'+x.bg+'">'+IC(x.ico)+'</span>'
      +'<b>'+x.t+'</b><span class="gv">'+x.v+'</span><span class="garr">'+IC('chev-r')+'</span></button>';
  });
  h+='</div>';
  h+='<div class="group">';
  var SUPS=[
    {ico:'github',bg:'linear-gradient(135deg,#3C3C43,#1D1D1F)',t:'GitHub 仓库',v:'源码与更新日志',ext:'https://github.com/ndshuge/ndshuge-academy'},
    {ico:'share2',bg:'linear-gradient(135deg,#0A84FF,#5E5CE6)',t:'分享学院',v:'复制学习链接',share:'1'}
  ];
  SUPS.forEach(function(x){
    var attr=x.ext?' data-ext="'+x.ext+'"':(x.share?' data-share="1"':'');
    h+='<button class="grow"'+attr+'><span class="gi" style="background:'+x.bg+'">'+IC(x.ico)+'</span>'
      +'<b>'+x.t+'</b><span class="gv">'+x.v+'</span><span class="garr">'+IC('chev-r')+'</span></button>';
  });
  h+='</div>';
  return h;
};
function themeLabel(){
  var t=load('theme','auto');
  return t==='dark'?'深色':(t==='light'?'浅色':'跟随系统');
}
function setTheme(t,announce){
  if(t==='auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme',t);
  store('theme',t);
  var tv=document.getElementById('themeVal');
  if(tv) tv.textContent=themeLabel();
  if(announce) toast('外观：'+themeLabel());
}

/* ============ 打卡日历 ============ */
renderers.calendar=function(){
  var streak=calcStreak(), set=acadDaySet();
  var h='<div class="kick">CALENDAR</div><div class="h1">打卡日历</div>'
    +'<div class="sub">四院共通，跨学院不断签。今日连签 '+streak+' 天</div>';
  var now=new Date();
  var y=now.getFullYear(), mo=now.getMonth();
  var days=new Date(y,mo+1,0).getDate();
  var first=new Date(y,mo,1).getDay();
  var lit=0;
  h+='<div class="card" style="border-radius:var(--r-l)"><div style="display:flex;align-items:center;justify-content:space-between"><b class="h2" style="font-size:18px">'+y+' 年 '+(mo+1)+' 月</b>'
    +'<span class="pill green">'+IC('check')+' 本月已点亮 '+Object.keys(set).length+' 天</span></div><div class="cal-grid">';
  ['日','一','二','三','四','五','六'].forEach(function(w){ h+='<div class="cap" style="text-align:center;font-weight:600">'+w+'</div>'; });
  for(var i=0;i<first;i++) h+='<div></div>';
  for(var d=1;d<=days;d++){
    var dk=y+'-'+(mo+1)+'-'+d;
    var litd=!!set[dk];
    if(litd) lit++;
    var cls='cal-day'+(litd?' lit':'')+(dk===todayStr()?' today':'');
    h+='<div class="'+cls+'">'+d+'</div>';
  }
  h+='</div></div>';
  return h;
};

/* ============ 排行榜（云接入前：本地说明） ============ */
renderers.rank=function(){
  var s=calcStats();
  var h='<div class="kick">LEADERBOARD</div><div class="h1">排行榜</div><div class="sub">比的是读了多少</div>';
  h+='<div class="card" style="border-radius:var(--r-l);text-align:center;padding:30px 20px">'
    +'<span style="font-size:44px">☁️</span>'
    +'<div class="h2" style="margin-top:10px">云端排行榜接入中</div>'
    +'<div class="cap" style="margin-top:6px;line-height:1.7">本版先把学习闭环做真（进度 / 判题 / 结算 / 打卡 / 错题都在本地与线上键兼容）。<br>登录账号 + 全站排行会在下一批接回。</div>'
    +'<div style="margin-top:14px"><span class="pill blue">你当前：'+s.doneC+' 章 · '+s.pct+'%</span></div></div>';
  return h;
};

/* ============ 荣誉墙 ============ */
renderers.honor=function(){
  var s=calcStats(), rk=curRank(s.pct);
  var h='<div class="kick">HONOR</div><div class="h1">荣誉墙</div>'
    +'<div class="sub">称号按已学章节推进，徽章记录你的历史时刻</div>';
  h+='<div class="card" style="border-radius:var(--r-l)"><div style="display:flex;align-items:center;gap:14px">'
    +'<div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#FFD60A,#FF9500);display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 4px 14px rgba(255,149,0,.35)">'+IC('trophy')+'</div>'
    +'<div><b style="font-size:20px">'+rk.name+'</b><div class="cap">当前称号 · 已学 '+s.doneC+' 章 · 总进度 '+s.pct+'%</div></div></div>'
    +'<div class="rank-scale"><div class="rbar"><i style="width:'+s.pct+'%"></i></div>'
    +'<div class="rrow"><span>等级进度 '+s.pct+' / 100</span><span>'+(rk.next?'下一阶：'+rk.next+'（'+rk.nextAt+'）':'已到顶')+'</span></div></div>'
    +'<div class="rank-steps">';
  RANKS.forEach(function(r){
    h+='<span class="rank-step'+(r[0]===rk.name?' on':(s.pct>=r[0]?' got':''))+'">'+r[1]+'</span>';
  });
  h+='</div></div>';
  var bd=badgeState(s);
  h+='<div class="card" style="margin-top:12px"><b class="h2" style="font-size:17px">徽章 '+bd.filter(function(x){return x.got;}).length+'/'+bd.length+'</b>'
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);margin-top:10px;gap:6px">';
  bd.forEach(function(b){
    h+='<div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0;text-align:center" title="'+esc(b.d)+'">'
      +'<span style="width:46px;height:46px;border-radius:50%;background:'+(b.got?'linear-gradient(135deg,#0A84FF,#5E5CE6)':'var(--fill)')+';display:flex;align-items:center;justify-content:center;color:'+(b.got?'#fff':'var(--muted)')+';font-size:20px'+(b.got?'':'')+'">'+(b.got?IC('check'):'·')+'</span>'
      +'<span class="cap" style="font-size:11px">'+b.n+'</span></div>';
  });
  h+='</div></div>';
  return h;
};

/* ============ 实验室 / 管理 / 关于 ============ */
renderers.lab=function(){
  var it=(CHAPTERS[0]&&CHAPTERS[0].story&&CHAPTERS[0].story.interact)||null;
  var h='<div class="kick">CALC LAB</div><div class="h1">实验室</div><div class="sub">一个规则变成一条曲线：笛卡尔的魔法</div>';
  if(!it){ return h+'<div class="card" style="text-align:center;padding:30px"><div class="cap">画板数据待机</div></div>'; }
  h+='<div class="card" style="border-radius:var(--r-l)"><b>函数互动画板 · '+esc(it.label||('y = f(x)'))+'</b>'
    +'<p style="font-size:13.5px;color:var(--ink2);margin:6px 0;line-height:1.7">'+esc(it.desc||'')+'</p>'
    +'<div style="display:flex;align-items:center;gap:12px;margin:10px 0;flex-wrap:wrap"><label style="font-size:13px;color:var(--ink2)">x = <b id="fxv">0</b></label>'
    +'<input type="range" id="fxs" min="'+it.xmin+'" max="'+it.xmax+'" step="0.2" value="0" style="flex:1;min-width:140px"></div>'
    +'<canvas id="fcv" width="720" height="400" style="width:100%;height:auto;background:#fff;border-radius:12px"></canvas></div>';
  h+='<div class="card" style="margin-top:12px"><div class="cap" style="line-height:1.8">拖动 x，看点如何沿曲线移动——函数从「看不见的规则」变成「看得见的图像」。</div></div>';
  setTimeout(function(){ try{ labFuncDraw(it); }catch(e){} },40);
  return h;
};
function labFuncDraw(it){
  var cv=document.getElementById('fcv'); if(!cv||!cv.getContext) return;
  var c=cv.getContext('2d'); var xv=parseFloat(document.getElementById('fxs').value||0);
  var W=cv.width,H=cv.height;
  var xmin=it.xmin,xmax=it.xmax,ymin=it.ymin,ymax=it.ymax;
  var sx=W/(xmax-xmin), sy=H/(ymax-ymin);
  var px=function(x){ return (x-xmin)*sx; }, py=function(y){ return H-(y-ymin)*sy; };
  c.fillStyle='#F7F8FA'; c.fillRect(0,0,W,H);
  c.strokeStyle='#E1E3E8'; c.lineWidth=1;
  for(var g=Math.ceil(xmin);g<=xmax;g++){ c.beginPath(); c.moveTo(px(g),0); c.lineTo(px(g),H); c.stroke(); }
  for(var g2=Math.ceil(ymin);g2<=ymax;g2++){ c.beginPath(); c.moveTo(0,py(g2)); c.lineTo(W,py(g2)); c.stroke(); }
  c.strokeStyle='#007AFF'; c.lineWidth=3; c.beginPath();
  var f=function(x){ try{ return eval('(' + it.fn + ')'); }catch(e){ return 0; } };
  for(var i=0;i<=W;i++){ var x=xmin+(i/W)*(xmax-xmin); var y=f(x);
    var X=px(x),Y=py(y); if(i===0)c.moveTo(X,Y); else c.lineTo(X,Y); }
  c.stroke();
  var vy=f(xv); var X0=px(xv),Y0=py(vy);
  c.fillStyle='#FF3B30'; c.beginPath(); c.arc(X0,Y0,7,0,7); c.fill();
  c.strokeStyle='#FF9500'; c.setLineDash([5,4]); c.beginPath(); c.moveTo(X0,py(0)); c.lineTo(X0,Y0); c.moveTo(0,Y0); c.lineTo(X0,Y0); c.stroke(); c.setLineDash([]);
  c.fillStyle='#3C3C43'; c.font='14px sans-serif';
  c.fillText('x = '+xv.toFixed(1)+'   y = '+vy.toFixed(2), 14, 26);
  var st=document.getElementById('fxv'); if(st) st.textContent=xv.toFixed(1);
}

renderers.manage=function(){
  var s=calcStats();
  var h='<div class="kick">ACCOUNT</div><div class="h1">管理</div>'
    +'<div class="sub">进度备份与恢复 · 本地游客态（云登录下一批接回）</div>';
  h+='<div class="card" style="border-radius:var(--r-l)"><b>📦 进度备份</b>'
    +'<div class="cap" style="margin:6px 0 12px;line-height:1.7">导出生成一串备份码（含学习数据），换设备粘贴即可恢复。</div>'
    +'<textarea id="bkText" style="width:100%;min-height:110px;border:1.5px solid var(--sep);border-radius:12px;padding:10px 12px;font-family:ui-monospace,Consolas,monospace;font-size:12px;background:var(--bg);color:var(--ink);resize:vertical" placeholder="点「导出备份」生成备份码；或粘贴备份码后点「导入恢复」…"></textarea>'
    +'<div class="mini-row" style="margin-top:10px"><button class="mini-btn lift" id="bkExport">'+IC('doc')+' 导出备份</button>'
    +'<button class="mini-btn lift" id="bkImport">'+IC('download','').replace('</span>','<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg></span>')+' 导入恢复</button></div></div>';
  h+='<div class="card" style="margin-top:12px"><b>👤 当前状态</b><div class="cap" style="margin:4px 0 2px;line-height:1.5">本地游客 · 已学 '+s.doneC+'/'+s.totalC+' 章 · '+s.pct+'%</div>'
    +'<div class="group" style="margin-top:0"><button class="grow" id="wipeBtn" data-wipe="1"><span class="gi" style="background:linear-gradient(135deg,#FF453A,#D70015)">'+IC('trash')+'</span>'
    +'<b>清除所有记录</b><span class="cap" style="font-size:13px;color:var(--red)">回到初始态</span><span class="garr">'+IC('chev-r')+'</span></button></div></div>';
  return h;
};
renderers.about=function(){
  return '<div class="kick">ABOUT</div><div class="h1">关于学院</div>'
    +'<div class="sub">微积分学院 · framework v2 · 对齐样张 + HIG 动效</div>'
    +'<div class="card" style="border-radius:var(--r-l)"><div class="lesson-body">'
    +'<p>大一高数先修：极限、导数、积分。每节讲义配公式渲染与随堂判题。</p>'
    +'<p>界面与动效统一走 <b>Apple 设计语言（framework v2）</b>：双舞台转场、Interactive Pop 跟手返回、Sheet 环境光、滚动视觉降噪、Dock 款悬停；内容为本院真实全书数据，进度按院存于本机（键隔离），打卡四院共通。</p>'
    +'<p>导读人：莱布尼茨与笛卡尔。称号与徽章在荣誉墙可见。</p>'
    +'<div style="margin-top:10px;padding:11px 14px;border-radius:12px;background:var(--fill-soft);font-size:13.5px;color:var(--ink2)">云端账号（多端同步 / 排行榜 / 留言）正在接入：登录弹窗已就位，账号批次上线后自动生效。</div>'
    +'</div></div>';
};
var APP_VER='v5.0 · 2026-09-04';
/* 补充线性图标（Lucide 官方 path） */
defI('github','<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>');
defI('share2','<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/>');


/* ============ 作者与幕后（四院同源文案） ============ */
renderers.author=function(){
  return '<div class="kick">BACKSTAGE</div><div class="h1">作者与幕后</div>'
    +'<div class="sub">谁搭的学院、为什么而建</div>'
    +'<div class="card" style="border-radius:var(--r-l)">'
    +'<div style="display:flex;gap:14px;align-items:center;margin-bottom:12px">'
    +'<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#0A84FF,#5E5CE6);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">🐭</div>'
    +'<div><b style="font-size:17px">鼠哥 · 学院发起人</b><div class="cap">西安交通大学 · 准大一新生</div></div></div>'
    +'<div style="font-size:14px;color:var(--ink2);line-height:1.9">打乒乓、敲架子鼓（十级）。开学前想做的事：<b>把同学们聚到一个地方，把大学第一年的硬课一起啃下来</b>。</div>'
    +'<div style="font-size:14px;color:var(--ink2);line-height:1.9;margin-top:8px"><b style="color:var(--ink)">为什么会有这一座座学院？</b><br>'
    +'高数光看 PDF 学不动，想要一个「做题马上批改、错题自己长记性」的地方 → 微积分学院诞生。<br>'
    +'同学说也想学编程 → Python 学院：浏览器里直接写代码、即时判题。<br>'
    +'接着 C 语言学院（浏览器里真编译真运行）、微积分学院（读透《芯片战争》）陆续加入。<br>'
    +'最后四院合一，成了现在的鼠哥学院：一个链接，四门硬课，一群同学。</div>'
    +'<div style="margin-top:12px;font-size:12.5px;color:var(--muted);line-height:1.8">每座学院的引擎与内容由拉里·佩奇搭建，方向与组织由鼠哥把关。界面统一走 Apple 设计语言（academy-shell 模版框架）。</div>'
    +'<button class="btn-go" data-go="home" style="margin-top:16px;width:100%;justify-content:center">回去学习</button>'
    +'</div>';
};
