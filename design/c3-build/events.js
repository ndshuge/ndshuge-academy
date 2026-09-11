/* ============================================================
   事件委托 · 静态绑定 · 启动（样张结构保真）
   ============================================================ */
/* toast 单例化：同一时刻只保留一条提示，新提示立即顶掉旧条（鼠哥 2026-09-04） */
function toast(msg, type){
  var box=document.getElementById('toastBox');
  if(!box) return;
  while(box.firstChild) box.removeChild(box.firstChild);
  var isOk = type==='ok' || (msg && msg.indexOf('✓')===0 && typeof type==='undefined');
  var el=document.createElement('div');
  if(isOk){
    el.className='toast ok';
    el.innerHTML='<span class="tk">✓</span><span class="tt">'+msg.replace(/^✓\s*/,'')+'</span>';
    /* 星星粒子（多邻国式欢庆） */
    var P=['★','✦','✓','+1','⭐'];
    var colors=['#FFD900','#FF9600','#FF4D4D','#58CC02','#2B8AFF'];
    for(var i=0;i<8;i++){
      var sp=document.createElement('span');
      sp.className='spark';
      sp.textContent=P[Math.floor(Math.random()*P.length)];
      var a=Math.random()*Math.PI*2, dist=44+Math.random()*52;
      var dx=Math.cos(a)*dist, dy=Math.sin(a)*dist-18;
      sp.style.setProperty('--dx',dx.toFixed(0)+'px');
      sp.style.setProperty('--dy',dy.toFixed(0)+'px');
      sp.style.background='none';
      sp.style.color=colors[Math.floor(Math.random()*colors.length)];
      sp.style.animationDelay=(Math.random()*0.12)+'s';
      el.appendChild(sp);
    }
  } else {
    el.className = type==='no' ? 'toast no' : 'toast';
    el.innerHTML='<span class="ic t-ic">'+(type==='no'?'✕':'✓')+'</span><span>'+msg+'</span>';
  }
  box.appendChild(el);
  setTimeout(function(){ el.classList.add('leaving'); setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); },320); }, isOk?1900:2200);
}
function refreshSettleCard(c){
  try{
    var el=document.getElementById('settleCard');
    if(el && typeof settleCardHTML==='function') el.innerHTML=settleCardHTML(c);
  }catch(e){}
}
function updatePgSub(){
  var el=document.getElementById('pgSub'); if(!el) return;
  if(window._cur==='chapter'){
    var c=chById(_lastNav.chapter||1); if(!c) return;
    var sm=chSummary(c);
    el.textContent='随堂 '+sm.total+' 题 · 已答 '+sm.answered+'/'+sm.total+(sm.answered===sm.total?' · 可结算':'');
  } else if(window._cur==='exam'){
    var c2=chById(_lastNav.exam||1); if(!c2) return;
    var st=examStatus(c2);
    el.textContent=st.total+' 题 · 已答 '+st.answered+'/'+st.total+(st.full?' · 已结算':'');
  }
}
function noteOK(id,html){ var n=document.getElementById(id); if(n){ n.className='why-note why-ok'; n.innerHTML='<div class="why-body"><span class="why-ic">'+IC('check')+'</span><span>'+html+'</span></div>'; } }
function noteNO(id,html){ var n=document.getElementById(id); if(n){ n.className='why-note why-no'; n.innerHTML='<div class="why-body"><span class="why-ic">'+IC('info')+'</span><span>'+html+'</span></div>'; } }
scroller.addEventListener('click',function(e){
  /* 结算按钮 */
  var setBtn=e.target.closest('[data-settle]');
  if(setBtn){ tap(); var c=chById(+setBtn.getAttribute('data-settle')); if(c){ var _ok=settleChapter(c,'lesson'); if(_ok){ try{ refreshSettleCard(c); }catch(e){} } } return; }
  /* 答错后再答一次（随堂） */
  var retry=e.target.closest('[data-retry]');
  if(retry){
    tap();
    var rq=retry.getAttribute('data-retry');
    var cA=chById(_lastNav.chapter||1); if(!cA) return;
    var key=cA.id+'_'+rq;
    delete quizStat[key]; store('quizStat',quizStat);
    var qb=document.getElementById('qbox'+rq);
    if(qb){
      qb.querySelectorAll('.opt').forEach(function(o){
        o.classList.remove('correct','wrong','muted'); o.removeAttribute('data-lock');
        var m=o.querySelector('.mark'); if(m) m.style.display='';
      });
    }
    var wn=document.getElementById('whyNote'+rq); if(wn){ wn.className='why-note'; wn.innerHTML=''; }
    updatePgSub();
    return;
  }
  /* 答错后再答一次（小卷） */
  var etry=e.target.closest('[data-etry]');
  if(etry){
    tap();
    var eq2=etry.getAttribute('data-etry');
    var cV=chById(_lastNav.exam||1); if(!cV) return;
    var ekey='e'+cV.id+'_'+eq2;
    delete quizStat[ekey]; store('quizStat',quizStat);
    var eqb=document.getElementById('eqbox'+eq2);
    if(eqb){
      eqb.querySelectorAll('.opt').forEach(function(o){
        o.classList.remove('correct','wrong','muted'); o.removeAttribute('data-lock');
        var m=o.querySelector('.mark'); if(m) m.style.display='';
      });
    }
    var ewn=document.getElementById('ewhyNote'+eq2); if(ewn){ ewn.className='why-note'; ewn.innerHTML=''; }
    updatePgSub();
    return;
  }
  /* 随堂题作答（chapter 页 / 刷题） */
  var opt=e.target.closest('.opt[data-q]');
  if(opt){
    tap();
    var c=chById(_lastNav.chapter||1); if(!c||!c.quiz) return;
    if(opt.hasAttribute('data-lock')) return;
    var qi=+opt.getAttribute('data-q'), oi=+opt.getAttribute('data-i');
    var q=c.quiz[qi]; if(!q) return;
    var ok=answerQuestion(c,qi,oi);
    var box=document.getElementById('qbox'+qi);
    box.querySelectorAll('.opt').forEach(function(o){
      var ii=+o.getAttribute('data-i');
      o.setAttribute('data-lock','1');
      if(ii===oi) o.classList.add(ok?'correct':'wrong');
      else if(ii===q.answer) o.classList.add('correct','muted');
      if(ii===q.answer){ var m=o.querySelector('.mark'); if(m) m.style.display='inline-flex'; }
    });
    if(ok) noteOK('whyNote'+qi,'<b>答对了。</b>'+esc(q.explain||''));
    else noteNO('whyNote'+qi,'<b>答错了，正确答案：「'+parseMath(q.options[q.answer])+'」</b><br>'+esc(q.explain||'')+(q.type==='code'?'<br><button class="retry-btn" data-retry="'+qi+'">↻ 重新作答</button>':''));
    toast(ok?'✓ 答对':'看解析，再试一次', ok?'ok':'no');
    updatePgSub();
    var sm=chSummary(c);
    if(sm.allDone&&!chIsDone(c)) setTimeout(function(){ if(settleChapter(c,'lesson')){ try{ refreshSettleCard(c); }catch(e){} } },900);
    return;
  }
  /* 小卷题作答 */
  var eopt=e.target.closest('.opt[data-eq]');
  if(eopt){
    tap();
    var cv=chById(_lastNav.exam||1); if(!cv||!cv.exam) return;
    if(eopt.hasAttribute('data-lock')) return;
    var eqi=+eopt.getAttribute('data-eq'), eoi=+eopt.getAttribute('data-i');
    var eq=cv.exam[eqi]; if(!eq) return;
    var eok=answerVol(cv,eqi,eoi);
    var ebox=document.getElementById('eqbox'+eqi);
    ebox.querySelectorAll('.opt').forEach(function(o){
      var ii=+o.getAttribute('data-i');
      o.setAttribute('data-lock','1');
      if(ii===eoi) o.classList.add(eok?'correct':'wrong');
      else if(ii===eq.answer) o.classList.add('correct','muted');
      if(ii===eq.answer){ var m=o.querySelector('.mark'); if(m) m.style.display='inline-flex'; }
    });
    if(eok) noteOK('ewhyNote'+eqi,'<b>答对了。</b>'+esc(eq.explain||''));
    else noteNO('ewhyNote'+eqi,'<b>答错了，正确答案：「'+parseMath(eq.options[eq.answer])+'」</b><br>'+esc(eq.explain||'')+(eq.type==='code'?'<br><button class="retry-btn" data-etry="'+eqi+'">↻ 重新作答</button>':''));
    toast(eok?'✓ 答对':'看解析，再试一次', eok?'ok':'no');
    updatePgSub();
    var est=examStatus(cv);
    if(est.full) setTimeout(function(){ settleVol(cv); },900);
    return;
  }
  /* 填空作答 */
  var fgo=e.target.closest('[data-fillgo]');
  if(fgo){
    tap();
    var cF=chById(_lastNav.chapter||1); if(!cF) return;
    var fi=+fgo.getAttribute('data-fillgo');
    var inp=document.getElementById('fin'+fi);
    var val=(inp&&inp.value||'').trim();
    if(!val){ toast('先输入答案'); return; }
    var fok=answerQuestion(cF,fi,val);
    var fq=cF.quiz[fi];
    if(fok) noteOK('whyNote'+fi,'<b>答对了。</b>'+esc(fq.explain||''));
    else noteNO('whyNote'+fi,'<b>答错了。</b>'+esc(fq.explain||''));
    inp.disabled=true; fgo.disabled=true;
    toast(fok?'✓ 答对':'看解析', fok?'ok':'no');
    updatePgSub();
    var smF=chSummary(cF);
    if(smF.allDone&&!chIsDone(cF)) setTimeout(function(){ if(settleChapter(cF,'lesson')){ try{ refreshSettleCard(cF); }catch(e){} } },900);
    return;
  }
  var efgo=e.target.closest('[data-efillgo]');
  if(efgo){
    tap();
    var cV2=chById(_lastNav.exam||1); if(!cV2) return;
    var efi=+efgo.getAttribute('data-efillgo');
    var einp=document.querySelector('[data-efill="'+efi+'"]');
    var eval2=(einp&&einp.value||'').trim();
    if(!eval2){ toast('先输入答案'); return; }
    var efok=answerVol(cV2,efi,eval2);
    var efq=cV2.exam[efi];
    if(efok) noteOK('ewhyNote'+efi,'<b>答对了。</b>'+esc(efq.explain||''));
    else noteNO('ewhyNote'+efi,'<b>答错了。</b>'+esc(efq.explain||''));
    einp.disabled=true; efgo.disabled=true;
    toast(efok?'✓ 答对':'看解析', efok?'ok':'no');
    updatePgSub();
    if(examStatus(cV2).full) setTimeout(function(){ settleVol(cV2); },900);
    return;
  }
  /* 外观切换（防抖 400ms，避免连点刷屏提示） */
  var tr=e.target.closest('#themeRow');
  if(tr){
    if(window._themeBusy) return;
    window._themeBusy=true;
    setTimeout(function(){ window._themeBusy=false; },400);
    tap();
    var seq=['auto','dark','light'];
    var cur=load('theme','auto');
    var nx=seq[(seq.indexOf(cur)+1)%3];
    setTheme(nx,true);
    return;
  }
  /* 管理页按钮 */
  if(e.target.closest('#bkExport')){ bkExport(); return; }
  if(e.target.closest('#bkImport')){ bkImport(); return; }
  if(e.target.closest('#wipeBtn')){ doWipe(); return; }
  /* 外链 / 分享 */
  var ext=e.target.closest('[data-ext]');
  if(ext){ tap(); var url=ext.getAttribute('data-ext'); if(url) window.open(url,'_blank','noopener'); return; }
  var shb=e.target.closest('[data-share]');
  if(shb){ tap(); shareAcademy(); return; }
  /* 页面跳转：先弹「开始做题」（Duolingo 式），点开始才进题计时 */
  var gc=e.target.closest('[data-go-ch]');
  if(gc){ tap(); showStart('lesson',+gc.getAttribute('data-go-ch')); return; }
  var gd=e.target.closest('[data-go-drill]');
  if(gd){ tap(); showStart('drill',+gd.getAttribute('data-go-drill')); return; }
  var ge=e.target.closest('[data-go-exam]');
  if(ge){ tap(); showStart('exam',+ge.getAttribute('data-go-exam')); return; }
  var g=e.target.closest('[data-go]');
  if(g){
    tap();
    var go2=g.getAttribute('data-go');
    if(go2==='back'){ guardedBack(); }
    else if(renderers[go2]){ requestNav(function(){ go(go2); }); }
    else if(go2==='portal'){ location.href='https://ndshuge.github.io/ndshuge-academy/'; }
    return;
  }
});
/* 章节页模式切换：lesson → drill（重开干净刷题） */
renderers.chapter=function(){
  var cid=_lastNav.chapter||1;
  var c=chById(cid); if(!c) return '<div class="cap">章节不存在</div>';
  startTimer();
  var mode=(_lastNav.mode==='drill')?'drill':'lesson';
  _lastNav.mode=mode;
  var html=chapterHTML(c,mode);
  /* 在头部 sub 上打锚点便于更新已答数 */
  html=html.replace('已答 '+chSummary(c).answered+'/'+chSummary(c).total,'<span id="pgSub">已答 '+chSummary(c).answered+'/'+chSummary(c).total+'</span>');
  html+='<div style="margin-top:16px;text-align:center"><button class="mini-btn lift" data-go="hall" style="background:var(--fill-soft);box-shadow:none"><span class="ic">'+IC('pen')+'</span>回练习大厅</button></div>';
  return html;
};
renderers.exam=function(){
  var eid=_lastNav.exam||1;
  var c=chById(eid); if(!c||!c.exam) return '<div class="cap">本章暂无小卷</div>';
  startTimer();
  var html=examHTML(c);
  html=html.replace('已答 '+examStatus(c).answered+'/'+examStatus(c).total,'<span id="pgSub">已答 '+examStatus(c).answered+'/'+examStatus(c).total+'</span>');
  html+='<div style="margin-top:16px;text-align:center"><button class="mini-btn lift" data-go="vol" style="background:var(--fill-soft);box-shadow:none"><span class="ic">'+IC('doc')+'</span>返回小卷列表</button></div>';
  return html;
};
/* ---------- 备份 / 清除 ---------- */
function bkExport(){
  var pack={
    ch:chDone,hall:hallDone,quizStat:quizStat,quizPick:quizPick,
    wrong:wrongPool,fixed:fixedPool,settle:settleStore,stat:stat,tstat:todayStat,log:studyLog
  };
  var txt;
  try{ txt=btoa(unescape(encodeURIComponent(JSON.stringify(pack)))); }
  catch(e){ txt='ERR'; }
  var ta=document.getElementById('bkText');
  if(ta){ ta.value=txt; ta.focus(); ta.select(); }
  toast('已生成备份码（点击即全选，可复制）');
}
function bkImport(){
  var ta=document.getElementById('bkText');
  var raw=(ta&&ta.value||'').trim();
  if(!raw){ toast('先粘贴备份码'); return; }
  var pack=null;
  try{ pack=JSON.parse(decodeURIComponent(escape(atob(raw)))); }catch(e){}
  if(!pack||!pack.quizStat){ toast('备份码无效'); return; }
  if(pack.ch) store('ch',pack.ch);
  if(pack.hall) store('hall',pack.hall);
  if(pack.quizStat) store('quizStat',pack.quizStat);
  if(pack.quizPick) store('quizPick',pack.quizPick);
  if(pack.wrong) store('wrong',pack.wrong);
  if(pack.fixed) store('fixed',pack.fixed);
  if(pack.settle) store('settle',pack.settle);
  if(pack.stat) store('stat',pack.stat);
  if(pack.tstat) store('tstat',pack.tstat);
  toast('导入成功');
  setTimeout(function(){ location.reload(); },600);
}
function doWipe(){
  if(!window.confirm('确定清除全部学习记录？将回到初始状态，不可恢复。')) return;
  wipeAll();
  toast('已清除，回到初始态');
  setTimeout(function(){ location.reload(); },500);
}
/* 分享学院：复制学习链接（带版本号防缓存），支持系统分享面板 */
function shareAcademy(){
  var url='https://ndshuge.github.io/ndshuge-academy/python.html?v='+encodeURIComponent(APP_VER);
  var done=function(){ toast('已复制学习链接'); };
  if(navigator.share){ navigator.share({title:'Python 学院',text:'跟我一起学 Python：',url:url}).catch(function(){}); return; }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(done,function(){ legacyCopy(url,done); });
  } else legacyCopy(url,done);
}
function legacyCopy(txt,ok){
  var ta=document.createElement('textarea');
  ta.value=txt; ta.style.cssText='position:fixed;left:-9999px';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); ok&&ok(); }catch(e){}
  document.body.removeChild(ta);
}
/* ---------- 结算庆祝关闭 ---------- */
document.getElementById('cClose').addEventListener('click',function(){
  $('#celebrate').classList.remove('show');
  var from=window._cur;
  go('home');
});
/* ---------- 开始做题层（Duolingo 式）：确认后才进题并计时 ---------- */
var startCtx=null;
function ssRow(ic,t,cap){ return '<div class="ss-row"><span class="ic">'+IC(ic)+'</span><div style="flex:1;min-width:0"><b style="display:block">'+t+'</b><span>'+cap+'</span></div></div>'; }
function showStart(kind,id){
  var c=chById(id); if(!c) return;
  startCtx={kind:kind,id:id};
  var kick,title,sub,rows='';
  if(kind==='exam'){
    var st=examStatus(c);
    kick='MINI EXAM '+('0'+id).slice(-2);
    title=esc(c.title)+' · 小卷';
    sub=st.full?'这份卷已结算 · 重做不改变记录':(st.answered>0?'继续上次作答':'答完自动结算点亮打卡');
    rows=ssRow('doc',(c.exam||[]).length+' 题','单选 · 即时批改 · 错题自动归档')
      +ssRow('bolt','30 分钟参考计时','切后台计时挂起，回来继续')
      +(st.answered>0?ssRow('check','已答 '+st.answered+'/'+st.total,'进度已保留'):'');
  } else {
    var sm=chSummary(c), isD=kind==='drill';
    kick='LESSON '+('0'+id).slice(-2);
    title=esc(c.title);
    sub=chIsDone(c)?'本章已点亮 · 可回来重读重做':(c.full?(isD?'按章刷题 · 答对自动移出错题':'讲义 + 随堂题 · 答完自动结算点亮章节'):'待莱布尼茨开讲');
    rows=ssRow('book',sm.total+' 道随堂题','答完即结算 · 不要求满分')
      +ssRow('bolt','30 分钟参考计时','切后台计时挂起，回来继续')
      +(sm.answered>0?ssRow(isD?'pen':'check','已答 '+sm.answered+'/'+sm.total,isD?'可反复重做':'继续上次进度'):'');
  }
  $('#ssKicker').textContent=kick;
  $('#ssTitle').textContent=title;
  $('#ssSub').textContent=sub;
  $('#ssRows').innerHTML=rows;
  /* 两拍式弹出：先显示落起始帧，再加 .show 触发弹簧过渡（rAF + setTimeout 双保险，防个别环境 rAF 节流导致无动画） */
  var sh=document.getElementById('startSheet');
  clearTimeout(sh._hideT);
  sh.classList.remove('show');
  sh.style.display='block';
  void sh.offsetWidth;
  var tryShow=function(){ sh.classList.add('show'); };
  if(window.requestAnimationFrame){ requestAnimationFrame(tryShow); setTimeout(tryShow, 40); }
  else tryShow();
  tap();
}
function closeStart(){
  startCtx=null;
  var el=document.getElementById('startSheet');
  if(el){
    el.classList.remove('show');
    clearTimeout(el._hideT);
    el._hideT=setTimeout(function(){ if(el && !el.classList.contains('show')) el.style.display='none'; },520);
  }
}
function beginStudy(){
  var ctx=startCtx; if(!ctx) return;
  closeStart();
  studyTimerEnter();
  sessSnap();   /* 新会话快照：退出做题页时回滚，本次作答不留 */
  if(ctx.kind==='exam'){ _lastNav.exam=ctx.id; go('exam',ctx.id); startTimer(); }
  else { _lastNav.chapter=ctx.id; _lastNav.mode=(ctx.kind==='drill')?'drill':'lesson'; go('chapter',ctx.id); startTimer(); }
}
/* ---------- 顶栏 / Dock 绑定 ---------- */
$('#btnBack').addEventListener('click',function(){
  tap();
  var _c=window._cur;
  if(_c==='home'||_c==='hall'||_c==='mine'){
    toast('正在前往总学院…');
    setTimeout(function(){ location.href='https://ndshuge.github.io/ndshuge-academy/'; },260);
  } else { guardedBack(); }
});

document.querySelectorAll('.dock-btn').forEach(function(b){
  b.addEventListener('click',function(){
    tap();
    var t=b.getAttribute('data-tab');
    var homeId={learn:'home',drill:'hall',mine:'mine'}[t];
    requestNav(function(){ go(homeId,undefined,'tab'); });
  });
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){ $('#celebrate').classList.remove('show'); dismissConfirm(); closeStart(); if(typeof hideLeaveGuard==='function') hideLeaveGuard(); }
});
/* startSheet DOM 在 script 之后，绑定需等 DOM 就绪 */
document.addEventListener('DOMContentLoaded',function(){
  var goBtn=document.getElementById('ssStart');
  if(goBtn) goBtn.addEventListener('click',function(){ tap(); beginStudy(); });
  var ccBtn=document.getElementById('ssCancel');
  if(ccBtn) ccBtn.addEventListener('click',function(){ tap(); closeStart(); });
  var mk=document.querySelector('#startSheet .ss-mask');
  if(mk) mk.addEventListener('click',function(){ tap(); closeStart(); });
});
/* ---------- 启动 ---------- */
(function(){
  document.getElementById('demoTag').style.display='none';
  try{
    var t=load('theme','auto');
    if(t==='dark') document.documentElement.setAttribute('data-theme','dark');
    else if(t==='light') document.documentElement.setAttribute('data-theme','light');
  }catch(e){}
  initStat();
  mountStaticIcons();
  history.replaceState({view:'home'},'');
  renderView('home',false);
})();

/* Dock 显隐覆盖：三大根页显示，二级页隐藏并收缩底部留白 */
function paintDock(id){
  var m=META[id]||{}; var curTab=m.tab||'learn';
  var root=(id==='home'||id==='hall'||id==='mine');
  try{
    var dk=document.getElementById('dock');
    if(dk) dk.style.display = root ? 'flex' : 'none';
    var sc=document.getElementById('scroller');
    if(sc) sc.style.paddingBottom = root ? '' : '72px';
  }catch(e){}
  var btns=document.querySelectorAll('.dock-btn');
  for(var i=0;i<btns.length;i++){ btns[i].classList.toggle('on', btns[i].getAttribute('data-tab')===curTab); }
}

/* 实验室滑块委托（微积分版：ε-δ / 切线 / 黎曼和 / 单位圆） */
scroller.addEventListener('input',function(ev){
  var t=ev.target; if(!t||t.type!=='range') return;
  var v=null, fn=null;
  if(t.id==='epsS'){ v=document.getElementById('epsV'); fn=drawEps; }
  else if(t.id==='aS'){ v=document.getElementById('aV'); fn=drawTan; }
  else if(t.id==='nS'){ v=document.getElementById('nV'); fn=drawRie; }
  else if(t.id==='thS'){ v=document.getElementById('thV'); fn=drawTri; }
  if(v) v.textContent=t.value;
  if(fn){ try{ fn(); }catch(e){} }
});

scroller.addEventListener('click', function(ev){
  var tc = ev.target.closest('[data-tutor]');
  if(!tc) return;
  var c = CHAPTERS[+tc.getAttribute('data-tutor') - 1];
  if(!c) return;
  if(!chIsDone(c)){ toast('🔒 学完本章解锁此人资料卡'); return; }
  if(typeof showMathematician==='function'){ showMathematician(c); return; }
  chipProfile(c);
});

/* 清除输入确认弹层 */
function showWipeDialog(){
  var wrap = document.createElement('div');
  wrap.id='wipeDlg';
  wrap.style.cssText='position:fixed;inset:0;background:rgba(10,10,14,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;-webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3)';
  wrap.onclick=function(e){ if(e.target===wrap) closeWipeDialog(); };
  var box=document.createElement('div');
  box.style.cssText='background:var(--card);border-radius:24px;padding:24px;max-width:430px;width:100%;box-shadow:var(--sh-float)';
  box.innerHTML='<b style="color:var(--red);font-size:17px">⚠ 清除所有记录</b>'
    +'<div style="color:var(--ink2);font-size:13.5px;line-height:1.8;margin:10px 0">将永久删除<b>本地与云端全部记录</b>：章节进度、徽章、错题、足迹、打卡、云端档案。回到初始状态，不可撤销。<br>输入 <b style="color:var(--red)">清除记录</b> 确认：</div>'
    +'<input id="wipeWord" placeholder="输入「清除记录」" style="width:100%;box-sizing:border-box;border:1.5px solid var(--sep);border-radius:12px;padding:12px 14px;font:14.5px inherit;font-family:inherit;background:var(--bg);color:var(--ink);outline:none">'
    +'<div style="display:flex;gap:10px;margin-top:14px">'
    +'<button id="wipeDo" style="flex:1;height:44px;border:none;border-radius:12px;background:var(--red);color:#fff;font:600 14px inherit;font-family:inherit;cursor:pointer">确认清除</button>'
    +'<button id="wipeNo" style="flex:1;height:44px;border:none;border-radius:12px;background:var(--fill-soft);color:var(--ink2);font:600 14px inherit;font-family:inherit;cursor:pointer">取消</button></div>';
  wrap.appendChild(box);
  document.body.appendChild(wrap);
  var inp=document.getElementById('wipeWord'); if(inp) inp.focus();
  document.getElementById('wipeDo').onclick=function(){
    var v=(inp&&inp.value||'').trim();
    if(v!=='清除记录'){ toast('输入不一致，未清除'); return; }
    /* 先清云端（若已接入登录），再清本地，最后登出回游客态 */
    var doLocal=function(){
      wipeAll();
      try{ if(typeof sbLogout==='function') sbLogout(); }catch(_e){}
      toast('本地与云端记录已清除，回到初始态');
      setTimeout(function(){ location.reload(); },700);
    };
    try{
      if(typeof sbClearCloud==='function'){ toast('正在清除云端…'); sbClearCloud(doLocal); return; }
    }catch(_e){}
    doLocal();
  };
  document.getElementById('wipeNo').onclick=function(){ closeWipeDialog(); };
}
function closeWipeDialog(){ var w=document.getElementById('wipeDlg'); if(w) w.remove(); }
/* 账号管理入口（顶部账号卡）：云接入后由云模块注册 showAcctMgmt 接管 */
scroller.addEventListener('click', function(ev){
  var acc=ev.target.closest('[data-acct]');
  if(!acc) return;
  tap();
  try{ if(typeof showAcctMgmt==='function'){ showAcctMgmt(); return; } }catch(e){}
  toast('云端账号接入中 · 当前为本地模式，学习记录只存本机');
});
scroller.addEventListener('click', function(ev){
  if(ev.target.closest('#wipeOpen')){ showWipeDialog(); return; }
  var sg=ev.target.closest('[data-soulgo]');
  if(sg){
    var ta=document.getElementById('soulTa');
    var c=CHAPTERS[+sg.getAttribute('data-soulgo')-1];
    if(!c||!c.dialogue) return;
    var val=(ta&&ta.value||'').trim();
    if(!val){ toast('先写下你的想法'); return; }
    var ks=(c.dialogue.keys||[]);
    var hit=ks.filter(function(k){ return val.indexOf(k)>-1 || val.indexOf(k.replace(/^\s+|\s+$/g,''))>-1; });
    var note=document.getElementById('soulNote');
    if(note){
      if(hit.length>=Math.min(2,ks.length||2)){
        note.className='why-note why-ok';
        note.innerHTML='<div class="why-body"><span class="why-ic">'+IC('check')+'</span><span><b>自检通过。</b>你提到了 '+hit.length+' 个关键点（'+hit.slice(0,4).map(function(x){return '「'+x+'」';}).join('')+'），思路对路了。想看参考思路就点旁边的按钮。</span></div>';
      } else {
        note.className='why-note why-no';
        note.innerHTML='<div class="why-body"><span class="why-ic">'+IC('info')+'</span><span><b>再想想。</b>目前只踩到 '+hit.length+' 个关键点，试试从「'+((c.dialogue.keys||[]).slice(0,3).join('」「'))+'」这些角度说清楚因果。</span></div>';
      }
    }
    return;
  }
  var sm=ev.target.closest('[data-soulmodel]');
  if(sm){
    var c2=CHAPTERS[+sm.getAttribute('data-soulmodel')-1];
    var note2=document.getElementById('soulNote');
    if(note2&&c2&&c2.dialogue){
      note2.className='why-note why-ok';
      note2.innerHTML='<div class="why-body"><span class="why-ic">'+IC('info')+'</span><span><b>参考思路</b><br>'+esc(c2.dialogue.model||'')+'</span></div>';
    }
  }
});

/* ===== 学习离开守卫弹层（框架玻璃质感；唯一守卫：退出进度不保存） ===== */
function showLeaveGuard(){
  if (document.getElementById('lgWrap')) return;
  var wrap = document.createElement('div');
  wrap.id = 'lgWrap';
  wrap.style.cssText = 'position:fixed;inset:0;background:rgba(10,10,14,.5);z-index:300;display:flex;align-items:center;justify-content:center;padding:22px;-webkit-backdrop-filter:blur(16px) saturate(1.3);backdrop-filter:blur(16px) saturate(1.3)';
  var card = document.createElement('div');
  card.style.cssText = 'background:var(--card);border-radius:24px;padding:24px;max-width:380px;width:100%;box-shadow:var(--sh-float);transform:translateY(16px) scale(.97);opacity:0;transition:transform .36s cubic-bezier(.24,1.42,.4,1),opacity .28s';
  requestAnimationFrame(function(){ card.style.transform = 'translateY(0) scale(1)'; card.style.opacity = '1'; });
  card.innerHTML = '<div style="width:54px;height:54px;border-radius:50%;background:var(--gold-soft);display:flex;align-items:center;justify-content:center;font-size:26px">⏳</div>'
    + '<b style="display:block;font-size:18px;margin-top:12px">学习还没完成</b>'
    + '<div style="color:var(--ink2);font-size:13.5px;line-height:1.8;margin:10px 0 4px"><b>退出后本次作答进度不会保存</b>，回来需要重新作答。<br>挂后台 / 锁屏不算离开，可放心切走再回来继续。</div>'
    + '<div style="display:flex;gap:10px;margin-top:16px">'
    + '<button id="lgStay" style="flex:1;height:46px;border:none;border-radius:14px;background:var(--accent);color:#fff;font:600 14.5px inherit;font-family:inherit;cursor:pointer">继续做题</button>'
    + '<button id="lgLeave" style="flex:1;height:46px;border:none;border-radius:14px;background:var(--red-soft);color:var(--red);font:600 14.5px inherit;font-family:inherit;cursor:pointer">退出并离开</button></div>';
  wrap.appendChild(card);
  wrap.onclick = function(e){ if (e.target === wrap) hideLeaveGuard(); };
  document.body.appendChild(wrap);
  document.getElementById('lgStay').onclick = function(){
    var n = _pendingNav; _pendingNav = null;
    hideLeaveGuard();
    /* _back：顶栏返回被拦，尚未发生任何导航，无需回退 */
    if(n && n._back) return;
    if(n){ if(n.isBack) history.forward(); else history.back(); }
  };
  document.getElementById('lgLeave').onclick = function(){
    var n = _pendingNav; _pendingNav = null;
    hideLeaveGuard();
    if(typeof stopTimer === 'function'){ try{ stopTimer(); }catch(e){} }
    /* 确认退出：回滚本次作答（真正不保存、从头再来） */
    try{ if(typeof sessRoll === 'function') sessRoll(); }catch(e){}
    if(!n) return;
    if(n._back){
      /* 顶栏返回：手动渲染上一页并同步历史，避免 base popstate 再次触发守卫 */
      var st=(typeof STACK!=='undefined'&&STACK)?STACK:null;
      var top=(st&&st.length)?st[st.length-1]:'home';
      if(st&&st.length) st.pop();
      if(typeof doRenderView==='function') doRenderView(top,true);
      try{ history.replaceState({view:top},''); }catch(e){}
    } else {
      if(typeof doRenderView==='function') doRenderView(n.id, n.isBack);
    }
  };
}
function hideLeaveGuard(){ var w = document.getElementById('lgWrap'); if (w) w.remove(); }

/* ===== 学习会话快照 / 回滚（鼠哥定稿：退出做题页即清掉本次作答，真正从头再来） ===== */
var _sessSnapData = null;
function sessSnap(){
  try{
    _sessSnapData = {
      qs: JSON.parse(JSON.stringify(quizStat || {})),
      qp: JSON.parse(JSON.stringify(quizPick || {})),
      wr: (wrongPool || []).slice(),
      fx: (fixedPool || []).slice(),
      hd: (hallDone || []).slice(),
      st: stat ? JSON.parse(JSON.stringify(stat)) : null,
      ts: todayStat ? JSON.parse(JSON.stringify(todayStat)) : null
    };
  }catch(e){ _sessSnapData = null; }
}
function sessRoll(){
  if(!_sessSnapData) return;
  try{
    quizStat = _sessSnapData.qs;  store('quizStat', quizStat);
    quizPick = _sessSnapData.qp;  store('quizPick', quizPick);
    wrongPool = _sessSnapData.wr; store('wrong', wrongPool);
    fixedPool = _sessSnapData.fx; store('fixed', fixedPool);
    hallDone = _sessSnapData.hd;  store('hall', hallDone);
    if(_sessSnapData.st){ stat = _sessSnapData.st; store('stat', stat); }
    if(_sessSnapData.ts){ todayStat = _sessSnapData.ts; store('tstat', todayStat); }
  }catch(e){}
  _sessSnapData = null;
}
/* 关闭 / 刷新兜底：做题未完成直接走也清本次 */
window.addEventListener('pagehide', function(){
  var cw = window._cur;
  if((cw === 'chapter' || cw === 'exam') && typeof sessDone === 'function' && !sessDone()){
    try{ sessRoll(); }catch(e){}
  }
});


/* ================= C 代码判题（c99js 浏览器内编译运行） ================= */
/* 编译器运行时由 build.py 注入（__C_RUNTIME_SRC__ / __C_SELFCOMPILE_SRC__ 已内联于 _c_runtime.js） */
function cShowSt(qi, isE, ok, msg, out){
  var st=document.getElementById((isE?'ecfst':'cfst')+qi);
  var ot=document.getElementById((isE?'ecout':'cout')+qi);
  if(ot){ ot.style.display='block'; ot.textContent=out!==undefined&&out!==''?out:(msg||''); }
  if(st){ st.className='py-status '+(ok?'ok':'no'); st.innerHTML=msg||''; }
}
function cCurCh(isE){
  var cid=isE?((_lastNav&&_lastNav.exam)||1):((_lastNav&&_lastNav.chapter)||1);
  return chById(cid);
}
function cTa(qi,isE){ return document.getElementById((isE?'ecta':'cta')+qi); }
function cGetQuiz(qi,isE){
  var c=cCurCh(isE); if(!c) return null;
  return isE?c.exam[qi]:c.quiz[qi];
}
function cRunTap(qi, isE, isJudge){
  tap();
  var ta=cTa(qi,isE); if(!ta) return;
  var q=cGetQuiz(qi,isE); if(!q) return;
  var key=(isE?'e':'')+cCurCh(isE).id+'_'+qi;
  var src=cmVal(ta);
  quizPick[key]=src; store('quizPick',quizPick);
  var st=document.getElementById((isE?'ecfst':'cfst')+qi);
  var ot=document.getElementById((isE?'ecout':'cout')+qi);
  if(st) st.textContent='编译运行中…（首次需加载 C 编译器，约 2-5 秒）';
  if(ot){ ot.style.display='block'; ot.textContent=''; }
  var run=function(){
    if(typeof ensureCrt!=='function'||typeof cRun!=='function'){ if(st) st.textContent='C 编译器未就绪'; return; }
    ensureCrt(function(){
      var r=cRun(src,'');
      if(!r.ok){
        cShowSt(qi,isE,false,'❌ 还没跑通，看报错修一修',r.error||r.stdout||'编译错误');
        return;
      }
      if(!isJudge){
        cShowSt(qi,isE,true,'✓ 运行完成（编译通过）',r.stdout||'(无输出)');
        return;
      }
      var gotT=String(r.stdout||'').trim();
      var exps=String(q.expect||'').split('|').map(function(x){return x.trim();});
      var ok=false;
      if(!String(q.expect||'').trim()) ok=true;
      else for(var i=0;i<exps.length;i++){ if(exps[i]===gotT||exps[i]===gotT.replace(/\s+$/,'')){ok=true;break;} }
      if(ok){
        quizStat[key]=1; store('quizStat',quizStat);
        poolMove(key,true); todayRecord(true); statRecordQ(true);
        try{ logStudy('quiz',cCurCh(isE).id,cCurCh(isE).title); if(typeof sbNotify==='function') sbNotify(); }catch(e){}
        cShowSt(qi,isE,true,'✓ 编译运行通过，输出正确！',r.stdout||'(无输出)');
        var whyId=(isE?'ewhyNote':'whyNote')+qi;
        noteOK(whyId,'<b>代码判题通过！</b>'+(q.explain?esc(q.explain):''));
        var qz=ta.closest('.quiz'); if(qz) qz.classList.add('done');
        if(!isE){ updatePgSub(); var sm=chSummary(cCurCh(false)); if(sm.allDone&&!chIsDone(cCurCh(false))) setTimeout(function(){ try{ if(settleChapter(cCurCh(false),'lesson')) refreshSettleCard(cCurCh(false)); }catch(e){} },900); }
        else { var st2=examStatus(cCurCh(true)); if(st2.full) setTimeout(function(){ try{ settleVol(cCurCh(true)); }catch(e){} },500); }
      } else {
        quizStat[key]=0; store('quizStat',quizStat);
        poolMove(key,false); todayRecord(false); statRecordQ(false);
        try{ logStudy('quiz',cCurCh(isE).id,cCurCh(isE).title); if(typeof sbNotify==='function') sbNotify(); }catch(e){}
        cShowSt(qi,isE,false,'✗ 输出不对，期望：「'+exps.join(' 或 ')+'」',r.stdout||'(无输出)');
        var whyId2=(isE?'ewhyNote':'whyNote')+qi;
        noteNO(whyId2,'<b>输出不对，对照期望再调。</b>'+(q.hint?'<br>💡 '+esc(q.hint):''));
      }
    });
  };
  run();
}
function cShowAns(qi,isE){
  tap();
  var q=cGetQuiz(qi,isE); if(!q) return;
  var ta=cTa(qi,isE);
  var key=(isE?'e':'')+cCurCh(isE).id+'_'+qi;
  var st=document.getElementById((isE?'ecfst':'cfst')+qi);
  if(ta && quizStat[key]===undefined){ cmSet(ta,q.code||''); if(st) st.innerHTML='<span style="color:var(--ochre)">👁 已填入参考解，可自行运行观察输出。</span>'; }
  else if(ta && st) st.textContent='已做锁定，不能覆盖。';
}
/* 代码填空：收集 ___N___ 输入 -> 拼 template -> cRun 判期望输出 */
function cFillRun(qi,isE){
  tap();
  var box=document.querySelector((isE?'[data-efill="'+qi+'"]':'[data-fill="'+qi+'"]'));
  if(!box) return;
  var q=cGetQuiz(qi,isE); if(!q||!q.template) return;
  var key=(isE?'e':'')+cCurCh(isE).id+'_'+qi;
  var st=document.getElementById((isE?'ecfst':'cfst')+qi);
  var ot=document.getElementById((isE?'ecout':'cout')+qi);
  if(st) st.textContent='编译运行中…（首次约 2-5 秒）';
  if(ot){ ot.style.display='block'; ot.textContent=''; }
  var ins=box.querySelectorAll('.fill-in');
  var vals={}, missing=false;
  ins.forEach(function(inp){ vals[inp.dataset.n]=inp.value; if(!inp.value.trim()) missing=true; });
  if(missing){ if(st) st.textContent='还有空没填，先填完再判题'; return; }
  var code=q.template.replace(/___(\d+)___/g,function(m,n){ return vals[n]!==undefined?vals[n]:''; });
  quizPick[key]=code; store('quizPick',quizPick);
  var run=function(){
    ensureCrt(function(){
      var r=cRun(code,'');
      if(!r.ok){ cShowSt(qi,isE,false,'❌ 还没跑通，看报错信息修一修',r.error||r.stdout||''); return; }
      var gotT=String(r.stdout||'').trim();
      var exps=String(q.expect||'').split('|').map(function(x){return x.trim();});
      var ok=false;
      if(!String(q.expect||'').trim()) ok=true;
      else for(var i=0;i<exps.length;i++){ if(exps[i]===gotT||exps[i]===gotT.replace(/\s+$/,'')){ok=true;break;} }
      if(ok){
        quizStat[key]=1; store('quizStat',quizStat);
        poolMove(key,true); todayRecord(true); statRecordQ(true);
        try{ logStudy('quiz',cCurCh(isE).id,cCurCh(isE).title); if(typeof sbNotify==='function') sbNotify(); }catch(e){}
        cShowSt(qi,isE,true,'✓ 运行通过，输出正确！',r.stdout||'(无输出)');
        noteOK((isE?'ewhyNote':'whyNote')+qi,'<b>代码填空判题通过！</b>'+(q.explain?esc(q.explain):''));
        var qz=box.closest('.quiz'); if(qz) qz.classList.add('done');
        if(!isE){ updatePgSub(); var sm=chSummary(cCurCh(false)); if(sm.allDone&&!chIsDone(cCurCh(false))) setTimeout(function(){ try{ if(settleChapter(cCurCh(false),'lesson')) refreshSettleCard(cCurCh(false)); }catch(e){} },900); }
        else { var st2=examStatus(cCurCh(true)); if(st2.full) setTimeout(function(){ try{ settleVol(cCurCh(true)); }catch(e){} },500); }
      } else {
        quizStat[key]=0; store('quizStat',quizStat);
        poolMove(key,false); todayRecord(false); statRecordQ(false);
        cShowSt(qi,isE,false,'✗ 输出不对，期望：「'+exps.join(' 或 ')+'」',r.stdout||'(无输出)');
        noteNO((isE?'ewhyNote':'whyNote')+qi,'<b>输出不对，对照期望再调。</b>'+(q.hint?'<br>💡 '+esc(q.hint):''));
      }
    });
  };
  if(typeof ensureCrt!=='function'){ if(st) st.textContent='C 编译器未就绪'; return; }
  ensureCrt(run);
}
function cFillAns(qi,isE){
  tap();
  var q=cGetQuiz(qi,isE); if(!q) return;
  var box=document.querySelector((isE?'[data-efill="'+qi+'"]':'[data-fill="'+qi+'"]'));
  if(!box) return;
  var key=(isE?'e':'')+cCurCh(isE).id+'_'+qi;
  if(quizStat[key]!==undefined) return;
  var ans=q.ans||[];
  box.querySelectorAll('.fill-in').forEach(function(inp){
    var n=parseInt(inp.dataset.n,10);
    if(ans[n-1]!==undefined) inp.value=ans[n-1];
  });
  var st=document.getElementById((isE?'ecfst':'cfst')+qi);
  if(st) st.textContent='答案已填入，点运行判题';
}
/* 事件委托 */
scroller.addEventListener('click', function(ev){
  var b;
  b=ev.target.closest('[data-crun]'); if(b){ cRunTap(+b.getAttribute('data-crun'),false,false); return; }
  b=ev.target.closest('[data-ccheck]'); if(b){ cRunTap(+b.getAttribute('data-ccheck'),false,true); return; }
  b=ev.target.closest('[data-cans]'); if(b){ cShowAns(+b.getAttribute('data-cans'),false); return; }
  b=ev.target.closest('[data-ecrun]'); if(b){ cRunTap(+b.getAttribute('data-ecrun'),true,false); return; }
  b=ev.target.closest('[data-eccheck]'); if(b){ cRunTap(+b.getAttribute('data-eccheck'),true,true); return; }
  b=ev.target.closest('[data-ecans]'); if(b){ cShowAns(+b.getAttribute('data-ecans'),true); return; }
  b=ev.target.closest('[data-fillrun]'); if(b){ cFillRun(+b.getAttribute('data-fillrun'),false); return; }
  b=ev.target.closest('[data-fillans]'); if(b){ cFillAns(+b.getAttribute('data-fillans'),false); return; }
  b=ev.target.closest('[data-efillrun]'); if(b){ cFillRun(+b.getAttribute('data-efillrun'),true); return; }
  b=ev.target.closest('[data-efillans]'); if(b){ cFillAns(+b.getAttribute('data-efillans'),true); return; }
});
/* 代码游乐场（lab）→ C 编译器版 */
scroller.addEventListener('click', function(ev){
  var sr=ev.target.closest('#sandRun');
  if(sr){
    tap();
    var ta=document.getElementById('sandTa'); var out=document.getElementById('sandOut'); var st=document.getElementById('sandSt');
    if(!ta||!out) return;
    if(st) st.textContent='编译运行中…（首次约 2-5 秒）';
    ensureCrt(function(){
      var r=cRun(cmVal(ta),'');
      out.textContent = r.ok ? (r.stdout||'(无输出)') : (r.error||r.stdout||'编译错误');
      if(st) st.textContent = r.ok?'✓ 运行完成':'⚠ 编译/运行出错';
    });
    return;
  }
  var sc=ev.target.closest('#sandClear');
  if(sc){
    var o2=document.getElementById('sandOut'); if(o2) o2.textContent='';
    var st2=document.getElementById('sandSt'); if(st2) st2.textContent='';
  }
});
