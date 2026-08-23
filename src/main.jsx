import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowLeft, Bell, CalendarClock, Check, CheckCircle2, ChevronRight, Clock3,
  ExternalLink, LogIn, LogOut, MapPin, Menu, Minus, Plus, Scissors,
  Settings2, Star, Store, UserRound, Users, X
} from 'lucide-react';
import './styles.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cyyanndxveuyiphrizhi.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_1AUslzH1HW2pIR8HZIazrA_QIGtzuvQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FALLBACK_SALONS = [
  { id:'demo-1', name:'Urban Gents', gender:'men', area:'Al Reem Island', google_rating:4.8, estimated_wait_minutes:12, queue_count:2, status:'available', address:'Al Reem Island, Abu Dhabi', is_demo:true, services:[{id:'d1',name:'Haircut',price:45,duration_minutes:25},{id:'d2',name:'Beard',price:25,duration_minutes:15},{id:'d3',name:'Haircut + Beard',price:65,duration_minutes:40}] },
  { id:'demo-2', name:'The Gentleman', gender:'men', area:'Al Khalidiyah', google_rating:4.6, estimated_wait_minutes:28, queue_count:5, status:'busy', address:'Al Khalidiyah, Abu Dhabi', is_demo:true, services:[{id:'d4',name:'Haircut',price:40,duration_minutes:25},{id:'d5',name:'Beard',price:20,duration_minutes:15}] },
  { id:'demo-3', name:'Luna Ladies', gender:'women', area:'Al Bateen', google_rating:4.9, estimated_wait_minutes:18, queue_count:3, status:'available', address:'Al Bateen, Abu Dhabi', is_demo:true, services:[{id:'d6',name:'Hair Styling',price:120,duration_minutes:45},{id:'d7',name:'Blow Dry',price:80,duration_minutes:35},{id:'d8',name:'Manicure',price:70,duration_minutes:40}] },
  { id:'demo-4', name:'Velvet Beauty', gender:'women', area:'Khalifa City', google_rating:4.7, estimated_wait_minutes:42, queue_count:8, status:'busy', address:'Khalifa City, Abu Dhabi', is_demo:true, services:[{id:'d9',name:'Hair Cut',price:100,duration_minutes:40},{id:'d10',name:'Blow Dry',price:70,duration_minutes:30}] }
];

const STATUS = {
  available: ['Available now','green'],
  busy: ['Busy','red'],
  closed: ['Closed','gray']
};

function App(){
  const [session,setSession]=useState(null);
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState('home');
  const [gender,setGender]=useState('men');
  const [selected,setSelected]=useState(null);
  const [salons,setSalons]=useState([]);
  const [services,setServices]=useState([]);
  const [queue,setQueue]=useState([]);
  const [authOpen,setAuthOpen]=useState(false);
  const [ownerOpen,setOwnerOpen]=useState(false);
  const [toast,setToast]=useState('');

  useEffect(()=>{
    let mounted=true;
    supabase.auth.getSession().then(({data})=>{ if(mounted){setSession(data.session);setLoading(false);} });
    const {data:listener}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));
    return ()=>{mounted=false;listener.subscription.unsubscribe();};
  },[]);

  const loadSalons=async()=>{
    const {data,error}=await supabase.from('salons').select('*').order('name');
    if(error || !data?.length){setSalons(FALLBACK_SALONS);return;}
    setSalons(data);
  };
  const loadQueue=async salonId=>{
    if(String(salonId).startsWith('demo-')) return;
    const {data}=await supabase.from('queue_entries').select('id,customer_id,service_id,status,position,joined_at').eq('salon_id',salonId).in('status',['waiting','in_service']).order('position',{ascending:true});
    setQueue(data||[]);
  };
  const loadServices=async salonId=>{
    if(String(salonId).startsWith('demo-')){const s=salons.find(x=>x.id===salonId);setServices(s?.services||[]);return;}
    const {data}=await supabase.from('services').select('*').eq('salon_id',salonId).eq('is_active',true).order('name');
    setServices(data||[]);
  };

  useEffect(()=>{loadSalons();},[session]);
  useEffect(()=>{
    if(!selected) return;
    loadServices(selected.id); loadQueue(selected.id);
    if(String(selected.id).startsWith('demo-')) return;
    const channel=supabase.channel(`salon-live-${selected.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'salons',filter:`id=eq.${selected.id}`},p=>setSalons(prev=>prev.map(s=>s.id===p.new.id?{...s,...p.new}:s)))
      .on('postgres_changes',{event:'*',schema:'public',table:'queue_entries',filter:`salon_id=eq.${selected.id}`},()=>loadQueue(selected.id))
      .subscribe();
    return()=>{supabase.removeChannel(channel);};
  },[selected?.id]);

  useEffect(()=>{ if(!toast) return; const t=setTimeout(()=>setToast(''),3200); return()=>clearTimeout(t);},[toast]);

  const visible=useMemo(()=>salons.filter(s=>s.gender===gender),[salons,gender]);

  async function signOut(){await supabase.auth.signOut();setView('home');setOwnerOpen(false);setSelected(null);}
  async function joinQueue(serviceId){
    if(!session){setAuthOpen(true);setToast('Sign in to join a live queue.');return;}
    if(String(selected.id).startsWith('demo-')){setToast('Demo mode: this queue is for UI preview only.');return;}
    const position=(selected.queue_count||0)+1;
    const {error}=await supabase.from('queue_entries').insert({salon_id:selected.id,customer_id:session.user.id,service_id:serviceId,source:'app',status:'waiting',position});
    if(error){setToast(error.message);return;}
    await loadQueue(selected.id);setToast('You joined the queue.');
  }

  if(loading) return <Splash/>;
  if(view==='owner') return <OwnerView session={session} setView={setView} salons={salons} setSalons={setSalons} setToast={setToast} />;
  if(selected) return <SalonProfile salon={selected} services={services} queue={queue} session={session} onBack={()=>{setSelected(null);setQueue([])}} onJoin={joinQueue} onAuth={()=>setAuthOpen(true)} onOwner={()=>setOwnerOpen(true)} />;

  return <div className="app">
    <Header session={session} onAuth={()=>setAuthOpen(true)} onOwner={()=>setView('owner')} onSignOut={signOut}/>
    <main className="page">
      <section className="heroCard">
        <div className="heroKicker"><span className="pulse"></span> LIVE QUEUE</div>
        <h1>Know the wait<br/><em>before you go.</em></h1>
        <p>Find a nearby salon, see the latest wait time, browse salon-owned prices, and join the queue when you are ready.</p>
        <div className="heroActions"><button className="primary" onClick={()=>document.getElementById('salons')?.scrollIntoView({behavior:'smooth'})}>Find a salon <ChevronRight size={17}/></button><button className="quiet" onClick={()=>setView('owner')}><Store size={16}/> Add your salon</button></div>
      </section>

      <section className="sectionHead" id="salons"><div><span className="eyebrow">DISCOVER</span><h2>Salons near you</h2></div><div className="locationPill"><MapPin size={15}/> Abu Dhabi</div></section>
      <div className="tabs"><button className={gender==='men'?'active':''} onClick={()=>setGender('men')}>Men</button><button className={gender==='women'?'active':''} onClick={()=>setGender('women')}>Women</button></div>
      <section className="salonGrid">{visible.map(s=><SalonCard key={s.id} salon={s} onOpen={()=>{setSelected(s);setServices(s.services||[]);}}/> )}</section>
      {!visible.length && <EmptyState onOwner={()=>setView('owner')}/>} 
    </main>
    <BottomNav active="home" onHome={()=>setSelected(null)} onAccount={()=>session?setView('owner'):setAuthOpen(true)}/>
    {authOpen && <AuthModal onClose={()=>setAuthOpen(false)} onSuccess={()=>{setAuthOpen(false);setToast('Welcome to SalonNow.')}}/>}
    {ownerOpen && <AuthModal ownerOnly onClose={()=>setOwnerOpen(false)} onSuccess={()=>{setOwnerOpen(false);setView('owner')}}/>}
    {toast&&<div className="toast"><CheckCircle2 size={18}/>{toast}</div>}
  </div>;
}

function Header({session,onAuth,onOwner,onSignOut}){return <header className="topbar"><div className="logo"><span className="logoMark"><Scissors size={18}/></span><span>SalonNow</span></div><div className="topActions">{session?<><button className="iconBtn" onClick={onOwner}><Settings2 size={19}/></button><button className="userChip" onClick={onSignOut}><UserRound size={16}/><span>Account</span></button></>:<><button className="quiet small" onClick={onOwner}><Store size={16}/> For salons</button><button className="darkBtn" onClick={onAuth}><LogIn size={16}/> Sign in</button></>}</div></header>}

function SalonCard({salon,onOpen}){const [label,color]=STATUS[salon.status]||STATUS.available;return <button className="salonCard" onClick={onOpen}>
  <div className="cover"><div className="coverIcon"><Scissors size={22}/></div><span className="distance">{salon.google_rating?`★ ${salon.google_rating}`:'New'}</span></div>
  <div className="salonInfo"><div className="titleRow"><h3>{salon.name}</h3><span className={`pill ${color}`}>{label}</span></div><div className="meta"><span><MapPin size={13}/>{salon.area||salon.address||'Location not set'}</span></div><div className="waitRow"><div><Clock3 size={15}/><strong>{salon.estimated_wait_minutes||0} min</strong><span>wait</span></div><div><Users size={14}/><span>{salon.queue_count||0} waiting</span></div></div></div>
</button>}

function SalonProfile({salon,services,queue,session,onBack,onJoin,onAuth}){const [serviceId,setServiceId]=useState(services[0]?.id||'');const [showInfo,setShowInfo]=useState(false);const [myJoin,setMyJoin]=useState(false);useEffect(()=>setServiceId(services[0]?.id||''),[salon?.id]);useEffect(()=>{if(session) setMyJoin(queue.some(q=>q.customer_id===session.user.id));},[queue,session]);return <div className="app"><header className="topbar"><button className="backBtn" onClick={onBack}><ArrowLeft size={18}/></button><div className="logo compact"><span className="logoMark"><Scissors size={18}/></span><span>SalonNow</span></div><button className="iconBtn"><Bell size={18}/></button></header><main className="page profilePage">
  <div className="profileCover"><div className="profileSymbol"><Scissors size={32}/></div></div>
  <section className="profileSummary"><div><span className="eyebrow">{salon.is_verified?'VERIFIED LISTING':'SALON LISTING'}</span><h1>{salon.name}</h1><div className="meta large"><span><MapPin size={14}/>{salon.area||salon.address}</span>{salon.google_rating&&<span><Star size={14}/>{salon.google_rating}</span>}</div></div><a className="mapBtn" href={salon.maps_url||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.address||salon.name)}`} target="_blank" rel="noreferrer"><MapPin size={16}/> Maps</a></section>
  <section className="liveHero"><div><span className="eyebrow">LIVE QUEUE</span><div className="bigWait">{salon.estimated_wait_minutes||0}<small>min</small></div><p>estimated wait</p></div><div className="liveSide"><span className="statusDot"></span><strong>{STATUS[salon.status]?.[0]||'Available'}</strong><span>Updated {salon.last_queue_update_at?new Date(salon.last_queue_update_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'just now'}</span><span>{salon.queue_count||0} people waiting</span></div></section>
  <section className="contentSection"><div className="sectionHead compact"><div><span className="eyebrow">MENU</span><h2>Services & prices</h2></div><span className="ownerHint">Prices set by salon</span></div><div className="serviceList">{services.length?services.map(s=><div className="serviceRow" key={s.id}><div><strong>{s.name}</strong><span>{s.duration_minutes} min</span></div><b>{Number(s.price).toFixed(0)} AED</b></div>):<div className="emptyInline">No services published yet.</div>}</div></section>
  {services.length>0 && <section className="joinCard"><div><span className="eyebrow">READY?</span><h3>Join the queue</h3><p>No payment in app. Pay the salon directly after your service.</p></div><div className="joinControls"><select value={serviceId} onChange={e=>setServiceId(e.target.value)}>{services.map(s=><option value={s.id} key={s.id}>{s.name} · {Number(s.price).toFixed(0)} AED</option>)}</select><button className="primary" disabled={myJoin} onClick={()=>onJoin(serviceId)}>{myJoin?'Already in queue':'Join queue'} <ChevronRight size={17}/></button></div></section>}
  <button className="detailsBtn" onClick={()=>setShowInfo(v=>!v)}>{showInfo?'Hide details':'View salon details'} <ChevronRight size={16}/></button>{showInfo&&<div className="detailsBox"><p>{salon.description||'This salon controls its own services, pricing and live queue status on SalonNow.'}</p>{salon.phone&&<a href={`tel:${salon.phone}`}>Call salon</a>}</div>}
 </main></div>}

function OwnerView({session,setView,salons,setSalons,setToast}){const [mine,setMine]=useState([]);const [active,setActive]=useState(null);const [tab,setTab]=useState('queue');const [showAdd,setShowAdd]=useState(false);const load=async()=>{if(!session){setMine([]);return;}const {data}=await supabase.from('salons').select('*').eq('owner_id',session.user.id).order('created_at');setMine(data||[]);};useEffect(()=>{load();},[session]);if(!session)return <div className="app"><Header session={null} onAuth={()=>{}} onOwner={()=>{}} onSignOut={()=>{}}/><main className="page"><div className="ownerGate"><Store size={38}/><h1>Salon Owner Portal</h1><p>Manage your salon profile, prices, staff and live queue from one screen.</p><button className="primary" onClick={()=>setView('home')}>Go back</button></div></main></div>;
 if(!mine.length&&!showAdd)return <div className="app"><OwnerTop setView={setView}/><main className="page"><div className="ownerHero"><div><span className="eyebrow">SALON PORTAL</span><h1>Put your salon on the map.</h1><p>Start free. You control your services, prices and live queue.</p></div><button className="primary" onClick={()=>setShowAdd(true)}>Add my salon <Plus size={17}/></button></div><div className="benefits"><div><Clock3/><strong>Live wait time</strong><span>Show customers your current queue.</span></div><div><Scissors/><strong>Your prices</strong><span>Update services whenever you need.</span></div><div><Users/><strong>Walk-ins</strong><span>Keep app and walk-in customers in sync.</span></div></div>{showAdd&&<SalonEditor session={session} onSaved={()=>{setShowAdd(false);load();setToast('Salon created.')}} onCancel={()=>setShowAdd(false)}/>}</main></div>;
 if(!active)return <div className="app"><OwnerTop setView={setView}/><main className="page"><div className="dashboardHeader"><div><span className="eyebrow">MY SALONS</span><h1>Salon dashboard</h1></div><button className="primary" onClick={()=>setShowAdd(true)}>Add salon <Plus size={17}/></button></div><div className="ownerSalonGrid">{mine.map(s=><button className="ownerSalon" key={s.id} onClick={()=>setActive(s)}><div className="ownerSalonIcon"><Scissors/></div><div><h3>{s.name}</h3><span>{s.gender==='men'?'Men':'Women'} · {s.address||'Location pending'}</span></div><ChevronRight/></button>)}</div>{showAdd&&<SalonEditor session={session} onSaved={()=>{setShowAdd(false);load();setToast('Salon created.')}} onCancel={()=>setShowAdd(false)}/>}</main></div>;
 return <OwnerDashboard salon={active} setActive={setActive} setTab={setTab} tab={tab} setToast={setToast} refresh={load}/> }

function OwnerTop({setView}){return <header className="topbar"><button className="backBtn" onClick={()=>setView('home')}><ArrowLeft size={18}/></button><div className="logo compact"><span className="logoMark"><Scissors size={18}/></span><span>SalonNow</span></div><div className="topActions"><span className="ownerBadge">OWNER</span></div></header>}

function SalonEditor({session,onSaved,onCancel}){const [form,setForm]=useState({name:'',gender:'men',address:'',maps_url:'',phone:'',description:''});const [busy,setBusy]=useState(false);const save=async e=>{e.preventDefault();setBusy(true);const {error}=await supabase.from('salons').insert({...form,owner_id:session.user.id,is_verified:true,status:'available',queue_count:0,estimated_wait_minutes:0});setBusy(false);if(error)alert(error.message);else onSaved();};return <div className="modalInline"><div className="modalHeader"><div><span className="eyebrow">NEW SALON</span><h2>Salon profile</h2></div><button className="iconBtn" onClick={onCancel}><X/></button></div><form className="formGrid" onSubmit={save}><label>Salon name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Category<select value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option value="men">Men</option><option value="women">Women</option></select></label><label className="full">Address<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><label>Phone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Google Maps URL<input value={form.maps_url} onChange={e=>setForm({...form,maps_url:e.target.value})}/></label><label className="full">About<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><div className="formActions"><button type="button" className="quiet" onClick={onCancel}>Cancel</button><button className="primary" disabled={busy}>{busy?'Saving...':'Create salon'} <Check size={17}/></button></div></form></div>}

function OwnerDashboard({salon,setActive,setTab,tab,setToast}){const [rows,setRows]=useState([]);const [services,setServices]=useState([]);const [form,setForm]=useState({name:'',price:'',duration_minutes:30});const load=async()=>{const [{data:q},{data:s}]=await Promise.all([supabase.from('queue_entries').select('*').eq('salon_id',salon.id).in('status',['waiting','in_service']).order('position'),supabase.from('services').select('*').eq('salon_id',salon.id).order('name')]);setRows(q||[]);setServices(s||[]);};useEffect(()=>{load();const c=supabase.channel(`owner-${salon.id}`).on('postgres_changes',{event:'*',schema:'public',table:'salons',filter:`id=eq.${salon.id}`},load).on('postgres_changes',{event:'*',schema:'public',table:'queue_entries',filter:`salon_id=eq.${salon.id}`},load).on('postgres_changes',{event:'*',schema:'public',table:'services',filter:`salon_id=eq.${salon.id}`},load).subscribe();return()=>supabase.removeChannel(c);},[salon.id]);
 const addWalkIn=async()=>{const position=(salon.queue_count||0)+1;const {error}=await supabase.from('queue_entries').insert({salon_id:salon.id,source:'walk_in',status:'waiting',position});if(error)setToast(error.message);else{setToast('Walk-in added.');load();}};
 const updateRow=async(id,status)=>{const payload=status==='in_service'?{status,started_at:new Date().toISOString()}:status==='completed'?{status,completed_at:new Date().toISOString()}:{status};const {error}=await supabase.from('queue_entries').update(payload).eq('id',id);if(error)setToast(error.message);else{setToast(status==='completed'?'Service completed.':'Customer moved to service.');load();}};
 const addService=async e=>{e.preventDefault();const {error}=await supabase.from('services').insert({salon_id:salon.id,name:form.name,price:Number(form.price),duration_minutes:Number(form.duration_minutes),is_active:true});if(error)setToast(error.message);else{setForm({name:'',price:'',duration_minutes:30});load();setToast('Service added.');}};
 const removeService=async id=>{const {error}=await supabase.from('services').delete().eq('id',id);if(error)setToast(error.message);else load();};
 return <div className="app"><OwnerTop setView={()=>setActive(null)}/><main className="page ownerPage"><button className="backLink" onClick={()=>setActive(null)}><ArrowLeft size={16}/> All salons</button><div className="dashboardTitle"><div><span className="eyebrow">LIVE OPERATIONS</span><h1>{salon.name}</h1><span>{salon.address||'Location pending'}</span></div><span className="pill green">Open</span></div><div className="ownerStats"><div><span>WAITING</span><strong>{salon.queue_count||0}</strong><small>people</small></div><div><span>EST. WAIT</span><strong>{salon.estimated_wait_minutes||0}</strong><small>minutes</small></div><button className="primary addWalk" onClick={addWalkIn}><Plus size={17}/> Walk-in</button></div><div className="ownerTabs"><button className={tab==='queue'?'active':''} onClick={()=>setTab('queue')}>Queue</button><button className={tab==='services'?'active':''} onClick={()=>setTab('services')}>Services & prices</button><button className={tab==='profile'?'active':''} onClick={()=>setTab('profile')}>Salon profile</button></div>
 {tab==='queue'&&<section className="queuePanel">{rows.length?rows.map((r,i)=><div className="queueRow" key={r.id}><div className="queueNum">{r.position||i+1}</div><div className="queueCustomer"><strong>{r.source==='walk_in'?'Walk-in customer':'App customer'}</strong><span>{r.status==='in_service'?'Currently in service':'Waiting'}</span></div><div className="queueActions">{r.status==='waiting'?<button className="secondary" onClick={()=>updateRow(r.id,'in_service')}>Start</button>:<button className="primary mini" onClick={()=>updateRow(r.id,'completed')}>Done</button>}</div></div>):<div className="emptyState"><Users size={34}/><h3>No one is waiting</h3><p>Use Walk-in to add a customer at the counter.</p></div>}</section>}
 {tab==='services'&&<section className="serviceAdmin"><form className="inlineAdd" onSubmit={addService}><input required placeholder="Service name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input required type="number" min="0" step="1" placeholder="AED" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/><input required type="number" min="5" step="5" placeholder="Min" value={form.duration_minutes} onChange={e=>setForm({...form,duration_minutes:e.target.value})}/><button className="primary"><Plus size={17}/> Add</button></form><div className="serviceList admin">{services.map(s=><div className="serviceRow" key={s.id}><div><strong>{s.name}</strong><span>{s.duration_minutes} min</span></div><div className="serviceAdminRight"><b>{Number(s.price).toFixed(0)} AED</b><button className="iconBtn danger" onClick={()=>removeService(s.id)}><X size={16}/></button></div></div>)}</div></section>}
 {tab==='profile'&&<div className="profileEditor"><p>Customers see this information on your salon profile.</p><div className="detailsBox"><div><strong>Google Maps</strong><span>{salon.maps_url||'Not added'}</span></div><div><strong>Phone</strong><span>{salon.phone||'Not added'}</span></div><div><strong>Description</strong><span>{salon.description||'Not added'}</span></div></div></div>}
 </main></div>}

function AuthModal({onClose,onSuccess,ownerOnly=false}){const [mode,setMode]=useState('signin');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [name,setName]=useState('');const [busy,setBusy]=useState(false);const submit=async e=>{e.preventDefault();setBusy(true);let result;if(mode==='signup')result=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});else result=await supabase.auth.signInWithPassword({email,password});setBusy(false);if(result.error){alert(result.error.message);return;}if(mode==='signup'&&!result.data.session){alert('Check your email to confirm your account, then sign in.');return;}onSuccess();};return <div className="overlay"><div className="modal"><button className="close" onClick={onClose}><X/></button><div className="modalBrand"><span className="logoMark"><Scissors size={18}/></span><span>{ownerOnly?'Salon owner access':'Welcome to SalonNow'}</span></div><h2>{mode==='signin'?'Sign in':'Create your account'}</h2><p>{ownerOnly?'Use your SalonNow account to manage your salon.':'Join queues, save salons and manage your bookings.'}</p>{mode==='signup'&&<label>Full name<input required value={name} onChange={e=>setName(e.target.value)} /></label>}<label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} /></label><label>Password<input required type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} /></label><button className="primary fullBtn" disabled={busy}>{busy?'Please wait...':mode==='signin'?'Sign in':'Create account'} <ChevronRight size={17}/></button><button className="switchAuth" onClick={()=>setMode(mode==='signin'?'signup':'signin')}>{mode==='signin'?"Don't have an account? Create one":"Already have an account? Sign in"}</button></div></div>}

function BottomNav({active,onHome,onAccount}){return <nav className="bottomNav"><button className={active==='home'?'active':''} onClick={onHome}><Store size={19}/><span>Explore</span></button><button onClick={onAccount}><UserRound size={19}/><span>Account</span></button></nav>}
function EmptyState({onOwner}){return <div className="emptyState pageEmpty"><Store size={36}/><h3>No salons yet</h3><p>SalonNow is ready for local owners to add their salons.</p><button className="secondary" onClick={onOwner}>Add a salon</button></div>}
function Splash(){return <div className="splash"><div className="logoMark large"><Scissors size={24}/></div><strong>SalonNow</strong><span>Find a salon. See the wait. Go.</span></div>}

createRoot(document.getElementById('root')).render(<App/>);
