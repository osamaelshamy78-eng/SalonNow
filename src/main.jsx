import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, CheckCircle2, ChevronRight, Clock3, MapPin, Minus, Plus, Settings2, Star, Users } from 'lucide-react';
import './styles.css';

const salons = [
  { id: 1, name: 'Urban Gents', gender: 'men', area: 'Al Reem Island', rating: 4.8, wait: 12, updated: '2 min ago', status: 'low', services: [['Haircut',45,25],['Beard',25,15],['Haircut + Beard',65,40]], address: 'Al Reem Island, Abu Dhabi' },
  { id: 2, name: 'The Gentleman', gender: 'men', area: 'Al Khalidiyah', rating: 4.6, wait: 28, updated: '5 min ago', status: 'medium', services: [['Haircut',40,25],['Beard',20,15],['Kids Haircut',30,20]], address: 'Al Khalidiyah, Abu Dhabi' },
  { id: 3, name: 'Luna Ladies', gender: 'women', area: 'Al Bateen', rating: 4.9, wait: 18, updated: '3 min ago', status: 'low', services: [['Hair Styling',120,45],['Blow Dry',80,35],['Manicure',70,40]], address: 'Al Bateen, Abu Dhabi' },
  { id: 4, name: 'Velvet Beauty', gender: 'women', area: 'Khalifa City', rating: 4.7, wait: 42, updated: '9 min ago', status: 'busy', services: [['Hair Cut',100,40],['Blow Dry',70,30],['Manicure',60,35]], address: 'Khalifa City, Abu Dhabi' }
];
const statusMap = { low:['Available','green'], medium:['Moderate wait','amber'], busy:['Busy','red'] };

function App(){
  const [mode,setMode]=useState('customer');
  const [gender,setGender]=useState('men');
  const [selected,setSelected]=useState(null);
  const [queue,setQueue]=useState({1:2,2:5,3:3,4:8});
  const [notice,setNotice]=useState('');
  const salon=salons.find(s=>s.id===selected);
  const filtered=useMemo(()=>salons.filter(s=>s.gender===gender),[gender]);
  const changeQueue=(id,delta)=>setQueue(q=>({...q,[id]:Math.max(0,(q[id]||0)+delta)}));
  if(mode==='salon') return <Dashboard queue={queue} changeQueue={changeQueue} setMode={setMode} notice={notice} setNotice={setNotice}/>;
  return <main className="shell">
    <header><div><div className="brand">SalonNow</div><div className="tag">Find a salon. See the wait. Go.</div></div><button className="ghost" onClick={()=>setMode('salon')}><Settings2 size={17}/> Salon dashboard</button></header>
    {salon ? <Profile salon={salon} queue={queue[salon.id]} setSelected={setSelected} setNotice={setNotice} notice={notice}/> : <>
      <section className="hero"><span className="eyebrow">LIVE QUEUE</span><h1>Know the wait before you go.</h1><p>Browse nearby salons, see services and prices set by each salon, and check their latest queue status.</p></section>
      <div className="segmented"><button className={gender==='men'?'active':''} onClick={()=>setGender('men')}>Men</button><button className={gender==='women'?'active':''} onClick={()=>setGender('women')}>Women</button></div>
      <section className="list">{filtered.map(s=><SalonCard key={s.id} salon={s} queue={queue[s.id]} onClick={()=>setSelected(s.id)}/>)}</section>
    </>}
  </main>;
}

function SalonCard({salon,queue,onClick}){ const [label,color]=statusMap[salon.status]; return <button className="salonCard" onClick={onClick}>
  <div className="avatar">✂</div><div className="cardBody"><div className="row"><h3>{salon.name}</h3><span className={'pill '+color}>{label}</span></div>
  <div className="muted"><MapPin size={14}/>{salon.area}<span>•</span><Star size={14}/>{salon.rating}</div>
  <div className="wait"><Clock3 size={16}/><strong>{salon.wait} min</strong><span>estimated wait</span><span className="updated">Updated {salon.updated}</span></div>
  <div className="queueLine"><Users size={15}/>{queue} people currently waiting</div></div><ChevronRight className="arrow"/>
</button> }

function Profile({salon,queue,setSelected,setNotice,notice}){ return <main className="inner">
  <button className="back" onClick={()=>setSelected(null)}><ArrowLeft size={17}/> Back to salons</button>
  <section className="profileHead"><div className="avatar big">✂</div><div><span className="eyebrow">VERIFIED LISTING</span><h1>{salon.name}</h1><div className="muted"><MapPin size={14}/>{salon.address}<span>•</span><Star size={14}/>{salon.rating}</div></div></section>
  <section className="liveBox"><div><span className="label">CURRENT STATUS</span><strong>{salon.wait} min</strong><span>estimated wait</span></div><div className="liveMeta"><span><i className="greenDot"></i>Open now</span><div>Updated {salon.updated}</div><div>{queue} people waiting</div></div></section>
  <h2>Services & prices</h2><p className="hint">Prices are provided and maintained by the salon.</p>
  <section className="services">{salon.services.map(([name,price,duration])=><div className="service" key={name}><div><strong>{name}</strong><span>{duration} min</span></div><b>{price} AED</b></div>)}</section>
  <button className="primary" onClick={()=>setNotice('Queue request recorded for this prototype. Payment is not part of this MVP.')}>Join queue</button>
  {notice&&<div className="notice"><CheckCircle2 size={18}/>{notice}</div>}
</main> }

function Dashboard({queue,changeQueue,setMode,notice,setNotice}){ const [salonId,setSalonId]=useState(1); const salon=salons.find(s=>s.id===salonId); return <main className="shell">
  <header><div><div className="brand">Salon Dashboard</div><div className="tag">Owner-controlled services, prices and live queue</div></div><button className="ghost" onClick={()=>setMode('customer')}><ArrowLeft size={17}/> Customer view</button></header>
  <section className="dashTop"><select value={salonId} onChange={e=>setSalonId(Number(e.target.value))}>{salons.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select><span className="pill green">Open</span></section>
  <div className="metric"><div><span className="label">CURRENT QUEUE</span><strong>{queue[salon.id]}</strong><span>people waiting</span></div><div><span className="label">EST. WAIT</span><strong>{Math.max(5,queue[salon.id]*6)} min</strong><span>auto-estimate</span></div></div>
  <h2>Quick queue controls</h2><div className="queueControl"><div><strong>Walk-in customer</strong><span>Add or remove customers who did not book in the app.</span></div><div className="counter"><button onClick={()=>changeQueue(salon.id,-1)} aria-label="remove customer"><Minus size={18}/></button><b>{queue[salon.id]}</b><button onClick={()=>changeQueue(salon.id,1)} aria-label="add customer"><Plus size={18}/></button></div></div>
  <h2>Services & prices</h2><p className="hint">These values are owned and maintained by the salon.</p><div className="services">{salon.services.map(([name,price,duration])=><div className="service" key={name}><div><strong>{name}</strong><span>{duration} min</span></div><b>{price} AED</b></div>)}</div>
  <button className="secondary" onClick={()=>setNotice('Service editor is the next build step. These demo values represent salon-owned data.')}>Manage services & prices</button>
  {notice&&<div className="notice"><CheckCircle2 size={18}/>{notice}</div>}
</main> }

createRoot(document.getElementById('root')).render(<App/>);
