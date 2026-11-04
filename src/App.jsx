import React,{useEffect,useMemo,useRef,useState} from 'react';

const STORAGE='acl-roomgrid-18rooms-v1';
const rooms=['A1-203', 'A2-106', 'A2-107', 'A3-208', 'A3-209', 'B1-205', 'B1-206', 'B1-207', 'B2-104', 'B2-105', 'B3-301', 'C1-102', 'C1-103', 'C2-201', 'C2-202', 'C3-101', 'C3-102', 'D1-101'];
// End dates are exclusive; all sample reservations use non-overlapping date ranges.
const sampleRows=[
 ['A1-203','2026-11-09','2026-11-11','Peer tutoring','other'],
 ['A1-203','2026-11-13','2026-11-15','Architecture workshop','other'],
 ['A1-203','2026-11-17','2026-11-19','Group assignment','you'],
 ['A2-106','2026-11-10','2026-11-13','Seminar preparation','other'],
 ['A2-106','2026-11-16','2026-11-19','Study circle','other'],
 ['A2-107','2026-11-09','2026-11-10','Student club planning','you'],
 ['A2-107','2026-11-12','2026-11-15','Project demo rehearsal','other'],
 ['A2-107','2026-11-16','2026-11-19','Study meeting','other'],
 ['A3-208','2026-11-11','2026-11-14','Presentation practice','other'],
 ['A3-208','2026-11-16','2026-11-18','Tutorial group','other'],
 ['A3-209','2026-11-10','2026-11-12','Study session','other'],
 ['B1-205','2026-11-09','2026-11-11','Meeting','other'],
 ['B1-205','2026-11-13','2026-11-15','Team discussion','other'],
 ['B1-205','2026-11-16','2026-11-18','Course project','other'],
 ['B1-206','2026-11-11','2026-11-13','Exam revision','other'],
 ['B1-206','2026-11-17','2026-11-20','Debate practice','you'],
 ['B1-207','2026-11-10','2026-11-12','Group study','you'],
 ['B1-207','2026-11-16','2026-11-19','Engineering project','other'],
 ['B2-104','2026-11-09','2026-11-11','Weekly study group','you'],
 ['B2-104','2026-11-13','2026-11-15','Team planning','other'],
 ['B2-104','2026-11-17','2026-11-19','Workshop preparation','other'],
 ['B2-105','2026-11-12','2026-11-15','Club meeting','other'],
 ['B2-105','2026-11-16','2026-11-18','Student committee','other'],
 ['B3-301','2026-11-09','2026-11-10','Debate practice','other'],
 ['B3-301','2026-11-11','2026-11-13','Group preparation','other'],
 ['B3-301','2026-11-18','2026-11-20','Portfolio review','other'],
 ['C1-102','2026-11-10','2026-11-14','Capstone meeting','other'],
 ['C1-102','2026-11-16','2026-11-19','Revision session','other'],
 ['C1-103','2026-11-09','2026-11-12','Group project','other'],
 ['C1-103','2026-11-14','2026-11-16','Student society','you'],
 ['C2-201','2026-11-12','2026-11-15','Project sprint','other'],
 ['C2-201','2026-11-16','2026-11-19','Robotics club','other'],
 ['C2-202','2026-11-09','2026-11-11','Lab preparation','other'],
 ['C2-202','2026-11-18','2026-11-20','Teaching assistant session','other'],
 ['C3-101','2026-11-12','2026-11-14','Presentation rehearsal','you'],
 ['C3-101','2026-11-14','2026-11-16','Design workshop','other'],
 ['C3-101','2026-11-18','2026-11-20','Study group','other'],
 ['C3-102','2026-11-11','2026-11-15','Research meeting','other'],
 ['D1-101','2026-11-10','2026-11-13','Team check-in','other'],
 ['D1-101','2026-11-16','2026-11-18','Group assignment','you'],
];
const seed=sampleRows.map(([roomNumber,startDate,endDate,purpose,owner],index)=>({id:`demo-${index+1}`,roomNumber,startDate,endDate,purpose,owner}));
const formEmpty={roomNumber:'',startDate:'',endDate:'',purpose:''};
function read(){try{let a=JSON.parse(localStorage.getItem(STORAGE));return Array.isArray(a)?a:seed;}catch{return seed;}}
function addDays(iso,days){const t=new Date(`${iso}T12:00:00Z`);t.setUTCDate(t.getUTCDate()+days);return t.toISOString().slice(0,10);}
function human(iso){return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short'});}
function weekDay(iso){return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB',{timeZone:'UTC',weekday:'short'});}
function issue(form,bookings,id){
 if(!form.roomNumber.trim()||!form.startDate||!form.endDate)return 'Complete the room and both dates.';
 if(form.endDate<=form.startDate)return 'End date must follow start date.';
 if(bookings.some(b=>b.id!==id&&b.roomNumber.toLowerCase()===form.roomNumber.trim().toLowerCase()&&form.startDate<b.endDate&&form.endDate>b.startDate))return 'This room is already booked for some of those dates.';
 return '';
}

// ---- Date picker with booked dates greyed out ----
const WEEKDAYS=['Mo','Tu','We','Th','Fr','Sa','Su'];
function firstOfMonth(iso){return iso.slice(0,7)+'-01';}
function addMonths(monthIso,n){const t=new Date(`${monthIso}T12:00:00Z`);t.setUTCMonth(t.getUTCMonth()+n,1);return t.toISOString().slice(0,10);}
function monthLabel(iso){return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB',{timeZone:'UTC',month:'long',year:'numeric'});}
function monthGrid(monthIso){const offset=(new Date(`${monthIso}T12:00:00Z`).getUTCDay()+6)%7;const start=addDays(monthIso,-offset);return Array.from({length:42},(_,i)=>addDays(start,i));}

function DateField({id,label,value,onChange,blockedInfo,fallbackMonth,rangeStart,rangeEnd,align='left',hint}){
 const [open,setOpen]=useState(false);
 const [month,setMonth]=useState(firstOfMonth(value||fallbackMonth));
 const wrapRef=useRef(null);
 const iconRef=useRef(null);
 const gridRef=useRef(null);
 useEffect(()=>{
  if(!open)return;
  const onDown=e=>{if(!wrapRef.current?.contains(e.target))setOpen(false);};
  const onKey=e=>{if(e.key==='Escape'){setOpen(false);iconRef.current?.focus();}};
  document.addEventListener('mousedown',onDown);document.addEventListener('keydown',onKey);
  // Move focus into the calendar: selected day, else first available day.
  requestAnimationFrame(()=>{const g=gridRef.current;(g?.querySelector('[aria-pressed="true"]:not(:disabled)')||g?.querySelector('button:not(:disabled)'))?.focus();});
  return()=>{document.removeEventListener('mousedown',onDown);document.removeEventListener('keydown',onKey);};
 },[open]);
 function toggle(){if(!open)setMonth(firstOfMonth(value||fallbackMonth));setOpen(o=>!o);}
 function choose(d){onChange(d);setOpen(false);iconRef.current?.focus();}
 return <div className="date-field" ref={wrapRef}>
  <label htmlFor={id}>{label}</label>
  <div className="date-input">
   <input id={id} type="date" value={value} onChange={e=>onChange(e.target.value)}/>
   <button ref={iconRef} type="button" className="date-icon" aria-label={`Open calendar for ${label.toLowerCase()}`} aria-expanded={open} onClick={toggle}>
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><rect x="2.5" y="4" width="15" height="13.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6"/><path d="M2.5 8.5h15M6.5 2v4M13.5 2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
   </button>
  </div>
  {open&&<div className={'date-pop '+align} role="dialog" aria-label={`${label} calendar`}>
   <div className="date-pop-head">
    <button type="button" aria-label="Previous month" onClick={()=>setMonth(addMonths(month,-1))}>←</button>
    <strong>{monthLabel(month)}</strong>
    <button type="button" aria-label="Next month" onClick={()=>setMonth(addMonths(month,1))}>→</button>
   </div>
   {hint&&<p className="date-pop-hint">{hint}</p>}
   <div className="date-grid" ref={gridRef}>
    {WEEKDAYS.map(w=><span key={w} className="date-wd">{w}</span>)}
    {monthGrid(month).map(d=>{
     const info=blockedInfo(d);
     const outside=d.slice(0,7)!==month.slice(0,7);
     const selected=d===value;
     const inRange=rangeStart&&rangeEnd&&d>=rangeStart&&d<rangeEnd;
     const cls=['date-day',outside&&'outside',info&&info.kind,inRange&&'in-range',selected&&'selected'].filter(Boolean).join(' ');
     return <button key={d} type="button" className={cls} disabled={!!info} aria-pressed={selected}
      aria-label={`${weekDay(d)} ${human(d)}${info?` – unavailable: ${info.reason}`:''}`}
      title={info?info.reason:'Available'} onClick={()=>choose(d)}>{Number(d.slice(8))}</button>;
    })}
   </div>
   <div className="date-pop-legend"><span><i className="lg-booked"/>Booked</span><span><i className="lg-selected"/>Selected</span>{rangeStart&&rangeEnd&&<span><i className="lg-range"/>Your range</span>}</div>
  </div>}
 </div>;
}

export default function App(){
 const [bookings,setBookings]=useState(read);
 const [week,setWeek]=useState('2026-11-09');
 const [view,setView]=useState('All rooms');
 const [form,setForm]=useState({...formEmpty});
 const [editing,setEditing]=useState(null);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [flash,setFlash]=useState(false);
 const roomInputRef=useRef(null);
 useEffect(()=>localStorage.setItem(STORAGE,JSON.stringify(bookings)),[bookings]);
 // Bookings for the room typed in the form (excluding the one being edited) drive the greyed-out dates.
 const roomKey=form.roomNumber.trim().toLowerCase();
 const roomBookings=roomKey?bookings.filter(b=>b.id!==editing&&b.roomNumber.toLowerCase()===roomKey):[];
 const bookedOn=d=>roomBookings.find(b=>d>=b.startDate&&d<b.endDate);
 const startBlocked=d=>{const b=bookedOn(d);return b?{kind:'booked',reason:b.owner==='you'?'you already booked this date':'already booked'}:null;};
 const endBlocked=d=>{
  // End dates are exclusive: the range [start, end) must not touch a booked night.
  if(form.startDate){
   if(d<=form.startDate)return {kind:'invalid',reason:'must be after the start date'};
   const b=roomBookings.find(b=>form.startDate<b.endDate&&d>b.startDate);
   if(!b)return null;
   return bookedOn(addDays(d,-1))?{kind:'booked',reason:'already booked'}:{kind:'invalid',reason:'range would cross an existing booking'};
  }
  return bookedOn(addDays(d,-1))?{kind:'booked',reason:'already booked'}:null;
 };
 const pickerHint=!roomKey?'Choose a room first to see which dates are booked.':null;
 function scrollToBookings(){document.getElementById('my-reservations')?.scrollIntoView({behavior:'smooth',block:'start'});}
 const days=useMemo(()=>Array.from({length:7},(_,i)=>addDays(week,i)),[week]);
 const myBookings=bookings.filter(b=>b.owner==='you').sort((a,b)=>a.startDate.localeCompare(b.startDate));
 const roomList=view==='All rooms'?rooms:rooms.filter(r=>r===view);
 const occupied=(room,date)=>bookings.find(b=>b.roomNumber===room&&date>=b.startDate&&date<b.endDate);
 function pick(room,date){setForm({roomNumber:room,startDate:date,endDate:addDays(date,1),purpose:''});setEditing(null);setError('');document.getElementById('booking-form')?.scrollIntoView({behavior:'smooth',block:'nearest'});}
 function edit(row){if(row.owner!=='you')return;setEditing(row.id);setForm({roomNumber:row.roomNumber,startDate:row.startDate,endDate:row.endDate,purpose:row.purpose});setError('');setNotice('');
  // Take the user to the form, highlight it, and put focus in the first field.
  setFlash(true);
  requestAnimationFrame(()=>{document.getElementById('booking-form')?.scrollIntoView({behavior:'smooth',block:'start'});roomInputRef.current?.focus({preventScroll:true});});}
 function submit(e){e.preventDefault();setNotice('');const err=issue(form,bookings,editing);if(err){setError('Reservation failed. Review the selected dates.');return;}const payload={roomNumber:form.roomNumber.trim(),startDate:form.startDate,endDate:form.endDate,purpose:form.purpose.trim(),owner:'you'};
 if(editing){setBookings(bookings.map(b=>b.id===editing?{...b,...payload}:b));setNotice('Booking updated.');}else{setBookings([...bookings,{...payload,id:'b-'+Date.now()}]);setNotice('Room reserved.');}setForm({...formEmpty});setEditing(null);setError('');}
 function reset(){setBookings(seed);setForm({...formEmpty});setEditing(null);setWeek('2026-11-09');setNotice('Example bookings restored.');setError('');setView('All rooms');}
 function check(){setNotice('');setError('');let e=issue(form,bookings,editing);if(e){setError(e);}else setNotice('No conflict detected for the selected dates.');}
 return <div className="room-app"><header className="topbar"><div className="mark"><span className="mark-sq">R</span><span><strong>room<span>grid</span></strong><small>Campus spaces</small></span></div><nav><span className="nav-current" aria-current="page">Availability</span><button type="button" className="nav-action" onClick={scrollToBookings}>My bookings <span className="nav-count">{myBookings.length}</span></button><button type="button" onClick={reset}>Reset demo</button></nav><div className="member"><span>Student dashboard</span><div className="profile">YOU</div></div></header>
  <main><section className="intro"><div><span className="eyebrow">SPACES / RESERVATIONS</span><h1>Find room availability</h1><p>Review campus rooms, dates and existing reservations in one view.</p></div><div className="intro-summary"><span>ROOMS IN DIRECTORY</span><strong>{rooms.length.toString().padStart(2,'0')}</strong><span>CURRENT RESERVATIONS</span><strong>{bookings.length.toString().padStart(2,'0')}</strong></div></section>
   <div className="pagegrid"><section className="calendar-pane"><div className="calendar-head"><div><span className="eyebrow">AVAILABILITY CALENDAR</span><h2>Rooms by day</h2></div><div className="weeknav"><button aria-label="Previous week" onClick={()=>setWeek(addDays(week,-7))}>←</button><strong>{human(week)} – {human(addDays(week,6))}</strong><button aria-label="Next week" onClick={()=>setWeek(addDays(week,7))}>→</button></div></div>
    <div className="calendar-controls"><label>Location <select value={view} onChange={e=>setView(e.target.value)}><option>All rooms</option>{rooms.map(r=><option key={r}>{r}</option>)}</select></label><span className="legend"><i className="booked"/> Reserved</span><span className="legend"><i className="free"/> Available</span><p>Click a day to enter it in the form.</p></div>
    <div className="calendar-scroll"><div className="room-cal"><div className="corner">ROOM / DATE</div>{days.map(d=><div className="dayhead" key={d}><strong>{weekDay(d)}</strong><span>{human(d)}</span></div>)}{roomList.map((room,i)=><React.Fragment key={room}><div className="roomname"><strong>{room}</strong><small>Study room · {room[0]}</small></div>{days.map(day=>{const b=occupied(room,day);return <button key={room+day} title={`${room}, ${day}: ${b?'Reserved':'Available'}`} className={'slot '+(b?'taken':'available')} onClick={()=>pick(room,day)}><span>{b?'Booked':'Open'}</span>{b&&<small>{b.owner==='you'?'Your booking':'Reserved'}</small>}</button>})}</React.Fragment>)}</div></div>
    <p className="calendar-note">Cells show individual dates. Reservations may span several dates; a day marked "Open" does not guarantee the full range you choose will be available.</p>
    <section id="my-reservations" className="reservations"><div className="reservations-head"><h2>Your bookings</h2><span>{myBookings.length} current records</span></div><div className="reservations-list">{myBookings.map(b=><article key={b.id} className={'reservation'+(editing===b.id?' is-editing':'')}><div className="room-chip">{b.roomNumber}</div><div className="reservation-body"><strong>{human(b.startDate)} – {human(b.endDate)}</strong><small>{editing===b.id?'Editing in the form…':(b.purpose||'No purpose entered')}</small></div><button type="button" className="change-button" aria-label={`Change booking for ${b.roomNumber}, ${human(b.startDate)} to ${human(b.endDate)}`} onClick={()=>edit(b)}>Change</button></article>)}{myBookings.length===0&&<p>No reservations.</p>}</div></section></section>
    <aside className={'booking-pane'+(flash?' flash':'')} id="booking-form" onAnimationEnd={()=>setFlash(false)}><div className="panel-tag"><span>BOOK A ROOM</span><span>FORM 01</span></div><h2>{editing?'Change reservation':'Make a reservation'}</h2><p className="booking-description">Use this panel to request a room for your study group, meeting or activity.</p>{notice&&<div className="success" role="status">{notice}</div>}{error&&<div className="error" role="alert">{error}</div>}<form onSubmit={submit}><label><span>Room number</span><input ref={roomInputRef} list="rooms" placeholder="e.g., B2-104" value={form.roomNumber} onChange={e=>setForm(f=>({...f,roomNumber:e.target.value}))}/><datalist id="rooms">{rooms.map(r=><option key={r} value={r}/>)}</datalist></label><div className="date-pair">
     <DateField id="start-date" label="Start date" value={form.startDate} onChange={v=>setForm(f=>({...f,startDate:v}))} blockedInfo={startBlocked} fallbackMonth={week} rangeStart={form.startDate} rangeEnd={form.endDate} hint={pickerHint}/>
     <DateField id="end-date" label="End date" align="right" value={form.endDate} onChange={v=>setForm(f=>({...f,endDate:v}))} blockedInfo={endBlocked} fallbackMonth={form.startDate||week} rangeStart={form.startDate} rangeEnd={form.endDate} hint={pickerHint}/>
    </div><label><span>Purpose / optional</span><textarea rows="5" placeholder="Meeting, group study..." value={form.purpose} onChange={e=>setForm(f=>({...f,purpose:e.target.value}))}/></label><p className="helper">Start and end dates are required. Reservations cannot overlap existing bookings for the same room.</p><button className="availability-check" type="button" onClick={check}>Check availability</button><button className="reserve-button" type="submit">{editing?'Save booking':'Confirm booking'}</button>{editing&&<button className="cancel-edit" type="button" onClick={()=>{setEditing(null);setForm({...formEmpty});setError('')}}>Cancel editing</button>}</form><div className="right-foot"><span>✦</span> Need a room for a group? Find an open date and submit your request.</div></aside></div>
  </main><footer>ROOMGRID / Academic campus demo — local browser data only.</footer>
 </div>;
}
