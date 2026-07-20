import React, { useState, useEffect, useMemo, useCallback } from "react";

const PARKS = [
  "Acadia","American Samoa","Arches","Badlands","Big Bend","Biscayne",
  "Black Canyon of the Gunnison","Bryce Canyon","Canyonlands","Capitol Reef",
  "Carlsbad Caverns","Channel Islands","Congaree","Crater Lake","Cuyahoga Valley",
  "Death Valley","Denali","Dry Tortugas","Everglades","Gates of the Arctic",
  "Gateway Arch","Glacier","Glacier Bay","Grand Canyon","Grand Teton",
  "Great Basin","Great Sand Dunes","Great Smoky Mountains","Guadalupe Mountains",
  "Haleakalā","Hawaii Volcanoes","Hot Springs","Indiana Dunes","Isle Royale",
  "Joshua Tree","Katmai","Kenai Fjords","Kings Canyon","Kobuk Valley",
  "Lake Clark","Lassen Volcanic","Mammoth Cave","Mesa Verde","Mount Rainier",
  "New River Gorge","North Cascades","Olympic","Petrified Forest","Pinnacles",
  "Redwood","Rocky Mountain","Saguaro","Sequoia","Shenandoah",
  "Theodore Roosevelt","Virgin Islands","Voyageurs","White Sands","Wind Cave",
  "Wrangell-St. Elias","Yellowstone","Yosemite","Zion"
];

const MIN_YEAR = 2017;
const MAX_YEAR = 2040;
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function pad(n){ return n < 10 ? "0"+n : ""+n; }
function toISO(y,m,d){ return `${y}-${pad(m+1)}-${pad(d)}`; }
function todayISO(){
  const t = new Date();
  return toISO(t.getFullYear(), t.getMonth(), t.getDate());
}
function daysInMonth(y,m){ return new Date(y, m+1, 0).getDate(); }
function firstWeekday(y,m){ return new Date(y, m, 1).getDay(); }
function uid(){ return Math.random().toString(36).slice(2,10); }

export default function App(){
  const [trips, setTrips] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const today = new Date();
  const [viewYear, setViewYear] = useState(Math.min(Math.max(today.getFullYear(), MIN_YEAR), MAX_YEAR));
  const [viewMonth, setViewMonth] = useState(today.getFullYear() >= MIN_YEAR && today.getFullYear() <= MAX_YEAR ? today.getMonth() : 0);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [showForm, setShowForm] = useState(false);
  const [editingTripId, setEditingTripId] = useState(null);
  const [formName, setFormName] = useState("");
  const [formStart, setFormStart] = useState(selectedDate);
  const [formEnd, setFormEnd] = useState(selectedDate);
  const [formParks, setFormParks] = useState([]);
  const [parkFilter, setParkFilter] = useState("");
  const [trackerTab, setTrackerTab] = useState("today"); // 'today' | 'selected'

  // load persisted trips
  useEffect(() => {
    try {
      const raw = localStorage.getItem("natparktracker.trips");
      if (raw) setTrips(JSON.parse(raw));
    } catch (e) {
      // no data yet, or corrupted — start fresh
    }
    setLoaded(true);
  }, []);

  const persist = useCallback((next) => {
    setTrips(next);
    try {
      localStorage.setItem("natparktracker.trips", JSON.stringify(next));
    } catch (e) {
      setError("Could not save trips to local storage (it may be full or disabled).");
    }
  }, []);

  function openNewTripForm(dateISO){
    setEditingTripId(null);
    setFormName("");
    setFormStart(dateISO || selectedDate);
    setFormEnd(dateISO || selectedDate);
    setFormParks([]);
    setParkFilter("");
    setShowForm(true);
  }

  function openEditTripForm(trip){
    setEditingTripId(trip.id);
    setFormName(trip.name);
    setFormStart(trip.startDate);
    setFormEnd(trip.endDate);
    setFormParks(trip.parks);
    setParkFilter("");
    setShowForm(true);
  }

  function togglePark(p){
    setFormParks(prev => prev.includes(p) ? prev.filter(x => x!==p) : [...prev, p]);
  }

  function saveTrip(){
    if (!formStart || !formEnd) { setError("Please set start and end dates."); return; }
    if (formStart > formEnd) { setError("Start date must be before end date."); return; }
    if (formParks.length === 0) { setError("Select at least one park."); return; }
    setError("");
    const trip = {
      id: editingTripId || uid(),
      name: formName.trim() || formParks.join(", "),
      startDate: formStart,
      endDate: formEnd,
      parks: formParks
    };
    let next;
    if (editingTripId) {
      next = trips.map(t => t.id === editingTripId ? trip : t);
    } else {
      next = [...trips, trip];
    }
    next.sort((a,b) => a.startDate.localeCompare(b.startDate));
    persist(next);
    setShowForm(false);
  }

  function deleteTrip(id){
    persist(trips.filter(t => t.id !== id));
  }

  function exportTrips(){
    const blob = new Blob([JSON.stringify(trips, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `natparktracker-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importTrips(e){
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!Array.isArray(data)) throw new Error("Invalid file");
        persist(data);
        setError("");
      } catch (err) {
        setError("Could not import file — make sure it's a valid backup JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // parks visited as of a given ISO date (trip counts once it has started, i.e. startDate <= date)
  const parksAsOf = useCallback((dateISO) => {
    const set = new Set();
    for (const t of trips) {
      if (t.startDate <= dateISO) {
        t.parks.forEach(p => set.add(p));
      }
    }
    return set;
  }, [trips]);

  const todaySet = useMemo(() => parksAsOf(todayISO()), [parksAsOf]);
  const selectedSet = useMemo(() => parksAsOf(selectedDate), [parksAsOf, selectedDate]);

  // trips touching a given date (for calendar highlighting)
  const tripsByDate = useMemo(() => {
    const map = {};
    for (const t of trips) {
      let d = new Date(t.startDate + "T00:00:00");
      const end = new Date(t.endDate + "T00:00:00");
      while (d <= end) {
        const iso = toISO(d.getFullYear(), d.getMonth(), d.getDate());
        if (!map[iso]) map[iso] = [];
        map[iso].push(t);
        d.setDate(d.getDate()+1);
      }
    }
    return map;
  }, [trips]);

  function changeMonth(delta){
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    if (y < MIN_YEAR || y > MAX_YEAR) return;
    setViewMonth(m); setViewYear(y);
  }

  function changeYear(y){
    y = Math.min(Math.max(y, MIN_YEAR), MAX_YEAR);
    setViewYear(y);
  }

  const dim = daysInMonth(viewYear, viewMonth);
  const startWeekday = firstWeekday(viewYear, viewMonth);
  const cells = [];
  for (let i=0;i<startWeekday;i++) cells.push(null);
  for (let d=1; d<=dim; d++) cells.push(d);

  const todayStr = todayISO();
  const yearOptions = [];
  for (let y=MIN_YEAR; y<=MAX_YEAR; y++) yearOptions.push(y);

  const filteredParks = PARKS.filter(p => p.toLowerCase().includes(parkFilter.toLowerCase()));

  const progressPct = (set) => Math.round((set.size / PARKS.length) * 100);

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif", background:"#0f1a14", minHeight:"100vh", color:"#eef3ee"}}>
      <div style={{maxWidth:1100, margin:"0 auto", padding:"24px 16px 60px"}}>
        <header style={{marginBottom:20}}>
          <h1 style={{fontSize:26, fontWeight:700, margin:0, letterSpacing:"-0.02em"}}>🏔️ National Park Tracker</h1>
          <p style={{color:"#9db3a4", margin:"4px 0 0", fontSize:14}}>Track trips and progress across all 63 U.S. National Parks — Jan {MIN_YEAR} through Dec {MAX_YEAR}.</p>
        </header>

        {error && (
          <div style={{background:"#3a1f1f", border:"1px solid #7a3a3a", color:"#ffb4b4", padding:"8px 12px", borderRadius:8, marginBottom:16, fontSize:13}}>
            {error} <button onClick={()=>setError("")} style={{marginLeft:8, background:"none", border:"none", color:"#ffb4b4", cursor:"pointer", textDecoration:"underline"}}>dismiss</button>
          </div>
        )}

        <div style={{display:"grid", gridTemplateColumns:"1fr", gap:20}}>
          {/* Trackers */}
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:16}}>
            <TrackerCard
              title="Progress as of Today"
              subtitle={new Date().toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"})}
              set={todaySet}
              pct={progressPct(todaySet)}
              accent="#4caf6e"
            />
            <TrackerCard
              title="Progress as of Selected Date"
              subtitle={selectedDate}
              set={selectedSet}
              pct={progressPct(selectedSet)}
              accent="#5a9bd8"
            />
          </div>

          {/* Calendar */}
          <div style={{background:"#152018", border:"1px solid #24352a", borderRadius:14, padding:16}}>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, flexWrap:"wrap", gap:8}}>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <button onClick={()=>changeMonth(-1)} style={navBtn}>‹</button>
                <select value={viewMonth} onChange={e=>setViewMonth(Number(e.target.value))} style={selectStyle}>
                  {MONTH_NAMES.map((m,i)=>(<option key={m} value={i}>{m}</option>))}
                </select>
                <select value={viewYear} onChange={e=>changeYear(Number(e.target.value))} style={selectStyle}>
                  {yearOptions.map(y=>(<option key={y} value={y}>{y}</option>))}
                </select>
                <button onClick={()=>changeMonth(1)} style={navBtn}>›</button>
              </div>
              <div style={{display:"flex", gap:8}}>
                <button onClick={exportTrips} style={secondaryBtn}>Export</button>
                <label style={{...secondaryBtn, display:"inline-block", cursor:"pointer"}}>
                  Import
                  <input type="file" accept="application/json" onChange={importTrips} style={{display:"none"}} />
                </label>
                <button onClick={()=>openNewTripForm(selectedDate)} style={primaryBtn}>+ New Trip</button>
              </div>
            </div>

            <div style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, fontSize:11, color:"#9db3a4", marginBottom:4}}>
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(<div key={d} style={{textAlign:"center", padding:"2px 0"}}>{d}</div>))}
            </div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4}}>
              {cells.map((d,i) => {
                if (d===null) return <div key={i}></div>;
                const iso = toISO(viewYear, viewMonth, d);
                const dayTrips = tripsByDate[iso] || [];
                const isToday = iso === todayStr;
                const isSelected = iso === selectedDate;
                return (
                  <button
                    key={i}
                    onClick={()=>setSelectedDate(iso)}
                    onDoubleClick={()=>openNewTripForm(iso)}
                    style={{
                      position:"relative",
                      aspectRatio:"1",
                      minHeight:44,
                      borderRadius:8,
                      border: isSelected ? "2px solid #5a9bd8" : isToday ? "1px solid #4caf6e" : "1px solid #24352a",
                      background: dayTrips.length ? "#1f3a28" : "#182119",
                      color:"#eef3ee",
                      cursor:"pointer",
                      fontSize:13,
                      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                      padding:2
                    }}
                    title={dayTrips.map(t=>t.name).join(", ")}
                  >
                    <span>{d}</span>
                    {dayTrips.length > 0 && (
                      <span style={{width:5,height:5,borderRadius:"50%",background:"#4caf6e",marginTop:2}}></span>
                    )}
                  </button>
                );
              })}
            </div>
            <p style={{fontSize:11, color:"#7a8d80", marginTop:10}}>Click a date to select it (updates the "Selected Date" tracker). Double-click a date to start a new trip on that day.</p>
          </div>

          {/* Trips on selected date */}
          <div style={{background:"#152018", border:"1px solid #24352a", borderRadius:14, padding:16}}>
            <h3 style={{margin:"0 0 10px", fontSize:15}}>Trips on {selectedDate}</h3>
            {(tripsByDate[selectedDate]||[]).length === 0 && <p style={{color:"#7a8d80", fontSize:13}}>No trips on this date.</p>}
            {(tripsByDate[selectedDate]||[]).map(t => (
              <TripRow key={t.id} trip={t} onEdit={()=>openEditTripForm(t)} onDelete={()=>deleteTrip(t.id)} />
            ))}
          </div>

          {/* All trips list */}
          <div style={{background:"#152018", border:"1px solid #24352a", borderRadius:14, padding:16}}>
            <h3 style={{margin:"0 0 10px", fontSize:15}}>All Trips ({trips.length})</h3>
            {trips.length === 0 && <p style={{color:"#7a8d80", fontSize:13}}>No trips scheduled yet. Click "+ New Trip" to add one.</p>}
            <div style={{display:"flex", flexDirection:"column", gap:8}}>
              {trips.map(t => (
                <TripRow key={t.id} trip={t} onEdit={()=>openEditTripForm(t)} onDelete={()=>deleteTrip(t.id)} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16, zIndex:50}} onClick={()=>setShowForm(false)}>
          <div style={{background:"#152018", border:"1px solid #24352a", borderRadius:14, padding:20, width:"100%", maxWidth:520, maxHeight:"85vh", overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>{editingTripId ? "Edit Trip" : "New Trip"}</h3>
            <label style={labelStyle}>Trip name (optional)</label>
            <input value={formName} onChange={e=>setFormName(e.target.value)} placeholder="e.g. Colorado Loop" style={inputStyle} />

            <div style={{display:"flex", gap:10}}>
              <div style={{flex:1}}>
                <label style={labelStyle}>Start date</label>
                <input type="date" min={`${MIN_YEAR}-01-01`} max={`${MAX_YEAR}-12-31`} value={formStart} onChange={e=>setFormStart(e.target.value)} style={inputStyle} />
              </div>
              <div style={{flex:1}}>
                <label style={labelStyle}>End date</label>
                <input type="date" min={`${MIN_YEAR}-01-01`} max={`${MAX_YEAR}-12-31`} value={formEnd} onChange={e=>setFormEnd(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <label style={labelStyle}>Parks visited on this trip ({formParks.length} selected)</label>
            <input value={parkFilter} onChange={e=>setParkFilter(e.target.value)} placeholder="Filter parks..." style={{...inputStyle, marginBottom:8}} />
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, maxHeight:220, overflowY:"auto", border:"1px solid #24352a", borderRadius:8, padding:8}}>
              {filteredParks.map(p => (
                <label key={p} style={{display:"flex", alignItems:"center", gap:6, fontSize:13, cursor:"pointer", padding:"2px 4px"}}>
                  <input type="checkbox" checked={formParks.includes(p)} onChange={()=>togglePark(p)} />
                  {p}
                </label>
              ))}
            </div>

            <div style={{display:"flex", justifyContent:"space-between", marginTop:16}}>
              <div>
                {editingTripId && (
                  <button onClick={()=>{ deleteTrip(editingTripId); setShowForm(false); }} style={{...secondaryBtn, color:"#ff8a8a", borderColor:"#7a3a3a"}}>Delete Trip</button>
                )}
              </div>
              <div style={{display:"flex", gap:8}}>
                <button onClick={()=>setShowForm(false)} style={secondaryBtn}>Cancel</button>
                <button onClick={saveTrip} style={primaryBtn}>Save Trip</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrackerCard({title, subtitle, set, pct, accent}){
  return (
    <div style={{background:"#152018", border:"1px solid #24352a", borderRadius:14, padding:16}}>
      <h3 style={{margin:"0 0 2px", fontSize:15}}>{title}</h3>
      <p style={{margin:"0 0 10px", fontSize:12, color:"#7a8d80"}}>{subtitle}</p>
      <div style={{display:"flex", alignItems:"baseline", gap:8, marginBottom:8}}>
        <span style={{fontSize:28, fontWeight:700, color:accent}}>{set.size}</span>
        <span style={{color:"#9db3a4", fontSize:14}}>/ {PARKS.length} parks ({pct}%)</span>
      </div>
      <div style={{background:"#0f1a14", borderRadius:6, height:8, overflow:"hidden", marginBottom:10}}>
        <div style={{width:`${pct}%`, height:"100%", background:accent}}></div>
      </div>
      <details>
        <summary style={{cursor:"pointer", fontSize:12, color:"#9db3a4"}}>View visited parks</summary>
        <div style={{display:"flex", flexWrap:"wrap", gap:4, marginTop:8}}>
          {[...set].sort().map(p => (
            <span key={p} style={{fontSize:11, background:"#1f3a28", padding:"2px 8px", borderRadius:20, color:"#c9e6d0"}}>{p}</span>
          ))}
          {set.size===0 && <span style={{fontSize:12, color:"#7a8d80"}}>None yet</span>}
        </div>
      </details>
    </div>
  );
}

function TripRow({trip, onEdit, onDelete}){
  return (
    <div style={{border:"1px solid #24352a", borderRadius:10, padding:"8px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, flexWrap:"wrap"}}>
      <div>
        <div style={{fontSize:14, fontWeight:600}}>{trip.name}</div>
        <div style={{fontSize:12, color:"#9db3a4"}}>{trip.startDate} → {trip.endDate}</div>
        <div style={{fontSize:12, color:"#7a8d80", marginTop:2}}>{trip.parks.join(", ")}</div>
      </div>
      <div style={{display:"flex", gap:6}}>
        <button onClick={onEdit} style={secondaryBtn}>Edit</button>
        <button onClick={onDelete} style={{...secondaryBtn, color:"#ff8a8a", borderColor:"#7a3a3a"}}>Delete</button>
      </div>
    </div>
  );
}

const navBtn = {background:"#1f3a28", border:"1px solid #2c4433", color:"#eef3ee", width:32, height:32, borderRadius:8, cursor:"pointer", fontSize:16};
const selectStyle = {background:"#1f3a28", border:"1px solid #2c4433", color:"#eef3ee", borderRadius:8, padding:"6px 8px", fontSize:13};
const primaryBtn = {background:"#4caf6e", border:"none", color:"#0f1a14", fontWeight:600, padding:"8px 14px", borderRadius:8, cursor:"pointer", fontSize:13};
const secondaryBtn = {background:"transparent", border:"1px solid #2c4433", color:"#eef3ee", padding:"6px 10px", borderRadius:8, cursor:"pointer", fontSize:12};
const labelStyle = {display:"block", fontSize:12, color:"#9db3a4", margin:"10px 0 4px"};
const inputStyle = {width:"100%", background:"#0f1a14", border:"1px solid #2c4433", color:"#eef3ee", borderRadius:8, padding:"8px 10px", fontSize:13, boxSizing:"border-box"};
