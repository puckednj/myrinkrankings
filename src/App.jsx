import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './supabaseClient';
import {
  Trophy, Search, Snowflake, ShoppingBag, Coffee, Wifi, Car,
  Dumbbell, AlertTriangle, CheckCircle2, Plus, X, Flame,
  ShieldCheck, Tv, Droplets, Footprints, Eye, Accessibility,
  ExternalLink, Sparkles, Mail, MapPin, RefreshCw
} from 'lucide-react';

// ============================================================================
// AFFILIATE CONFIGURATION (Swap in your tracking IDs once approved)
// ============================================================================
const AFFILIATE_LINKS = {
  heatedJacket: 'https://www.amazon.com/s?k=mens+womens+heated+jacket+battery+pack',
  handWarmers: 'https://www.amazon.com/s?k=rechargeable+hand+warmers+2+pack',
  pureHockeyTapeLaces: 'https://www.purehockey.com/c/hockey-tape-laces-accessories',
  hockeyMonkeySharpening: 'https://www.hockeymonkey.com/accessories/skate-accessories/skate-sharpeners.html',
  skateGuards: 'https://www.purehockey.com/c/skate-guards-soakers',
  powerBank: 'https://www.amazon.com/s?k=portable+charger+power+bank+fast+charging',
};

const PULSE_OPTIONS = [
  { label: 'Restroom / 1 Urinal Issue', category: 'Restrooms', impact: -5 },
  { label: 'Sheet Freezing / Icebox Today', category: 'Temperature', impact: -4 },
  { label: 'LiveBarn / Stream Down', category: 'Streaming', impact: -3 },
  { label: 'Parking Lot Gridlock', category: 'Parking', impact: -3 },
  { label: 'All Good / Smooth Operations', category: 'Status', impact: 1 },
];

export default function App() {
  const [rinks, setRinks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [quickFilter, setQuickFilter] = useState('ALL');

  // Modals
  const [selectedRink, setSelectedRink] = useState(null);
  const [showAddRink, setShowAddRink] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);

  // Add Rink Form State
  const [newRink, setNewRink] = useState({ name: '', city: '', state: 'NJ', sheets: 1, notes: '' });
  const [submittingRink, setSubmittingRink] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: rinksData, error: rinksError } = await supabase
        .from('rinks')
        .select('*')
        .order('live_score', { ascending: false });

      if (rinksError) throw rinksError;

      const { data: alertsData, error: alertsError } = await supabase
        .from('rink_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(30);

      if (alertsError) throw alertsError;

      setRinks(rinksData || []);
      setAlerts(alertsData || []);

      if (selectedRink && rinksData) {
        const refreshed = rinksData.find((r) => r.id === selectedRink.id);
        if (refreshed) setSelectedRink(refreshed);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Could not load rinks from Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRinks = useMemo(() => {
    return rinks
      .filter((r) => {
        if (stateFilter !== 'ALL' && r.state !== stateFilter) return false;
        if (quickFilter === 'HOME' && !r.is_home_rink) return false;
        if (quickFilter === 'SHOP' && r.pro_shop_status.toLowerCase().includes('no pro shop')) return false;
        if (quickFilter === 'COLD' && r.cold_penalty === 0) return false;
        if (quickFilter === 'BAR' && !r.has_bar_restaurant) return false;
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          return (
            r.name.toLowerCase().includes(q) ||
            r.city.toLowerCase().includes(q) ||
            r.state.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => b.live_score - a.live_score);
  }, [rinks, stateFilter, quickFilter, searchQuery]);

  const handlePulseReport = async (rink, option) => {
    try {
      const { error: alertErr } = await supabase.from('rink_alerts').insert([
        {
          rink_id: rink.id,
          category: option.category,
          message: option.label,
          score_impact: option.impact,
          status: 'active',
        },
      ]);
      if (alertErr) throw alertErr;

      const updatedScore = Math.max(0, Math.min(100, rink.live_score + option.impact));
      const { error: updateErr } = await supabase
        .from('rinks')
        .update({ live_score: updatedScore, updated_at: new Date().toISOString() })
        .eq('id', rink.id);

      if (updateErr) throw updateErr;

      showToast(`Pulse logged (${option.impact > 0 ? '+' : ''}${option.impact} pts) for ${rink.name}`);
      fetchData();
    } catch (err) {
      showToast('Error saving pulse update: ' + err.message);
    }
  };

  const handleVerifyRink = async (rink) => {
    try {
      const { error } = await supabase
        .from('rinks')
        .update({
          verification_status: 'Verified by Hockey Parents',
          updated_at: new Date().toISOString(),
        })
        .eq('id', rink.id);
      if (error) throw error;
      showToast(`${rink.name} marked Parent Verified!`);
      fetchData();
    } catch (err) {
      showToast('Error verifying rink: ' + err.message);
    }
  };

  const handleAddRinkSubmit = async (e) => {
    e.preventDefault();
    if (!newRink.name.trim() || !newRink.city.trim()) return;
    setSubmittingRink(true);
    try {
      const { error } = await supabase.from('pending_rinks').insert([
        {
          name: newRink.name.trim(),
          city: newRink.city.trim(),
          state: newRink.state,
          sheets: Number(newRink.sheets) || 1,
          submitted_notes: newRink.notes.trim(),
        },
      ]);
      if (error) throw error;
      setNewRink({ name: '', city: '', state: 'NJ', sheets: 1, notes: '' });
      setShowAddRink(false);
      showToast('Rink submitted! Thanks for helping Tri-State hockey families.');
    } catch (err) {
      showToast('Could not submit rink: ' + err.message);
    } finally {
      setSubmittingRink(false);
    }
  };

  const getScoreBadgeColor = (score) => {
    if (score >= 85) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (score >= 70) return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    if (score >= 60) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  };

  const getContextualGear = (rink) => {
    const items = [];
    if (rink.cold_penalty < 0) {
      items.push({
        badge: 'ICEBOX ALERT',
        title: 'Heated Vests & Rechargeable Hand Warmers',
        reason: `${rink.name} runs cold (${rink.inside_temp_rating}). Layer up before puck drop.`,
        cta: 'Check Heated Gear on Amazon',
        url: AFFILIATE_LINKS.heatedJacket,
        partner: 'Amazon',
      });
    }
    if (
      rink.pro_shop_status.toLowerCase().includes('no pro shop') ||
      rink.pro_shop_status.toLowerCase().includes('no sharpening')
    ) {
      items.push({
        badge: 'NO ON-SITE PRO SHOP',
        title: 'Pack Spare Tape, Waxed Laces & Edge Care',
        reason: 'No full pro shop or skate sharpening inside this rink. Stock your bag ahead of time.',
        cta: 'Stock Up at Pure Hockey',
        url: AFFILIATE_LINKS.pureHockeyTapeLaces,
        partner: 'Pure Hockey',
      });
    }
    if (
      rink.skate_friendly_floors.toLowerCase().includes('partial') ||
      rink.skate_friendly_floors.toLowerCase().includes('concrete')
    ) {
      items.push({
        badge: 'PROTECT YOUR BLADES',
        title: 'Heavy-Duty Skate Guards',
        reason: 'Partial rubber flooring/concrete areas reported—protect edges walking to the lobby.',
        cta: 'View Skate Guards',
        url: AFFILIATE_LINKS.skateGuards,
        partner: 'Pure Hockey',
      });
    }
    if (items.length === 0) {
      items.push({
        badge: 'TOURNAMENT ESSENTIALS',
        title: 'Portable Power Bank & Rink Bag Restock',
        reason: 'Keep phones charged for LiveBarn & tournament schedules all weekend.',
        cta: 'View Portable Chargers',
        url: AFFILIATE_LINKS.powerBank,
        partner: 'Amazon',
      });
    }
    return items;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-full shadow-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-sky-500/20">
              MR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg tracking-tight text-white">
                  MyRinkRankings
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Tri-State Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real-time 100-pt rink intel by hockey parents
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddRink(true)}
            className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs px-3 py-2 rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rink</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-5 space-y-5">
        {/* Live Rink Pulse Ticker */}
        {alerts.length > 0 && (
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3 overflow-x-auto">
            <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
              <Flame className="w-3.5 h-3.5" /> Live Pulse
            </span>
            <div className="flex items-center gap-4 text-xs text-slate-300 whitespace-nowrap">
              {alerts.slice(0, 5).map((al) => {
                const target = rinks.find((r) => r.id === al.rink_id);
                return (
                  <span key={al.id} className="inline-flex items-center gap-1.5">
                    <strong className="text-white">{target ? target.name : 'Rink'}:</strong>
                    <span>{al.message}</span>
                    <span
                      className={
                        al.score_impact < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'
                      }
                    >
                      ({al.score_impact > 0 ? '+' : ''}
                      {al.score_impact})
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Search & State Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search rink name, town, or state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* State Tabs */}
            <div className="flex items-center gap-1.5">
              {['ALL', 'NJ', 'NY', 'PA', 'CT'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStateFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    stateFilter === st
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Feature Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'ALL', label: 'All Rinks' },
                { id: 'HOME', label: '🏠 Home Rinks' },
                { id: 'SHOP', label: '🏒 Pro Shop' },
                { id: 'BAR', label: '🍔 Bar/Cafe' },
                { id: 'COLD', label: '🥶 Cold Alert' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setQuickFilter(chip.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    quickFilter === chip.id
                      ? 'bg-slate-700 text-white border border-slate-600'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Leaderboard List */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
            <p className="text-sm">Loading live Tri-State rink rankings...</p>
          </div>
        ) : errorMsg ? (
          <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 text-sm text-rose-200">
            <strong>Connection check:</strong> {errorMsg}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRinks.map((rink, idx) => {
              const delta = rink.live_score - rink.baseline_score;
              return (
                <div
                  key={rink.id}
                  onClick={() => setSelectedRink(rink)}
                  className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-4 cursor-pointer transition shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-sm text-slate-300 shrink-0 mt-0.5">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-bold text-base text-white">{rink.name}</h2>
                          {rink.is_home_rink && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                              🏠 Home Rink
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {rink.city}, {rink.state} • {rink.sheets}{' '}
                            {rink.sheets === 1 ? 'Sheet' : 'Sheets'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Score Pill */}
                    <div className="text-right shrink-0">
                      <div
                        className={`inline-flex items-baseline gap-1 px-3 py-1 rounded-xl border font-black text-xl ${getScoreBadgeColor(
                          rink.live_score
                        )}`}
                      >
                        <span>{rink.live_score}</span>
                        <span className="text-[11px] font-semibold opacity-75">/100</span>
                      </div>
                      {delta !== 0 && (
                        <div
                          className={`text-[11px] font-bold mt-1 ${
                            delta < 0 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : delta} live pulse
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Scannable Tags */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200">
                      {rink.inside_temp_rating}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                      🏒 {rink.pro_shop_status.split('(')[0].trim()}
                    </span>
                    {rink.has_hockey_vending && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        24/7 Gear Vending
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                      📺 {rink.streaming_provider}
                    </span>
                    {rink.corner_padded_mats && (
                      <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300">
                        Corner Mats
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500 space-y-2">
        <p className="text-slate-400 font-semibold">
          MyRinkRankings — Built by Travel Hockey Parents
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="mailto:myrinkrankings@gmail.com?subject=Rink%20Owner%20or%20Partner%20Inquiry"
            className="text-sky-400 hover:underline inline-flex items-center gap-1"
          >
            <Mail className="w-3.5 h-3.5" /> Rink Owner / Partner Contact
          </a>
          <button
            onClick={() => setShowLegalModal(true)}
            className="text-slate-400 hover:text-white underline"
          >
            Affiliate Disclosure, Terms & Privacy
          </button>
        </div>
      </footer>

      {/* ===================================================================== */}
      {/* RINK DETAIL & LIVE PULSE MODAL                                        */}
      {/* ===================================================================== */}
      {selectedRink && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {selectedRink.verification_status}
                  </span>
                  {selectedRink.is_home_rink && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                      🏠 Home Rink
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-white mt-1.5">{selectedRink.name}</h2>
                <p className="text-xs text-slate-400">
                  {selectedRink.city}, {selectedRink.state} • {selectedRink.sheets} Ice{' '}
                  {selectedRink.sheets === 1 ? 'Sheet' : 'Sheets'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`px-3.5 py-1.5 rounded-2xl border font-black text-2xl ${getScoreBadgeColor(
                    selectedRink.live_score
                  )}`}
                >
                  {selectedRink.live_score}
                  <span className="text-xs font-semibold opacity-75">/100</span>
                </div>
                <button
                  onClick={() => setSelectedRink(null)}
                  className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 1-Tap Live Rink Pulse */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Flame className="w-4 h-4" /> At This Rink Right Now? Tap a Live Update
                </h3>
                <span className="text-[11px] text-slate-500">Updates score live</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PULSE_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => handlePulseReport(selectedRink, opt)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition flex items-center gap-1.5"
                  >
                    <span>{opt.label}</span>
                    <span
                      className={
                        opt.impact < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'
                      }
                    >
                      ({opt.impact > 0 ? `+${opt.impact}` : opt.impact})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Complete v3.1 Rink Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1">
                <div className="font-bold text-sky-400 flex items-center gap-1.5">
                  <Snowflake className="w-4 h-4" /> Viewing & Temperature
                </div>
                <p className="text-white font-semibold">{selectedRink.inside_temp_rating}</p>
                <p className="text-slate-400">{selectedRink.sheet_temp_notes}</p>
                <p className="text-slate-300 pt-1">• {selectedRink.viewing_comfort}</p>
                <p className="text-slate-300">
                  • Corner Standing Mats:{' '}
                  <strong>{selectedRink.corner_padded_mats ? 'Yes (Padded)' : 'Bare Concrete'}</strong>
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1">
                <div className="font-bold text-sky-400 flex items-center gap-1.5">
                  <Eye className="w-4 h-4" /> Glass, Scoreboard & Stream
                </div>
                <p className="text-slate-300">• Glass: {selectedRink.glass_clarity}</p>
                <p className="text-slate-300">• Scoreboard: {selectedRink.corner_scoreboard}</p>
                <p className="text-slate-300">
                  • Streaming: {selectedRink.streaming_provider} ({selectedRink.streaming_status})
                </p>
                <p className="text-slate-300">• Monitors: {selectedRink.locker_room_monitors}</p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1">
                <div className="font-bold text-sky-400 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4" /> Pro Shop, 24/7 Vending & Food
                </div>
                <p className="text-slate-300">• Shop: {selectedRink.pro_shop_status}</p>
                <p className="text-slate-300">
                  • 24/7 Gear Vending:{' '}
                  <strong>{selectedRink.has_hockey_vending ? 'Yes' : 'No'}</strong>
                </p>
                <p className="text-slate-300">• Food/Bar: {selectedRink.food_options}</p>
                <p className="text-slate-400 italic pt-0.5">{selectedRink.nearby_fallback_notes}</p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1">
                <div className="font-bold text-sky-400 flex items-center gap-1.5">
                  <Footprints className="w-4 h-4" /> Floors, Parking & Off-Ice
                </div>
                <p className="text-slate-300">• Floors: {selectedRink.skate_friendly_floors}</p>
                <p className="text-slate-300">• Cleanliness: {selectedRink.cleanliness_smell}</p>
                <p className="text-slate-300">
                  • Water Bottle Filler:{' '}
                  <strong>{selectedRink.water_bottle_fillers ? 'Yes' : 'Check Lobby'}</strong>
                </p>
                <p className="text-slate-300">• Drop-Off/Lot: {selectedRink.parking_bag_drop}</p>
                <p className="text-slate-300">• Off-Ice: {selectedRink.off_ice_training}</p>
              </div>
            </div>

            {/* Smart Contextual Gear Recommendations */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Smart Prep For This Rink
                </h3>
                <span className="text-[10px] text-slate-500">Reader-supported links</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {getContextualGear(selectedRink).map((gear, i) => (
                  <a
                    key={i}
                    href={gear.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-gradient-to-r from-slate-950 to-slate-900 hover:from-slate-900 hover:to-slate-800 border border-emerald-500/30 rounded-xl p-3.5 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                        {gear.badge}
                      </span>
                      <span className="text-xs font-bold text-sky-400 inline-flex items-center gap-1">
                        {gear.cta} <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <p className="font-bold text-sm text-white mt-1.5">{gear.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{gear.reason}</p>
                  </a>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <button
                onClick={() => handleVerifyRink(selectedRink)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Confirm Info Accurate Today
              </button>

              <a
                href={`mailto:myrinkrankings@gmail.com?subject=Update%20or%20Claim%20Rink:%20${encodeURIComponent(
                  selectedRink.name
                )}`}
                className="text-slate-400 hover:text-sky-400 underline"
              >
                Rink Manager? Claim or Update Facility
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ADD MISSING RINK MODAL                                                */}
      {/* ===================================================================== */}
      {showAddRink && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-white">Submit a Missing Rink</h3>
              <button
                onClick={() => setShowAddRink(false)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddRinkSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Rink Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g., Floyd Hall Arena"
                  value={newRink.name}
                  onChange={(e) => setNewRink({ ...newRink, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1">City / Town *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g., Little Falls"
                    value={newRink.city}
                    onChange={(e) => setNewRink({ ...newRink, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">State</label>
                  <select
                    value={newRink.state}
                    onChange={(e) => setNewRink({ ...newRink, state: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {['NJ', 'NY', 'PA', 'CT', 'MA', 'DE', 'MD', 'OTHER'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Quick Notes (Pro shop, coldness, LiveBarn, etc.)
                </label>
                <textarea
                  rows={3}
                  placeholder="Tell other parents what to expect..."
                  value={newRink.notes}
                  onChange={(e) => setNewRink({ ...newRink, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <button
                type="submit"
                disabled={submittingRink}
                className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black py-2.5 rounded-xl transition"
              >
                {submittingRink ? 'Submitting...' : 'Submit Rink for Review'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* AFFILIATE DISCLOSURE & LEGAL MODAL                                    */}
      {/* ===================================================================== */}
      {showLegalModal && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-5 space-y-3 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-white">
                Affiliate Disclosure, Terms & Privacy
              </h3>
              <button
                onClick={() => setShowLegalModal(false)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p>
              <strong>Affiliate Disclosure:</strong> MyRinkRankings is 100% free for hockey
              families. To keep the app free, some gear links (such as Amazon, Pure Hockey, or
              HockeyMonkey) may earn a small commission at zero extra cost to you.
            </p>
            <p>
              <strong>Community Scores:</strong> Rink scores and live pulse updates reflect
              crowdsourced parent observations and may change throughout the day.
            </p>
            <p>
              <strong>Privacy & Contact:</strong> We do not sell personal user data. Questions or
              rink verification requests can be sent to{' '}
              <span className="text-sky-400">myrinkrankings@gmail.com</span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
