"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Trash2, Plus, X, Activity, TrendingUp, Calendar, 
  Clock, BarChart3, Target, CheckCircle2, Settings2, 
  Timer, Edit3, Trophy, ChevronRight 
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const RUN_TYPES = [
  "Lockerer Dauerlauf", "Zügiger Dauerlauf", "Intervalle", 
  "Tempolauf (Threshold)", "Langer Lauf (Longrun)", 
  "Regenerationslauf", "Fahrtspiel", "Wettkampf"
];

export default function RunTracker() {
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Daten-States
  const [runs, setRuns] = useState<any[]>([]);
  const [plan, setPlan] = useState<any>({});
  const [races, setRaces] = useState<any[]>([]);
  
  // UI-States
  const [showRunForm, setShowRunForm] = useState(false);
  const [showRaceForm, setShowRaceForm] = useState(false);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editingRunId, setEditingRunId] = useState<number | null>(null);

  // Input-States
  const [newRun, setNewRun] = useState({ date: '', distance: '', duration: '', type: 'Lockerer Dauerlauf' });
  const [planInput, setPlanInput] = useState({ date: '', task: 'Lockerer Dauerlauf', targetKm: '', targetPace: '' });
  const [raceInput, setRaceInput] = useState({ name: '', date: '', target_time: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rData } = await supabase.from('runs').select('*').order('date', { ascending: false });
      const { data: pData } = await supabase.from('training_plan').select('*');
      const { data: raData } = await supabase.from('races').select('*').order('date', { ascending: true });
      
      if (rData) setRuns(rData);
      if (raData) setRaces(raData);
      if (pData) {
        const planObj = pData.reduce((acc: any, item: any) => {
          acc[item.date] = item;
          return acc;
        }, {});
        setPlan(planObj);
      }
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    const today = new Date().toISOString().split('T')[0];
    setNewRun(prev => ({ ...prev, date: today }));
    setPlanInput(prev => ({ ...prev, date: today }));
    fetchData();
  }, []);

  // Logik für Wettkämpfe und Stats
  const { activeRace, countdown, progressPercent, chartData, todaysGoal, kmToday } = useMemo(() => {
    if (!isMounted) return { activeRace: null, countdown: 0, progressPercent: 0, chartData: [], todaysGoal: null, kmToday: 0 };
    
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Aktiven Wettkampf finden (der nächste in der Zukunft)
    const futureRaces = races.filter(r => r.date >= today);
    const race = futureRaces.length > 0 ? futureRaces[0] : null;
    
    // 2. Countdown berechnen
    let days = 0;
    if (race) {
      const diff = new Date(race.date).getTime() - new Date().getTime();
      days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    // 3. Tages-Statistik
    const goal = plan[today] || { task: "Kein Training geplant", target_km: 0, target_pace: "-" };
    const km = runs.filter(r => r.date === today).reduce((sum, r) => sum + r.distance, 0);

    // 4. Gesamtfortschritt (Anteil erledigter Tage im Plan)
    const planDates = Object.keys(plan);
    const completed = planDates.filter(d => runs.some(r => r.date === d)).length;
    const percent = planDates.length > 0 ? Math.round((completed / planDates.length) * 100) : 0;

    // 5. Chart-Daten
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const s = date.toISOString().split('T')[0];
      return {
        name: date.toLocaleDateString('de-DE', { weekday: 'short' }),
        km: runs.filter(r => r.date === s).reduce((sum, r) => sum + r.distance, 0)
      };
    }).reverse();

    return { activeRace: race, countdown: days, progressPercent: percent, chartData: last7Days, todaysGoal: goal, kmToday: km };
  }, [runs, plan, races, isMounted]);

  // Handler
  const handleSaveRun = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { date: newRun.date, distance: parseFloat(newRun.distance), duration: parseInt(newRun.duration), type: newRun.type };
    if (editingRunId) await supabase.from('runs').update(payload).eq('id', editingRunId);
    else await supabase.from('runs').insert([payload]);
    setShowRunForm(false);
    setEditingRunId(null);
    fetchData();
  };

  const handleSaveRace = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('races').insert([raceInput]);
    setShowRaceForm(false);
    setRaceInput({ name: '', date: '', target_time: '' });
    fetchData();
  };

  if (!isMounted || loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <Activity className="text-blue-600 animate-bounce mx-auto mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Race.Flow Sync...</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto bg-slate-50 min-h-screen text-slate-900 font-sans relative">
      
      {/* HEADER */}
      <header className="flex justify-between items-center mb-10 px-2">
        <h1 className="text-2xl font-black italic flex items-center gap-2 tracking-tighter text-slate-800 uppercase leading-none">
            <Activity className="text-blue-600" strokeWidth={3}/> Race.Flow
        </h1>
        <div className="flex gap-2 text-sm">
          <button onClick={() => setShowRaceForm(true)} className="bg-white border border-slate-200 px-4 py-2 rounded-2xl font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
            <Trophy size={16} className="text-yellow-500" /> <span className="hidden sm:inline">Event</span>
          </button>
          <button onClick={() => setIsEditingPlan(!isEditingPlan)} className={`px-4 py-2 rounded-2xl font-bold flex items-center gap-2 transition-all ${isEditingPlan ? 'bg-slate-900 text-white shadow-xl' : 'bg-white border border-slate-200 text-slate-600'}`}>
            <Settings2 size={16}/> {isEditingPlan ? 'Dashboard' : 'Planer'}
          </button>
          <button onClick={() => { setEditingRunId(null); setShowRunForm(true); }} className="bg-blue-600 text-white px-5 py-2 rounded-2xl font-bold shadow-lg shadow-blue-100 active:scale-95 transition-all">
            <Plus size={18} />
          </button>
        </div>
      </header>

      {/* MODAL: RUN LOGGEN */}
      {showRunForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowRunForm(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X size={24} /></button>
            <h3 className="font-black mb-6 text-slate-800 uppercase italic flex items-center gap-2 text-xl">
              {editingRunId ? <Edit3 className="text-blue-600" /> : <Plus className="text-blue-600" />} {editingRunId ? 'Edit Log' : 'Lauf loggen'}
            </h3>
            <form onSubmit={handleSaveRun} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Lauftyp</label>
                <select className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-100 font-bold" value={newRun.type} onChange={e => setNewRun({...newRun, type: e.target.value})}>
                  {RUN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-100 font-bold" value={newRun.date} onChange={e => setNewRun({...newRun, date: e.target.value})} required />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.1" placeholder="km" className="w-full p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-100 font-bold text-center" value={newRun.distance} onChange={e => setNewRun({...newRun, distance: e.target.value})} required />
                <input type="number" placeholder="min" className="w-full p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-100 font-bold text-center" value={newRun.duration} onChange={e => setNewRun({...newRun, duration: e.target.value})} required />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-100 mt-4 active:scale-95">Sichern</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: WETTKAMPF PLANEN */}
      {showRaceForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowRaceForm(false)} className="absolute top-6 right-6 text-slate-400"><X size={24} /></button>
            <h3 className="font-black mb-6 text-xl italic uppercase flex items-center gap-2"><Trophy className="text-yellow-500"/> Main Event</h3>
            <form onSubmit={handleSaveRace} className="space-y-4">
              <input type="text" placeholder="Wettkampf Name" className="w-full p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-100 font-bold" value={raceInput.name} onChange={e => setRaceInput({...raceInput, name: e.target.value})} required />
              <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-100 font-bold" value={raceInput.date} onChange={e => setRaceInput({...raceInput, date: e.target.value})} required />
              <input type="text" placeholder="Zielzeit (z.B. 03:59:00)" className="w-full p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-100 font-mono" value={raceInput.target_time} onChange={e => setRaceInput({...raceInput, target_time: e.target.value})} />
              <button type="submit" className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg">Event in Cloud sichern</button>
            </form>
          </div>
        </div>
      )}

      {!isEditingPlan ? (
        /* --- DASHBOARD VIEW --- */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            
            {/* RACE CARD */}
            {activeRace ? (
              <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-slate-800 animate-in slide-in-from-bottom-4 duration-500">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Coming Up</p>
                      <h2 className="text-4xl font-black italic uppercase leading-none">{activeRace.name}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-5xl font-black italic text-blue-500 leading-none">{countdown}</p>
                      <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Days Left</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-3xl">
                      <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Soll Heute</p>
                      <p className="text-xl font-black">{todaysGoal?.target_km || 0} km</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-3xl text-blue-400">
                      <p className="text-slate-500 text-[10px] font-bold uppercase mb-1 font-sans">Soll Pace</p>
                      <p className="text-xl font-black font-mono">{todaysGoal?.target_pace || '-'}</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-3xl text-emerald-400">
                      <p className="text-slate-500 text-[10px] font-bold uppercase mb-1 font-sans text-slate-500">Ist Heute</p>
                      <p className="text-xl font-black">{kmToday.toFixed(1)} km</p>
                    </div>
                  </div>
                </div>
                <Trophy className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 rotate-12" />
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-slate-200 p-12 rounded-[3rem] text-center">
                <Trophy className="mx-auto text-slate-200 mb-4" size={48} />
                <p className="text-slate-400 font-bold uppercase text-xs mb-4">No Race Planned yet</p>
                <button onClick={() => setShowRaceForm(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest">Plan First Race</button>
              </div>
            )}

            {/* DIAGRAMM */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 h-64 shadow-sm">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#cbd5e1', fontSize: 11, fontWeight: 800}} /><Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.05)'}} /><Bar dataKey="km" fill="#2563eb" radius={[6,6,6,6]} barSize={40} /></BarChart>
                </ResponsiveContainer>
            </div>

            {/* HISTORIE */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                <div className="p-8 border-b border-slate-50 font-black italic text-slate-800 uppercase tracking-tighter flex justify-between items-center">
                    Historie <TrendingUp size={16} className="text-blue-600" />
                </div>
                <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-50">
                    {runs.map(run => (
                        <div key={run.id} className="p-6 flex items-center justify-between hover:bg-slate-50 group transition-all">
                            <div className="flex items-center gap-4">
                                <div className="text-center bg-slate-50 border border-slate-100 p-2 rounded-xl min-w-[55px]">
                                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none">{new Date(run.date).toLocaleDateString('de-DE', {month: 'short'})}</p>
                                    <p className="text-xl font-black text-slate-800">{new Date(run.date).getDate()}</p>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 leading-tight">{run.type}</p>
                                    <p className="text-[10px] font-black text-blue-600 uppercase mt-1">{(run.duration/run.distance).toFixed(2)} min/km • {run.duration} min</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 font-black italic text-2xl text-slate-800">
                                {run.distance.toFixed(1)} <span className="text-xs font-normal text-slate-400 ml-1">km</span>
                                <div className="flex opacity-0 group-hover:opacity-100 transition-all gap-1 ml-4">
                                    <button onClick={() => { setEditingRunId(run.id); setNewRun({date: run.date, distance: run.distance.toString(), duration: run.duration.toString(), type: run.type}); setShowRunForm(true); }} className="text-slate-200 hover:text-blue-500"><Edit3 size={16}/></button>
                                    <button onClick={async () => { if(confirm("Löschen?")) { await supabase.from('runs').delete().eq('id', run.id); fetchData(); } }} className="text-slate-200 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-6">
             <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                <h3 className="font-black italic uppercase text-[10px] mb-6 text-slate-400 tracking-widest">Race Timeline</h3>
                <div className="space-y-4">
                  {races.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100 group">
                      <div>
                        <p className="font-black text-sm uppercase leading-tight italic">{r.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(r.date).toLocaleDateString('de-DE', {day: '2-digit', month: 'short', year: 'numeric'})}</p>
                      </div>
                      <button onClick={async () => { if(confirm("Wettkampf wirklich löschen?")) { await supabase.from('races').delete().eq('id', r.id); fetchData(); }}} className="text-slate-200 group-hover:text-red-400 transition-colors"><X size={16}/></button>
                    </div>
                  ))}
                </div>
             </div>
             <div className="bg-blue-600 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden group">
                <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 group-hover:scale-110 transition-transform" />
                <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1">Total Distance</p>
                <p className="text-5xl font-black italic">{runs.reduce((acc, r) => acc + r.distance, 0).toFixed(1)} <span className="text-lg font-normal opacity-50">km</span></p>
            </div>
          </div>
        </div>
      ) : (
        /* --- PLANER MODUS --- */
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h2 className="text-xl font-black mb-6 italic text-slate-800">Training Vorausplanen</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              await supabase.from('training_plan').upsert([{ date: planInput.date, task: planInput.task, target_km: parseFloat(planInput.targetKm) || 0, target_pace: planInput.targetPace }]);
              setPlanInput({ ...planInput, task: 'Lockerer Dauerlauf', targetKm: '', targetPace: '' });
              fetchData();
            }} className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <input type="date" className="p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-100" value={planInput.date} onChange={e => setPlanInput({...planInput, date: e.target.value})} required />
              <select className="p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-100 font-bold" value={planInput.task} onChange={e => setPlanInput({...planInput, task: e.target.value})}>
                {RUN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="number" step="0.1" placeholder="Ziel-km" className="p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-100" value={planInput.targetKm} onChange={e => setPlanInput({...planInput, targetKm: e.target.value})} />
              <input type="text" placeholder="Ziel-Pace" className="p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-100 font-mono" value={planInput.targetPace} onChange={e => setPlanInput({...planInput, targetPace: e.target.value})} />
              <button type="submit" className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl">Sichern</button>
            </form>
          </div>
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <tr><th className="p-6 text-center">Status</th><th className="p-6">Datum</th><th className="p-6">Einheit</th><th className="p-6 text-right">Ziel</th><th className="p-6"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {Object.keys(plan).sort().reverse().map(date => {
                    const isDone = runs.some(r => r.date === date);
                    return (
                      <tr key={date} className={`group ${date < new Date().toISOString().split('T')[0] && !isDone ? 'opacity-30' : ''}`}>
                        <td className="p-6 text-center">{isDone ? <CheckCircle2 className="text-emerald-500 mx-auto" size={18}/> : <div className="w-5 h-5 rounded-full border-2 border-slate-100 mx-auto"/>}</td>
                        <td className="p-6 font-bold">{new Date(date).toLocaleDateString('de-DE', {day: '2-digit', month: 'short'})}</td>
                        <td className="p-6 font-medium text-slate-700">{plan[date].task} <span className="text-[10px] font-mono text-blue-500 ml-2 font-black">{plan[date].target_pace}</span></td>
                        <td className="p-6 text-right font-black italic">{plan[date].target_km} km</td>
                        <td className="p-6 text-right">
                          <button onClick={async () => { if(confirm("Eintrag löschen?")) { await supabase.from('training_plan').delete().eq('date', date); fetchData(); } }} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
          </div>
        </div>
      )}
    </div>
  );
}