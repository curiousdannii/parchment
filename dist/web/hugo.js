var tt=(()=>{var ae=import.meta.url;return async function(_r={}){var te,o=_r,ie,H,dr=new Promise((e,r)=>{ie=e,H=r}),yr=typeof WorkerGlobalScope<"u";if(0)var it;let g,V,E,ne=()=>{};o.start=function(e){if(g=e.Dialog,!g.async)throw new Error("Emglken requires an async Dialog library");V=e.GlkOte,e.accept=mr,lr(e.arguments),V.init(e)};function mr(e){E&&console.warn("Already have GlkOte event when next event arrives"),E=e,ne()}o.locateFile=function(e){try{return new URL(e,import.meta.url).href}catch{return e}};var le=Object.assign({},o),hr=[],se="./this.program",oe=(e,r)=>{throw r},h="";function pr(e){return o.locateFile?o.locateFile(e,h):h+e}var ce,ve;if(0)var nt,lt;else yr?h=self.location.href:typeof document<"u"&&document.currentScript&&(h=document.currentScript.src),ae&&(h=ae),h.startsWith("blob:")?h="":h=h.substr(0,h.replace(/[?#].*/,"").lastIndexOf("/")+1),ce=async e=>{var r=await fetch(e,{credentials:"same-origin"});if(r.ok)return r.arrayBuffer();throw new Error(r.status+" : "+r.url)};var gr=console.log.bind(console),T=console.error.bind(console);Object.assign(o,le),le=null;var U=o.wasmBinary,j,S=!1,x,p,w,wr,Sr,u,_,kr,Cr;function fe(){var e=j.buffer;p=new Int8Array(e),wr=new Int16Array(e),w=new Uint8Array(e),Sr=new Uint16Array(e),u=new Int32Array(e),_=new Uint32Array(e),kr=new Float32Array(e),Cr=new Float64Array(e)}var Ar=[],ue=[],Rr=[],Er=[],Tr=[],br=!1,z=!1;function Nr(){M(Ar)}function Dr(){br=!0,M(ue)}function Mr(){M(Rr)}function Or(){Ie(),M(Er),Ta(),z=!0}function Fr(){M(Tr)}function Ir(e){ue.unshift(e)}var b=0,N=null;function Ur(e){b++}function jr(e){if(b--,b==0&&N){var r=N;N=null,r()}}function D(e){e="Aborted("+e+")",T(e),S=!0,e+=". Build with -sASSERTIONS for more info.";var r=new WebAssembly.RuntimeError(e);throw H(r),r}var xr="data:application/octet-stream;base64,",_e=e=>e.startsWith(xr),st=e=>e.startsWith("file://");function Pr(){if(o.locateFile){var e="hugo.wasm";return _e(e)?e:pr(e)}return new URL("hugo.wasm",import.meta.url).href}var Y;function Wr(e){if(e==Y&&U)return new Uint8Array(U);if(ve)return ve(e);throw"both async and sync fetching of the wasm failed"}async function Lr(e){if(!U)try{var r=await ce(e);return new Uint8Array(r)}catch{}return Wr(e)}async function Br(e,r){try{var a=await Lr(e),t=await WebAssembly.instantiate(a,r);return t}catch(i){T(`failed to asynchronously prepare wasm: ${i}`),D(i)}}async function Hr(e,r,a){if(!e&&typeof WebAssembly.instantiateStreaming=="function"&&!_e(r)&&typeof fetch=="function")try{var t=fetch(r,{credentials:"same-origin"}),i=await WebAssembly.instantiateStreaming(t,a);return i}catch(n){T(`wasm streaming compile failed: ${n}`),T("falling back to ArrayBuffer instantiation")}return Br(r,a)}function Vr(){return{a:ja}}async function zr(){function e(i,n){return v=i.exports,v=l.instrumentWasmExports(v),j=v.S,fe(),Oa=v.X,Ir(v.T),jr("wasm-instantiate"),v}Ur("wasm-instantiate");function r(i){e(i.instance)}var a=Vr();Y??=Pr();try{var t=await Hr(U,Y,a);return r(t),t}catch(i){H(i);return}}var C,$;class de{name="ExitStatus";constructor(r){this.message=`Program terminated with exit(${r})`,this.status=r}}var M=e=>{for(;e.length>0;)e.shift()(o)},y=e=>Pe(e),m=()=>Le(),Yr=(e,r)=>(a=>re(e,a))(r),A=0;class ye{constructor(r){this.excPtr=r,this.ptr=r-24}set_type(r){_[this.ptr+4>>2]=r}get_type(){return _[this.ptr+4>>2]}set_destructor(r){_[this.ptr+8>>2]=r}get_destructor(){return _[this.ptr+8>>2]}set_caught(r){r=r?1:0,p[this.ptr+12]=r}get_caught(){return p[this.ptr+12]!=0}set_rethrown(r){r=r?1:0,p[this.ptr+13]=r}get_rethrown(){return p[this.ptr+13]!=0}init(r,a){this.set_adjusted_ptr(0),this.set_type(r),this.set_destructor(a)}set_adjusted_ptr(r){_[this.ptr+16>>2]=r}get_adjusted_ptr(){return _[this.ptr+16>>2]}}var $r=e=>{throw A||(A=e),A},P=e=>xe(e),qr=e=>{var r=A;if(!r)return P(0),0;var a=new ye(r);a.set_adjusted_ptr(r);var t=a.get_type();if(!t)return P(0),r;for(var i of e){if(i===0||i===t)break;var n=a.ptr+16;if(Be(i,t,n))return P(i),r}return P(t),r},Gr=()=>qr([]),Kr=0,Jr=(e,r,a)=>{var t=new ye(e);throw t.init(r,a),A=e,Kr++,A},Xr=e=>{for(var r=0,a=0;a<e.length;++a){var t=e.charCodeAt(a);t<=127?r++:t<=2047?r+=2:t>=55296&&t<=57343?(r+=4,++a):r+=3}return r},Zr=(e,r,a,t)=>{if(!(t>0))return 0;for(var i=a,n=a+t-1,c=0;c<e.length;++c){var s=e.charCodeAt(c);if(s>=55296&&s<=57343){var f=e.charCodeAt(++c);s=65536+((s&1023)<<10)|f&1023}if(s<=127){if(a>=n)break;r[a++]=s}else if(s<=2047){if(a+1>=n)break;r[a++]=192|s>>6,r[a++]=128|s&63}else if(s<=65535){if(a+2>=n)break;r[a++]=224|s>>12,r[a++]=128|s>>6&63,r[a++]=128|s&63}else{if(a+3>=n)break;r[a++]=240|s>>18,r[a++]=128|s>>12&63,r[a++]=128|s>>6&63,r[a++]=128|s&63}}return r[a]=0,a-i},O=(e,r,a)=>Zr(e,w,r,a),Qr=(e,r)=>{},ea=()=>D(""),ra=(e,r,a)=>w.copyWithin(e,r,r+a),W=0,aa=()=>{W=0},ta=e=>e%4===0&&(e%100!==0||e%400===0),ia=[0,31,60,91,121,152,182,213,244,274,305,335],na=[0,31,59,90,120,151,181,212,243,273,304,334],la=e=>{var r=ta(e.getFullYear()),a=r?ia:na,t=a[e.getMonth()]+e.getDate()-1;return t},me=(e,r)=>r+2097152>>>0<4194305-!!e?(e>>>0)+r*4294967296:NaN;function sa(e,r,a){var t=me(e,r),i=new Date(t*1e3);u[a>>2]=i.getSeconds(),u[a+4>>2]=i.getMinutes(),u[a+8>>2]=i.getHours(),u[a+12>>2]=i.getDate(),u[a+16>>2]=i.getMonth(),u[a+20>>2]=i.getFullYear()-1900,u[a+24>>2]=i.getDay();var n=la(i)|0;u[a+28>>2]=n,u[a+36>>2]=-(i.getTimezoneOffset()*60);var c=new Date(i.getFullYear(),0,1),s=new Date(i.getFullYear(),6,1).getTimezoneOffset(),f=c.getTimezoneOffset(),k=(s!=f&&i.getTimezoneOffset()==Math.min(f,s))|0;u[a+32>>2]=k}var F={},q=e=>{if(e instanceof de||e=="unwind")return x;oe(1,e)},G=()=>W>0,he=e=>{x=e,G()||(S=!0),oe(e,new de(e))},pe=(e,r)=>{x=e,G()||Or(),he(e)},ge=pe,oa=()=>{if(!z&&!G())try{ge(x)}catch(e){q(e)}},we=e=>{if(!(z||S))try{e(),oa()}catch(r){q(r)}},Se=()=>performance.now(),ca=(e,r)=>{if(F[e]&&(clearTimeout(F[e].id),delete F[e]),!r)return 0;var a=setTimeout(()=>{delete F[e],we(()=>je(e,Se()))},r);return F[e]={id:a,timeout_ms:r},0},va=(e,r,a,t)=>{var i=new Date().getFullYear(),n=new Date(i,0,1),c=new Date(i,6,1),s=n.getTimezoneOffset(),f=c.getTimezoneOffset(),k=Math.max(s,f);_[e>>2]=k*60,u[r>>2]=+(s!=f);var or=fr=>{var et=fr>=0?"-":"+",ur=Math.abs(fr),rt=String(Math.floor(ur/60)).padStart(2,"0"),at=String(ur%60).padStart(2,"0");return`UTC${et}${rt}${at}`},cr=or(s),vr=or(f);f<s?(O(cr,a,17),O(vr,t,17)):(O(cr,t,17),O(vr,a,17))},ke=()=>Date.now(),fa=1,ua=e=>e>=0&&e<=3;function _a(e,r,a,t){var i=me(r,a);if(!ua(e))return 28;var n;if(e===0)n=ke();else if(fa)n=Se();else return 52;var c=Math.round(n*1e3*1e3);return $=[c>>>0,(C=c,+Math.abs(C)>=1?C>0?+Math.floor(C/4294967296)>>>0:~~+Math.ceil((C-+(~~C>>>0))/4294967296)>>>0:0)],u[t>>2]=$[0],u[t+4>>2]=$[1],0}function Ce(e,r){let a=ee(r.length);p.set(r,a),u[e>>2]=a,u[e+4>>2]=r.length}function K(e,r){let a=JSON.stringify(r);Ce(e,Ua.encode(a))}var Ae=new TextDecoder,R=(e,r)=>{if(!e)return"";for(var a=e+r,t=e;!(t>=a)&&w[t];)++t;return Ae.decode(w.subarray(e,t))},Re=function(r,a){return l.handleAsync(async()=>{let t=R(r,a);await g.delete(t)})};Re.isAsync=!0;var Ee=function(r,a){return l.handleAsync(async()=>{let t=R(r,a);return g.exists(t)})};Ee.isAsync=!0;var Te=function(){return l.handleAsync(async()=>{await g.write(Q),Q={}})};Te.isAsync=!0;var be=function(r,a,t){return l.handleAsync(async()=>{let i=R(r,a),n=await g.read(i);return n?(Ce(t,n),!0):!1})};be.isAsync=!0;function da(e,r,a,t){let i=R(e,r),n=p.subarray(a,a+t);Q[i]=n}function ya(e){let r=g.get_dirs();K(e,r)}var Ne=function(r){return l.handleAsync(async()=>{E||await new Promise(a=>{ne=a}),K(r,E),E=null})};Ne.isAsync=!0;function ma(e,r){let a=JSON.parse(R(e,r));V.update(a)}function ha(e,r,a){let t=R(e,r),i=g.set_storyfile_dir(t);K(a,i)}var pa=()=>2147483648,ga=(e,r)=>Math.ceil(e/r)*r,wa=e=>{var r=j.buffer,a=(e-r.byteLength+65535)/65536|0;try{return j.grow(a),fe(),1}catch{}},Sa=e=>{var r=w.length;e>>>=0;var a=pa();if(e>a)return!1;for(var t=1;t<=4;t*=2){var i=r*(1+.2/t);i=Math.min(i,e+100663296);var n=Math.min(a,ga(Math.max(e,i),65536)),c=wa(n);if(c)return!0}return!1},J={},ka=()=>se||"./this.program",I=()=>{if(!I.strings){var e=(typeof navigator=="object"&&navigator.languages&&navigator.languages[0]||"C").replace("-","_")+".UTF-8",r={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:e,_:ka()};for(var a in J)J[a]===void 0?delete r[a]:r[a]=J[a];var t=[];for(var a in r)t.push(`${a}=${r[a]}`);I.strings=t}return I.strings},Ca=(e,r)=>{for(var a=0;a<e.length;++a)p[r++]=e.charCodeAt(a);p[r]=0},Aa=(e,r)=>{var a=0;return I().forEach((t,i)=>{var n=r+a;_[e+i*4>>2]=n,Ca(t,n),a+=t.length+1}),0},Ra=(e,r)=>{var a=I();_[e>>2]=a.length;var t=0;return a.forEach(i=>t+=i.length+1),_[r>>2]=t,0},X=[null,[],[]],Ea=(e,r=0,a=NaN)=>{for(var t=r+a,i=r;e[i]&&!(i>=t);)++i;return Ae.decode(e.buffer?e.subarray(r,i):new Uint8Array(e.slice(r,i)))},Z=(e,r)=>{var a=X[e];r===0||r===10?((e===1?gr:T)(Ea(a)),a.length=0):a.push(r)},Ta=()=>{Ue(0),X[1].length&&Z(1,10),X[2].length&&Z(2,10)},ba=(e,r,a,t)=>{for(var i=0,n=0;n<a;n++){var c=_[r>>2],s=_[r+4>>2];r+=8;for(var f=0;f<s;f++)Z(e,w[c+f]);i+=s}return _[t>>2]=i,0},Na=()=>{if(typeof crypto=="object"&&typeof crypto.getRandomValues=="function")return t=>crypto.getRandomValues(t);if(0)try{var e,r,a}catch(t){}D("initRandomDevice")},De=e=>(De=Na())(e),Da=(e,r)=>(De(w.subarray(e,e+r)),0),Me=e=>We(e),Ma=e=>{var r=Xr(e)+1,a=Me(r);return O(e,a,r),a},Oa,L=e=>{try{return e()}catch(r){D(r)}},Fa=()=>{W+=1},Ia=()=>{W-=1},l={instrumentWasmImports(e){var r=/^(invoke_.*|__asyncjs__.*)$/;for(let[a,t]of Object.entries(e))if(typeof t=="function"){let i=t.isAsync||r.test(a)}},instrumentWasmExports(e){var r={};for(let[a,t]of Object.entries(e))typeof t=="function"?r[a]=(...i)=>{l.exportCallStack.push(a);try{return t(...i)}finally{if(!S){var n=l.exportCallStack.pop();l.maybeStopUnwind()}}}:r[a]=t;return r},State:{Normal:0,Unwinding:1,Rewinding:2,Disabled:3},state:0,StackSize:8192,currData:null,handleSleepReturnValue:0,exportCallStack:[],callStackNameToId:{},callStackIdToName:{},callStackId:0,asyncPromiseHandlers:null,sleepCallbacks:[],getCallStackId(e){var r=l.callStackNameToId[e];return r===void 0&&(r=l.callStackId++,l.callStackNameToId[e]=r,l.callStackIdToName[r]=e),r},maybeStopUnwind(){l.currData&&l.state===l.State.Unwinding&&l.exportCallStack.length===0&&(l.state=l.State.Normal,Fa(),L(tr),typeof Fibers<"u"&&Fibers.trampoline())},whenDone(){return new Promise((e,r)=>{l.asyncPromiseHandlers={resolve:e,reject:r}})},allocateData(){var e=ee(12+l.StackSize);return l.setDataHeader(e,e+12,l.StackSize),l.setDataRewindFunc(e),e},setDataHeader(e,r,a){_[e>>2]=r,_[e+4>>2]=r+a},setDataRewindFunc(e){var r=l.exportCallStack[0],a=l.getCallStackId(r);u[e+8>>2]=a},getDataRewindFuncName(e){var r=u[e+8>>2],a=l.callStackIdToName[r];return a},getDataRewindFunc(e){var r=v[e];return r},doRewind(e){var r=l.getDataRewindFuncName(e),a=l.getDataRewindFunc(r);return Ia(),a()},handleSleep(e){if(!S){if(l.state===l.State.Normal){var r=!1,a=!1;e((t=0)=>{if(!S&&(l.handleSleepReturnValue=t,r=!0,!!a)){l.state=l.State.Rewinding,L(()=>ir(l.currData)),typeof MainLoop<"u"&&MainLoop.func&&MainLoop.resume();var i,n=!1;try{i=l.doRewind(l.currData)}catch(f){i=f,n=!0}var c=!1;if(!l.currData){var s=l.asyncPromiseHandlers;s&&(l.asyncPromiseHandlers=null,(n?s.reject:s.resolve)(i),c=!0)}if(n&&!c)throw i}}),a=!0,r||(l.state=l.State.Unwinding,l.currData=l.allocateData(),typeof MainLoop<"u"&&MainLoop.func&&MainLoop.pause(),L(()=>ar(l.currData)))}else l.state===l.State.Rewinding?(l.state=l.State.Normal,L(nr),Oe(l.currData),l.currData=null,l.sleepCallbacks.forEach(we)):D(`invalid state: ${l.state}`);return l.handleSleepReturnValue}},handleAsync(e){return l.handleSleep(r=>{e().then(r)})}};let Q={},Ua=new TextEncoder;var ja={R:Yr,a:Gr,Q:Jr,e:$r,P:Qr,K:ea,J:ra,I:aa,r:sa,H:ca,G:va,s:_a,F:Re,E:Ee,D:Te,C:be,B:da,A:ya,z:Ne,y:ma,x:ha,w:ke,v:Sa,O:Aa,N:Ra,u:ge,p:ba,n:Ka,d:Va,i:Ha,j:qa,m:Xa,l:Ja,q:Za,h:$a,b:Pa,c:Ba,f:La,k:za,g:Wa,o:Ya,t:Ga,M:he,L:Da},v;zr();var xa=()=>(xa=v.T)(),ee=e=>(ee=v.U)(e),Oe=e=>(Oe=v.V)(e),Fe=o._main=(e,r)=>(Fe=o._main=v.W)(e,r),Ie=()=>(Ie=v.Y)(),Ue=e=>(Ue=v.Z)(e),je=(e,r)=>(je=v._)(e,r),d=o._setThrew=(e,r)=>(d=o._setThrew=v.$)(e,r),xe=e=>(xe=v.aa)(e),Pe=e=>(Pe=v.ba)(e),We=e=>(We=v.ca)(e),Le=()=>(Le=v.da)(),Be=(e,r,a)=>(Be=v.ea)(e,r,a),re=o.dynCall_vi=(e,r)=>(re=o.dynCall_vi=v.fa)(e,r),He=o.dynCall_iii=(e,r,a)=>(He=o.dynCall_iii=v.ga)(e,r,a),Ve=o.dynCall_vii=(e,r,a)=>(Ve=o.dynCall_vii=v.ha)(e,r,a),ze=o.dynCall_ii=(e,r)=>(ze=o.dynCall_ii=v.ia)(e,r),Ye=o.dynCall_viiii=(e,r,a,t,i)=>(Ye=o.dynCall_viiii=v.ja)(e,r,a,t,i),$e=o.dynCall_viiiii=(e,r,a,t,i,n)=>($e=o.dynCall_viiiii=v.ka)(e,r,a,t,i,n),qe=o.dynCall_viiiiii=(e,r,a,t,i,n,c)=>(qe=o.dynCall_viiiiii=v.la)(e,r,a,t,i,n,c),Ge=o.dynCall_viii=(e,r,a,t)=>(Ge=o.dynCall_viii=v.ma)(e,r,a,t),Ke=o.dynCall_v=e=>(Ke=o.dynCall_v=v.na)(e),Je=o.dynCall_iiii=(e,r,a,t)=>(Je=o.dynCall_iiii=v.oa)(e,r,a,t),Xe=o.dynCall_iijj=(e,r,a,t,i,n)=>(Xe=o.dynCall_iijj=v.pa)(e,r,a,t,i,n),Ze=o.dynCall_viiiiiii=(e,r,a,t,i,n,c,s)=>(Ze=o.dynCall_viiiiiii=v.qa)(e,r,a,t,i,n,c,s),Qe=o.dynCall_iiiiii=(e,r,a,t,i,n)=>(Qe=o.dynCall_iiiiii=v.ra)(e,r,a,t,i,n),er=o.dynCall_iiiii=(e,r,a,t,i)=>(er=o.dynCall_iiiii=v.sa)(e,r,a,t,i),rr=o.dynCall_i=e=>(rr=o.dynCall_i=v.ta)(e),ar=e=>(ar=v.ua)(e),tr=()=>(tr=v.va)(),ir=e=>(ir=v.wa)(e),nr=()=>(nr=v.xa)();function Pa(e,r){var a=m();try{re(e,r)}catch(t){if(y(a),t!==t+0)throw t;d(1,0)}}function Wa(e,r,a,t,i,n){var c=m();try{$e(e,r,a,t,i,n)}catch(s){if(y(c),s!==s+0)throw s;d(1,0)}}function La(e,r,a,t){var i=m();try{Ge(e,r,a,t)}catch(n){if(y(i),n!==n+0)throw n;d(1,0)}}function Ba(e,r,a){var t=m();try{Ve(e,r,a)}catch(i){if(y(t),i!==i+0)throw i;d(1,0)}}function Ha(e,r,a){var t=m();try{return He(e,r,a)}catch(i){if(y(t),i!==i+0)throw i;d(1,0)}}function Va(e,r){var a=m();try{return ze(e,r)}catch(t){if(y(a),t!==t+0)throw t;d(1,0)}}function za(e,r,a,t,i){var n=m();try{Ye(e,r,a,t,i)}catch(c){if(y(n),c!==c+0)throw c;d(1,0)}}function Ya(e,r,a,t,i,n,c){var s=m();try{qe(e,r,a,t,i,n,c)}catch(f){if(y(s),f!==f+0)throw f;d(1,0)}}function $a(e){var r=m();try{Ke(e)}catch(a){if(y(r),a!==a+0)throw a;d(1,0)}}function qa(e,r,a,t){var i=m();try{return Je(e,r,a,t)}catch(n){if(y(i),n!==n+0)throw n;d(1,0)}}function Ga(e,r,a,t,i,n,c,s){var f=m();try{Ze(e,r,a,t,i,n,c,s)}catch(k){if(y(f),k!==k+0)throw k;d(1,0)}}function Ka(e){var r=m();try{return rr(e)}catch(a){if(y(r),a!==a+0)throw a;d(1,0)}}function Ja(e,r,a,t,i,n){var c=m();try{return Qe(e,r,a,t,i,n)}catch(s){if(y(c),s!==s+0)throw s;d(1,0)}}function Xa(e,r,a,t,i){var n=m();try{return er(e,r,a,t,i)}catch(c){if(y(n),c!==c+0)throw c;d(1,0)}}function Za(e,r,a,t,i,n){var c=m();try{return Xe(e,r,a,t,i,n)}catch(s){if(y(c),s!==s+0)throw s;d(1,0)}}var B;N=function e(){B||sr(),B||(N=e)};function lr(e=[]){var r=Fe;e.unshift(se);var a=e.length,t=Me((a+1)*4),i=t;e.forEach(c=>{_[i>>2]=Ma(c),i+=4}),_[i>>2]=0;try{var n=r(a,t);return pe(n,!0),n}catch(c){return q(c)}}function sr(e=hr){if(b>0||(Nr(),b>0))return;function r(){B||(B=!0,o.calledRun=!0,!S&&(Dr(),Mr(),ie(o),Qa&&lr(e),Fr()))}r()}var Qa=!1;return sr(),te=dr,te}})(),ot=tt;export{ot as default};
//# sourceMappingURL=hugo.js.map
