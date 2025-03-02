var Ka=(()=>{var ee=import.meta.url;return async function(or={}){var re,s=or,ae,B,cr=new Promise((e,r)=>{ae=e,B=r}),vr=typeof WorkerGlobalScope<"u";if(0)var Ga;let g,L,R,te=()=>{};s.start=function(e){if(g=e.Dialog,!g.async)throw new Error("Emglken requires an async Dialog library");L=e.GlkOte,e.accept=ur,lr(e.arguments),L.init(e)};function ur(e){R&&console.warn("Already have GlkOte event when next event arrives"),R=e,te()}s.locateFile=function(e){try{return new URL(e,import.meta.url).href}catch{return e}};var ie=Object.assign({},s),fr=[],ne="./this.program",le=(e,r)=>{throw r},m="";function _r(e){return s.locateFile?s.locateFile(e,m):m+e}var se,oe;if(0)var Ja,Xa;else vr?m=self.location.href:typeof document<"u"&&document.currentScript&&(m=document.currentScript.src),ee&&(m=ee),m.startsWith("blob:")?m="":m=m.substr(0,m.replace(/[?#].*/,"").lastIndexOf("/")+1),se=async e=>{var r=await fetch(e,{credentials:"same-origin"});if(r.ok)return r.arrayBuffer();throw new Error(r.status+" : "+r.url)};var dr=console.log.bind(console),A=console.error.bind(console);Object.assign(s,ie),ie=null;var M=s.wasmBinary,U,w=!1,P,h,p,yr,mr,k,f,hr,pr;function ce(){var e=U.buffer;h=new Int8Array(e),yr=new Int16Array(e),p=new Uint8Array(e),mr=new Uint16Array(e),k=new Int32Array(e),f=new Uint32Array(e),hr=new Float32Array(e),pr=new Float64Array(e)}var gr=[],ve=[],wr=[],kr=[],Cr=[],Sr=!1,V=!1;function Rr(){T(gr)}function Ar(){Sr=!0,T(ve)}function Er(){T(wr)}function br(){Fe(),T(kr),pa(),V=!0}function Nr(){T(Cr)}function Tr(e){ve.unshift(e)}var E=0,b=null;function Ir(e){E++}function Dr(e){if(E--,E==0&&b){var r=b;b=null,r()}}function N(e){e="Aborted("+e+")",A(e),w=!0,e+=". Build with -sASSERTIONS for more info.";var r=new WebAssembly.RuntimeError(e);throw B(r),r}var Fr="data:application/octet-stream;base64,",ue=e=>e.startsWith(Fr),Ya=e=>e.startsWith("file://");function Mr(){if(s.locateFile){var e="glulxe.wasm";return ue(e)?e:_r(e)}return new URL("glulxe.wasm",import.meta.url).href}var H;function Ur(e){if(e==H&&M)return new Uint8Array(M);if(oe)return oe(e);throw"both async and sync fetching of the wasm failed"}async function Pr(e){if(!M)try{var r=await se(e);return new Uint8Array(r)}catch{}return Ur(e)}async function Or(e,r){try{var a=await Pr(e),t=await WebAssembly.instantiate(a,r);return t}catch(i){A(`failed to asynchronously prepare wasm: ${i}`),N(i)}}async function jr(e,r,a){if(!e&&typeof WebAssembly.instantiateStreaming=="function"&&!ue(r)&&typeof fetch=="function")try{var t=fetch(r,{credentials:"same-origin"}),i=await WebAssembly.instantiateStreaming(t,a);return i}catch(n){A(`wasm streaming compile failed: ${n}`),A("falling back to ArrayBuffer instantiation")}return Or(r,a)}function xr(){return{a:ba}}async function Wr(){function e(i,n){return v=i.exports,v=l.instrumentWasmExports(v),U=v.S,ce(),Sa=v.X,Tr(v.T),Dr("wasm-instantiate"),v}Ir("wasm-instantiate");function r(i){e(i.instance)}var a=xr();H??=Mr();try{var t=await jr(M,H,a);return r(t),t}catch(i){B(i);return}}var C,z;class fe{name="ExitStatus";constructor(r){this.message=`Program terminated with exit(${r})`,this.status=r}}var T=e=>{for(;e.length>0;)e.shift()(s)},_=e=>Oe(e),d=()=>xe(),Br=(e,r)=>(a=>Q(e,a))(r),S=0;class _e{constructor(r){this.excPtr=r,this.ptr=r-24}set_type(r){f[this.ptr+4>>2]=r}get_type(){return f[this.ptr+4>>2]}set_destructor(r){f[this.ptr+8>>2]=r}get_destructor(){return f[this.ptr+8>>2]}set_caught(r){r=r?1:0,h[this.ptr+12]=r}get_caught(){return h[this.ptr+12]!=0}set_rethrown(r){r=r?1:0,h[this.ptr+13]=r}get_rethrown(){return h[this.ptr+13]!=0}init(r,a){this.set_adjusted_ptr(0),this.set_type(r),this.set_destructor(a)}set_adjusted_ptr(r){f[this.ptr+16>>2]=r}get_adjusted_ptr(){return f[this.ptr+16>>2]}}var Lr=e=>{throw S||(S=e),S},O=e=>Pe(e),Vr=e=>{var r=S;if(!r)return O(0),0;var a=new _e(r);a.set_adjusted_ptr(r);var t=a.get_type();if(!t)return O(0),r;for(var i of e){if(i===0||i===t)break;var n=a.ptr+16;if(We(i,t,n))return O(i),r}return O(t),r},Hr=()=>Vr([]),zr=0,qr=(e,r,a)=>{var t=new _e(e);throw t.init(r,a),S=e,zr++,S},$r=e=>{for(var r=0,a=0;a<e.length;++a){var t=e.charCodeAt(a);t<=127?r++:t<=2047?r+=2:t>=55296&&t<=57343?(r+=4,++a):r+=3}return r},Kr=(e,r,a,t)=>{if(!(t>0))return 0;for(var i=a,n=a+t-1,o=0;o<e.length;++o){var c=e.charCodeAt(o);if(c>=55296&&c<=57343){var y=e.charCodeAt(++o);c=65536+((c&1023)<<10)|y&1023}if(c<=127){if(a>=n)break;r[a++]=c}else if(c<=2047){if(a+1>=n)break;r[a++]=192|c>>6,r[a++]=128|c&63}else if(c<=65535){if(a+2>=n)break;r[a++]=224|c>>12,r[a++]=128|c>>6&63,r[a++]=128|c&63}else{if(a+3>=n)break;r[a++]=240|c>>18,r[a++]=128|c>>12&63,r[a++]=128|c>>6&63,r[a++]=128|c&63}}return r[a]=0,a-i},Gr=(e,r,a)=>Kr(e,p,r,a),Jr=(e,r)=>{},Xr=()=>N(""),Yr=(e,r,a)=>p.copyWithin(e,r,r+a),j=0,Qr=()=>{j=0},I={},q=e=>{if(e instanceof fe||e=="unwind")return P;le(1,e)},$=()=>j>0,de=e=>{P=e,$()||(w=!0),le(e,new fe(e))},ye=(e,r)=>{P=e,$()||br(),de(e)},me=ye,Zr=()=>{if(!V&&!$())try{me(P)}catch(e){q(e)}},he=e=>{if(!(V||w))try{e(),Zr()}catch(r){q(r)}},pe=()=>performance.now(),ea=(e,r)=>{if(I[e]&&(clearTimeout(I[e].id),delete I[e]),!r)return 0;var a=setTimeout(()=>{delete I[e],he(()=>Ue(e,pe()))},r);return I[e]={id:a,timeout_ms:r},0},ge=()=>Date.now(),ra=1,aa=e=>e>=0&&e<=3,ta=(e,r)=>r+2097152>>>0<4194305-!!e?(e>>>0)+r*4294967296:NaN;function ia(e,r,a,t){var i=ta(r,a);if(!aa(e))return 28;var n;if(e===0)n=ge();else if(ra)n=pe();else return 52;var o=Math.round(n*1e3*1e3);return z=[o>>>0,(C=o,+Math.abs(C)>=1?C>0?+Math.floor(C/4294967296)>>>0:~~+Math.ceil((C-+(~~C>>>0))/4294967296)>>>0:0)],k[t>>2]=z[0],k[t+4>>2]=z[1],0}function we(e,r){let a=Y(r.length);h.set(r,a),k[e>>2]=a,k[e+4>>2]=r.length}function ke(e,r){let a=JSON.stringify(r);we(e,Ea.encode(a))}var Ce=new TextDecoder,D=(e,r)=>{if(!e)return"";for(var a=e+r,t=e;!(t>=a)&&p[t];)++t;return Ce.decode(p.subarray(e,t))},Se=function(r,a){return l.handleAsync(async()=>{let t=D(r,a);await g.delete(t)})};Se.isAsync=!0;var Re=function(r,a){return l.handleAsync(async()=>{let t=D(r,a);return g.exists(t)})};Re.isAsync=!0;var Ae=function(){return l.handleAsync(async()=>{await g.write(X),X={}})};Ae.isAsync=!0;var Ee=function(r,a,t){return l.handleAsync(async()=>{let i=D(r,a),n=await g.read(i);return n?(we(t,n),!0):!1})};Ee.isAsync=!0;function na(e,r,a,t){let i=D(e,r),n=h.subarray(a,a+t);X[i]=n}function la(e){let r=g.get_dirs();ke(e,r)}var be=function(r){return l.handleAsync(async()=>{R||await new Promise(a=>{te=a}),ke(r,R),R=null})};be.isAsync=!0;function sa(){return new Date().getTimezoneOffset()*-60}function oa(e,r){let a=JSON.parse(D(e,r));L.update(a)}var ca=()=>2147483648,va=(e,r)=>Math.ceil(e/r)*r,ua=e=>{var r=U.buffer,a=(e-r.byteLength+65535)/65536|0;try{return U.grow(a),ce(),1}catch{}},fa=e=>{var r=p.length;e>>>=0;var a=ca();if(e>a)return!1;for(var t=1;t<=4;t*=2){var i=r*(1+.2/t);i=Math.min(i,e+100663296);var n=Math.min(a,va(Math.max(e,i),65536)),o=ua(n);if(o)return!0}return!1},K={},_a=()=>ne||"./this.program",F=()=>{if(!F.strings){var e=(typeof navigator=="object"&&navigator.languages&&navigator.languages[0]||"C").replace("-","_")+".UTF-8",r={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:e,_:_a()};for(var a in K)K[a]===void 0?delete r[a]:r[a]=K[a];var t=[];for(var a in r)t.push(`${a}=${r[a]}`);F.strings=t}return F.strings},da=(e,r)=>{for(var a=0;a<e.length;++a)h[r++]=e.charCodeAt(a);h[r]=0},ya=(e,r)=>{var a=0;return F().forEach((t,i)=>{var n=r+a;f[e+i*4>>2]=n,da(t,n),a+=t.length+1}),0},ma=(e,r)=>{var a=F();f[e>>2]=a.length;var t=0;return a.forEach(i=>t+=i.length+1),f[r>>2]=t,0},G=[null,[],[]],ha=(e,r=0,a=NaN)=>{for(var t=r+a,i=r;e[i]&&!(i>=t);)++i;return Ce.decode(e.buffer?e.subarray(r,i):new Uint8Array(e.slice(r,i)))},J=(e,r)=>{var a=G[e];r===0||r===10?((e===1?dr:A)(ha(a)),a.length=0):a.push(r)},pa=()=>{Me(0),G[1].length&&J(1,10),G[2].length&&J(2,10)},ga=(e,r,a,t)=>{for(var i=0,n=0;n<a;n++){var o=f[r>>2],c=f[r+4>>2];r+=8;for(var y=0;y<c;y++)J(e,p[o+y]);i+=c}return f[t>>2]=i,0},wa=()=>{if(typeof crypto=="object"&&typeof crypto.getRandomValues=="function")return t=>crypto.getRandomValues(t);if(0)try{var e,r,a}catch(t){}N("initRandomDevice")},Ne=e=>(Ne=wa())(e),ka=(e,r)=>(Ne(p.subarray(e,e+r)),0),Te=e=>je(e),Ca=e=>{var r=$r(e)+1,a=Te(r);return Gr(e,a,r),a},Sa,x=e=>{try{return e()}catch(r){N(r)}},Ra=()=>{j+=1},Aa=()=>{j-=1},l={instrumentWasmImports(e){var r=/^(invoke_.*|__asyncjs__.*)$/;for(let[a,t]of Object.entries(e))if(typeof t=="function"){let i=t.isAsync||r.test(a)}},instrumentWasmExports(e){var r={};for(let[a,t]of Object.entries(e))typeof t=="function"?r[a]=(...i)=>{l.exportCallStack.push(a);try{return t(...i)}finally{if(!w){var n=l.exportCallStack.pop();l.maybeStopUnwind()}}}:r[a]=t;return r},State:{Normal:0,Unwinding:1,Rewinding:2,Disabled:3},state:0,StackSize:8192,currData:null,handleSleepReturnValue:0,exportCallStack:[],callStackNameToId:{},callStackIdToName:{},callStackId:0,asyncPromiseHandlers:null,sleepCallbacks:[],getCallStackId(e){var r=l.callStackNameToId[e];return r===void 0&&(r=l.callStackId++,l.callStackNameToId[e]=r,l.callStackIdToName[r]=e),r},maybeStopUnwind(){l.currData&&l.state===l.State.Unwinding&&l.exportCallStack.length===0&&(l.state=l.State.Normal,Ra(),x(tr),typeof Fibers<"u"&&Fibers.trampoline())},whenDone(){return new Promise((e,r)=>{l.asyncPromiseHandlers={resolve:e,reject:r}})},allocateData(){var e=Y(12+l.StackSize);return l.setDataHeader(e,e+12,l.StackSize),l.setDataRewindFunc(e),e},setDataHeader(e,r,a){f[e>>2]=r,f[e+4>>2]=r+a},setDataRewindFunc(e){var r=l.exportCallStack[0],a=l.getCallStackId(r);k[e+8>>2]=a},getDataRewindFuncName(e){var r=k[e+8>>2],a=l.callStackIdToName[r];return a},getDataRewindFunc(e){var r=v[e];return r},doRewind(e){var r=l.getDataRewindFuncName(e),a=l.getDataRewindFunc(r);return Aa(),a()},handleSleep(e){if(!w){if(l.state===l.State.Normal){var r=!1,a=!1;e((t=0)=>{if(!w&&(l.handleSleepReturnValue=t,r=!0,!!a)){l.state=l.State.Rewinding,x(()=>ir(l.currData)),typeof MainLoop<"u"&&MainLoop.func&&MainLoop.resume();var i,n=!1;try{i=l.doRewind(l.currData)}catch(y){i=y,n=!0}var o=!1;if(!l.currData){var c=l.asyncPromiseHandlers;c&&(l.asyncPromiseHandlers=null,(n?c.reject:c.resolve)(i),o=!0)}if(n&&!o)throw i}}),a=!0,r||(l.state=l.State.Unwinding,l.currData=l.allocateData(),typeof MainLoop<"u"&&MainLoop.func&&MainLoop.pause(),x(()=>ar(l.currData)))}else l.state===l.State.Rewinding?(l.state=l.State.Normal,x(nr),Ie(l.currData),l.currData=null,l.sleepCallbacks.forEach(he)):N(`invalid state: ${l.state}`);return l.handleSleepReturnValue}},handleAsync(e){return l.handleSleep(r=>{e().then(r)})}};let X={},Ea=new TextEncoder;var ba={R:Br,a:Hr,Q:qr,f:Lr,P:Jr,J:Xr,I:Yr,H:Qr,G:ea,s:ia,F:Se,E:Re,D:Ae,C:Ee,B:na,A:la,z:be,y:sa,x:oa,w:ge,v:fa,O:ya,N:ma,u:me,M:ga,m:Ba,c:Ua,k:Ma,i:xa,o:Va,l:La,p:Ha,r:qa,q:za,h:ja,b:Ta,d:Fa,g:Da,j:Pa,e:Ia,n:Oa,t:Wa,L:de,K:ka},v;Wr();var Na=()=>(Na=v.T)(),Y=e=>(Y=v.U)(e),Ie=e=>(Ie=v.V)(e),De=s._main=(e,r)=>(De=s._main=v.W)(e,r),Fe=()=>(Fe=v.Y)(),Me=e=>(Me=v.Z)(e),Ue=(e,r)=>(Ue=v._)(e,r),u=s._setThrew=(e,r)=>(u=s._setThrew=v.$)(e,r),Pe=e=>(Pe=v.aa)(e),Oe=e=>(Oe=v.ba)(e),je=e=>(je=v.ca)(e),xe=()=>(xe=v.da)(),We=(e,r,a)=>(We=v.ea)(e,r,a),Q=s.dynCall_vi=(e,r)=>(Q=s.dynCall_vi=v.fa)(e,r),Be=s.dynCall_viiiii=(e,r,a,t,i,n)=>(Be=s.dynCall_viiiii=v.ga)(e,r,a,t,i,n),Le=s.dynCall_viii=(e,r,a,t)=>(Le=s.dynCall_viii=v.ha)(e,r,a,t),Ve=s.dynCall_vii=(e,r,a)=>(Ve=s.dynCall_vii=v.ia)(e,r,a),He=s.dynCall_iii=(e,r,a)=>(He=s.dynCall_iii=v.ja)(e,r,a),ze=s.dynCall_ii=(e,r)=>(ze=s.dynCall_ii=v.ka)(e,r),qe=s.dynCall_viiii=(e,r,a,t,i)=>(qe=s.dynCall_viiii=v.la)(e,r,a,t,i),$e=s.dynCall_viiiiii=(e,r,a,t,i,n,o)=>($e=s.dynCall_viiiiii=v.ma)(e,r,a,t,i,n,o),Ke=s.dynCall_v=e=>(Ke=s.dynCall_v=v.na)(e),Ge=s.dynCall_iiii=(e,r,a,t)=>(Ge=s.dynCall_iiii=v.oa)(e,r,a,t),Je=s.dynCall_iijj=(e,r,a,t,i,n)=>(Je=s.dynCall_iijj=v.pa)(e,r,a,t,i,n),Xe=s.dynCall_viiiiiii=(e,r,a,t,i,n,o,c)=>(Xe=s.dynCall_viiiiiii=v.qa)(e,r,a,t,i,n,o,c),Ye=s.dynCall_i=e=>(Ye=s.dynCall_i=v.ra)(e),Qe=s.dynCall_iiiiii=(e,r,a,t,i,n)=>(Qe=s.dynCall_iiiiii=v.sa)(e,r,a,t,i,n),Ze=s.dynCall_iiiii=(e,r,a,t,i)=>(Ze=s.dynCall_iiiii=v.ta)(e,r,a,t,i),er=s.dynCall_iiji=(e,r,a,t,i)=>(er=s.dynCall_iiji=v.ua)(e,r,a,t,i),rr=s.dynCall_iiiiiii=(e,r,a,t,i,n,o)=>(rr=s.dynCall_iiiiiii=v.va)(e,r,a,t,i,n,o),ar=e=>(ar=v.wa)(e),tr=()=>(tr=v.xa)(),ir=e=>(ir=v.ya)(e),nr=()=>(nr=v.za)();function Ta(e,r){var a=d();try{Q(e,r)}catch(t){if(_(a),t!==t+0)throw t;u(1,0)}}function Ia(e,r,a,t,i,n){var o=d();try{Be(e,r,a,t,i,n)}catch(c){if(_(o),c!==c+0)throw c;u(1,0)}}function Da(e,r,a,t){var i=d();try{Le(e,r,a,t)}catch(n){if(_(i),n!==n+0)throw n;u(1,0)}}function Fa(e,r,a){var t=d();try{Ve(e,r,a)}catch(i){if(_(t),i!==i+0)throw i;u(1,0)}}function Ma(e,r,a){var t=d();try{return He(e,r,a)}catch(i){if(_(t),i!==i+0)throw i;u(1,0)}}function Ua(e,r){var a=d();try{return ze(e,r)}catch(t){if(_(a),t!==t+0)throw t;u(1,0)}}function Pa(e,r,a,t,i){var n=d();try{qe(e,r,a,t,i)}catch(o){if(_(n),o!==o+0)throw o;u(1,0)}}function Oa(e,r,a,t,i,n,o){var c=d();try{$e(e,r,a,t,i,n,o)}catch(y){if(_(c),y!==y+0)throw y;u(1,0)}}function ja(e){var r=d();try{Ke(e)}catch(a){if(_(r),a!==a+0)throw a;u(1,0)}}function xa(e,r,a,t){var i=d();try{return Ge(e,r,a,t)}catch(n){if(_(i),n!==n+0)throw n;u(1,0)}}function Wa(e,r,a,t,i,n,o,c){var y=d();try{Xe(e,r,a,t,i,n,o,c)}catch(Z){if(_(y),Z!==Z+0)throw Z;u(1,0)}}function Ba(e){var r=d();try{return Ye(e)}catch(a){if(_(r),a!==a+0)throw a;u(1,0)}}function La(e,r,a,t,i,n){var o=d();try{return Qe(e,r,a,t,i,n)}catch(c){if(_(o),c!==c+0)throw c;u(1,0)}}function Va(e,r,a,t,i){var n=d();try{return Ze(e,r,a,t,i)}catch(o){if(_(n),o!==o+0)throw o;u(1,0)}}function Ha(e,r,a,t,i,n,o){var c=d();try{return rr(e,r,a,t,i,n,o)}catch(y){if(_(c),y!==y+0)throw y;u(1,0)}}function za(e,r,a,t,i,n){var o=d();try{return Je(e,r,a,t,i,n)}catch(c){if(_(o),c!==c+0)throw c;u(1,0)}}function qa(e,r,a,t,i){var n=d();try{return er(e,r,a,t,i)}catch(o){if(_(n),o!==o+0)throw o;u(1,0)}}var W;b=function e(){W||sr(),W||(b=e)};function lr(e=[]){var r=De;e.unshift(ne);var a=e.length,t=Te((a+1)*4),i=t;e.forEach(o=>{f[i>>2]=Ca(o),i+=4}),f[i>>2]=0;try{var n=r(a,t);return ye(n,!0),n}catch(o){return q(o)}}function sr(e=fr){if(E>0||(Rr(),E>0))return;function r(){W||(W=!0,s.calledRun=!0,!w&&(Ar(),Er(),ae(s),$a&&lr(e),Nr()))}r()}var $a=!1;return sr(),re=cr,re}})(),Qa=Ka;export{Qa as default};
//# sourceMappingURL=glulxe.js.map
