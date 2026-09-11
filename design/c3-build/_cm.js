/* ============ CodeMirror 代码编辑器（共享模块：python3/c3 · 稳定版） ============ */
var CM_SRCS = [
  'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/lib/codemirror.min.js',
  'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/mode/python/python.min.js',
  'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/mode/clike/clike.min.js',
  'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/addon/edit/closebrackets.min.js',
  'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/addon/edit/matchbrackets.min.js',
  'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/addon/selection/active-line.min.js',
  'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/addon/fold/foldcode.min.js',
  'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/addon/fold/foldgutter.min.js',
  'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/addon/fold/brace-fold.min.js',
  'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/addon/comment/comment.min.js'
];
var _cmBusy = false;
var _cmReady = false;
function cmModeOf(ta){ return ta.getAttribute('data-cm')==='c' ? 'text/x-csrc' : 'python'; }
/* 顺序加载全部 CM 脚本（逐个 onload 推进，异常也继续） */
function cmLoadAll(idx, done){
  if(typeof CodeMirror!=='undefined' && _cmReady){ done(); return; }
  if(idx>=CM_SRCS.length){ _cmReady=true; _cmBusy=false; done(); return; }
  var s=document.createElement('script');
  s.src=CM_SRCS[idx];
  s.onload=function(){ cmLoadAll(idx+1, done); };
  s.onerror=function(){ cmLoadAll(idx+1, done); };
  document.head.appendChild(s);
}
function ensureCM(cb){
  if(_cmReady && typeof CodeMirror!=='undefined'){ cb(); return; }
  if(_cmBusy){ setTimeout(function(){ ensureCM(cb); }, 150); return; }
  _cmBusy=true;
  cmLoadAll(0, function(){ _cmBusy=false; try{ cb(); }catch(e){} });
}
/* 渲染完成后把 .py-ta 变成 CodeMirror */
function initCodeMirrors(){
  var tas=document.querySelectorAll('textarea.py-ta:not(.cm-ready)');
  if(!tas.length) return;
  if(typeof CodeMirror==='undefined'){
    if(!_cmBusy){ ensureCM(function(){ initCodeMirrors(); }); }
    else { setTimeout(function(){ initCodeMirrors(); }, 200); }
    return;
  }
  tas.forEach(function(ta){
    ta.classList.add('cm-ready');
    try{
      var readOnly = ta.hasAttribute('readonly') || ta.disabled;
      var cm = CodeMirror.fromTextArea(ta, {
        mode: cmModeOf(ta),
        placeholder: ta.getAttribute('placeholder') || '',
        lineNumbers: true,
        indentUnit: 4, tabSize: 4, indentWithTabs: false,
        matchBrackets: true, autoCloseBrackets: true, styleActiveLine: true,
        foldGutter: true,
        gutters: ['CodeMirror-foldgutter','CodeMirror-linenumbers'],
        theme: 'darcula',
        readOnly: readOnly,
        extraKeys: {
          'Tab': 'indentMore','Shift-Tab': 'indentLess',
          'Ctrl-Enter': function(m){ cmRunCurrent(m); },
          'Ctrl-/': 'toggleComment'
        }
      });
      ta.cm = cm;
      /* 初始值同步：CM 已从 textarea 读取；后续代码通过 cmSet 更新 */
    }catch(e){
      ta.classList.remove('cm-ready');
    }
  });
}
function cmVal(ta){ if(ta&&ta.cm) return ta.cm.getValue(); return ta?ta.value:''; }
function cmSet(ta,val){ if(ta&&ta.cm){ ta.cm.setValue(String(val==null?'':val)); ta.cm.focus(); } else if(ta){ ta.value=val==null?'':val; ta.focus(); } }
function cmRunCurrent(cm){
  var wrap=cm.getWrapperElement();
  var box=wrap?wrap.closest('.codebox'):null;
  if(!box) return;
  var runBtn=box.querySelector('[data-pyrun],[data-crun],[data-epyrun],[data-ecrun]');
  if(runBtn){ runBtn.click(); }
}
var _cmScanTimer=null;
function cmScanLater(){
  if(_cmScanTimer) clearTimeout(_cmScanTimer);
  _cmScanTimer=setTimeout(function(){ initCodeMirrors(); }, 120);
}
