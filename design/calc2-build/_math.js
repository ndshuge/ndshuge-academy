
/* 公式渲染（旧 calculus 解析器，纯函数） */
var _calcPM=function(s){
  if(s===undefined||s===null) return '';
  s=String(s); var i=0, out='';
  /* 裸 Σ/∫ 的上下标写法归一为 \sum/\int（教材式垂直叠放渲染） */
  s = s.replace(/Σ_/g,'\\sum_').replace(/∫_/g,'\\int_').replace(/Σ\^/g,'\\sum^').replace(/∫\^/g,'\\int^');
  function readGroup(){
    var depth=0, j=i;
    while(j<s.length){ if(s[j]==='{')depth++; if(s[j]==='}'){depth--; if(depth===0)break;} j++; }
    var g=s.slice(i+1,j); i=Math.min(j+1,s.length); return g;
  }
  while(i<s.length){
    var c=s[i];
    if(c==='\\'){
      if(s[i+1]==="'"||s[i+1]==='′'){out+='′'; i+=2; continue;}
      var m=/^[a-zA-Z]+/.exec(s.slice(i+1));
      if(m){
        var cmd=m[0]; i+=1+cmd.length;
        switch(cmd){
          case 'frac': {var a=readGroup(),b=readGroup(); out+='<span class="fr" style="display:inline-block;vertical-align:middle;text-align:center;margin:0 2px"><span style="display:block;border-bottom:1px solid currentColor;padding:0 4px">'+parseMath(a)+'</span><span style="display:block;padding:0 4px">'+parseMath(b)+'</span></span>'; break;}
          case 'lim': {var sub=''; if(s[i]==='_'){i++; sub=s[i]==='{'?readGroup():(s[i++]||'');} out+='<i>lim</i>'+(sub?'<sub>'+parseMath(sub)+'</sub>':''); break;}
          case 'int': {var lw='',up=''; if(s[i]==='_'){i++; lw=s[i]==='{'?readGroup():(s[i++]||'');} if(s[i]==='^'){i++; up=s[i]==='{'?readGroup():(s[i++]||'');} out+='<span style="display:inline-flex;align-items:center;vertical-align:middle;margin:0 1px"><span style="font-size:1.35em">∫</span>'+(lw||up?'<span style="display:inline-flex;flex-direction:column;align-items:center;font-size:.7em;line-height:1.08;margin-left:2px">'+(up?'<span>'+parseMath(up)+'</span>':'<span>&nbsp;</span>')+(lw?'<span style="padding:0 1px">'+parseMath(lw)+'</span>':'')+'</span>':'')+'</span>'; break;}
          case 'sum': {var lw2='',up2=''; if(s[i]==='_'){i++; lw2=s[i]==='{'?readGroup():(s[i++]||'');} if(s[i]==='^'){i++; up2=s[i]==='{'?readGroup():(s[i++]||'');} out+='<span style="display:inline-flex;align-items:center;vertical-align:middle;margin:0 1px"><span style="font-size:1.25em">Σ</span>'+(lw2||up2?'<span style="display:inline-flex;flex-direction:column;align-items:center;font-size:.72em;line-height:1.08;margin-left:2px">'+(up2?'<span>'+parseMath(up2)+'</span>':'<span>&nbsp;</span>')+(lw2?'<span style="padding:0 1px">'+parseMath(lw2)+'</span>':'')+'</span>':'')+'</span>'; break;}
          case 'sqrt': {var r=readGroup(); out+='√<span style="border-top:1px solid currentColor;padding:0 3px">'+parseMath(r)+'</span>'; break;}
          case 'pi': out+='π'; break;
          case 'theta': out+='θ'; break;
          case 'alpha': out+='α'; break;
          case 'beta': out+='β'; break;
          case 'gamma': out+='γ'; break;
          case 'delta': out+='δ'; break;
          case 'epsilon': out+='ε'; break;
          case 'varepsilon': out+='ε'; break;
          case 'xi': out+='ξ'; break;
          case 'phi': out+='φ'; break;
          case 'text': { var t=readGroup(); out+='<span>'+parseMath(t)+'</span>'; break; }
          case 'circ': out+='∘'; break;
          case 'deg': out+='°'; break;
          case 'iff': out+='⇔'; break;
          case 'cdots': out+='⋯'; break;
          case 'dots': out+='…'; break;
          case 'prime': out+='′'; break;
          case 'quad': out+='　'; break;
          case 'qquad': out+='　　'; break;
          case 'mathbb': { var b=readGroup(); out+=b; break; }
          case 'overline': { var o=readGroup(); out+='<span style="border-top:1px solid currentColor">'+parseMath(o)+'</span>'; break; }
          case 'left': case 'right': case 'big': case 'Big': case 'bigg': case 'Bigg': i++; break;
          case 'infty': out+='∞'; break;
          case 'to': out+='→'; break;
          case 'Rightarrow': out+='⇒'; break;
          case 'cdot': out+='·'; break;
          case 'times': out+='×'; break;
          case 'pm': out+='±'; break;
          case 'ne': out+='≠'; break;
          case 'le': out+='≤'; break;
          case 'ge': out+='≥'; break;
          case 'approx': out+='≈'; break;
          case 'in': out+='∈'; break;
          case 'sin': out+='<i>sin</i>'; break;
          case 'cos': out+='<i>cos</i>'; break;
          case 'tan': out+='<i>tan</i>'; break;
          case 'cot': out+='<i>cot</i>'; break;
          case 'sec': out+='<i>sec</i>'; break;
          case 'csc': out+='<i>csc</i>'; break;
          case 'ln': out+='<i>ln</i>'; break;
          case 'log': out+='<i>log</i>'; break;
          case 'exp': out+='<i>exp</i>'; break;
          case 'arcsin': out+='<i>arcsin</i>'; break;
          case 'arccos': out+='<i>arccos</i>'; break;
          case 'arctan': out+='<i>arctan</i>'; break;
          case 'sinh': out+='<i>sinh</i>'; break;
          case 'cosh': out+='<i>cosh</i>'; break;
          case 'tanh': out+='<i>tanh</i>'; break;
          default: out+=cmd;
        }
        continue;
      }
      out+=s[i+1]||''; i+=2; continue;
    }
    if(c==='^'){ i++; var su = s[i]==='{'?readGroup():(s[i++]||''); out+='<sup>'+parseMath(su)+'</sup>'; continue; }
    if(c==='_'){ i++; var sb = s[i]==='{'?readGroup():(s[i++]||''); out+='<sub>'+parseMath(sb)+'</sub>'; continue; }
    if(c==='<'){ out+='&lt;'; i++; continue; }
    if(c==='>'){ out+='&gt;'; i++; continue; }
    out+=c; i++;
  }
  return out;
}
var parseMath=function(s){ try{ return _calcPM(s); }catch(err){ return esc(s); } };
