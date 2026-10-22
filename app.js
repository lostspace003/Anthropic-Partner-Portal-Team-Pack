const $=id=>document.getElementById(id);
const FLAT=DATA.flatMap((s,t)=>s.docs.map((doc,d)=>({t,d,title:doc.title}))).filter(x=>(window.PAGE.tabs||[x.t]).includes(x.t));
const ALLOW=window.PAGE.tabs||DATA.map((_,i)=>i);
let t=ALLOW[0],d=0,token=0,spy;
const onlyStrong=p=>p.tagName==='P'&&p.children.length===1&&p.firstElementChild.tagName==='STRONG'&&p.textContent.trim()===p.firstElementChild.textContent.trim();
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50);

function enhance(root){
  const kids=[...root.children],out=document.createDocumentFragment(),toc=[];
  let i=0,first=true;
  const caption=el=>el&&el.tagName==='P'&&!onlyStrong(el)&&!el.querySelector('img')?el:null;
  while(i<kids.length){
    const el=kids[i++];
    if(first&&onlyStrong(el)){
      first=false;
      const hero=document.createElement('div');hero.className='hero';
      hero.innerHTML='<h1>'+el.textContent.trim()+'</h1>';
      const sub=kids[i];
      if(caption(sub)&&sub.textContent.length<400){hero.insertAdjacentHTML('beforeend','<p>'+sub.innerHTML+'</p>');i++}
      out.appendChild(hero);continue;
    }
    first=false;
    if(onlyStrong(el)){
      const txt=el.textContent.trim(),h=document.createElement('h2');
      const m=txt.match(/^(Step\s+\d+|\d+|[A-H])[.\s\u2013-]+\s*(.*)$/);
      h.id='s-'+slug(txt);
      h.innerHTML=m?'<span class="num">'+m[1].replace(/^(\d+)$/,'$1')+'</span><span>'+m[2]+'</span>':txt;
      toc.push({id:h.id,text:m?m[2]:txt,num:m?m[1]:''});
      out.appendChild(h);continue;
    }
    if(el.tagName==='TABLE'){
      const ths=el.querySelectorAll('thead th'),rows=el.querySelectorAll('tbody tr');
      if(ths.length===1&&!rows.length){
        const c=document.createElement('div');c.className='callout';c.innerHTML=ths[0].innerHTML;
        const f=c.firstElementChild;if(f&&onlyStrong(f))f.classList.add('ct');
        out.appendChild(c);
      }else{
        el.querySelectorAll('colgroup').forEach(g=>g.remove());
        const w=document.createElement('div');w.className='table-wrap';w.appendChild(el);out.appendChild(w);
      }
      continue;
    }
    const img=el.tagName==='P'&&el.children.length===1&&el.firstElementChild.tagName==='IMG'?el.firstElementChild:null;
    if(img){
      const fig=document.createElement('figure');
      const wd=parseFloat(img.style.width),ht=parseFloat(img.style.height);
      if(ht>wd)fig.className='portrait';
      img.removeAttribute('style');img.loading='lazy';
      const cap=caption(kids[i]);
      img.alt=cap?cap.textContent.trim().slice(0,120):'Portal page';
      fig.appendChild(img);
      if(cap){const fc=document.createElement('figcaption');fc.innerHTML=cap.innerHTML;fig.appendChild(fc);i++}
      out.appendChild(fig);continue;
    }
    out.appendChild(el);
  }
  // group consecutive landscape figures into two-up grids
  const nodes=[...out.childNodes];
  for(let k=0;k<nodes.length-1;k++){
    const a=nodes[k],b=nodes[k+1];
    if(a.tagName==='FIGURE'&&b.tagName==='FIGURE'&&!a.classList.contains('portrait')&&!b.classList.contains('portrait')){
      const g=document.createElement('div');g.className='fig-grid';
      out.insertBefore(g,a);g.appendChild(a);g.appendChild(b);k++;
    }
  }
  root.replaceChildren(out);
  return toc;
}

function buildToc(toc){
  const list=toc.map(x=>`<a href="#${x.id}" data-id="${x.id}">${x.num?x.num.replace(/^(\d+|[A-H])$/,'$1. ')+' ':''}${x.text}</a>`).join('');
  $('toc').innerHTML=toc.length?'<h4>On this page</h4>'+list:'';
  $('mtoclist').innerHTML=list;$('mtoc').style.display=toc.length?'':'none';
  if(spy)spy.disconnect();
  spy=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){document.querySelectorAll('#toc a').forEach(a=>a.classList.toggle('on',a.dataset.id===e.target.id))}})},{rootMargin:'-130px 0px -70% 0px'});
  document.querySelectorAll('#view h2').forEach(h=>spy.observe(h));
}
$('mtoclist').onclick=e=>{if(e.target.tagName==='A')$('mtoc').open=false};

function pager(){
  const idx=FLAT.findIndex(x=>x.t===t&&x.d===d),p=FLAT[idx-1],n=FLAT[idx+1];
  $('pager').innerHTML=(p?`<button data-go="${idx-1}"><small>&larr; Previous</small><b>${p.title}</b></button>`:'<span></span>')+
    (n?`<button class="next" data-go="${idx+1}"><small>Next &rarr;</small><b>${n.title}</b></button>`:'');
}
$('pager').onclick=e=>{const b=e.target.closest('button');if(b){const x=FLAT[+b.dataset.go];t=x.t;d=x.d;show()}};

async function show(){
  const doc=DATA[t].docs[d],my=++token;
  $('docs').innerHTML=DATA[t].docs.length>1?DATA[t].docs.map((x,i)=>`<button class="pill" aria-pressed="${i==d}" data-d="${i}">${x.title}</button>`).join(''):'';
  [...$('tabs').children].forEach(b=>b.setAttribute('aria-selected',+b.dataset.t===t));
  history.replaceState(null,'','#'+t+'-'+d);
  document.title=doc.title+' \u00b7 Partner Portal Team Pack';
  $('view').textContent='Loading...';
  try{
    const r=await fetch(doc.html);if(!r.ok)throw 0;
    const h=await r.text();if(my!==token)return;
    $('view').innerHTML=h;
    buildToc(enhance($('view')));pager();window.scrollTo(0,0);
  }catch(e){if(my===token)$('view').textContent='Could not load this document.'}
}
$('tabs').innerHTML=ALLOW.length>1?ALLOW.map(i=>`<button role="tab" data-t="${i}">${DATA[i].tab}</button>`).join(''):'';
$('tabs').onclick=e=>{if(e.target.dataset.t){t=+e.target.dataset.t;d=0;show()}};
$('docs').onclick=e=>{if(e.target.dataset.d){d=+e.target.dataset.d;show()}};
$('view').onclick=e=>{if(e.target.tagName==='IMG'){const im=$('lb').querySelector('img');im.src=e.target.src;$('lb').showModal()}};
$('lb').onclick=()=>$('lb').close();
addEventListener('scroll',()=>{const h=document.documentElement;$('progress').style.width=(h.scrollTop/(h.scrollHeight-h.clientHeight||1)*100)+'%'},{passive:true});
const m=location.hash.match(/^#(\d+)-(\d+)$/);
if(m&&ALLOW.includes(+m[1])&&DATA[+m[1]].docs[+m[2]]){t=+m[1];d=+m[2]}
show();

