/* ============================================================
   calc3 云客户端（微积分学院 · Supabase · 登录在总院，此处复用共享登录态）
   功能：自动同步 / 作答推送 / 云排行榜(app=calculus) / 账号管理 / 清云
   仅作学院侧接入；登录/注册/找回在总院门户完成。
   ============================================================ */
var SB_URL = 'https://yycokuphczoxfntcwizi.supabase.co';
var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5Y29rdXBoY3pveGZudGN3aXppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MDM3MzgsImV4cCI6MjEwMjk3OTczOH0.1vm61oyqeBmc2lL_q0-rgJT2x6TsOn_DXsQo1GQJbSM';
var SB_APP = 'calculus';
var SB_PORTAL = 'https://ndshuge.github.io/ndshuge-academy/';

/* ---------- 登录态（共享键 acad_sb_session / acad_profile，四院同域互通） ---------- */
function sbSession(){
  try{
    var a = JSON.parse(localStorage.getItem('acad_sb_session'));
    if(a && a.access_token) return a;
    var b = JSON.parse(localStorage.getItem('academy_sb_session')); /* 兼容旧键 */
    if(b && b.access_token){ localStorage.setItem('acad_sb_session', JSON.stringify(b)); return b; }
  }catch(e){}
  return null;
}
function sbSaveSession(s){ try{ localStorage.setItem('acad_sb_session', JSON.stringify(s)); }catch(e){} }
function sbDropSession(){ try{ localStorage.removeItem('acad_sb_session'); }catch(e){} }
function sbAuthHeaders(){
  var s = sbSession();
  return s ? { 'Authorization': 'Bearer ' + s.access_token, 'Content-Type': 'application/json', 'apikey': SB_KEY } : null;
}
function sbProfile(){
  try{
    var p = JSON.parse(localStorage.getItem('acad_profile')) || JSON.parse(localStorage.getItem('academy_profile')) || JSON.parse(localStorage.getItem('chip_profile'));
    if(p) return p;
  }catch(e){}
  var s = sbSession();
  return s && s.user ? { username: '同学', avatar: '🐹', user_id: s.user.id } : null;
}
function sbUser(){ var s = sbSession(); if(!s || !s.user) return null; var p = sbProfile(); return { id: s.user.id, nick: (p && (p.username || p.nick)) || '同学', avatar: (p && p.avatar) || '🐹' }; }

async function sbEnsureToken(){
  var s = sbSession(); if(!s) return false;
  try{
    var payload = JSON.parse(atob(s.access_token.split('.')[1]));
    if(Date.now() < (payload.exp * 1000) - 60000) return true;
  }catch(e){ return false; }
  if(!s.refresh_token) return false;
  try{
    var r = await fetch(SB_URL + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY }, body: JSON.stringify({ refresh_token: s.refresh_token }) });
    var j = await r.json();
    if(j.access_token){ sbSaveSession({ access_token: j.access_token, refresh_token: j.refresh_token || s.refresh_token, user: j.user || s.user }); return true; }
  }catch(e){}
  sbDropSession(); return false;
}

/* ---------- 进度打包 / 合并（与旧引擎同语义：并集去重不互覆） ---------- */
function sbPack(){
  return {
    ch: load('ch', []), hall: load('hall', []), wrong: load('wrong', []),
    fixed: load('fixed', []), log: load('log', []), quizStat: load('quizStat', {}),
    tstat: load('tstat', {}), quizPick: load('quizPick', {}), settle: load('settle', {})
  };
}
var SB_MERGE_ARR = ['ch','hall','wrong','fixed','log'];
var SB_MERGE_OBJ = ['quizStat','tstat','quizPick','settle'];
function sbSanitize(d){ return d && typeof d === 'object' ? d : {}; }
function sbMerge(local, cloud){
  var out = {}; local = sbSanitize(local); cloud = sbSanitize(cloud);
  SB_MERGE_ARR.forEach(function(k){
    var a = local[k] || [], b = cloud[k] || [];
    if(!Array.isArray(a)) a = []; if(!Array.isArray(b)) b = [];
    var seen = {}, m = [];
    a.concat(b).forEach(function(x){ var kk = (typeof x === 'object' && x !== null) ? JSON.stringify(x) : String(x); if(!seen[kk]){ seen[kk] = 1; m.push(x); } });
    out[k] = m;
  });
  SB_MERGE_OBJ.forEach(function(k){
    var o = {}, a = local[k] || {}, b = cloud[k] || {};
    if(typeof a !== 'object') a = {}; if(typeof b !== 'object') b = {};
    Object.keys(a).forEach(function(x){ o[x] = a[x]; }); Object.keys(b).forEach(function(x){ o[x] = b[x]; });
    out[k] = o;
  });
  return out;
}
function sbApplyLocal(m){
  try{
    if(m.ch){ chDone = m.ch; store('ch', chDone); }
    if(m.hall){ hallDone = m.hall; store('hall', hallDone); }
    if(m.wrong){ wrongPool = m.wrong; store('wrong', wrongPool); }
    if(m.fixed){ fixedPool = m.fixed; store('fixed', fixedPool); }
    if(m.quizStat){ quizStat = m.quizStat; store('quizStat', quizStat); }
    if(m.quizPick){ quizPick = m.quizPick; store('quizPick', quizPick); }
    if(m.settle){ settleStore = m.settle; store('settle', settleStore); }
    if(m.tstat){ todayStat = m.tstat; store('tstat', todayStat); }
  }catch(e){}
}
function sbCloudData(d){ return (d && d.data && d.data[SB_APP]) ? d.data[SB_APP] : null; }

/* ---------- 拉取并合并云端（打开学院 / 手动同步） ---------- */
async function sbSyncFromCloud(silent){
  var s = sbSession(); if(!s || !s.user){ if(!silent) toast('未登录，去总院登录后可云同步'); return false; }
  if(!(await sbEnsureToken())){ if(!silent) toast('登录已失效，请去总院重新登录'); return false; }
  var h = sbAuthHeaders(); if(!h) return false;
  if(!silent) toast('正在同步并合并两端进度…');
  try{
    var r = await fetch(SB_URL + '/rest/v1/progress?select=data&user_id=eq.' + s.user.id, { headers: h });
    var rows = await r.json();
    var d = sbCloudData(rows && rows.length ? rows[0] : null);
    if(d){
      var merged = sbMerge(sbPack(), d);
      sbApplyLocal(merged);
      if(!silent) toast('✅ 已合并云端进度（取并集，不丢数据）');
    } else if(!silent) {
      toast('云端暂无记录，本次先上传');
    }
    await sbPush(true);
    try{ if(window._cur === 'mine' || window._cur === 'home' || window._cur === 'hall'){ doRenderView(window._cur, true); } }catch(e){}
    return true;
  }catch(e){ if(!silent) toast('云端同步失败，请检查网络'); return false; }
}

/* ---------- 推送（防抖 2s；推送前合并云端最新防覆盖） ---------- */
var sbTimer = null;
async function sbPush(immediate){
  var s = sbSession(); if(!s) return;
  if(!immediate){ clearTimeout(sbTimer); sbTimer = setTimeout(function(){ sbPush(true); }, 2000); return; }
  if(!(await sbEnsureToken())) return;
  try{
    var h = sbAuthHeaders(); if(!h) return;
    var r = await fetch(SB_URL + '/rest/v1/progress?select=data&user_id=eq.' + s.user.id, { headers: h });
    var rows = await r.json();
    var row = rows && rows.length ? rows[0] : null;
    var data2 = (row && row.data && typeof row.data === 'object') ? row.data : {};
    var cloudD = sbCloudData(row);
    var calc = sbPack();
    if(cloudD){ var merged = sbMerge(calc, cloudD); sbApplyLocal(merged); data2[SB_APP] = merged; }
    else { data2[SB_APP] = calc; }
    var hh = Object.assign({}, h, { 'Prefer': 'resolution=merge-duplicates' });
    if(row){
      await fetch(SB_URL + '/rest/v1/progress?user_id=eq.' + s.user.id, { method: 'PATCH', headers: h, body: JSON.stringify({ data: data2 }) });
    } else {
      await fetch(SB_URL + '/rest/v1/progress', { method: 'POST', headers: hh, body: JSON.stringify({ user_id: s.user.id, data: data2 }) });
    }
    sbPushRank();
  }catch(e){}
}
function sbNotify(){ try{ if(sbSession()) sbPush(false); }catch(e){} }

/* ---------- 排行榜推送（app=chip） ---------- */
function sbPushRank(){
  try{
    var s = sbSession(); if(!s || !s.user) return;
    var st = calcStats(), p = sbProfile(); if(!p) return;
    var rk = curRank(st.pct);
    var h = sbAuthHeaders(); if(!h) return;
    var hh = Object.assign({}, h, { 'Prefer': 'resolution=merge-duplicates' });
    var rb = { user_id: s.user.id, app: SB_APP, username: p.username || '同学', avatar: p.avatar || '🐹', pct: st.pct, done: st.doneC, lessons: st.doneC, rank_name: rk.name, updated_at: new Date().toISOString() };
    fetch(SB_URL + '/rest/v1/leaderboard', { method: 'POST', headers: hh, body: JSON.stringify(rb) }).catch(function(){});
  }catch(e){}
}

/* ---------- 清云端（本院命名空间，供清除记录联动） ---------- */
function sbClearCloud(done){
  try{
    var s = sbSession(); if(!s || !s.user){ if(typeof done === 'function') done(); return; }
    sbEnsureToken().then(function(ok){
      if(!ok){ if(typeof done === 'function') done(); return; }
      var h = sbAuthHeaders(); if(!h){ if(typeof done === 'function') done(); return; }
      fetch(SB_URL + '/rest/v1/progress?select=data&user_id=eq.' + s.user.id, { headers: h })
        .then(function(r){ return r.json(); })
        .then(function(rows){
          var data = (rows && rows.length && rows[0].data && typeof rows[0].data === 'object') ? rows[0].data : {};
          if(data[SB_APP]) delete data[SB_APP];
          if(rows && rows.length) return fetch(SB_URL + '/rest/v1/progress?user_id=eq.' + s.user.id, { method: 'PATCH', headers: h, body: JSON.stringify({ data: data }) });
          return null;
        })
        .then(function(){
          var h2 = sbAuthHeaders();
          if(h2) fetch(SB_URL + '/rest/v1/leaderboard?user_id=eq.' + s.user.id + '&app=eq.' + SB_APP, { method: 'DELETE', headers: h2 }).catch(function(){});
          if(typeof done === 'function') done();
        })
        .catch(function(){ if(typeof done === 'function') done(); });
    });
  }catch(e){ if(typeof done === 'function') done(); }
}

/* ---------- 登出（仅清本机会话；总院重新登录即恢复） ---------- */
function sbLogout(){
  sbDropSession();
  try{ localStorage.removeItem('acad_profile'); }catch(e){}
  toast('已退出登录');
  try{ if(window._cur === 'mine') doRenderView('mine', true); }catch(e){}
}

/* ---------- 账号管理（大弹窗：头像 / 昵称 / 密码 / 退出） ---------- */
var SB_AVATARS=['🦊','🐼','🐸','🐙','🦄','🐯','🐨','🐰','🦁','🐢','🐳','🦉','🐭','🐿️'];
var SB_AV_COLORS=['#537D96','#5B8C5A','#6D9B7C','#C77B6D','#A67BB8','#D9A441','#8FA3B8','#C75B7A','#B57F5E','#7BA6A0','#A08BD1','#D08159','#9B8579','#C77B3D'];
function sbAvColor(a){ var i=SB_AVATARS.indexOf(a); return SB_AV_COLORS[i>=0?i:0]; }
function sbRefreshMine(){
  try{ if(window._cur==='mine' && typeof doRenderView==='function') doRenderView('mine', true); }catch(e){}
}
function sbSaveProfile(upd, cb){
  var s=sbSession(); if(!s||!s.user){ toast('未登录'); if(cb) cb(false); return; }
  sbEnsureToken().then(function(ok){
    if(!ok){ toast('登录已失效，请重新登录'); if(cb) cb(false); return; }
    var h=sbAuthHeaders(); if(!h) return;
    var body={};
    if(upd.username!==undefined) body.username=upd.username;
    if(upd.avatar!==undefined) body.avatar=upd.avatar;
    /* 先确保云端有 profile 行（老账号可能没有，直接 PATCH 打空枪） */
    fetch(SB_URL+'/rest/v1/profiles?select=user_id&user_id=eq.'+s.user.id, { headers:h })
      .then(function(r){ return r.json(); })
      .then(function(rows){
        var has = rows && rows.length;
        var hh = Object.assign({}, h, { 'Prefer':'return=minimal' });
        if(has) return fetch(SB_URL+'/rest/v1/profiles?user_id=eq.'+s.user.id, { method:'PATCH', headers:h, body: JSON.stringify(body) });
        var p2 = JSON.parse(JSON.stringify(body)); p2.user_id=s.user.id;
        return fetch(SB_URL+'/rest/v1/profiles', { method:'POST', headers:hh, body: JSON.stringify(p2) });
      })
      .then(function(rr){
        if(rr && !rr.ok && rr.status!==204) throw new Error('HTTP'+rr.status);
        var p=sbProfile()||{};
        if(upd.username!==undefined) p.username=upd.username;
        if(upd.avatar!==undefined) p.avatar=upd.avatar;
        p.user_id=s.user.id;
        try{ localStorage.setItem('acad_profile', JSON.stringify(p)); }catch(e){}
        toast('✅ 已保存');
        sbPushRank();
        sbRefreshMine();
        if(cb) cb(true);
      })
      .catch(function(){ toast('保存失败（昵称可能已被占用）'); if(cb) cb(false); });
  });
}
function showAcctMgmt(){
  var u=sbUser?sbUser():null;
  var s=sbSession();
  var email=(s&&s.user&&s.user.email)||'';
  var wrap=document.createElement('div');
  wrap.id='acctWrap';
  wrap.style.cssText='position:fixed;inset:0;background:rgba(10,10,14,.55);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;-webkit-backdrop-filter:blur(18px) saturate(1.3);backdrop-filter:blur(18px) saturate(1.3)';
  wrap.onclick=function(e){ if(e.target===wrap) wrap.remove(); };
  var card=document.createElement('div');
  card.style.cssText='background:var(--card);border-radius:26px;padding:24px;max-width:560px;width:100%;max-height:88vh;overflow:auto;box-shadow:var(--sh-float);transform:translateY(10px) scale(.98);opacity:0;transition:transform .32s cubic-bezier(.24,1.4,.4,1),opacity .24s';
  requestAnimationFrame(function(){ card.style.transform='none'; card.style.opacity='1'; });
  if(!u||!s){
    card.innerHTML='<div style="text-align:center;padding:30px 10px">'
      +'<span style="font-size:46px">🐹</span><div class="h2" style="margin-top:12px">账号管理</div>'
      +'<div class="cap" style="margin-top:6px;line-height:1.8">登录一次，四院通用；进度自动云端同步，换设备不丢。</div>'
      +'<a href="' + SB_PORTAL + '" style="display:block;margin:18px auto 0;width:200px;height:48px;line-height:48px;border-radius:14px;background:var(--accent);color:#fff;font:600 15px inherit;font-family:inherit;text-decoration:none">去总院登录 / 注册</a>'
      +'<button id="acctClose" style="margin:12px auto 0;display:block;border:none;background:none;color:var(--muted);font:inherit;font-size:13px;cursor:pointer">暂不登录 · 先本地学</button></div>';
    wrap.appendChild(card);
    document.body.appendChild(wrap);
    var cl=document.getElementById('acctClose'); if(cl) cl.onclick=function(){ wrap.remove(); };
    return;
  }
  var av='<div style="display:flex;align-items:center;gap:18px">'
    +'<div id="acctAvBig" style="width:76px;height:76px;border-radius:50%;background:'+sbAvColor(u.avatar)+';display:flex;align-items:center;justify-content:center;font-size:38px;flex:none">'+esc(u.avatar)+'</div>'
    +'<div style="flex:1;min-width:0"><b style="font-size:20px">'+esc(u.nick)+'</b>'
    +'<div style="font-size:12.5px;color:var(--muted);margin-top:3px;overflow:hidden;text-overflow:ellipsis">'+esc(email||'已登录')+'</div>'
    +'<div style="font-size:12px;color:var(--muted);margin-top:2px">chip 学院 · 云同步已开启</div></div></div>';
  var body='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><b style="font-size:18px">账号管理</b><button id="acctX" style="border:none;background:var(--fill-soft);width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:14px;color:var(--muted)">✕</button></div>'
    + av
    + '<div style="margin-top:18px"><b style="font-size:14px">换头像</b><div id="acctAvRow" style="display:flex;gap:8px;overflow-x:auto;margin-top:8px;padding-bottom:6px"></div></div>'
    + '<div style="margin-top:16px"><b style="font-size:14px">昵称</b><div style="display:flex;gap:8px;margin-top:8px">'
    + '<input id="acctName" value="'+esc(u.nick)+'" maxlength="16" style="flex:1;border:1.5px solid var(--sep);border-radius:12px;padding:11px 13px;font:15px inherit;font-family:inherit;background:var(--bg);color:var(--ink)">'
    + '<button id="acctNameSave" style="flex:none;border:none;border-radius:12px;background:var(--accent);color:#fff;padding:0 20px;font:600 14px inherit;font-family:inherit;cursor:pointer">保存</button></div></div>'
    + '<div style="margin-top:16px"><b style="font-size:14px">修改密码</b><div style="display:flex;gap:8px;margin-top:8px">'
    + '<input id="acctPw1" type="password" placeholder="新密码（至少 6 位）" style="flex:1;min-width:0;border:1.5px solid var(--sep);border-radius:12px;padding:11px 13px;font:14px inherit;font-family:inherit;background:var(--bg);color:var(--ink)">'
    + '<input id="acctPw2" type="password" placeholder="再输一次" style="flex:1;min-width:0;border:1.5px solid var(--sep);border-radius:12px;padding:11px 13px;font:14px inherit;font-family:inherit;background:var(--bg);color:var(--ink)">'
    + '<button id="acctPwSave" style="flex:none;border:none;border-radius:12px;background:var(--fill-soft);color:var(--ink2);padding:0 18px;font:600 13px inherit;font-family:inherit;cursor:pointer">改密</button></div></div>'
    + '<button id="acctLogout" style="width:100%;height:46px;border:none;border-radius:14px;background:var(--red-soft);color:var(--red);font:600 14.5px inherit;font-family:inherit;cursor:pointer;margin-top:20px">退出登录</button>';
  card.innerHTML=body;
  wrap.appendChild(card);
  document.body.appendChild(wrap);
  /* 头像选择 */
  var row=document.getElementById('acctAvRow');
  var cur=u.avatar||'🦊';
  SB_AVATARS.forEach(function(a,i){
    var b=document.createElement('button');
    b.textContent=a;
    b.style.cssText='width:44px;height:44px;border-radius:50%;font-size:22px;flex:none;cursor:pointer;background:'+(a===cur?'var(--accent-soft)':'var(--fill-soft)')+';border:2px solid '+(a===cur?'var(--accent)':'transparent')+';display:flex;align-items:center;justify-content:center';
    b.onclick=function(){
      cur=a;
      SB_AVATARS.forEach(function(a2,k2){ row.children[k2].style.borderColor=(a2===cur?'var(--accent)':'transparent'); row.children[k2].style.background=(a2===cur?'var(--accent-soft)':'var(--fill-soft)'); });
      var big=document.getElementById('acctAvBig');
      if(big){ big.textContent=a; big.style.background=sbAvColor(a); }
      sbSaveProfile({avatar:a});
    };
    row.appendChild(b);
  });
  var ns=document.getElementById('acctNameSave');
  if(ns) ns.onclick=function(){
    var nm=(document.getElementById('acctName').value||'').trim();
    if(!/^[\u4e00-\u9fa5A-Za-z0-9_]{2,16}$/.test(nm)){ toast('昵称 2~16 位：中文/字母/数字/下划线'); return; }
    sbSaveProfile({username:nm});
  };
  var ps=document.getElementById('acctPwSave');
  if(ps) ps.onclick=function(){
    var n1=(document.getElementById('acctPw1').value||''), n2=(document.getElementById('acctPw2').value||'');
    if(n1.length<6){ toast('新密码至少 6 位'); return; }
    if(n1!==n2){ toast('两次输入不一致'); return; }
    sbEnsureToken().then(function(ok){
      if(!ok){ toast('登录已失效'); return; }
      var ss=sbSession();
      fetch(SB_URL+'/auth/v1/user', { method:'PUT', headers:{ 'apikey':SB_KEY, 'Authorization':'Bearer '+ss.access_token, 'Content-Type':'application/json' }, body: JSON.stringify({ password:n1 }) })
        .then(function(r){ return r.json(); })
        .then(function(j){ if(j&&j.id){ toast('✅ 密码已更新'); document.getElementById('acctPw1').value=''; document.getElementById('acctPw2').value=''; } else { toast('修改失败：'+(j.msg||j.message||j.error_description||'未知')); } })
        .catch(function(){ toast('修改失败，请检查网络'); });
    });
  };
  var lg=document.getElementById('acctLogout');
  if(lg) lg.onclick=function(){ wrap.remove(); sbLogout(); };
  var x=document.getElementById('acctX'); if(x) x.onclick=function(){ wrap.remove(); };
}

/* ---------- 云排行榜（覆盖 renderers.rank） ---------- */
function sbRankHTML(){
  var u = sbUser(), s = sbSession();
  var h = '<div class="kick">LEADERBOARD</div><div class="h1">排行榜</div>'
    + '<div class="sub">微积分学院 · 按已学章节与总进度排 · 真人榜</div>';
  if(!u || !s){ h += sbRankEmpty('登录后加入全院排行榜'); return h; }
  h += '<div class="card" style="border-radius:var(--r-l);text-align:center;padding:22px" id="rankBox"><div style="color:var(--muted)">加载中…</div></div>';
  setTimeout(function(){
    fetch(SB_URL + '/rest/v1/leaderboard?select=user_id,username,avatar,pct,done,rank_name&order=pct.desc,updated_at.asc&app=eq.' + SB_APP + '&limit=100', { headers: sbAuthHeaders() })
      .then(function(r){ return r.json(); })
      .then(function(rows){ paintRank(rows, u); })
      .catch(function(){ var b = document.getElementById('rankBox'); if(b) b.innerHTML = sbRankEmpty('加载失败，请检查网络'); });
  }, 60);
  return h;
}
function sbRankEmpty(tip){
  return '<div class="card" style="border-radius:var(--r-l);text-align:center;padding:30px 20px">'
    + '<span style="font-size:40px">🏆</span><div class="h2" style="margin-top:10px">' + tip + '</div>'
    + '<div style="margin-top:12px"><a href="' + SB_PORTAL + '" class="btn-go" style="text-decoration:none;display:inline-flex">去总院登录</a></div></div>';
}
function paintRank(rows, u){
  var box = document.getElementById('rankBox'); if(!box) return;
  if(!rows || !rows.length){ box.innerHTML = sbRankEmpty('还没有人上榜，快去学习成为第一名！'); return; }
  var medals = ['🥇','🥈','🥉'];
  var html = '';
  var myRank = -1, me = u.id;
  rows.forEach(function(r, i){
    if(r.user_id === me) myRank = i + 1;
    var isMe = r.user_id === me;
    html += '<div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:14px;margin-top:8px;' + (isMe ? 'background:var(--accent-soft);border:1px solid var(--accent)' : 'background:var(--fill-soft)') + '">'
      + '<span style="width:34px;text-align:center;font-size:18px;flex:none">' + ((i < 3) ? medals[i] : '<b style="font-size:14px;color:var(--muted)">' + (i + 1) + '</b>') + '</span>'
      + '<span style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#0A84FF,#5E5CE6);display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;flex:none">' + esc(r.avatar || '🐹') + '</span>'
      + '<span style="flex:1;min-width:0;text-align:left"><b style="display:block;font-size:15px">' + esc(r.username) + (isMe ? ' <span style="font-size:11px;color:var(--accent)">我</span>' : '') + '</b>'
      + '<span style="font-size:12px;color:var(--muted)">' + esc(r.rank_name || '') + ' · 已学 ' + r.done + ' 章</span></span>'
      + '<b style="font-size:18px;color:' + (r.pct >= 80 ? 'var(--green)' : r.pct >= 60 ? 'var(--gold)' : 'var(--muted)') + '">' + r.pct + '%</b></div>';
  });
  if(myRank > 0) html = '<div style="text-align:center;font-size:13px;color:var(--muted);margin-bottom:6px">你当前第 <b style="color:var(--accent)">' + myRank + '</b> 名</div>' + html;
  box.innerHTML = html;
}
renderers.rank = function(){ return sbRankHTML(); };

/* ---------- 反馈意见（表 feedback，app=chip） ---------- */
renderers.feedback=function(){
  var u=sbUser?sbUser():null;
  var h='<div class="kick">FEEDBACK</div><div class="h1">反馈意见</div>'
    +'<div class="sub">Bug、想法、下一章想学什么——直接说</div>';
  if(!u){
    h+='<div class="card" style="border-radius:var(--r-l);text-align:center;padding:30px 20px">'
      +'<span style="font-size:40px">💬</span><div class="h2" style="margin-top:10px">登录后再反馈</div>'
      +'<div class="cap" style="margin-top:6px;line-height:1.7">反馈会署上你的名字，方便跟进。<br>先去总院登录一次（四院通用）。</div>'
      +'<div style="margin-top:14px"><a href="' + SB_PORTAL + '" class="btn-go" style="text-decoration:none;display:inline-flex">去总院登录</a></div></div>';
    return h;
  }
  h+='<div class="card" style="border-radius:var(--r-l)">'
    +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><span style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#0A84FF,#5E5CE6);display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff">'+esc(u.avatar)+'</span>'
    +'<b>'+esc(u.nick)+'</b><span class="cap">· 将作为 chip 学院反馈提交</span></div>'
    +'<textarea id="fbText" rows="5" placeholder="写下你的意见、建议或遇到的 Bug…" style="width:100%;box-sizing:border-box;border:1.5px solid var(--sep);border-radius:14px;padding:12px 14px;font:14.5px/1.8 inherit;font-family:inherit;background:var(--bg);color:var(--ink);resize:vertical"></textarea>'
    +'<button class="btn-go" id="fbSend" style="width:100%;justify-content:center;margin-top:12px">发送反馈</button></div>';
  return h;
};
function sendFeedback(){
  var u2=(typeof sbUser==='function')?sbUser():null;
  if(!u2){ toast('请先登录再反馈'); return; }
  var el=document.getElementById('fbText');
  var c=(el&&el.value||'').trim();
  if(!c){ toast('先写下你的意见'); return; }
  var h=sbAuthHeaders(); if(!h){ toast('登录已失效，请去总院重新登录'); return; }
  var hh=Object.assign({}, h, { 'Prefer': 'return=minimal' });
  fetch(SB_URL+'/rest/v1/feedback', { method:'POST', headers: hh, body: JSON.stringify({ user_id: u2.id, username: u2.nick, avatar: u2.avatar, content: c, app: SB_APP }) })
    .then(function(r){ if(r.ok){ toast('✅ 已发送，感谢反馈！'); if(el) el.value=''; } else { toast('发送失败，请稍后再试'); } })
    .catch(function(){ toast('发送失败，请检查网络'); });
}
scroller.addEventListener('click', function(ev){
  var fb=ev.target.closest('#fbSend');
  if(fb){ tap(); sendFeedback(); }
});

/* ---------- 讨论区（app=chip · feedback 表承载，content 以 [讨论] 前缀区分） ---------- */
var BD_TAG = '[讨论] ';
renderers.board=function(){
  var u=sbUser?sbUser():null;
  var h='<div class="kick">BOARD</div><div class="h1">讨论区</div>'
    +'<div class="sub">同学间说说话 · 分享进度与心得（登录后发言）</div>';
  if(!u){
    h+='<div class="card" style="border-radius:var(--r-l);text-align:center;padding:30px 20px">'
      +'<span style="font-size:40px">💬</span><div class="h2" style="margin-top:10px">登录后参与讨论</div>'
      +'<div class="cap" style="margin-top:6px;line-height:1.7">先去总院登录一次，就能在这和大家聊天了。</div>'
      +'<div style="margin-top:14px"><a href="' + SB_PORTAL + '" class="btn-go" style="text-decoration:none;display:inline-flex">去总院登录</a></div></div>';
    return h;
  }
  h+='<div style="display:flex;gap:8px;margin-bottom:12px">'
    +'<input id="bdText" placeholder="说点什么…（按 Enter 发送）" style="flex:1;border:1.5px solid var(--sep);border-radius:14px;padding:12px 14px;font:15px inherit;font-family:inherit;background:var(--card);color:var(--ink)">'
    +'<button id="bdSend" style="flex:none;border:none;border-radius:14px;background:var(--accent);color:#fff;padding:0 22px;font:600 14px inherit;font-family:inherit;cursor:pointer">发送</button></div>'
    +'<div id="boardList"><div class="card" style="border-radius:var(--r-l);text-align:center;padding:24px;color:var(--muted)">加载中…</div></div>';
  setTimeout(function(){ bdLoad(); }, 60);
  return h;
};
function bdLoad(){
  var list=document.getElementById('boardList'); if(!list) return;
  list.innerHTML='<div class="card" style="border-radius:var(--r-l);text-align:center;padding:24px;color:var(--muted)">加载中…</div>';
  fetch(SB_URL+'/rest/v1/feedback?select=user_id,username,avatar,content,created_at&app=eq.'+SB_APP+'&order=created_at.desc&limit=60', { headers: sbAuthHeaders() })
    .then(function(r){ return r.json(); })
    .then(function(rows){ bdPaint(rows||[]); })
    .catch(function(){ list.innerHTML='<div class="card" style="border-radius:var(--r-l);text-align:center;padding:24px;color:var(--muted)">加载失败，请检查网络</div>'; });
}
function bdPaint(rows){
  var list=document.getElementById('boardList'); if(!list) return;
  var mine=(sbUser?sbUser():{id:''}).id;
  var items=rows.filter(function(x){ return x && x.content && x.content.indexOf(BD_TAG)===0; });
  if(!items.length){
    list.innerHTML='<div class="card" style="border-radius:var(--r-l);text-align:center;padding:30px"><span style="font-size:36px">💬</span><div class="cap" style="margin-top:8px">还没有人发言，来抢沙发！</div></div>';
    return;
  }
  var html='';
  items.forEach(function(x){
    var t=new Date(x.created_at);
    var p=function(n){return (n<10?'0':'')+n;};
    var isMe=(mine && x.user_id===mine);
    html+='<div class="card" style="border-radius:var(--r-l);padding:14px 16px;margin-bottom:10px;border-color:'+(isMe?'var(--accent)':'var(--sep)')+'">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">'
      +'<span style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#0A84FF,#5E5CE6);display:flex;align-items:center;justify-content:center;font-size:17px;color:#fff">'+esc(x.avatar||'🐹')+'</span>'
      +'<b style="font-size:13.5px">'+esc(x.username||'同学')+(isMe?'<span style="color:var(--accent);font-size:11px;margin-left:5px">我</span>':'')+'</b>'
      +'<span style="font-size:11px;color:var(--muted)">'+p(t.getMonth()+1)+'-'+p(t.getDate())+' '+p(t.getHours())+':'+p(t.getMinutes())+'</span></div>'
      +'<div style="font-size:14.5px;color:var(--ink2);line-height:1.7;white-space:pre-wrap;word-break:break-word">'+esc(x.content.slice(BD_TAG.length))+'</div></div>';
  });
  list.innerHTML=html;
}
function bdSend(){
  var u=(typeof sbUser==='function')?sbUser():null;
  if(!u){ toast('登录后才能发言'); return; }
  var el=document.getElementById('bdText');
  var v=(el&&el.value||'').trim();
  if(!v){ toast('先写点什么'); return; }
  var h=sbAuthHeaders(); if(!h){ toast('登录已失效'); return; }
  var hh=Object.assign({}, h, { 'Prefer': 'return=minimal' });
  fetch(SB_URL+'/rest/v1/feedback', { method:'POST', headers: hh, body: JSON.stringify({ user_id: u.id, username: u.nick, avatar: u.avatar, content: BD_TAG + v, app: SB_APP }) })
    .then(function(r){ if(r.ok){ if(el) el.value=''; bdLoad(); } else { toast('发送失败，稍后再试'); } })
    .catch(function(){ toast('发送失败，请检查网络'); });
}
scroller.addEventListener('click', function(ev){
  var bd=ev.target.closest('#bdSend');
  if(bd){ tap(); bdSend(); }
});
var bdInp=null;
scroller.addEventListener('keydown', function(ev){
  if(ev.target && ev.target.id==='bdText' && ev.key==='Enter'){ ev.preventDefault(); bdSend(); }
});

/* ---------- 启动：恢复登录态并拉取合并 ---------- */
function cloudInit(){
  if(!sbSession()) return;
  try{
    sbSyncFromCloud(true).then(function(){ sbPushRank(); }).catch(function(){});
  }catch(e){}
  /* 回前台静默同步 */
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible' && sbSession()){ try{ sbSyncFromCloud(true); }catch(e){} }
  });
}

/* 启动即同步（登录态来自总院共享会话） */
try{ cloudInit(); }catch(_e){}
