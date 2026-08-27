import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const viewport = document.querySelector('#viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06111d);
const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 1000);
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = true;
controls.minDistance = 2;
controls.maxDistance = 18;

scene.add(new THREE.HemisphereLight(0xbed8ff, 0x112236, 2.4));
const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(5,9,7); scene.add(key);
const fill = new THREE.DirectionalLight(0x55a9ff, 1.2); fill.position.set(-5,4,-5); scene.add(fill);
const grid = new THREE.GridHelper(8, 28, 0x1c3a57, 0x10283d); grid.position.y=-1.55; scene.add(grid);

let model=null, modelBox=null, autoRotate=false;
const markerGroup=new THREE.Group(); scene.add(markerGroup);
const risks=[
 {title:'屋面临边防护不足',text:'AI识别：屋面与高处临边区域存在防护连续性不足的潜在坠落风险。',recommend:'建议：设置连续临边防护栏杆及安全网，并复核安全警示与作业边界。',confidence:'AI 94.7%'},
 {title:'高处作业人员防护',text:'AI识别：东侧立面高处作业区域存在个人防护用品佩戴与使用状态需复核的问题。',recommend:'建议：复核安全带、安全帽等PPE，并进行作业前安全确认。',confidence:'AI 91.2%'},
 {title:'施工通道占用',text:'AI识别：入口附近可能存在材料临时堆放导致通行空间受限的风险。',recommend:'建议：清理通道、划定材料堆放区并设置醒目标识。',confidence:'AI 88.5%'}
];

document.querySelectorAll('.risk-card').forEach((el,i)=>el.addEventListener('click',()=>pickRisk(i)));
function resize(){const r=viewport.getBoundingClientRect();camera.aspect=Math.max(r.width,1)/Math.max(r.height,1);camera.updateProjectionMatrix();renderer.setSize(r.width,r.height,false)}
window.addEventListener('resize',resize); resize();
function loading(on,text){const el=document.querySelector('#loading');el.style.display=on?'flex':'none';if(text)el.querySelector('b').textContent=text}
function showError(){loading(true);document.querySelector('#loading').innerHTML='<div class="spinner"></div><b>模型加载失败</b><span>请把 building_optimized.glb 上传到 GitHub 仓库的 assets/ 文件夹，并刷新页面。</span>'}
function fitView(type){if(!modelBox)return;const c=modelBox.getCenter(new THREE.Vector3()),s=modelBox.getSize(new THREE.Vector3()),d=Math.max(s.x,s.y,s.z)*2.05;const y=c.y+s.y*.12;if(type==='front')camera.position.set(c.x,y,c.z+d);else if(type==='back')camera.position.set(c.x,y,c.z-d);else if(type==='side')camera.position.set(c.x+d,y,c.z);else camera.position.set(c.x+d*.78,c.y+s.y*.62,c.z+d*.78);controls.target.set(c.x,c.y+s.y*.02,c.z);controls.update()}
function markerSprite(color){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');ctx.shadowBlur=22;ctx.shadowColor=color;ctx.beginPath();ctx.arc(32,32,12,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.beginPath();ctx.arc(32,32,4,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false}));s.scale.set(.16,.16,.16);s.renderOrder=10;return s}
function createMarkers(){markerGroup.clear();if(!modelBox)return;const c=modelBox.getCenter(new THREE.Vector3()),s=modelBox.getSize(new THREE.Vector3());const ps=[new THREE.Vector3(c.x+.06*s.x,c.y+.42*s.y,c.z+.13*s.z),new THREE.Vector3(c.x-.30*s.x,c.y+.17*s.y,c.z+.46*s.z),new THREE.Vector3(c.x+.32*s.x,c.y+.10*s.y,c.z+.08*s.z)];ps.forEach((p,i)=>{const m=markerSprite(i===0?'#ff5968':'#ffb44e');m.position.copy(p);markerGroup.add(m)})}
function load(){loading(true,'正在加载建筑数字孪生模型');new GLTFLoader().load('./assets/building_optimized.glb',g=>{model=g.scene;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});scene.add(model);let raw=new THREE.Box3().setFromObject(model),rs=raw.getSize(new THREE.Vector3()),rc=raw.getCenter(new THREE.Vector3());model.position.sub(rc);const max=Math.max(rs.x,rs.y,rs.z)||1;model.scale.setScalar(5/max);model.position.y=-1.25;modelBox=new THREE.Box3().setFromObject(model);fitView('iso');createMarkers();loading(false)},xhr=>{if(xhr.total){const p=Math.round(xhr.loaded/xhr.total*100);const bar=document.querySelector('#progress');if(bar)bar.style.width=p+'%';const t=document.querySelector('#loadText');if(t)t.textContent='建筑模型加载中… '+p+'%'}},()=>showError())}
const viewMap={iso:'iso',front:'front',side:'side',rear:'back'};document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(x=>x.classList.remove('active'));b.classList.add('active');fitView(viewMap[b.dataset.view])}));
document.querySelector('#auto')?.addEventListener('click',()=>{autoRotate=!autoRotate;document.querySelector('#auto').classList.toggle('active',autoRotate);toast(autoRotate?'已开启自动旋转':'已关闭自动旋转')});
function pickRisk(i){const r=risks[i];document.querySelectorAll('.risk-card').forEach((e,n)=>e.classList.toggle('selected',n===i));document.querySelector('#detailTitle').textContent=r.title;document.querySelector('#confidence').textContent=r.confidence;document.querySelector('#detailText').textContent=r.text;document.querySelector('#recommend').textContent=r.recommend;markerGroup.children.forEach((m,n)=>{m.scale.setScalar(n===i?.22:.16);m.material.opacity=n===i?1:.38});toast('已定位风险点：'+r.title)}
document.querySelector('#scan')?.addEventListener('click',()=>{const st=document.querySelector('#scanStatus'),sc=document.querySelector('#score');st.textContent='SCANNING';let p=0;document.querySelectorAll('.risk-card').forEach(e=>e.classList.remove('selected'));const timer=setInterval(()=>{p+=10;sc.textContent=String(Math.min(72+Math.floor(p/10),82));markerGroup.children.forEach(m=>m.material.opacity=Math.min(1,p/100));if(p>=100){clearInterval(timer);sc.textContent='72';st.textContent='LIVE';toast('AI巡检完成：识别3项潜在风险并生成整改建议。')}},100)});
document.querySelector('#report')?.addEventListener('click',()=>document.querySelector('#modal').classList.add('show'));document.querySelector('#close')?.addEventListener('click',()=>document.querySelector('#modal').classList.remove('show'));document.querySelector('#modal')?.addEventListener('click',e=>{if(e.target.id==='modal')e.currentTarget.classList.remove('show')});
function toast(t){const x=document.querySelector('#toast');if(!x)return;x.textContent=t;x.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>x.classList.remove('show'),2200)}
function animate(){requestAnimationFrame(animate);if(autoRotate&&model)model.rotation.y+=.0022;controls.update();renderer.render(scene,camera)}
load();animate();
