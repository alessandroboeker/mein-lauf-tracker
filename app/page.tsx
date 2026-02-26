"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Plus, X, Activity, TrendingUp, Calendar, Clock, BarChart3, Target, CheckCircle2, Settings2, Timer, Edit3, Save, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const RUN_TYPES = ["Lockerer Dauerlauf", "Zügiger Dauerlauf", "Intervalle", "Tempolauf (Threshold)", "Langer Lauf (Longrun)", "Regenerationslauf", "Fahrtspiel", "Wettkampf"];

export default function RunTracker() {
  const [isMounted, setIsMounted] = useState(false);
  const [runs, setRuns] = useState<any[]>([]);
  const [plan, setPlan] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  
  const [editingRunId, setEditingRunId] = useState<number | null>(null);
  const [editingPlanDate, setEditingPlanDate] = useState<string | null>(null);
  
  const [newRun, setNewRun] = useState({ date: '', distance: '', duration: '', type: 'Lockerer Dauerlauf' });
  const [planInput, setPlanInput] = useState({ date: '', task: 'Lockerer Dauerlauf', targetKm: '', targetPace: '' });

  useEffect(() => {
    setIsMounted(true);
    const today = new Date().toISOString().split('T')[0];
    setNewRun(prev => ({ ...prev, date: today }));
    setPlanInput(prev => ({ ...prev, date: today }));

    const savedRuns = localStorage.getItem('run-flow-v16');
    const savedPlan = localStorage.getItem('run-plan-v16');
    if (savedRuns) setRuns(JSON.parse(savedRuns));
    if (savedPlan) setPlan(JSON.parse(savedPlan));
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('run-flow-v16', JSON.stringify(runs));
      localStorage.setItem('run-plan-v16', JSON.stringify(plan));
    }
  }, [runs, plan, isMounted]);

  const { todayStr, todaysGoal, kmToday, chartData, progressPercent, upcomingTasks } = useMemo(() => {
    if (!isMounted) return { todayStr: '', todaysGoal: null, kmToday: 0, chartData: [], progressPercent: 0, upcomingTasks: [] };
    const d = new Date().toISOString().split('T')[0];
    const goal = plan[d] || { task: "Kein Training geplant", targetKm: 0, targetPace: "-" };
    const km = runs.filter(r => r.date === d).reduce((sum, r) => sum + r.distance, 0);

    const planDates = Object.keys(plan).sort();
    const completedDays = planDates.filter(date => runs.some(r => r.date === date)).length;
    const percent = planDates.length > 0 ? Math.round((completedDays / planDates.length) * 100) : 0;

    // Die nächsten 3 geplanten Läufe (nach heute)
    const futureTasks = planDates
      .filter(date => date > d)
      .slice(0, 3)
      .map(date => ({ date, ...plan[date] }));

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const s = date.toISOString().split('T')[0];
      return {
        date: date.toLocaleDateString('de-DE', { weekday: 'short' }),
        km: runs.filter(r => r.date === s).reduce((sum, r) => sum + r.distance, 0)
      };
    }).reverse();

    return { todayStr: d, todaysGoal: goal, kmToday: km, chartData: last7Days, progressPercent: percent, upcomingTasks: futureTasks };
  }, [runs, plan, isMounted]);

  const handleSaveRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRunId !== null) {
      setRuns(runs.map(r => r.id === editingRunId ? { ...r, ...newRun, distance: parseFloat(newRun.distance), duration: parseInt(newRun.duration) } : r));
      setEditingRunId(null);
    } else {
      setRuns([{ id: Date.now(), ...newRun, distance: parseFloat(newRun.distance), duration: parseInt(newRun.duration) }, ...runs]);
    }
    setShowForm(false);
    setNewRun({ ...newRun, distance: '', duration: '' });
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    setPlan({ ...plan, [planInput.date]: { task: planInput.task, targetKm: parseFloat(planInput.targetKm) || 0, targetPace: planInput.targetPace } });
    setEditingPlanDate(null);
    setPlanInput({ ...planInput, task: 'Lockerer Dauerlauf', targetKm: '', targetPace: '' });
  };

  const startEditPlan = (date: string) => {
    const item = plan[date];
    setPlanInput({ date, task: item.task, targetKm: item.targetKm.toString(), targetPace: item.targetPace || '' });
    setEditingPlanDate(date);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isMounted) return null;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto bg-slate-50 min-h-screen text-slate-900 font-sans">
      <header className="flex justify-between items-center mb-10 px-2">
        <h1 className="text-2xl font-black italic flex items-center gap-2 tracking-tighter text-slate-800 uppercase leading-none">
            <Activity className="text-blue-600" strokeWidth={3}/> Race.Flow
        </h1>
        <div className="flex gap-2 text-sm">
          <button onClick={() => { setIsEditingPlan(!isEditingPlan); setShowForm(false); }} className={`px-4 py-2 rounded-2xl font-bold flex items-center gap-2 transition-all ${isEditingPlan ? 'bg-slate-900 text-white shadow-xl' : 'bg-white border border-slate-200 text-slate-600'}`}>
            <Settings2 size={16}/> {isEditingPlan ? 'Dashboard' : 'Planer'}
          </button>
          {!isEditingPlan && (
            <button onClick={() => { setEditingRunId(null); setShowForm(!showForm); }} className="bg-blue-600 text-white px-5 py-2 rounded-2xl font-bold shadow-lg shadow-blue-100 active:scale-95 transition-all">
              {showForm ? <X size={18} /> : <Plus size={18} />}
            </button>
          )}
        </div>
      </header>

      {isEditingPlan ? (
        /* --- PLANER MODUS --- */
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className={`bg-white p-8 rounded-[2.5rem] shadow-sm border-2 transition-all ${editingPlanDate ? 'border-blue-500' : 'border-slate-100'}`}>
            <h2 className="text-xl font-black mb-6 italic flex items-center gap-2">
                {editingPlanDate ? <Edit3 className="text-blue-600" size={20}/> : <Calendar className="text-blue-600" size={20}/>}
                {editingPlanDate ? 'Plan anpassen' : 'Training planen'}
            </h2>
            <form onSubmit={handleSavePlan} className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <input type="date" className="p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-100" value={planInput.date} onChange={e => setPlanInput({...planInput, date: e.target.value})} required disabled={!!editingPlanDate} />
              <select className="p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-100 font-bold" value={planInput.task} onChange={e => setPlanInput({...planInput, task: e.target.value})}>
                {RUN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="number" step="0.1" placeholder="Ziel-km" className="p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-100" value={planInput.targetKm} onChange={e => setPlanInput({...planInput, targetKm: e.target.value})} />
              <input type="text" placeholder="Pace" className="p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-100 font-mono" value={planInput.targetPace} onChange={e => setPlanInput({...planInput, targetPace: e.target.value})} />
              <button type="submit" className="bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px]">Sichern</button>
            </form>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <tr><th className="p-6 text-center">Status</th><th className="p-6">Datum</th><th className="p-6">Einheit</th><th className="p-6 text-right">Ziel</th><th className="p-6"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {Object.keys(plan).sort().map(date => {
                    const isDone = runs.some(r => r.date === date);
                    return (
                      <tr key={date} className={`group ${date < todayStr && !isDone ? 'opacity-40' : ''}`}>
                        <td className="p-6 text-center">
                            {isDone ? <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-full inline-block shadow-sm"><CheckCircle2 size={16}/></div> : <div className="w-5 h-5 rounded-full border-2 border-slate-100 mx-auto"/>}
                        </td>
                        <td className="p-6 font-bold">{new Date(date).toLocaleDateString('de-DE', {day: '2-digit', month: 'short'})}</td>
                        <td className="p-6 font-medium">{plan[date].task} <span className="text-[10px] font-mono text-blue-500 ml-2">{plan[date].targetPace}</span></td>
                        <td className="p-6 text-right font-black">{plan[date].targetKm} km</td>
                        <td className="p-6 text-right flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditPlan(date)} className="text-slate-300 hover:text-blue-500"><Edit3 size={16}/></button>
                          <button onClick={() => { if(confirm("Löschen?")) { const p = {...plan}; delete p[date]; setPlan(p); } }} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
          </div>
        </div>
      ) : (
        /* --- DASHBOARD --- */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-slate-800">
                <div className="flex justify-between items-center mb-6">
                  <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em]">Progress: {progressPercent}%</p>
                  <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
                <h2 className="text-4xl font-black mb-10 italic leading-tight">{todaysGoal?.task || "Laufen"}</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/5 border border-white/10 p-5 rounded-3xl text-center">
                    <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Ziel</p>
                    <p className="text-2xl font-black">{todaysGoal?.targetKm || 0} km</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-5 rounded-3xl text-center font-mono text-blue-400">
                    <p className="text-slate-500 text-[10px] font-bold uppercase mb-1 font-sans">Pace</p>
                    <p className="text-2xl font-black">{todaysGoal?.targetPace || '-'}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-5 rounded-3xl text-center text-emerald-400">
                    <p className="text-slate-500 text-[10px] font-bold uppercase mb-1 font-sans text-slate-500">Ist</p>
                    <p className="text-2xl font-black">{kmToday.toFixed(1)} km</p>
                  </div>
                </div>
            </div>

            {/* ANSTEHENDE LÄUFE */}
            <div className="space-y-4">
                <h3 className="px-2 font-black italic text-slate-400 uppercase text-[10px] tracking-widest flex items-center gap-2">
                    <Calendar size={14}/> Nächste Einheiten
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {upcomingTasks.length > 0 ? upcomingTasks.map((t: any) => (
                        <div key={t.date} className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                            <p className="text-[10px] font-black text-blue-600 uppercase mb-1">{new Date(t.date).toLocaleDateString('de-DE', {weekday: 'short', day: '2-digit', month: 'short'})}</p>
                            <p className="font-bold text-slate-800 text-sm mb-2 line-clamp-1">{t.task}</p>
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-mono text-slate-400">{t.targetPace || '-'}</span>
                                <span className="text-lg font-black italic">{t.targetKm} km</span>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-3 bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-[2rem] p-6 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            Kein Plan für die nächsten Tage
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 h-64 shadow-sm">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#cbd5e1', fontSize: 11, fontWeight: 800}} /><Tooltip cursor={{fill: '#f8fafc'}} /><Bar dataKey="km" fill="#2563eb" radius={[6,6,6,6]} barSize={40} /></BarChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                <div className="p-8 border-b border-slate-50 font-black italic text-slate-800 uppercase tracking-tighter">Historie</div>
                <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-50">
                    {runs.map(run => (
                        <div key={run.id} className="p-6 flex items-center justify-between hover:bg-slate-50 group">
                            <div className="flex items-center gap-4">
                                <div className="text-center bg-slate-50 border border-slate-100 p-2 rounded-xl min-w-[55px]">
                                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none">{new Date(run.date).toLocaleDateString('de-DE', {month: 'short'})}</p>
                                    <p className="text-xl font-black leading-none text-slate-800">{new Date(run.date).getDate()}</p>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 leading-tight">{run.type}</p>
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">{(run.duration/run.distance).toFixed(2)} min/km • {run.duration} min</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 font-black italic text-2xl">
                                {run.distance.toFixed(1)} <span className="text-xs font-normal text-slate-400 ml-1">km</span>
                                <div className="flex opacity-0 group-hover:opacity-100 transition-all gap-1 ml-4">
                                    <button onClick={() => { setEditingRunId(run.id); setNewRun({date: run.date, distance: run.distance.toString(), duration: run.duration.toString(), type: run.type}); setShowForm(true); window.scrollTo({top:0, behavior:'smooth'}); }} className="text-slate-200 hover:text-blue-500"><Edit3 size={16}/></button>
                                    <button onClick={() => { if(confirm("Löschen?")) setRuns(runs.filter(r => r.id !== run.id)); }} className="text-slate-200 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>

          <div className="space-y-6">
            {showForm && (
              <div className="p-8 bg-white rounded-[2.5rem] shadow-2xl border-2 border-blue-600 animate-in zoom-in-95">
                <h3 className="font-black mb-6 text-slate-800 uppercase italic flex items-center gap-2">
                  {editingRunId ? 'Edit Log' : 'Lauf loggen'}
                </h3>
                <form onSubmit={handleSaveRun} className="space-y-4">
                  <select className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-100 font-bold" value={newRun.type} onChange={e => setNewRun({...newRun, type: e.target.value})}>
                    {RUN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-100" value={newRun.date} onChange={e => setNewRun({...newRun, date: e.target.value})} />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" step="0.1" placeholder="km" className="w-full p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-100 font-bold text-center" value={newRun.distance} onChange={e => setNewRun({...newRun, distance: e.target.value})} required />
                    <input type="number" placeholder="min" className="w-full p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-100 font-bold text-center" value={newRun.duration} onChange={e => setNewRun({...newRun, duration: e.target.value})} required />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-100">Speichern</button>
                </form>
              </div>
            )}
            <div className="bg-blue-600 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden group">
                <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 group-hover:scale-110 transition-transform" />
                <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1">Totaldistanz</p>
                <p className="text-5xl font-black italic">{runs.reduce((acc, r) => acc + r.distance, 0).toFixed(1)} <span className="text-xl font-normal opacity-50">km</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}