let fv = new function(){let that = this;
  let cache = {}

  let optable = new Array(8).fill(0).map(_=>({}))
  let fntable = {};
  let impls = {};
  let kwnames = [];
  let isfunname = {};

  function compile_ops(){
    kwnames.splice(0,Infinity);
    for (let i = 0; i < optable.length; i++){
      for (let k in optable[i]){
        impls[k] = optable[i][k];
        kwnames.push(k);
      }
    }
    for (let k in fntable){
      isfunname[k] = true;
      kwnames.push(k);
      impls[k] = fntable[k];
    }
    kwnames = kwnames.sort((a,b)=>(b.length-a.length));
  }
  
  function new_op(symb, fun, priority){
    optable[priority][symb] = fun;
    compile_ops();
  }
  
  function new_fn(name,fun){
    fntable[name] = fun;
    compile_ops();
  }

  function hadamard(f){
    return a=>a[0].map((x,i)=>f(x,...a.slice(1).map(y=>y[i])));
  }
  function steal_math(){
    for (let i = 0; i < arguments.length; i++){
      let name = arguments[i];
      new_fn(name,hadamard(Math[name]));
    }
  }

  new_op('**',hadamard((a,b)=>(a**b)),3);
  new_op('*' ,hadamard((a,b)=>(a*b) ),4);
  new_op('/' ,hadamard((a,b)=>(a/b) ),4);
  new_op('%' ,hadamard((a,b)=>(a%b) ),4);
  new_op('+' ,hadamard((a,b)=>(a+b) ),5);
  new_op('-' ,hadamard((a,b)=>(a-b) ),5);

  new_fn('length',a=>Math.sqrt(a[0].reduce((z,x)=>(z+x*x),0)));
  new_fn('dot',a=>a[0].map((x,i)=>(x*a[1][i])).reduce((z,x)=>(z+x),0));
  new_fn('mix',hadamard((a,b,c)=>(a*(1-c)+b*c)));
  new_fn('cross',([[a1,a2,a3],[b1,b2,b3]])=>[(a2)*(b3)-(a3)*(b2),(a3)*(b1)-(a1)*(b3),(a1)*(b2)-(a2)*(b1)]);
  new_fn('fract',hadamard(a=>(a-Math.floor(a))));
  new_fn('clamp',hadamard((a,b,c)=>Math.min(Math.max(a,b),c)));
  new_fn('distance',a=>Math.sqrt(a[0].map((x,i)=>(x-a[1][i])).reduce((z,x)=>(z+x*x),0)));
  new_fn('vec',a=>a.flat());

  new_fn('neg',hadamard((a)=>(-a)));

  let sw = a=>a[0].map(x=>a[1][x]);
  sw.no_auto_dim = true;
  new_fn('swizzle',sw);

  steal_math('sin','cos','tan','atan2','floor','ceil','trunc','sqrt','min','max','round','abs','asin','acos','log','exp');


  function tokenize(s){
    let o = [];

    function is_digit(x){
      if (x === undefined) return false;
      let n = x.charCodeAt(0)-48;
      return (0 <= n && n <= 9);
    }
    let i = 0;
    let badpos = new Array(s.length).fill(' ');
    while (i < s.length){
      if (is_digit(s[i]) || (s[i] == '.' && is_digit(s[i+1])) ){            
        let k = i+1;
        while (k < s.length && (is_digit(s[k]) || s[k].toLowerCase() == 'e' || s[k] == '.')){
          k++;
        }
        o.push(s.slice(i,k));
        i = k-1;
      }else if (s[i] == ' ' || s[i] == '\t'){

      }else if (s[i] == '(' || s[i] == ')' || s[i] == ','){
        o.push(s[i]);
      }else if (s[i] == '.'){
        i++;
        while (s[i] == " " || s[i] == "\t"){
          i++;
        }
        let k = i;
        while ("xyzw".includes(s[k])){
          k++;
        }
        o.push({'__swizzle':s.slice(i,k)});
        i = k-1;
      }else{
        let ok = false;
        for (let j = 0; j < kwnames.length; j++){
          let k = 0;
          while (i+k < s.length && s[i+k] == kwnames[j][k]){
            k++;
          }
          if (k == kwnames[j].length){
            if (isfunname[kwnames[j]]){
              o.push({'__fun':kwnames[j]});
            }else{
              o.push({'__o':kwnames[j]});
            }
            
            i += k-1;
            ok = true;
            break;
          }
        }
        if (!ok) badpos[i] = '^';
      }
      i++;
    }
    if (badpos.includes('^')){
      console.warn('[error] '+s);
      console.warn('        '+badpos.join(''));
    }
    return o;
  }
  
  function group(ts){
    let i = 0;
    let o = [];
    function o_push(x){
      if (typeof x == 'string'){
        let n = Number(x);
        o.push(isNaN(n)?x:n);
      }else{
        o.push(x);
      }
    }
    while (i < ts.length){
      if (ts[i] == '('){
        let lvl = 0;
        for (let j = i; j < ts.length; j++){
          if (ts[j] == '('){
            lvl++;
          }else if (ts[j] == ')'){
            lvl--;
            if (lvl == 0){
              o_push(group(ts.slice(i+1,j)));
              i = j+1;
              break;
            }
          }
        }
        if (lvl){
          console.warn('[error] missing )');
          break;
        }
      }else{
        o_push(ts[i]);
        i++;
      }
    }
    o.__type = 'group'
    return o;
  }
  function funfix(gs){
    for (let i = 0; i < gs.length; i++){
      if (typeof gs[i] == 'object' && gs[i].__type == 'group'){
        gs[i] = funfix(gs[i])
      }
    }
    let i = 0;
    while (i < gs.length){
      if (gs[i].__fun){
        let gg = gs[i+1];
        let aa = [[]];
        
        for (let j = 0; j < gg.length; j++){
          if (gg[j] == ','){
            aa.push([])
          }else{
            aa[aa.length-1].push(gg[j]);
            aa[aa.length-1].__type = 'group';
          }
        }
        if (!aa[aa.length-1].length){
          aa.pop();
        }
        aa.__type = "group";
        aa.__fun = gs[i].__fun;
        gs[i] = aa;
        gs.splice(i+1,1);
        i++;
      }else{
        i++;
      }
    }
    return gs;
  }

  function prefix(gs){
    if (gs.__fun){
      let fun = gs.__fun;
      delete gs.__fun;
      let xs = prefix(gs);
      if (!Array.isArray(xs)){
        xs = [xs];
      }
      return {
        __op:fun,
        __xs:xs,
      }
    }
    for (let i = 0; i < gs.length; i++){
      if (typeof gs[i] == 'object' && gs[i].__type == 'group'){
        gs[i] = prefix(gs[i])
      }
    }
    
    for (let i = 0; i < gs.length; i++){
      if (gs[i].__swizzle){
        gs[i-1] = {
          __op:'swizzle',
          __xs:[gs[i].__swizzle.split('').map(x=>"xyzw".indexOf(x)),gs[i-1]]
        }
        gs.splice(i,1);
      }
    }

    for (let i = gs.length-1; i>=0; i--){
      if (gs[i].__o == '-'){
        if (gs[i-1] === undefined || gs[i-1].__o || gs[i-1] == ','){
          gs.splice(i,2,{__op:'neg',__xs:[gs[i+1]]});
        }
      }
    }

    for (let i = gs.length-1; i>=0; i--){
      if (gs[i] == ',') gs.splice(i,1);
    }

    function iter(ops){
      for (let i = 0; i < gs.length; i++){
        if (gs[i].__o && (ops.includes(gs[i].__o))){
          gs.splice(i-1,3,{__op:gs[i].__o,__xs:[gs[i-1],gs[i+1]]});
          return true;
        }
      }
      return false;
    }
    for (let i = 0; i < optable.length; i++){
      let oo = Object.keys(optable[i]);
      if (oo.length){
        while (iter(oo)){}
      }
    }
    if (gs.length == 1) return gs[0];
    return gs;
  }
  
  function calc(ps,vs){
    if (typeof ps == 'object' && Array.isArray(ps)){
      return ps.map(p=>calc(p,vs))
    }else if (typeof ps != 'object'){
      return ps;
    }else if (typeof ps == 'object' && '__var' in ps){
      return vs[ps.__var];
    }
    let xs = ps.__xs.slice();
    let op = ps.__op;
    
    if (impls[op] === undefined){
      console.warn("[error] no def: "+op);
    }

    for (let i = 0; i < xs.length; i++){
      if (typeof xs[i] == 'object' && ('__op' in xs[i] || Array.isArray(xs[i]))){
        xs[i] = calc(xs[i],vs);
      }else if (typeof xs[i] == 'object' && '__var' in xs[i]){
        xs[i] = vs[xs[i].__var];
      }
    }

    let justnums = !xs.some(x=>(typeof x != 'number'));

    function dim(x){
      if (typeof x == 'number'){
        return 1;
      }else{
        return x.length;
      }
    }
    let ds = xs.map(dim);
    let d = Math.max(...ds);

    function make_dim(x,n){
      if (typeof x == 'number'){
        return new Array(n).fill(x);
      }else if (x.length >= n){
        return x.slice(0,n);
      }else{
        return x.concat(new Array(n-x.length).fill(0));
      }
    }
    if (!impls[op].no_auto_dim){
      xs = xs.map(x=>make_dim(x,d));
    }
    let r = impls[op](xs);

    if (!impls[op].no_auto_dim && justnums && Array.isArray(r) && r.length == 1){
      return r[0];
    }
    return r;
  }

  function parse(ss,vs){
    let hash = ss.join("%");
    let ps = cache[hash];

    if (ps === undefined){
    
      let o = [...tokenize(ss[0])];
      
      for (let i = 0; i < vs.length; i++){
        o.push({__var:i});
        o.push(...tokenize(ss[i+1]));
      }

      // console.log(o);
      let gs = group(o);
      // console.dir(gs,{depth:null});
      gs = funfix(gs);
      // console.dir(gs,{depth:null});
      ps = prefix(gs);
      // console.dir(ps,{depth:null});
      cache[hash] = ps;
    }

    let rs = calc(ps,vs);
    // if (rs.length == 1) return rs[0];
    return rs;

  }
  that.main = function() {
    return parse(arguments[0],Array.from(arguments).slice(1));
  }
  that.main.fmt = function(){
    return parse(arguments[0].split('%'),Array.from(arguments).slice(1));
  }
  that.main.cache = cache;
  that.main.new_fn = new_fn;
  that.main.new_op = new_op;
  return that.main;
}

if (typeof module !== 'undefined'){
  module.exports = fv;
}