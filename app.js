import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

const $ = (id) => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const state = { playing: !reducedMotion.matches, speed: 1, night: false, journey: false, view: 'overview', distance: 0, phase: 0, angle: 1.57, sound: false };
let renderer, scene, camera, controls, rider, wheels = [], crank, body, head, scarf, legs = [], sea, sun, lighthouseLight, skyLight, keyLight, last = performance.now(), elapsed = 0, toastTimer, cameraTween = null;
const palms = [], clouds = [], gulls = [], stars = [], sparkles = [], flowers = [], wind = new THREE.Vector3();
const V = (x,y,z) => new THREE.Vector3(x,y,z);
const mats = {};
const mat = (color, roughness = .75, metalness = 0) => new THREE.MeshStandardMaterial({color,roughness,metalness});

function toast(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3200); }
function mesh(geometry, material, parent, position, scale) { const m = new THREE.Mesh(geometry,material); if(position)m.position.copy(position); if(scale)m.scale.copy(scale); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
const sphereGeo = new THREE.SphereGeometry(1,24,16);
function ellipsoid(parent, material, p, s) { return mesh(sphereGeo,material,parent,V(...p),V(...s)); }
function tube(parent, points, radius, material, segments = 24) { return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>V(...p))),segments,radius,8,false),material,parent); }
function rod(parent,a,b,r,material) { const av=Array.isArray(a)?V(...a):a,bv=Array.isArray(b)?V(...b):b; const d = bv.clone().sub(av);const m = mesh(new THREE.CylinderGeometry(r,r,d.length(),10),material,parent,av.clone().add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return m; }
function ring(parent,radius,tubeRadius,material,p) {return mesh(new THREE.TorusGeometry(radius,tubeRadius,12,64),material,parent,V(...p));}
function seeded(seed) {return () => {seed = (seed * 1664525 + 1013904223) >>> 0;return seed / 4294967296;};}
const random = seeded(81);

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(36,1,.1,150);
  renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  renderer.domElement.setAttribute('aria-label','可旋转的 3D 海岛：鹈鹕骑着薄荷绿自行车，经过灯塔、棕榈树与海浪');renderer.domElement.setAttribute('role','img');renderer.domElement.tabIndex=0;
  $('scene').append(renderer.domElement);
  controls = new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.enablePan=false;controls.minDistance=5;controls.maxDistance=38;controls.minPolarAngle=.2;controls.maxPolarAngle=Math.PI*.49;controls.target.set(0,1.3,0);
  controls.addEventListener('start',()=>{cameraTween=null; if(state.view!=='overview'){state.view='overview';updateViewButtons();} });
  const ambient = new THREE.AmbientLight(0xfff7e0,.7);scene.add(ambient);skyLight = new THREE.HemisphereLight(0xeafcff,0xa19a72,2.3);scene.add(skyLight);
  keyLight = new THREE.DirectionalLight(0xffe5bc,3.6);keyLight.position.set(-7,15,10);keyLight.castShadow=true;keyLight.shadow.mapSize.set(2048,2048);Object.assign(keyLight.shadow.camera,{left:-14,right:14,top:14,bottom:-14,near:.5,far:50});keyLight.shadow.normalBias=.025;keyLight.shadow.bias=-.0002;keyLight.shadow.radius=4;scene.add(keyLight);
  const rim = new THREE.DirectionalLight(0xc8f4ed,1.2);rim.position.set(8,7,-8);scene.add(rim);
  Object.assign(mats,{cream:mat(0xfaf2d9),wing:mat(0xe5e5cf),wingTip:mat(0x42564f),orange:mat(0xf0a943),pouch:mat(0xe6a04b),dark:mat(0x2b413d),mint:mat(0x82c9b1,.35,.15),tire:mat(0x354849,.9),rim:mat(0xf3e9cc,.45,.4),metal:mat(0xa3b0a3,.3,.65),coral:mat(0xdb8068),sand:mat(0xeedfc0),grass:mat(0xd1db9a),trunk:mat(0xa99065),leaf:mat(0x66987c),road:mat(0xb6c2ac),paint:mat(0xf6f1db),white:mat(0xf5efd9),roof:mat(0xce7b60),rock:mat(0xb8bd9e)});
  buildIsland();buildBike();buildPelican();buildScenery();buildAtmosphere();
  setOverview(true);resize();
  // Observe the actual scene box: responsive layout can settle after window.resize.
  new ResizeObserver(resize).observe($('scene'));bindUI();updatePlay();
  renderer.domElement.addEventListener('webglcontextlost',(e)=>{e.preventDefault();state.playing=false;updatePlay();toast('画面暂时休息了，刷新页面即可继续旅程');});
  renderer.compile(scene,camera);renderer.render(scene,camera);$('loading').classList.add('loaded');
  window.__pelican = {state, renderer, scene, camera, get wheels(){return wheels;},get rider(){return rider;}};
  requestAnimationFrame(animate);
}

function buildIsland() {
  const island = new THREE.Group();scene.add(island);island.scale.z=.86;
  const profile = [V(0,-.7),V(7.3,-.7),V(7.9,-.5),V(8.15,-.16),V(8.1,.02),V(7.8,.16),V(0,.16)];
  mesh(new THREE.LatheGeometry(profile.map(v=>new THREE.Vector2(v.x,v.y)),100),mats.sand,island);
  const lawn=mesh(new THREE.CylinderGeometry(5.2,5.4,.22,80),mats.grass,island,V(0,.21,0));
  const road=mesh(new THREE.RingGeometry(5.25,6.65,100),mats.road,island,V(0,.175,0));road.rotation.x=-Math.PI/2;
  for(let i=0;i<45;i++){const a=i/45*Math.PI*2;const dash=mesh(new THREE.BoxGeometry(.36,.012,.045),mats.paint,island,V(Math.cos(a)*5.95,.19,Math.sin(a)*5.95));dash.rotation.y=-a-Math.PI/2;}
  for(const r of [5.3,6.6]) {const edge=ring(island,r,.025,mats.paint,[0,.18,0]);edge.rotation.x=-Math.PI/2;}
  for(let i=0;i<29;i++){const a=random()*Math.PI*2,r=6.95+random()*.6;const rock=ellipsoid(island,mats.rock,[Math.cos(a)*r,.12,Math.sin(a)*r],[.12+random()*.24,.1+random()*.2,.13+random()*.24]);rock.rotation.y=random()*5;}
  for(let i=0;i<22;i++){const a=random()*Math.PI*2,r=2+random()*3;ellipsoid(island,i%2?mats.leaf:mats.grass,[Math.cos(a)*r,.3,Math.sin(a)*r],[.2+random()*.6,.04,.2+random()*.5]);}
  sea = mesh(new THREE.CircleGeometry(11.2,100), new THREE.ShaderMaterial({transparent:true,uniforms:{uTime:{value:0},uNight:{value:0}},vertexShader:`varying vec2 vUv;varying vec3 vPos;uniform float uTime;void main(){vUv=uv;vec3 p=position;p.z+=sin(p.x*1.9+uTime)*cos(p.y*1.3+uTime*.6)*.035;vPos=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`varying vec2 vUv;varying vec3 vPos;uniform float uTime;uniform float uNight;void main(){float d=length(vUv-.5)*2.;float waves=sin(vPos.x*3.+uTime*.7+sin(vPos.y*2.))*sin(vPos.y*3.5-uTime*.6);float foam=pow(max(0.,sin(d*65.-uTime*1.2+sin(vPos.x*1.2)*.5)),14.)*.13;vec3 day=mix(vec3(.34,.67,.63),vec3(.67,.83,.75),smoothstep(.6,1.,d));day+=waves*.024+foam;vec3 night=mix(vec3(.08,.25,.3),vec3(.2,.38,.42),d)+foam*.7;float alpha=1.-smoothstep(.89,1.,d);gl_FragColor=vec4(mix(day,night,uNight),alpha);}`}),scene,V(0,-.45,0));sea.rotation.x=-Math.PI/2;sea.castShadow=false;sea.receiveShadow=false;
  // Narrow foam lines trace the shore; their varying arcs keep the coastline organic.
  for(let i=0;i<6;i++){const points=[];for(let j=0;j<=80;j++){const a=j/80*Math.PI*2;const r=8.4+i*.32+Math.sin(a*5+i)*.06;points.push(V(Math.cos(a)*r,-.4,Math.sin(a)*r*.86));}const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xe8f5dc,transparent:true,opacity:.25-i*.025}));scene.add(line);sparkles.push(line);}
  // Radial contact shadow beneath the floating water makes a soft tabletop diorama.
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');const g=ctx.createRadialGradient(64,64,12,64,64,64);g.addColorStop(0,'rgba(50,80,65,.18)');g.addColorStop(1,'rgba(50,80,65,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  const shadow=mesh(new THREE.PlaneGeometry(27,23),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}),scene,V(0,-.9,0));shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
}

function buildBike() {
  rider = new THREE.Group();scene.add(rider);
  const bike = new THREE.Group();rider.add(bike);
  for(const x of [-1.25,1.25]){
    const wheel=new THREE.Group();wheel.position.set(x,.86,0);bike.add(wheel);wheels.push(wheel);
    ring(wheel,.62,.075,mats.tire,[0,0,0]);ring(wheel,.55,.025,mats.rim,[0,0,0]);
    for(let i=0;i<16;i++){let a=i/16*Math.PI*2;rod(wheel,[0,0,0],[Math.cos(a)*.54,Math.sin(a)*.54,0],.009,mats.metal);}
    const hub=mesh(new THREE.CylinderGeometry(.075,.075,.19,16),mats.metal,wheel);hub.rotation.x=Math.PI/2;
    mesh(new THREE.BoxGeometry(.06,.13,.035),mats.orange,wheel,V(.37,.27,.045));
    const mud=mesh(new THREE.TorusGeometry(.73,.035,8,40,Math.PI),mats.mint,bike,V(x,.86,0));mud.rotation.z=.05;
  }
  const rear=[-1.25,.86,0],bb=[-.15,.83,0],seat=[-.57,1.88,0],front=[.8,1.85,0],lower=[.97,1.45,0];
  for(const [a,b,r] of [[rear,bb,.045],[rear,seat,.045],[bb,seat,.065],[seat,front,.06],[bb,lower,.065],[front,lower,.075],[lower,[1.25,.86,0],.045]])rod(bike,a,b,r,mats.mint);
  rod(bike,[-.57,1.88,0],[-.62,2.15,0],.04,mats.metal);ellipsoid(bike,mats.dark,[-.67,2.18,0],[.39,.1,.24]);
  tube(bike,[[.8,1.85,0],[.72,2.17,0],[.83,2.34,0],[1.03,2.35,0]],.04,mats.metal);
  tube(bike,[[1.08,2.3,-.42],[.88,2.35,-.32],[.83,2.35,0],[.88,2.35,.32],[1.08,2.3,.42]],.04,mats.metal);
  rod(bike,[1.02,2.31,-.4],[1.18,2.27,-.4],.06,mats.dark);rod(bike,[1.02,2.31,.4],[1.18,2.27,.4],.06,mats.dark);
  // Little brass bell, front lamp, leather saddle bag, rear rack.
  ellipsoid(bike,mats.orange,[.89,2.42,.26],[.1,.07,.1]);ellipsoid(bike,mats.rim,[1.13,1.81,0],[.12,.12,.14]);ellipsoid(bike,mat(0xfff6bd),[1.23,1.81,0],[.035,.085,.09]);
  tube(bike,[[-1.6,1.65,-.22],[-.8,1.65,-.22],[-.8,1.65,.22],[-1.6,1.65,.22]],.025,mats.metal);rod(bike,[-1.25,.86,.1],[-1.5,1.65,.18],.02,mats.metal);
  const bag=mesh(new THREE.BoxGeometry(.43,.42,.22),mats.coral,bike,V(-1.26,1.45,.31));bag.rotation.z=-.07;
  rod(bike,[-1.48,1.6,.44],[-1.06,1.6,.44],.022,mats.orange);
  const chain=mesh(new THREE.TorusGeometry(.24,.018,6,32),mats.metal,bike,V(-.15,.83,.12));
  const chain2=ring(bike,.1,.014,mats.metal,[-1.25,.86,.12]);
  for(const y of [.62,1.03])rod(bike,[-1.25,y+.02,.12],[-.15,y,.12],.012,mats.dark);
  crank = new THREE.Group();crank.position.set(-.15,.83,0);bike.add(crank);
  rod(crank,[0,0,-.2],[.32,0,-.2],.028,mats.metal);rod(crank,[0,0,.2],[-.32,0,.2],.028,mats.metal);
  for(let side of [-1,1]){const pedal=mesh(new THREE.BoxGeometry(.24,.06,.22),mats.dark,crank,V(side*-.32,0,side*.29));pedal.name='pedal';}
  rider.position.set(0,.13,5.12);
}

function buildPelican() {
  body=new THREE.Group();rider.add(body);
  const belly=ellipsoid(body,mats.cream,[-.58,2.92,0],[.64,.79,.47]);belly.rotation.z=.24;
  const rump=ellipsoid(body,mats.cream,[-.98,2.66,0],[.52,.48,.43]);
  for(let i=0;i<4;i++){const tail=ellipsoid(body,i%2?mats.wing:mats.cream,[-1.27-i*.055,2.66+i*.025,(i-1.5)*.1],[.43,.1,.095]);tail.rotation.z=-.2-i*.08;}
  tube(body,[[-.42,3.2,0],[-.24,3.58,0],[-.2,3.94,0],[.06,4.17,0],[.35,4.23,0]],.23,mats.cream);
  head=new THREE.Group();head.position.set(.35,4.28,0);body.add(head);
  ellipsoid(head,mats.cream,[0,0,0],[.43,.37,.33]);
  const beak=mesh(new THREE.ConeGeometry(.23,1.48,32),mats.orange,head,V(1.03,-.035,0),V(1,1,.78));beak.rotation.z=-Math.PI/2;
  ellipsoid(head,mats.pouch,[.79,-.23,0],[.69,.25,.19]);
  tube(head,[[.24,-.05,.18],[.7,-.065,.13],[1.7,-.04,0]],.012,mats.trunk,20);
  ellipsoid(head,mats.orange,[1.73,-.05,0],[.07,.055,.055]);
  for(const side of [-1,1]){
    ellipsoid(head,mats.white,[.14,.08,side*.304],[.12,.125,.052]);
    ellipsoid(head,mats.dark,[.18,.09,side*.35],[.065,.074,.027]);
    ellipsoid(head,mats.white,[.2,.115,side*.373],[.019,.02,.008]);
    const brow=ellipsoid(head,mats.wing,[.11,.23,side*.31],[.16,.034,.034]);brow.rotation.z=-.09;
    ellipsoid(head,mats.pouch,[.05,-.09,side*.32],[.09,.045,.012]);
  }
  // A tiny sea-green cycling cap with a fabric seam and forward visor.
  const cap=mesh(new THREE.SphereGeometry(.405,32,16,0,Math.PI*2,0,Math.PI*.48),mats.mint,head,V(-.03,.1,0),V(1,.77,.94));
  ellipsoid(head,mats.mint,[.33,.16,0],[.29,.035,.26]);rod(head,[-.03,.28,-.29],[-.03,.39,0],.012,mats.cream);rod(head,[-.03,.39,0],[-.03,.28,.29],.012,mats.cream);ellipsoid(head,mats.dark,[-.03,.41,0],[.035,.018,.035]);
  // Wings lean into the handlebar, with layered feathers along the arm.
  for(const side of [-1,1]){
    const shoulder=[-.63,3.22,side*.39],elbow=[-.1,2.84,side*.54],hand=[1.08,2.36,side*.4];
    tube(body,[shoulder,elbow,[.55,2.54,side*.47],hand],.14,mats.wing);
    for(let i=0;i<4;i++){const feather=ellipsoid(body,i===3?mats.wingTip:mats.cream,[-.17+i*.19,2.92-i*.12,side*(.53-i*.014)],[.32,.075,.08]);feather.rotation.z=-.55;}
    ellipsoid(body,mats.cream,hand,[.14,.09,.11]);
    const thigh=new THREE.Group();body.add(thigh);const upper=rod(thigh,[0,0,0],[0,1,0],.065,mats.orange);const lower=rod(thigh,[0,0,0],[0,1,0],.055,mats.orange);const foot=ellipsoid(thigh,mats.orange,[0,0,0],[.22,.06,.16]);legs.push({side,upper,lower,foot});
  }
  // The coral neckerchief streams behind the rider.
  ellipsoid(body,mats.coral,[-.23,3.67,0],[.25,.12,.26]);
  scarf = new THREE.Group();scarf.position.set(-.42,3.66,.03);body.add(scarf);
  const shape=new THREE.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.3,.03,-.5,.22,-.8,.15);shape.lineTo(-1.05,.28);shape.lineTo(-.99,.02);shape.bezierCurveTo(-.65,-.12,-.3,-.15,0,-.1);
  const cloth=mesh(new THREE.ShapeGeometry(shape,20),new THREE.MeshStandardMaterial({color:0xde876e,side:THREE.DoubleSide,roughness:1}),scarf);cloth.rotation.x=.15;
}

function palm(x,z,size=1) {
  const group = new THREE.Group();group.position.set(x,.3,z);group.scale.setScalar(size);scene.add(group);palms.push(group);
  tube(group,[[0,0,0],[.1,1,0],[.28,2,0],[.4,2.7,0]],.13,mats.trunk);
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2;const leaf=new THREE.Group();leaf.position.set(.4,2.65,0);leaf.rotation.y=a;group.add(leaf);
    const points = [[0,0,0],[.5,.25,0],[1.15,.13,0],[1.65,-.35,0]];
    tube(leaf,points,.025,mats.leaf,12);
    const geometry=new THREE.BufferGeometry();const verts=[];const idx=[];for(let k=0;k<=12;k++){const t=k/12;const width=Math.sin(t*Math.PI)*.32;const y=Math.sin(t*Math.PI)*.28-t*t*.36;verts.push(t*1.65,y,-width,t*1.65,y,width);if(k<12){const n=k*2;idx.push(n,n+1,n+2,n+1,n+3,n+2);}}geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geometry.setIndex(idx);geometry.computeVertexNormals();const leafMat=mats.leaf.clone();leafMat.side=THREE.DoubleSide;mesh(geometry,leafMat,leaf);}
  for(let i=0;i<3;i++)ellipsoid(group,mats.trunk,[.4+(i-1)*.16,2.55,.1],[.13,.17,.13]);
}

function buildScenery() {
  palm(-3.6,-1.3,1.12);palm(-4.2,-2.7,.75);palm(3.3,.45,.84);
  // Lighthouse on the far shore, with balcony, glass lantern, and a warm rotating lamp.
  const tower=new THREE.Group();tower.position.set(2,.32,-2.6);scene.add(tower);
  mesh(new THREE.CylinderGeometry(.72,.86,.18,32),mats.white,tower,V(0,.05,0));
  mesh(new THREE.CylinderGeometry(.39,.66,3.1,32),mats.white,tower,V(0,1.65,0));
  for(const y of [.6,1.55,2.5])mesh(new THREE.CylinderGeometry(.66-(y/3.1)*.27,.66-((y-.35)/3.1)*.27,.34,32),mats.coral,tower,V(0,y,0));
  const door=mesh(new THREE.BoxGeometry(.25,.48,.06),mats.dark,tower,V(0,.36,.66));
  for(const y of [1.1,2.05])mesh(new THREE.BoxGeometry(.13,.23,.08),mats.dark,tower,V(0,y,.58-y*.075));
  mesh(new THREE.CylinderGeometry(.69,.69,.13,32),mats.white,tower,V(0,3.25,0));
  const glass=mat(0xc3ded0,.15,.2);glass.transparent=true;glass.opacity=.64;mesh(new THREE.CylinderGeometry(.39,.39,.58,16),glass,tower,V(0,3.61,0));
  for(let i=0;i<8;i++){const a=i*Math.PI/4;rod(tower,[Math.cos(a)*.57,3.27,Math.sin(a)*.57],[Math.cos(a)*.57,3.62,Math.sin(a)*.57],.025,mats.dark);rod(tower,[Math.cos(a)*.37,3.35,Math.sin(a)*.37],[Math.cos(a)*.37,3.95,Math.sin(a)*.37],.025,mats.dark);}
  for(const y of [3.37,3.61]){const rail=ring(tower,.57,.02,mats.dark,[0,y,0]);rail.rotation.x=Math.PI/2;}
  mesh(new THREE.ConeGeometry(.61,.38,32),mats.roof,tower,V(0,4.08,0));ellipsoid(tower,mats.dark,[0,4.32,0],[.06,.13,.06]);
  const lamp=mat(0xffd779);lamp.emissive=new THREE.Color(0xffd779);lamp.emissiveIntensity=1;ellipsoid(tower,lamp,[0,3.63,0],[.15,.22,.15]);
  lighthouseLight=new THREE.PointLight(0xffc66a,0,8);lighthouseLight.position.set(2,3.95,-2.6);scene.add(lighthouseLight);
  // Curving footpath and small cottage anchor the island's sense of scale.
  const path=mesh(new THREE.PlaneGeometry(1,3.5),mats.sand,scene,V(1.7,.34,-.4));path.rotation.x=-Math.PI/2;path.rotation.z=.17;
  const house=new THREE.Group();scene.add(house);house.position.set(-.65,.4,-2.7);house.rotation.y=.18;
  mesh(new THREE.BoxGeometry(1.55,.9,1.1),mats.white,house,V(0,.45,0));
  const roof=mesh(new THREE.ConeGeometry(1.12,.65,4),mats.roof,house,V(0,1.22,0),V(1,.85,.8));roof.rotation.y=Math.PI/4;
  mesh(new THREE.BoxGeometry(.3,.52,.03),mats.mint,house,V(.3,.28,.57));mesh(new THREE.BoxGeometry(.34,.3,.03),mats.dark,house,V(-.4,.51,.57));
  rod(house,[-.4,.36,.6],[-.4,.66,.6],.014,mats.white);rod(house,[-.57,.51,.6],[-.23,.51,.6],.014,mats.white);
  mesh(new THREE.BoxGeometry(.2,.5,.22),mats.sand,house,V(-.45,1.3,-.1));
  // A park bench, striped beach umbrella, route sign, and pockets of daisies.
  const bench=new THREE.Group();scene.add(bench);bench.position.set(-2,.35,2.6);bench.rotation.y=-.2;
  for(let i=0;i<3;i++)mesh(new THREE.BoxGeometry(1.1,.045,.11),mats.trunk,bench,V(0,.45,i*.13));
  for(let i=0;i<2;i++){mesh(new THREE.BoxGeometry(1.1,.1,.045),mats.trunk,bench,V(0,.65+i*.14,-.04));for(const x of [-.42,.42])rod(bench,[x,.05,.06+i*.2],[x,.45,.06+i*.2],.03,mats.dark);}
  const umbrella=new THREE.Group();scene.add(umbrella);umbrella.position.set(-5.9,.2,3.25);rod(umbrella,[0,0,0],[0,1.65,0],.025,mats.trunk);
  const canopy=mesh(new THREE.ConeGeometry(.7,.37,12,1,true),[mats.cream,mats.coral],umbrella,V(0,1.67,0));const pos=canopy.geometry;pos.clearGroups();for(let i=0;i<12;i++)pos.addGroup(i*3,3,i%2);canopy.material.forEach(m=>m.side=THREE.DoubleSide);
  const towel=mesh(new THREE.PlaneGeometry(.75,1.3),mats.coral,scene,V(-6.05,.2,3.3));towel.rotation.x=-Math.PI/2;towel.rotation.z=.3;
  const sign=new THREE.Group();scene.add(sign);sign.position.set(4.45,.2,1.65);rod(sign,[0,0,0],[0,1.25,0],.035,mats.trunk);mesh(new THREE.BoxGeometry(.75,.27,.08),mats.mint,sign,V(0,1.1,0));
  const signCanvas=document.createElement('canvas');signCanvas.width=256;signCanvas.height=96;const sctx=signCanvas.getContext('2d');sctx.fillStyle='#82c9b1';sctx.fillRect(0,0,256,96);sctx.fillStyle='#293e37';sctx.font='bold 29px sans-serif';sctx.textAlign='center';sctx.fillText('SLOW  →',128,58);mesh(new THREE.PlaneGeometry(.72,.26),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(signCanvas)}),sign,V(0,1.1,.043));
  for(let i=0;i<65;i++){const a=random()*Math.PI*2,r=1.5+random()*3.3;const x=Math.cos(a)*r,z=Math.sin(a)*r*.8;if(Math.abs(x-2)<1&&z<-.8)continue;const h=.13+random()*.18;rod(scene,[x,.33,z],[x,.33+h,z],.012,mats.leaf);const petal=i%4===0?mats.coral:mats.paint;ellipsoid(scene,petal,[x,.33+h,z],[.075,.025,.075]);ellipsoid(scene,mats.orange,[x,.35+h,z],[.025,.019,.025]);}
  for(let i=0;i<10;i++){const a=random()*Math.PI*2;const r=8.4+random()*1.7;const stone=ellipsoid(scene,mats.rock,[Math.cos(a)*r,-.36,Math.sin(a)*r*.86],[.2+random()*.4,.2+random()*.2,.25+random()*.3]);stone.rotation.y=a;}
}

function buildAtmosphere() {
  const cloudMaterial=new THREE.MeshStandardMaterial({color:0xfffdf0,roughness:1,transparent:true,opacity:.88});
  for(const [x,y,z,s] of [[-5,6.2,-4,1],[4.3,7,-5,.8],[6.6,5.3,.6,.62],[-6.8,4.8,2,.5]]){
    const c=new THREE.Group();c.position.set(x,y,z);c.scale.setScalar(s);scene.add(c);clouds.push({group:c,x,z});
    for(const [cx,cy,cz,sx,sy,sz] of [[0,0,0,.9,.28,.4],[-.45,.13,0,.37,.3,.35],[.15,.25,0,.49,.4,.4],[.62,.08,0,.45,.25,.3]])ellipsoid(c,cloudMaterial,[cx,cy,cz],[sx,sy,sz]);
  }
  for(let i=0;i<5;i++){const g=new THREE.Group();scene.add(g);const left=tube(g,[[0,0,0],[-.17,.12,0],[-.38,.02,0]],.022,mats.white,10);const right=tube(g,[[0,0,0],[.17,.12,0],[.38,.02,0]],.022,mats.white,10);gulls.push({group:g,left,right,phase:random()*7,radius:6+random()*3,y:5+random()*2});}
  const sunMat = new THREE.MeshBasicMaterial({color:0xf1d58a});sun=ellipsoid(scene,sunMat,[-5,6.3,-6.7],[.66,.66,.66]);sun.castShadow=false;
  const starMat=new THREE.MeshBasicMaterial({color:0xf6e4af,transparent:true,opacity:0});
  for(let i=0;i<45;i++){const star=ellipsoid(scene,starMat,[random()*20-10,4+random()*6,-3-random()*5],[.025,.025,.025]);star.castShadow=false;stars.push(star);}
}

function alignRod(m,a,b) {const d=b.clone().sub(a);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(1,d.length(),1);m.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());}
function pose(t) {
  wheels.forEach(w=>w.rotation.z=-t*2.8);crank.rotation.z=-t*2.8;
  body.position.y=Math.sin(t*5.6)*.028;body.rotation.x=Math.sin(t*2.8)*.015;
  head.rotation.z=Math.sin(t*.9)*.025;scarf.rotation.x=.1+Math.sin(t*5)*.13;scarf.rotation.y=Math.sin(t*3.6)*.12;
  for(const {side,upper,lower,foot} of legs){const p=-t*2.8+(side>0?Math.PI:0);const pedal=V(-.15+Math.cos(p)*.32,.83+Math.sin(p)*.32,side*.28);const hip=V(-.64,2.6,side*.26);const knee=V(-.08+Math.cos(p-.7)*.13,1.67+Math.sin(p)*.15,side*.34);alignRod(upper,hip,knee);alignRod(lower,knee,pedal);foot.position.copy(pedal).add(V(.08,.04,0));foot.rotation.z=Math.sin(p)*.13;}
}

function resize(){const r=$('scene').getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();if(state.view==='overview')setOverview(false);renderer.render(scene,camera);}
function overviewPosition(){return innerWidth<761?V(12.8,10.2,18.8):V(13.8,10.3,20.2);}
function setOverview(immediate=false) {const p=overviewPosition();const target=V(0,1.8,.2);if(immediate){camera.position.copy(p);controls.target.copy(target);controls.update();}else moveCamera(p,target);}
function moveCamera(position,target){cameraTween={from:camera.position.clone(),to:position,fromTarget:controls.target.clone(),target,start:performance.now(),duration:1300};}
function updateViewButtons(){document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.view)));}
function setView(view){state.view=view;updateViewButtons();if(view==='overview'){setOverview();return;}const p=rider.position.clone();const offset=view==='detail'?V(5.8,3.3,7.4):V(7.5,4.7,10);offset.applyAxisAngle(V(0,1,0),rider.rotation.y);moveCamera(p.clone().add(offset),p.clone().add(V(.2,2.2,0)));}
function animate(now) {
  requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden)return;
  if(state.playing){elapsed+=dt;state.phase+=dt*state.speed;state.distance+=dt*state.speed*.00145;if(state.journey)state.angle-=dt*state.speed*.125;}
  const theta=state.angle;rider.position.set(Math.cos(theta)*5.95,.13,Math.sin(theta)*5.95*.86);rider.rotation.y=Math.atan2(-.86*Math.cos(theta),Math.sin(theta));
  rider.rotation.z=state.journey?Math.sin(state.phase*2.8)*.012:0;pose(state.phase);
  sea.material.uniforms.uTime.value=elapsed;
  if(!reducedMotion.matches){for(let i=0;i<palms.length;i++)palms[i].rotation.z=Math.sin(elapsed*.7+i)*.018;for(const c of clouds){c.group.position.x=c.x+Math.sin(elapsed*.075+c.x)*.45;c.group.position.y+=Math.sin(elapsed*.2+c.x)*.0003;}for(let i=0;i<gulls.length;i++){const g=gulls[i],a=elapsed*.09+g.phase;g.group.position.set(Math.cos(a)*g.radius,g.y+Math.sin(a*3)*.2,Math.sin(a)*g.radius*.7);g.group.rotation.y=-a;g.left.rotation.x=Math.sin(elapsed*3.3+i)*.3;g.right.rotation.x=-Math.sin(elapsed*3.3+i)*.3;}}
  const n=sea.material.uniforms.uNight;n.value=THREE.MathUtils.damp(n.value,state.night?1:0,2.2,dt);skyLight.intensity=THREE.MathUtils.lerp(2.3,.75,n.value);keyLight.intensity=THREE.MathUtils.lerp(3.6,.65,n.value);keyLight.color.set(0xffe5bc).lerp(new THREE.Color(0x93b6e8),n.value);renderer.toneMappingExposure=THREE.MathUtils.lerp(1.2,.95,n.value);lighthouseLight.intensity=n.value*6;sun.material.color.set(0xf1d58a).lerp(new THREE.Color(0xf2f2cc),n.value);stars[0].material.opacity=n.value*.85;
  if(cameraTween){const k=Math.min((now-cameraTween.start)/cameraTween.duration,1),e=1-Math.pow(1-k,3);camera.position.lerpVectors(cameraTween.from,cameraTween.to,e);controls.target.lerpVectors(cameraTween.fromTarget,cameraTween.target,e);if(k>=1)cameraTween=null;}
  else if(state.view!=='overview'){const p=rider.position.clone();const offset=(state.view==='detail'?V(5.8,3.3,7.4):V(7.5,4.7,10)).applyAxisAngle(V(0,1,0),rider.rotation.y);camera.position.lerp(p.clone().add(offset),1-Math.exp(-dt*2));controls.target.lerp(p.add(V(.2,2.2,0)),1-Math.exp(-dt*4));}
  controls.update();renderer.render(scene,camera);$('distance').textContent=state.distance.toFixed(2);
}

function updatePlay(){ $('play').setAttribute('aria-label',state.playing?'暂停骑行':'继续骑行');$('play').setAttribute('aria-pressed',String(!state.playing));$('play-icon').innerHTML=state.playing?'<path d="M8 6v12M16 6v12"/>':'<path d="m9 5 10 7-10 7z" fill="currentColor" stroke="none"/>'; $('ride-status').innerHTML=state.playing?(state.journey?'正在环岛':'正在慢骑')+' <span class="status-wave">～</span>':'停下来，看海'; }
function togglePlay(){state.playing=!state.playing;updatePlay();}
function toggleNight(){state.night=!state.night;document.body.classList.toggle('night',state.night);$('daynight').setAttribute('aria-label',state.night?'切换为晴日':'切换为月夜');$('sun-icon').innerHTML=state.night?'<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/>':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>';$('scene-weather').textContent=state.night?'月 · 把星光装进口袋':'晴 · 适合漫无目的';toast(state.night?'今晚，跟着灯塔的光走。':'阳光刚好，再骑一段。');}

let audioContext,windGain,windSource;
function audio(){if(!audioContext)audioContext=new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();return audioContext;}
function ringBell(){try{const a=audio();for(let i=0;i<2;i++){const t=a.currentTime+i*.17;for(const f of [1800,2760,4210]){const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.07*(1800/f),t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+.8);o.connect(g).connect(a.destination);o.start(t);o.stop(t+.82);}}toast('叮铃～借过一阵海风。');$('bell').animate([{transform:'rotate(0deg)'},{transform:'rotate(-20deg)'},{transform:'rotate(18deg)'},{transform:'rotate(0deg)'}],{duration:450});}catch{toast('当前浏览器无法播放声音');}}
function toggleSound(){try{const a=audio();if(!windSource){const buffer=a.createBuffer(1,a.sampleRate*5,a.sampleRate),data=buffer.getChannelData(0);let b=0;for(let i=0;i<data.length;i++){b=(b+Math.random()*.04-.02)/1.02;data[i]=b*4;}windSource=a.createBufferSource();windSource.buffer=buffer;windSource.loop=true;const filter=a.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;windGain=a.createGain();windGain.gain.value=0;windSource.connect(filter).connect(windGain).connect(a.destination);windSource.start();}state.sound=!state.sound;windGain.gain.setTargetAtTime(state.sound?.22:0,a.currentTime,.4);$('sound').setAttribute('aria-pressed',String(state.sound));$('sound').setAttribute('aria-label',state.sound?'关闭海风声':'开启海风声');toast(state.sound?'闭上眼，也能听见海。':'海风声已关闭');}catch{toast('当前浏览器无法播放声音');}}
function savePhoto(){try{renderer.render(scene,camera);const c=document.createElement('canvas');c.width=1600;c.height=1200;const ctx=c.getContext('2d');ctx.fillStyle=state.night?'#182e36':'#f5f3e9';ctx.fillRect(0,0,c.width,c.height);const source=renderer.domElement,ratio=Math.min(1540/source.width,1020/source.height),w=source.width*ratio,h=source.height*ratio;ctx.drawImage(source,(1600-w)/2,30+(1020-h)/2,w,h);ctx.fillStyle=state.night?'#eeefdb':'#293e37';ctx.font='bold 32px sans-serif';ctx.fillText('PELICAN / THE SLOW LANE',75,1100);ctx.font='17px sans-serif';ctx.fillText('GOOD DAYS, EASY WAYS.     Nº 001 — COASTAL RIDE',75,1140);ctx.textAlign='right';ctx.fillText(state.night?'A NIGHT TO REMEMBER.':'A LITTLE PIECE OF FREEDOM.',1525,1120);c.toBlob(blob=>{if(!blob){toast('图片保存失败，请再试一次');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`pelican-postcard-${state.night?'moonlight':'sunshine'}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),15000);toast('海风已打包，明信片正在保存。');},'image/png');$('flash').classList.remove('on');void $('flash').offsetWidth;$('flash').classList.add('on');}catch{toast('图片保存失败，请再试一次');}}
function reset(){state.distance=0;state.phase=0;state.angle=Math.PI/2;state.journey=false;state.speed=1;state.playing=!reducedMotion.matches;$('speed').value='1';$('speed-value').value='1.0×';$('journey-label').textContent='开启环岛旅程';setView('overview');updatePlay();toast('新的旅程，从此刻开始。');}
function bindUI(){
  $('play').addEventListener('click',togglePlay);$('speed').addEventListener('input',e=>{state.speed=+e.target.value;$('speed-value').value=state.speed.toFixed(1)+'×';});
  $('journey').addEventListener('click',()=>{state.journey=!state.journey;if(state.journey)state.playing=true;$('journey-label').textContent=state.journey?'停驻这一刻':'开启环岛旅程';updatePlay();toast(state.journey?'出发吧，绕一圈也不必有目的。':'就在这里，多看一会儿海。');});
  $('daynight').addEventListener('click',toggleNight);$('bell').addEventListener('click',ringBell);$('photo').addEventListener('click',savePhoto);$('sound').addEventListener('click',toggleSound);$('reset').addEventListener('click',reset);
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  $('about').addEventListener('click',()=>$('guide').showModal());$('close-guide').addEventListener('click',()=>$('guide').close());$('guide').addEventListener('click',e=>{if(e.target===$('guide')){const r=$('guide').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('guide').close();}});
  window.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,button,a')||$('guide').open||e.ctrlKey||e.metaKey||e.altKey)return;switch(e.key.toLowerCase()){case ' ':e.preventDefault();togglePlay();break;case 'n':toggleNight();break;case 'b':ringBell();break;case 'p':savePhoto();break;case 'm':toggleSound();break;case 'r':reset();break;}});
  reducedMotion.addEventListener('change',e=>{if(e.matches){state.playing=false;updatePlay();}});
  document.addEventListener('visibilitychange',()=>{last=performance.now();if(windGain&&audioContext)windGain.gain.setTargetAtTime(document.hidden?0:state.sound?.22:0,audioContext.currentTime,.2);});
}

try{init();}catch(error){console.error(error);$('loading').innerHTML='<span>海岛暂时无法绘制</span><span style="font-size:11px;letter-spacing:0;max-width:260px;line-height:2;text-align:center">请使用支持 WebGL 的浏览器，并开启硬件加速后刷新页面。</span><button onclick="location.reload()" style="padding:12px 22px;border-radius:24px;background:#d5e58a;color:#293e37">重新出发 ↗</button>';}
