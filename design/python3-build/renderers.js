/* ============================================================
   渲染器与页面逻辑（真实版）：页面结构/组件/动效沿用样张，数据全真
   ============================================================ */
/* ---------- 导航覆盖：支持带参页面 ---------- */
var META={
  home:{n:'首页',tab:'learn'},plan:{n:'章节课堂',tab:'learn'},chapter:{n:'',tab:'learn'},
  hall:{n:'练习大厅',tab:'drill'},vol:{n:'小卷',tab:'drill'},exam:{n:'',tab:'drill'},
  wrong:{n:'错题集',tab:'drill'},fixed:{n:'已订正',tab:'drill'},
  mine:{n:'我的',tab:'mine'},rank:{n:'排行榜',tab:'mine'},calendar:{n:'打卡日历',tab:'mine'},
  honor:{n:'荣誉墙',tab:'mine'},stats:{n:'进度总览',tab:'mine'},board:{n:'讨论区',tab:'mine'},feedback:{n:'反馈意见',tab:'mine'},lab:{n:'实验室',tab:'drill'},about:{n:'关于学院',tab:'mine'},manage:{n:'管理',tab:'mine'},author:{n:'作者与幕后',tab:'mine'}
};
var _lastNav={};
function chById(id){ return CHAPTERS[id-1]; }
var _swapBusy = false; /* 兼容旧调用遗留 */
/* ============================================================
   页面切换动效 = apple-ui-动效实验室 同款（class push/pushBack）
   其余机制不变（导航栈/参数页/守卫/主题）
   ============================================================ */
function doRenderView(id,isBack){
  var html=renderers[id]?renderers[id]():'<div class="cap">页面不存在</div>';
  var m=META[id]||{n:'Python 学院'};
  var nn=m.n;
  if(id==='chapter'){ var cc=chById(_lastNav.chapter||1); nn=cc?('第 '+cc.id+' 章'):'章节'; }
  if(id==='exam'){ var ec=chById(_lastNav.exam||1); nn=ec?('第 '+ec.id+' 章 · 小卷'):'小卷'; }
  var v=view;
  v.className='view '+((isBack)?'pushBack':'push');
  v.innerHTML=html;
  scroller.scrollTop=0;
  $('#brandName').textContent=nn;
  try{
    var _isRoot=(id==='home'||id==='hall'||id==='mine');
    var _bt=document.getElementById('backTxt');
    if(_bt) _bt.textContent=_isRoot?'总学院':'返回';
    var _bi=document.getElementById('backIco');
    if(_bi&&typeof I!=='undefined') _bi.innerHTML=_isRoot?(I['home']||''):(I['back']||'');
  }catch(e){}
  var prev=STACK.length?STACK[STACK.length-1]:null;
  if(prev&&META[prev]){ $('#backTxt').textContent=META[prev].n; $('#btnBack').disabled=false; }
  else { $('#backTxt').textContent='返回'; $('#btnBack').disabled=true; }
  window._cur=id;
  paintDock(id);
  try{ if(typeof initCodeMirrors==='function') initCodeMirrors(); }catch(e){}
  try{ if(typeof cmScanLater==='function') cmScanLater(); }catch(e){}
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
  /* 退出守卫 = calc2 同款 confirmBox（底部升起）：计时学习中必弹（calc2 同条件）；计时停但未做完也弹 */
  var cw=window._cur;
  var unfin=false; try{ unfin=!sessDone(); }catch(e){ unfin=true; }
  if((cw==='chapter'||cw==='exam') && (timerRunning || unfin)){
    leaveAfter=action;
    $('#confirmMsg').textContent='本章还没做完。退出后本次作答进度不会保存，回来需要重新作答。';
    $('#confirmBox').classList.add('show');
    return;
  }
  action();
}
function clearLeave(){ leaveAfter=null; }
function dismissConfirm(){ $('#confirmBox').classList.remove('show'); }
$('#confirmStay').addEventListener('click',function(){ clearLeave(); dismissConfirm(); });
/* 离开：先取出动作再关弹窗（dismissConfirm 不再吞掉 leaveAfter），随后回滚本次作答并执行返回 */
$('#confirmLeave').addEventListener('click',function(){
  var act=leaveAfter; leaveAfter=null;
  dismissConfirm();
  if(typeof stopTimer==='function'){ try{ stopTimer(); }catch(e){} }
  try{ if(typeof sessRoll==='function') sessRoll(); }catch(e){}
  if(typeof act==='function'){ try{ act(); }catch(e2){ try{ console.error('[confirmLeave] act fail', e2); }catch(ce){} } }
});
function guardedBack(){ requestNav(function(){ doBack(); }); }
/* 显式回上一级：从导航栈取上一页渲染并同步历史，不依赖浏览器历史回退 */
function doBack(){
  var errMsg='';
  var st=(typeof STACK!=='undefined'&&STACK)?STACK:null;
  var top=null;
  /* 从导航栈取真正的列表页（过滤掉做题页自身） */
  while(st&&st.length){ var t=st.pop(); if(t!=='chapter'&&t!=='exam'){ top=t; break; } }
  var root = (window._cur==='exam')?'vol':((window._lastNav&&window._lastNav.mode==='drill')?'hall':'plan');
  if(!top){ top=root; }
  var ok=false;
  try{ history.replaceState({view:top},''); }catch(e){}
  try{ doRenderView(top,true); ok=(window._cur===top); }catch(err){ errMsg=String(err&&err.message||err); }
  if(!ok && typeof go==='function'){ try{ go(top); ok=(window._cur===top); }catch(e2){ errMsg=String(e2&&e2.message||e2); } }
  if(!ok && top!==root){ try{ doRenderView(root,true); ok=(window._cur===root); }catch(e3){ errMsg=String(e3&&e3.message||e3); } }
  try{
    if(!ok){
      try{ console.error('[doBack] fail top='+top+' cur='+window._cur+' :: '+errMsg); }catch(ce){}
      toast('返回失败，正在回到首页…');
      setTimeout(function(){ try{ window.location.reload(); }catch(e){} }, 500);
    }
  }catch(e){}
  /* 兜底校验：400ms 后仍在做题页则强制回首页 */
  try{
    setTimeout(function(){
      var c=window._cur;
      if(c==='chapter'||c==='exam'){ try{ console.error('[doBack] stuck, force reload cur='+c); }catch(ce2){} window.location.reload(); }
    }, 400);
  }catch(e){}
}
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
  var h='<div class="kick">PYTHON ACADEMY</div><div class="h1">Python 学院</div>'
    +'<div class="sub">编程入门 · 语法/数据/项目三幕 · 答完随堂题即点亮章节 · 进度 '+s.doneC+'/'+s.totalC+' 章</div>';
  h+='<div class="tutor-card"><span class="tutor-photo" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0A84FF,#5E5CE6);color:#fff;font-size:34px;font-family:Georgia,serif;letter-spacing:1px">LP</span>'
    +'<div class="tutor-body"><div class="tutor-cap">导读人</div>'
    +'<div class="tutor-name-big">LARRY PAGE</div>'
    +'<div class="tutor-quote">'+pick(TUTOR_QUOTES)+'</div>'
    +'<div class="tutor-name">Google 联合创始人 · 你正在学的语言的老东家</div></div></div>';
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
      +'<b class="next">30 章全部点亮。去荣誉墙领你的毕业称号。</b>'
      +'<div class="foot"><span class="pill green">'+IC('check')+' 章节全通</span>'
      +'<button class="btn-go" data-go="honor">荣誉墙'+IC('arrow-r')+'</button></div></div>';
  }
  h+='<button class="big-entry lift" data-go="plan"><span class="be-ico" style="background:linear-gradient(135deg,#0A84FF,#5E5CE6)">'+IC('bookopen')+'</span>'
    +'<span class="be-body"><b>章节课堂</b>'
    +'<span class="cap">Python 入门 30 章 · 讲义 + 随堂题，答完即点亮</span>'
    +'<span class="be-meta"><span class="pill blue">已学 '+s.doneC+' / '+s.totalC+' 章</span></span></span>'
    +'<span class="be-arrow">'+IC('chev-r')+'</span></button>';

  return h;
};
var TUTOR_QUOTES=[
  '「代码是写给同事看的，顺便让机器跑一下。」',
  '「先让程序跑起来，再让它跑得优雅。」',
  '「报错信息是给你的线索，不是给你的惩罚。」',
  '「可读性是 Python 的第一信条。」',
  '「不调试的程序员不是真程序员，是赌徒。」',
  '「今天偷懒少写一个测试，明天花一小时追 bug。」'
]

/* ============ 学习 Tab · 章节课堂（30 章书架） ============ */
renderers.plan=function(){
  var s=calcStats();
  var h='<div class="kick">ROADMAP</div><div class="h1">章节课堂</div>'
    +'<div class="sub">十四周就是一本 Python 入门。每章讲义 + 随堂题，答完即结算点亮。已学 '+s.doneC+'/'+s.totalC+'。</div>';
  CHAPTERS.forEach(function(c){
    var done=chIsDone(c);
    var sm=chSummary(c);
    var cap;
    if(done) cap='已学完'+(sm.allCorrect?' · 全对通关':' · 答完即结算');
    else cap=sm.answered>0?('进行中 '+sm.answered+'/'+sm.total+' 题 · 继续 →'):(c.full?'讲义已授 · 待开卷':'待佩奇开讲');
    h+='<button class="ch-row'+(done?' done':'')+'" data-go-ch="'+c.id+'">'
      +'<span class="ch-num">'+(done?IC('check'):c.id)+'</span>'
      +'<span class="ch-body"><b>第 '+c.id+' 章 · '+esc(c.title)+'</b>'
      +'<span class="cap">'+cap+' · '+esc(c.weeks||'')+'</span></span>'
      +'<span class="chev">'+IC('chev-r')+'</span></button>';
  });
  return h;
};

/* ============ 学习 Tab · 章节学习（讲义 + 随堂题 + 计时 + 结算） ============ */
function fmtDur(sec){
  sec=Math.max(0, Math.round(sec||0));
  var m=Math.floor(sec/60), s=sec%60;
  return (m<10?'0':'')+m+':'+(s<10?'0':'')+s;
}
/* 讲义底部结算战报：已结算常驻显示（含历史记录）；做完未结算给按钮；未完给引导 */
function settleCardHTML(c){
  var sm=chSummary(c);
  var rec=settleStore['settle_'+c.id];
  if(rec){
    var dt=new Date(rec.ts);
    var ds=(dt.getMonth()+1)+'月'+dt.getDate()+'日 '+(dt.getHours()<10?'0':'')+dt.getHours()+':'+(dt.getMinutes()<10?'0':'')+dt.getMinutes();
    var pct=(rec.pct!==undefined)?rec.pct:Math.round((rec.correct||0)/(rec.total||1)*100);
    var tot=(rec.total!==undefined)?rec.total:sm.total;
    var cor=(rec.correct!==undefined)?rec.correct:Math.round(tot*pct/100);
    var durTxt=(rec.dur!==undefined)?fmtDur(rec.dur):'—';
    var col=pct>=80?'var(--green)':(pct>=60?'var(--ochre)':'var(--red)');
    return '<div class="card"><h3>📜 本节战报 · 已结算</h3>'
      +'<div style="font-size:12px;color:var(--muted);margin:-4px 0 10px">'+ds+' · 本章已点亮 · 结果存档，永久留档</div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:24px;font-size:14.5px">'
      +'<span>正确率 <b style="color:'+col+';font-size:20px">'+pct+'%</b>（'+cor+'/'+tot+'）</span>'
      +'<span>用时 <b style="color:var(--blue)">'+durTxt+'</b></span>'
      +'<span>里程碑 <b style="color:var(--blue)">已学 '+chDone.length+'/'+CHAPTERS.length+' 章</b></span>'
      +(rec.allCorrect?'<span style="color:var(--green);font-weight:600">👑 全对通关</span>':'')
      +'</div></div>';
  }
  if(sm.allDone){
    return '<div class="settle-wrap"><button class="settle-btn" data-settle="'+c.id+'">'+IC('check')+' 结算本章</button>'
      +'<div class="settle-hint">全部答完，点结算点亮本章与打卡；结算战报会永久留在这里。</div></div>';
  }
  return '<div class="card" style="text-align:center;padding:18px"><div style="color:var(--muted);font-size:13px">全部题目做完后，这里自动生成结算战报（正确率 · 用时）。</div></div>';
}
function chapterHTML(c,mode){
  var sm=chSummary(c), settled=chIsDone(c);
  var isLesson=mode!=='drill';
  var h='<div class="kick">LESSON '+('0'+c.id).slice(-2)+'</div><div class="h1">'+esc(c.title)+'</div>'
    +'<div class="sub">随堂 '+sm.total+' 题'+(isLesson?' · 30 分钟参考计时 · 答完自动结算点亮打卡':' · 刷题模式：做完即存，可反复重做')+' · 已答 '+sm.answered+'/'+sm.total+'</div>';
  if(settled) h+='<div class="pill green" style="margin-bottom:10px">'+IC('check')+' 本章已点亮 · 可随时回来重做</div>';
  h+='<div id="legacy-chapter">';
  /* 开讲词（旧版 .motto 渐变深条） */
  h+='<div class="motto">'+esc(c.motto||'')+'<span class="who">—— '+esc(c.mottoWho||'')+'</span></div>';
  /* 知识地图 */
  if(c.map&&c.map.length){
    h+='<div class="card"><h3>知识地图</h3><div class="map">'+c.map.map(function(m){return '<span>'+esc(m)+'</span>';}).join('')+'</div></div>';
  }
  /* 人物史话 */
  if(c.story){
    var nm=c.story.tutor||'';
    var pv=c.story.img&&PORTRAITS[c.story.img]?'<img src="'+PORTRAITS[c.story.img]+'" alt="'+esc(nm)+'" style="width:64px;height:80px;border-radius:6px;border:1px solid var(--blue);object-fit:cover;flex-shrink:0">':'<span style="width:64px;height:80px;border-radius:6px;border:1px solid var(--blue);background:#F1E8D4;display:flex;align-items:center;justify-content:center;color:var(--blue2);font-family:Georgia,serif;font-size:22px;flex-shrink:0">'+esc(nm.charAt(0))+'</span>';
    h+='<div class="card story-card"><h3>人物史话 · 这一章的来处</h3>'
      +'<div class="story-head">'+pv+'<div><div class="story-name">'+esc(nm)+'</div><div class="story-era">'+esc(c.story.era||'')+'</div></div></div>'
      +'<div class="story-fact">'+parseMath(c.story.fact||'')+'</div>'
      +(c.story.quote?'<div class="story-quote">'+esc(c.story.quote)+'</div>':'')
      +(c.story.story?'<div class="story-anecdote"><b>轶事</b>　'+parseMath(c.story.story)+'</div>':'')
      +'</div>';
  }
  /* 讲义正文（旧版 .sec 分节，纸面直排） */
  (c.sections||[]).forEach(function(sec,si){
    h+='<div class="sec"><h4><em>§'+(si+1)+'</em>'+esc(sec.t)+'</h4>'
      +'<p>'+parseMath(sec.p)+'</p>'
      +(sec.formula?'<div class="formula">'+parseMath(sec.formula)+'</div>':'')
      +'</div>';
  });
  /* 例题（内心独白式解题） */
  if(c.example){
    h+='<div class="card"><h3>例题 · 先想再做</h3><div class="example"><div class="lbl">SOLVE WITH YOUR INNER MONOLOGUE</div>'
      +'<p><b>'+parseMath(c.example.q)+'</b></p><p>'+parseMath(c.example.s)+'</p>'
      +'<p style="font-size:13px;color:var(--ink2);margin-top:8px">先挡住解答自己试做，再对照这段「思考过程」——注意看是怎么想出来的，而不是只看写了什么。</p>'
      +'</div></div>';
  }
  /* 易错陷阱 */
  if(c.traps&&c.traps.length){
    h+='<div class="card"><h3>易错陷阱</h3>'+c.traps.map(function(t,ti){return '<div class="trap"><b>陷阱'+(ti+1)+'</b>　'+parseMath(t)+'</div>';}).join('')+'</div>';
  }
  /* 随堂练习（即时批改） */
  h+='<div class="card"><h3>随堂练习（即时批改）</h3><div class="quizwrap">'+quizCardsHTML(c,mode)+'</div></div>';
  /* 灵魂拷问（旧观感，保留 data-soulgo / soulNote 契约给事件层） */
  if(c.dialogue&&c.dialogue.q){
    var keys=(c.dialogue.keys||[]).slice(0,8);
    h+='<div class="card dia"><h3>灵魂拷问（佩奇的追问）</h3>'
      +'<p style="margin-bottom:8px;color:var(--ink2)">'+parseMath(c.dialogue.q)+'</p>'
      +(keys.length?'<p style="font-size:12.5px;color:var(--muted);margin-bottom:8px">说到这些词才算想透：'+keys.map(function(k){return '「'+esc(k)+'」';}).join(' ')+'</p>':'')
      +'<textarea id="soulTa" placeholder="把你的想法写在这里……"></textarea>'
      +'<div class="act"><button class="primary" data-soulgo="'+c.id+'">交给我自检</button>'
      +(c.dialogue.model?'<button data-soulmodel="'+c.id+'">看参考思路</button>':'')
      +'</div><div class="why-note" id="soulNote"></div></div>';
  }
  /* 结算战报：常驻最下方（已结算显示历史 / 做完可结算 / 未完引导） */
  h+='<div id="settleCard">'+settleCardHTML(c)+'</div>';
  h+='</div>';
  return h;
}
function quizCardsHTML(c,mode){
  var isLesson=mode!=='drill';
  var h='';
  (c.quiz||[]).forEach(function(q,qi){
    var k=c.id+'_'+qi;
    var hist=(isLesson)?(quizStat[k]):undefined;
    var done=hist!==undefined;
    var pv=quizPick[k];
    h+='<div class="quiz'+(done?' done':'')+'" data-k="'+k+'">'
      +'<div class="q"><span class="qn">Q'+(qi+1)+'</span>'+(done?'<span class="hall-done-tag">✓ 已做</span>':'')+parseMath(q.q)+'</div>';
    if(q.type==='fill'){
      h+='<div class="fillrow"><input id="fin'+qi+'" data-fill="'+qi+'" placeholder="输入答案"'+(done&&pv!==undefined?' value="'+esc(pv)+'" disabled':'')+'><button data-fillgo="'+qi+'"'+(done?' disabled':'')+'>批改</button></div>';
    } else if(q.type==='code'){
      /* Python 代码题：编辑器 + 运行/判题/看解（pyodide 真运行） */
      var starter='';
      var showCode=(done&&pv!==undefined)?pv:(q.start||starter);
      h+='<div class="codebox">'
        +'<div class="cb-head"><span class="lb">✏️ 写代码</span>'+(q.expect?'<span class="lb" style="color:var(--muted)">期望输出：'+esc(String(q.expect).split('|').join(' 或 '))+'</span>':'')+'</div>'
        +'<textarea class="py-ta" id="pyta'+qi+'" placeholder="在下方编写代码…" spellcheck="false" data-py="'+qi+'" data-starter="'+esc(starter)+'"'+(done?' readonly':'')+'>'+esc(showCode)+'</textarea>'
        +'<div class="code-actions">'
        +'<button class="mini-btn lift" data-pyrun="'+qi+'"'+(done?' disabled':'')+'>▶ 运行</button>'
        +'<button class="mini-btn lift" data-pycheck="'+qi+'" style="background:linear-gradient(135deg,#34C759,#28A745);color:#fff"'+(done?' disabled':'')+'>✓ 判题</button>'
        +'<button class="mini-btn lift" data-pyans="'+qi+'" style="background:var(--fill-soft)"'+(done?' disabled':'')+'>👁 参考解</button>'
        +'</div>'
        +'<pre class="pyout" id="pyout'+qi+'"'+(done&&pv!==undefined?' style="display:block"':'')+'>'+(done&&pv!==undefined?esc(pv):'')+'</pre>'
        +'<div class="py-status" id="pyst'+qi+'"></div>'
        +(q.hint?'<div style="font-size:12.5px;color:var(--muted);margin-top:6px;line-height:1.6">💡 '+esc(q.hint)+'</div>':'')+''
        +'</div>';
    } else {
      h+='<div class="opts" id="qbox'+qi+'">';
      ['A','B','C','D'].slice(0,(q.options||[]).length).forEach(function(k2,i){
        var cls='opt';
        if(done){
          cls+=' lock';
          if(hist===1){ if(i===q.answer) cls+=' correct'; }
          else { if(i===pv&&i!==q.answer) cls+=' wrong'; if(i===q.answer) cls+=' correct muted'; }
        }
        h+='<div class="'+cls+'" data-q="'+qi+'" data-i="'+i+'" data-o="'+i+'"'+(done?' data-lock="1"':'')+'>'+k2+'. '+parseMath(q.options[i])+'<span class="mark" style="display:none"></span></div>';
      });
      h+='</div>';
    }
    h+='<div class="why-note'+(hist===1?' why-ok':(hist===0?' why-no':''))+'" id="whyNote'+qi+'">';
    if(hist===1) h+='<div class="why-body"><span class="why-ic"></span><span><b>上次答对了。</b>'+esc(q.explain||'')+'</span></div>';
    else if(hist===0) h+='<div class="why-body"><span class="why-ic"></span><span><b>上次答错，正确答案已标出：</b>'+esc(q.explain||'')+'</span></div>'+(q.type==='code'?'<button class="retry-btn" data-retry="'+qi+'">↻ 重新作答</button>':'');
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
  h+='<button class="tile lift" data-go="lab"><span class="t-ico" style="background:linear-gradient(135deg,#0A84FF,#5E5CE6)">'+IC('flask')+'</span><b>代码游乐场</b><span class="cap">随便写点 Python</span></button>';
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
    } else if(q.type==='code'){
      /* 小卷 code 题 */
      var est='';
      var eshow=(hist!==undefined&&quizPick[k]!==undefined)?quizPick[k]:(q.start||est);
      h+='<div class="codebox">'
        +'<div class="cb-head"><span class="lb">✏️ 写代码</span>'+(q.expect?'<span class="lb" style="color:var(--muted)">期望输出：'+esc(String(q.expect).split('|').join(' 或 '))+'</span>':'')+'</div>'
        +'<textarea class="py-ta" id="epyta'+qi+'" placeholder="在下方编写代码…" spellcheck="false" data-epy="'+qi+'" data-starter="'+esc(est)+'"'+(hist!==undefined?' readonly':'')+'>'+esc(eshow)+'</textarea>'
        +'<div class="code-actions">'
        +'<button class="mini-btn lift" data-epyrun="'+qi+'"'+(hist!==undefined?' disabled':'')+'>▶ 运行</button>'
        +'<button class="mini-btn lift" data-epycheck="'+qi+'" style="background:linear-gradient(135deg,#34C759,#28A745);color:#fff"'+(hist!==undefined?' disabled':'')+'>✓ 判题</button>'
        +'<button class="mini-btn lift" data-epyans="'+qi+'" style="background:var(--fill-soft)"'+(hist!==undefined?' disabled':'')+'>👁 参考解</button>'
        +'</div>'
        +'<pre class="pyout" id="epyout'+qi+'"'+(hist!==undefined?' style="display:block"':'')+'>'+(hist!==undefined&&quizPick[k]!==undefined?esc(quizPick[k]):'')+'</pre>'
        +'<div class="py-status" id="epyst'+qi+'"></div>'
        +(q.hint?'<div style="font-size:12.5px;color:var(--muted);margin-top:6px;line-height:1.6">💡 '+esc(q.hint)+'</div>':'')+''
        +'</div>';
    } else {
      ['A','B','C','D'].slice(0,(q.options||[]).length).forEach(function(k2,i){
        var cls='opt'+(hist===0&&quizPick[k]===i?' wrong':'')+(hist===1&&i===q.answer?' correct':(hist===0&&i===q.answer?' correct muted':''));
        h+='<button class="'+cls+'" data-eq="'+qi+'" data-i="'+i+'"'+(hist!==undefined?' data-lock="1"':'')+'><span class="k">'+k2+'</span><span>'+parseMath(q.options[i])+'</span><span class="mark">'+IC('check')+'</span></button>';
      });
    }
    h+='</div><div class="why-note'+(hist===1?' why-ok':(hist===0?' why-no':''))+'" id="ewhyNote'+qi+'">';
    if(hist===1) h+='<div class="why-body"><span class="why-ic">'+IC('check')+'</span><span><b>答对了。</b>'+esc(q.explain||'')+'</span></div>';
    else if(hist===0) h+='<div class="why-body"><span class="why-ic">'+IC('info')+'</span><span><b>上次答错，正确答案：「'+parseMath(q.options[q.answer])+'」</b><br>'+esc(q.explain||'')+'</span></div>'
      +(q.type==='code'?'<button class="retry-btn" data-etry="'+qi+'">↻ 重新作答</button>':'');
    h+='</div></div>';
  });
  return h;
}

/* ============ 我的 Tab ============ */
renderers.mine=function(){
  var s=calcStats(), streak=calcStreak(), rk=curRank(s.pct);
  var h='<div class="kick">PROFILE</div><div class="h1">我的</div>'
    +'<div class="sub">账号、战果与设置（本版进度存本浏览器）</div>';
  var _usr=(typeof sbUser==='function')?sbUser():null;
  var _acctName=_usr?( _usr.nick||_usr.username||_usr.email||'已登录' ):'本地模式 · 未登录';
  var _acctSub=_usr?('云同步已开启 · 做完自动上传'):('学习记录仅存本机 · 点此登录云端');
  h+='<button class="account-card" data-acct style="display:flex;align-items:center;gap:14px;width:100%;border-radius:var(--r-l);border:1px solid var(--sep);background:var(--card);padding:16px;text-align:left;font-family:inherit;cursor:pointer;color:var(--ink);box-shadow:var(--sh-card)">'
    +'<span style="width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#0A84FF,#5E5CE6);display:flex;align-items:center;justify-content:center;color:#fff;flex:none;font-size:24px">'+( _usr&&_usr.avatar?esc(_usr.avatar):'🐹')+'</span>'
    +'<span style="min-width:0;flex:1"><b style="font-size:18px;display:block">'+esc(_acctName)+'</b>'
    +'<span style="font-size:13px;color:var(--ink2);margin-top:2px;line-height:1.5;display:block;min-width:0">'+rk.name+' · 已学 '+s.doneC+'/'+s.totalC+' 章 · 小卷 '+s.examFull+' 份</span>'
    +'<span style="font-size:12px;color:var(--muted);margin-top:3px;line-height:1.5;display:block;min-width:0">'+esc(_acctSub)+' · 连签 '+streak+' 天 · 总进度 '+s.pct+'%</span></span>'
    +'<span class="garr" style="flex:none">'+IC('chev-r')+'</span></button>';
  h+='<div class="sec-title">ACHIEVE 成就</div><div class="tiles">';
  var MG=[
    {g:'calendar',ico:'calendar',bg:'linear-gradient(135deg,#34C759,#28A745)',t:'打卡日历',c:streak+' 天连签'},
    {g:'rank',ico:'flag',bg:'linear-gradient(135deg,#FFD60A,#FF9500)',t:'排行榜',c:'全院真人榜'},
    {g:'honor',ico:'trophy',bg:'linear-gradient(135deg,#AF52DE,#7D2AE0)',t:'荣誉墙',c:rk.name+' · '+s.pct+'%'},
    {g:'stats',emo:'📊',bg:'linear-gradient(135deg,#5E5CE6,#5856D6)',t:'进度总览',c:'全部学习数据'}
  ];
  MG.forEach(function(x){
    h+='<button class="tile lift" data-go="'+x.g+'"><span class="t-ico" style="background:'+x.bg+'">'+(x.emo?x.emo:IC(x.ico))+'</span><b>'+x.t+'</b><span class="cap">'+x.c+'</span></button>';
  });
  h+='</div>';
  h+='<div class="sec-title">SYSTEM 设置</div><div class="group">';
  var _u2=(typeof sbUser==='function')?sbUser():null;
  var SETS=[
    {acct:1,ico:'person',bg:'linear-gradient(135deg,#0A84FF,#5E5CE6)',t:'账号管理',v:(_u2?('登录：'+esc(_u2.nick)):'未登录 · 去总院登录')},
    {ico:'moon',bg:'linear-gradient(135deg,#5856D6,#AF52DE)',t:'外观',v:themeLabel(),act:'theme'},
    {ico:'doc',bg:'linear-gradient(135deg,#0A84FF,#5E5CE6)',t:'数据管理',v:'导出 / 导入 / 清除（本地 + 云端）',act:'manage'}
  ];
  SETS.forEach(function(x){
    var attr=x.acct?' data-acct="1"':(x.act?' data-go="'+x.act+'"':'');
    h+='<button class="grow"'+(x.act==='theme'?' id="themeRow"':'')+attr+'>'
      +'<span class="gi" style="background:'+x.bg+'">'+IC(x.ico)+'</span><b>'+x.t+'</b>'
      +'<span class="gv"'+(x.act==='theme'?' id="themeVal"':'')+'>'+x.v+'</span>'
      +'<span class="garr">'+IC('chev-r')+'</span></button>';
  });
  h+='</div>';
  h+='<div class="group">';
  var GROUPS=[
    {ico:'info',bg:'linear-gradient(135deg,#8E8E93,#5A5A5E)',t:'关于学院',v:'样张真版 · '+APP_VER,g:'about'},
    {ico:'person',bg:'linear-gradient(135deg,#0A84FF,#5E5CE6)',t:'作者与幕后',v:'鼠哥 × 拉里·佩奇',g:'author'},
    {emo:'💬',bg:'linear-gradient(135deg,#0A84FF,#5E5CE6)',t:'讨论区',v:'大家说说话 · 交换进度',g:'board'},
    {emo:'📮',bg:'linear-gradient(135deg,#AF52DE,#7D2AE0)',t:'反馈意见',v:'说点什么 · 建议直达',g:'feedback'}
  ];
  GROUPS.forEach(function(x){
    h+='<button class="grow" data-go="'+x.g+'"><span class="gi" style="background:'+x.bg+';font-size:17px">'+(x.emo?x.emo:IC(x.ico))+'</span>'
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
  try{ localStorage.setItem('acad_theme', t); }catch(e){}  /* 共享键：总门户/跨院跟随 */
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

/* ============ 荣誉墙（整块移用自 chip.html.bak-ios：称号阶梯 + 徽章墙 + 名人堂 + 资料卡） ============ */
var PORTRAITS={}; /* Python 学院无画像表（story.img 空），走首字母头像 */ /* 旧版荣誉墙名人像空表（无画像数据时走首字母头像分支） */
renderers.honor=function(){
  var s=calcStats(), rk=curRank(s.pct);
  var pct=s.pct;
  var curIdx=0;
  for(var i=0;i<RANKS.length;i++){ if(pct>=RANKS[i][0]) curIdx=i; }
  var stairs=RANKS.map(function(r,i){
    var cls=i<curIdx?'done':(i===curIdx?'cur':'');
    var mark=i<curIdx?'✓':(i===curIdx?'👑':'');
    return '<div class="rank-step '+cls+'"><div class="rv">'+mark+' '+r[0]+'%</div><div class="rn">'+r[1]+'</div></div>';
  }).join('');
  var icons=['📜','🔺','🌀','⚔️','🖋️','🧮','∑','🎓','📝','🏅','🧹','🚀','📆','👑'];
  var bd=badgeState(s);
  var bcards=bd.map(function(b,i){
    return '<div class="hw-card'+(b.got?' got':'')+'"><div class="hc"><div class="hic">'+(icons[i]||'⭐')+'</div><div class="hn">'+b.n+'</div></div><div class="hd">'+b.d+'</div><div class="hst">'+(b.got?'✦ 已解锁':'未解锁')+'</div></div>';
  }).join('');
  var palette=[['#537D96','#3F6179'],['#8a6d1f','#5c4714'],['#9D5F4D','#6e3f31'],['#3a6b47','#264a30'],['#6b5b8e','#463a5e'],['#a8733a','#6e4a1f']];
  var hall=CHAPTERS.filter(function(c){ return c.story && c.story.tutor; }).map(function(c,i){
    var p=palette[i%palette.length];
    var nm=c.story.tutor.replace(/（.*/,'').trim();
    var first=nm.charAt(0);
    var quote=(c.story.quote||'').replace(/^「/,'').replace(/」.*$/,'').trim();
    var lit=chIsDone(c);
    var portrait=(c.story.img && PORTRAITS[c.story.img])
      ? '<img src="'+PORTRAITS[c.story.img]+'" alt="'+esc(nm)+'" class="mh-img">'
      : '<div class="mh-avatar" style="background:linear-gradient(135deg,'+p[0]+','+p[1]+')">'+first+'</div>';
    return '<div class="mh-card'+(lit?' lit':'')+'" data-c="'+c.id+'"'+(lit?' title="点击查看 '+esc(nm)+' 的资料卡"':' title="学完本章点亮并解锁资料卡"')+'>'+portrait+'<div class="mh-info"><div class="mh-name">'+esc(nm)+(lit?' <span class="mh-lit">✦ 已学</span>':'')+'</div><div class="mh-era">'+esc(c.story.era||'')+' · 第 '+c.id+' 章</div><div class="mh-quote">'+esc(quote)+'</div>'+(lit?'<div class="mh-open">点击查看资料卡 →</div>':'<div class="mh-lock">🔒 学完本章解锁</div>')+'</div></div>';
  }).join('');
  var h='<div class="kick">HONOR</div><div class="h1">荣誉墙</div>'
    +'<div class="sub">称号按已学章节推进，徽章记录你的历史时刻，学完一章点亮一位编程人物</div>'
    +'<div id="legacy-honor">'
    +'<div class="card"><h3>👑 称号阶梯</h3><p class="hint">当前称号：<b style="color:#8a6d1f">'+RANKS[curIdx][1]+'</b> · 总进度 '+pct+'%'+(curIdx<RANKS.length-1 ? ' · 距「'+RANKS[curIdx+1][1]+'」还差 '+(RANKS[curIdx+1][0]-pct)+'%' : ' · 已达最高荣誉')+'</p><div class="rank-stairs">'+stairs+'</div></div>'
    +'<div class="card"><h3>🏅 徽章墙</h3><div class="badge-grid">'+bcards+'</div></div>'
    +'<div class="card"><h3>📜 人物名人堂</h3><p class="hint">学完本章点亮对应人物，点亮后可点击查看资料卡。点亮越多，名人堂越亮。</p><div class="hall-grid">'+hall+'</div></div>'
    +'</div>';
  setTimeout(function(){
    var root=document.getElementById('legacy-honor');
    if(!root) return;
    root.querySelectorAll('.mh-card.lit').forEach(function(card){
      card.addEventListener('click', function(){ showMathematician(CHAPTERS[+card.dataset.c-1]); });
    });
  },60);
  return h;
};
/* 名人资料卡弹层（移用自旧版） */
function showMathematician(c){
  if(!c || !c.story) return;
  var nm=c.story.tutor.replace(/（.*/,'').trim();
  var first=nm.charAt(0);
  var palette=[['#537D96','#3F6179'],['#8a6d1f','#5c4714'],['#9D5F4D','#6e3f31'],['#3a6b47','#264a30'],['#6b5b8e','#463a5e'],['#a8733a','#6e4a1f']];
  var p=palette[(c.id-1)%palette.length];
  var portrait=(c.story.img && PORTRAITS[c.story.img])
    ? '<img src="'+PORTRAITS[c.story.img]+'" style="width:110px;height:130px;border-radius:14px;object-fit:cover;border:2px solid #d4a92a;box-shadow:0 8px 24px rgba(0,0,0,.35)">'
    : '<div style="width:110px;height:110px;border-radius:50%;background:linear-gradient(135deg,'+p[0]+','+p[1]+');display:flex;align-items:center;justify-content:center;font-size:50px;color:#fff;font-family:Georgia,serif;box-shadow:0 8px 24px rgba(0,0,0,.35)">'+first+'</div>';
  var wrap=document.createElement('div');
  wrap.className='mh-modal';
  wrap.style.cssText='position:fixed;inset:0;background:rgba(30,26,20,.72);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px)';
  wrap.addEventListener('click', function(e){ if(e.target===wrap) wrap.remove(); });
  var box=document.createElement('div');
  box.style.cssText='background:linear-gradient(160deg,#fbf6ea,#f3e7c9);border-radius:22px;padding:30px 34px;max-width:660px;width:100%;border:2px solid #d4a92a;box-shadow:0 24px 80px rgba(0,0,0,.45);max-height:90vh;overflow:auto';
  box.innerHTML=
    '<div style="text-align:center;margin-bottom:16px">'+portrait+'</div>'+
    '<div style="text-align:center"><div style="font-size:25px;font-weight:600;letter-spacing:2px;color:#2d2a26">'+esc(nm)+'</div>'+
    '<div style="font-size:13px;color:var(--muted);margin-top:5px">'+esc(c.story.era||'')+' · 第 '+c.id+' 章「'+esc(c.title)+'」</div></div>'+
    '<div style="background:#fffdf6;border:1px solid var(--line);border-radius:14px;padding:16px 18px;margin-top:16px;font-size:14px;line-height:1.85;color:var(--ink2);border-left:3px solid #b8860b">'+parseMath(c.story.fact||'')+'</div>'+
    (c.story.quote ? '<div style="font-style:italic;color:#8a6d1f;text-align:center;margin:16px 0 4px;font-size:15px">'+esc(c.story.quote)+'</div>' : '')+
    (c.story.story ? '<div style="background:rgba(157,95,77,.07);border:1px solid rgba(157,95,77,.2);border-radius:12px;padding:13px 16px;margin-top:12px;font-size:13.5px;color:var(--ink2);line-height:1.75"><b style="color:var(--ochre)">📖 轶事</b>　'+parseMath(c.story.story)+'</div>' : '')+
    '<div style="text-align:center;margin-top:20px"><button class="mh-close" style="border:none;background:linear-gradient(135deg,#b8860b,#d4a92a);color:#fff;border-radius:980px;padding:10px 34px;font-family:inherit;font-size:15px;cursor:pointer;letter-spacing:1px;box-shadow:0 4px 14px rgba(184,134,11,.35)">收下这张名片</button></div>';
  box.querySelector('.mh-close').addEventListener('click', function(){ wrap.remove(); });
  wrap.appendChild(box);
  document.body.appendChild(wrap);
}

/* ============ 进度总览 ============ */
renderers.stats=function(){
  var s=calcStats(), streak=calcStreak(), rk=curRank(s.pct);
  var tq=(stat&&stat.totalQ)?stat.totalQ:0, tc=(stat&&stat.totalCorrect)?stat.totalCorrect:0;
  var bd=badgeState(s), gotN=bd.filter(function(b){return b.got;}).length;
  var acc = tq ? Math.round(tc/tq*100) : 0;
  var pct=s.pct;
  /* 当前档与下一档（进度条刻度） */
  var curAt=0, nextAt=rk.nextAt, curName=rk.name, nextName=rk.next;
  for(var i=0;i<RANKS.length;i++){ if(pct>=RANKS[i][0]){ curAt=RANKS[i][0]; curName=RANKS[i][1]; } }
  var span=(nextAt!==null&&nextAt!==undefined)?(nextAt-curAt):1;
  var innerPct=Math.max(0,Math.min(1,(pct-curAt)/span));
  /* 荣誉调色板（随档位轮换） */
  var PALS=[
    ['linear-gradient(135deg,#0A84FF,#5E5CE6)','#0A84FF'],
    ['linear-gradient(135deg,#FF9F0A,#FF7A00)','#FF9F0A'],
    ['linear-gradient(135deg,#FF453A,#D70015)','#FF453A'],
    ['linear-gradient(135deg,#34C759,#28A745)','#34C759'],
    ['linear-gradient(135deg,#AF52DE,#7D2AE0)','#AF52DE'],
    ['linear-gradient(135deg,#FFD60A,#FF9500)','#FF9500']
  ];
  var idx=0; for(var pi=0;pi<RANKS.length;pi++){ if(pct>=RANKS[pi][0]) idx=pi; }
  var pal=PALS[(idx+1)%PALS.length];
  var C=pal[1], Cg=pal[0];
  /* 进度环（SVG） */
  var R=54, CIRC=2*Math.PI*R;
  var ring='<div style="position:relative;width:132px;height:132px;flex:none">'
    +'<svg width="132" height="132" viewBox="0 0 132 132" style="transform:rotate(-90deg)">'
    +'<circle cx="66" cy="66" r="'+R+'" fill="none" stroke="var(--fill)" stroke-width="10"/>'
    +'<circle cx="66" cy="66" r="'+R+'" fill="none" stroke="'+C+'" stroke-width="10" stroke-linecap="round" '
    +'stroke-dasharray="'+CIRC+'" stroke-dashoffset="'+CIRC*(1-pct/100)+'" style="transition:stroke-dashoffset 1s cubic-bezier(.22,.9,.3,1)"/>'
    +'</svg>'
    +'<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">'
    +'<b style="font-size:26px;color:var(--ink);line-height:1">'+pct+'<span style="font-size:14px">%</span></b>'
    +'<span class="cap" style="margin-top:2px">总进度</span></div></div>';
  var h='<div class="kick">OVERVIEW</div><div class="h1">进度总览</div>'
    +'<div class="sub">'+rk.name+' · 距「'+(rk.next||'满级')+'」还差 '+(rk.nextAt!==null&&rk.nextAt!==undefined?rk.nextAt-pct:'0')+'%</div>';
  /* 称号横幅 */
  h+='<div style="border-radius:24px;padding:20px;color:#fff;background:'+Cg+';box-shadow:0 12px 32px rgba(0,0,0,.18);display:flex;align-items:center;gap:16px;position:relative;overflow:hidden">'
    +'<div style="position:absolute;right:-30px;top:-30px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.12)"></div>'
    +'<div style="position:absolute;right:30px;bottom:-50px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.08)"></div>'
    +'<div style="width:60px;height:60px;border-radius:20px;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-size:30px;flex:none;backdrop-filter:blur(4px)">'
    +(idx===0?'🌱':idx>=RANKS.length-2?'👑':'🏆')+'</div>'
    +'<div style="flex:1;min-width:0;position:relative;z-index:1">'
    +'<div style="font-size:11px;font-weight:800;letter-spacing:1.6px;opacity:.85">CURRENT RANK</div>'
    +'<b style="font-size:21px;display:block;margin-top:2px">'+curName+'</b>'
    +'<div style="height:6px;background:rgba(255,255,255,.25);border-radius:3px;margin-top:9px;overflow:hidden">'
    +'<i style="display:block;height:100%;width:'+Math.round(innerPct*100)+'%;background:#fff;border-radius:3px;transition:width .8s"></i></div>'
    +'<div style="font-size:11.5px;opacity:.9;margin-top:5px;display:flex;justify-content:space-between"><span>'+curAt+'%</span><span>'+(rk.next||'满级')+' · '+(nextAt!==null&&nextAt!==undefined?nextAt+'%':'MAX')+'</span></div>'
    +'</div></div>';
  /* 中央行：进度环 + 今日/连签 */
  h+='<div style="display:flex;align-items:center;gap:18px;margin-top:14px">'
    +ring
    +'<div style="flex:1;display:grid;grid-template-columns:1fr;gap:8px">'
    +'<div style="display:flex;align-items:center;gap:10px;background:var(--card);border-radius:16px;padding:10px 14px;box-shadow:var(--sh-card)"><span style="font-size:22px">🔥</span><div><b style="font-size:15px;display:block">'+streak+' 天</b><span class="cap">连续打卡</span></div></div>'
    +'<div style="display:flex;align-items:center;gap:10px;background:var(--card);border-radius:16px;padding:10px 14px;box-shadow:var(--sh-card)"><span style="font-size:22px">🎯</span><div><b style="font-size:15px;display:block">'+acc+'%</b><span class="cap">答题正确率</span></div></div>'
    +'</div></div>';
  /* 数据六宫格 */
  var D=[
    {ico:'📖',v:s.doneC+'/'+s.totalC,l:'已学章节'},
    {ico:'📝',v:s.examFull+'/'+s.examTotal,l:'小卷已做'},
    {ico:'🧮',v:tq,l:'累计答题'+(tc?'':'')},
    {ico:'✍️',v:tc,l:'累计答对'},
    {ico:'🎖️',v:gotN+'/'+bd.length,l:'徽章解锁'},
    {ico:'🧹',v:s.wrongPool,l:'待订正错题'}
  ];
  h+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px">';
  D.forEach(function(d){
    h+='<div style="background:var(--card);border-radius:18px;padding:12px 6px;text-align:center;box-shadow:var(--sh-card);border:1px solid var(--sep)">'
      +'<div style="font-size:20px;line-height:1">'+d.ico+'</div>'
      +'<b style="font-size:17px;display:block;margin-top:5px">'+d.v+'</b>'
      +'<span class="cap" style="display:block;margin-top:2px">'+d.l+'</span></div>';
  });
  h+='</div>';
  return h;
};
/* ============ 实验室（Python 代码游乐场 · 动手练手） ============ */
renderers.lab=function(){
  var h='<div class="kick">PY SANDBOX</div><div class="h1">代码游乐场</div>'
    +'<div class="sub">不判题、不打卡，纯练手。随便写点 Python，看它跑出什么。</div>';
  h+='<div class="card" style="border-radius:var(--r-l)">'
    +'<b>✏️ 试试这些：</b>'
    +'<div style="font-size:13px;color:var(--ink2);line-height:1.9;margin:6px 0 10px">'
    +'<code style="background:var(--fill-soft);padding:2px 6px;border-radius:6px">print("Hello!")</code>　'
    +'<code style="background:var(--fill-soft);padding:2px 6px;border-radius:6px">for i in range(5): print(i*i)</code>　'
    +'<code style="background:var(--fill-soft);padding:2px 6px;border-radius:6px">[x for x in range(10) if x%2]</code><br>'
    +'<span style="color:var(--muted)">首次运行需联网加载 Python 运行时（约 10 秒）。</span></div>'
    +'<textarea class="py-ta" id="sandTa" spellcheck="false" style="min-height:180px">print("Hello, Python!")</textarea>'
    +'<div class="code-actions"><button class="mini-btn lift" id="sandRun" style="background:linear-gradient(135deg,#0A84FF,#5E5CE6);color:#fff">▶ 运行</button>'
    +'<button class="mini-btn lift" id="sandClear" style="background:var(--fill-soft)">清空输出</button></div>'
    +'<pre class="pyout" id="sandOut" style="display:block;min-height:60px"></pre>'
    +'<div class="py-status" id="sandSt"></div>'
    +'</div>';
  return h;
};
renderers.manage=function(){
  var s=calcStats();
  return '<div class="kick">DATA</div><div class="h1">数据管理</div>'
    +'<div class="sub">导出 / 导入备份 · 清除所有记录（本地与云端一并删除）</div>'
    +'<div class="card" style="border-radius:var(--r-l)">'
    +'<b style="font-size:16px">📦 备份与恢复</b>'
    +'<div class="cap" style="margin:6px 0 12px;line-height:1.7">导出生成一串备份码，换设备 / 清空前粘贴即可恢复；云端登录时进度会自动同步，备份码用作额外保险。</div>'
    +'<textarea id="bkText" style="width:100%;min-height:100px;border:1.5px solid var(--sep);border-radius:14px;padding:12px 14px;font-family:ui-monospace,Consolas,monospace;font-size:12px;line-height:1.6;background:var(--bg);color:var(--ink);resize:vertical" placeholder="点「导出备份」生成备份码；或粘贴备份码后点「导入恢复」…"></textarea>'
    +'<div class="mini-row" style="margin-top:10px"><button class="mini-btn lift" id="bkExport">'+IC('doc')+' 导出备份</button>'
    +'<button class="mini-btn lift" id="bkImport">'+IC('download','').replace('</span>','<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg></span>')+' 导入恢复</button></div>'
    +'<div style="height:1px;background:var(--sep);margin:16px 0 14px"></div>'
    +'<b style="color:var(--red);font-size:16px">🗑 清除所有记录</b>'
    +'<div class="cap" style="margin:6px 0 12px;line-height:1.7">将<b>永久删除本地与云端全部记录</b>（章节进度 / 徽章 / 错题 / 足迹 / 打卡 / 云端档案），回到初始状态，不可撤销。为防误触，需输入「清除记录」确认。建议先导出备份。</div>'
    +'<button class="btn-go" id="wipeOpen" style="background:var(--red);box-shadow:0 6px 18px var(--red-soft)">清除所有记录（本地 + 云端）</button>'
    +'<div class="cap" style="margin-top:10px;line-height:1.6;color:var(--muted)">当前：本地游客 · 已学 '+s.doneC+'/'+s.totalC+' 章 · 总进度 '+s.pct+'%</div>'
    +'</div>';
};
;
renderers.about=function(){
  return '<div class="kick">ABOUT</div><div class="h1">关于学院</div>'
    +'<div class="sub">Python 学院 · framework v2 · 对齐样张 + HIG 动效</div>'
    +'<div class="card" style="border-radius:var(--r-l)"><div class="lesson-body">'
    +'<p>Python 入门 30 章 · 语法、数据结构与三个实战项目。讲义 + 随堂题（含代码判题），答完点亮章节。</p>'
    +'<p>界面与动效统一走 <b>Apple 设计语言（framework v2）</b>：双舞台转场、Interactive Pop 跟手返回、Sheet 环境光、滚动视觉降噪、Dock 款悬停；内容为本院真实全书数据，进度按院存于本机（键隔离），打卡四院共通。</p>'
    +'<p>导读人：拉里·佩奇。称号与徽章在荣誉墙可见。</p>'
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
    +'<div><b style="font-size:17px">鼠哥 · 学院发起人</b><div class="cap">西安交通大学 · 大一新生</div></div></div>'
    +'<div style="font-size:14px;color:var(--ink2);line-height:1.9">打乒乓、敲架子鼓（十级）。这个暑假第一次接触 AI agent，一发不可收拾——<b>想让同学都用到自己能动手的硬课学院</b>，于是有了这里。</div>'
    +'<div style="font-size:14px;color:var(--ink2);line-height:1.9;margin-top:8px"><b style="color:var(--ink)">为什么会有这一座座学院？</b><br>'
    +'高数光看 PDF 学不动，想要一个「做题马上批改、错题自己长记性」的地方 → 微积分学院诞生。<br>'
    +'同学说也想学编程 → Python 学院：浏览器里直接写代码、即时判题。<br>'
    +'接着 C 语言学院（浏览器里真编译真运行）、芯片战争学院（读透《芯片战争》）陆续加入。<br>'
    +'最后四院合一，成了现在的鼠哥学院：一个链接，四门硬课，一群同学。</div>'
    +'<div style="margin-top:12px;font-size:12.5px;color:var(--muted);line-height:1.8">每座学院的引擎与内容由拉里·佩奇搭建，方向与组织由鼠哥把关。界面统一走 Apple 设计语言（academy-shell 模版框架）。</div>'
    +'<button class="btn-go" data-go="home" style="margin-top:16px;width:100%;justify-content:center">回去学习</button>'
    +'</div>';
};


/* ===== 丢失功能找回：灵魂拷问自检 + 史话故事卡（通用 helper） ===== */
function storyHTML(c){
  if(!c.story || !c.story.tutor) return '';
  return '<div class="card" style="border-radius:var(--r-l);margin-top:14px">'
    +'<div style="display:flex;gap:13px;align-items:center;margin-bottom:8px">'
    +'<span style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#0A84FF,#5E5CE6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;flex:none;font-family:Georgia,serif">'+esc((c.story.tutor||'?').charAt(0))+'</span>'
    +'<div><b style="font-size:15px">'+esc(c.story.tutor||'')+'</b><div class="cap">'+esc(c.story.era||'')+'</div></div></div>'
    +'<div style="font-size:14px;color:var(--ink2);line-height:1.85">'+parseMath(c.story.fact||'')+'</div>'
    +(c.story.quote?'<div style="margin-top:10px;padding:11px 14px;border-left:3px solid var(--accent);background:var(--fill-soft);border-radius:10px;font-size:14px;color:var(--ink2);line-height:1.7">'+parseMath(c.story.quote)+'</div>':'')
    +(c.story.story?'<div style="margin-top:10px;font-size:13px;color:var(--muted);line-height:1.8">轶事 · '+parseMath(c.story.story)+'</div>':'')
    +'</div>';
}
function soulHTML(c){
  if(!c.dialogue || !c.dialogue.q) return '';
  var keys = (c.dialogue.keys || []).slice(0,8);
  return '<div class="card" style="border-radius:var(--r-l);margin-top:14px">'
    +'<b style="font-size:15px">💬 灵魂拷问</b>'
    +'<div class="q-stem" style="font-size:16px">'+parseMath(c.dialogue.q)+'</div>'
    +(keys.length?'<div class="cap" style="margin-bottom:8px">说到这些词才算想透：'+keys.map(function(k){return '「'+esc(k)+'」';}).join(' ')+'</div>':'')
    +'<textarea id="soulTa" rows="3" placeholder="把你的回答写在这里，先让本学院做关键词初判…" style="width:100%;box-sizing:border-box;border:1.5px solid var(--sep);border-radius:12px;padding:11px 13px;font:14px/1.7 inherit;font-family:inherit;background:var(--bg);color:var(--ink);resize:vertical"></textarea>'
    +'<div class="mini-row" style="margin-top:10px"><button class="mini-btn lift" data-soulgo="'+c.id+'">自检一下</button>'
    +(c.dialogue.model?'<button class="mini-btn lift" data-soulmodel="'+c.id+'" style="background:var(--fill-soft);box-shadow:none">看参考思路</button>':'')
    +'</div><div class="why-note" id="soulNote"></div></div>';
}

/* ===== 学习会话守卫（离开做题页 → 确认；后台/锁屏不拦） ===== */
var _pendingNav = null;
function sessChap(){
  if(window._cur === 'chapter') return chById((_lastNav && _lastNav.chapter) || 1);
  if(window._cur === 'exam') return chById((_lastNav && _lastNav.exam) || 1);
  return null;
}
function sessDone(){
  var c = sessChap(); if(!c) return true;
  if(window._cur === 'chapter'){
    if(chIsDone(c)) return true;
    var sm = chSummary(c);
    return sm.total > 0 && sm.answered >= sm.total;
  }
  if(window._cur === 'exam'){ var st = examStatus(c); return st.total > 0 && st.full; }
  return true;
}
function renderView(id, isBack){
  /* 退出确认统一走 requestNav → confirmBox（calc2 同款）；页面渲染直通 */
  doRenderView(id, isBack);
  try{ if(typeof cmScanLater==='function') cmScanLater(); }catch(e){}
}
