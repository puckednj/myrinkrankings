import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './supabaseClient';
import {
  Search, Snowflake, ShoppingBag, Plus, X, Flame,
  ShieldCheck, Eye, Footprints, ExternalLink, Sparkles,
  Mail, MapPin, RefreshCw, CheckCircle2, ArrowUpRight,
  Radio, Layers, ThermometerSnowflake
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
  { label: 'Restroom Out of Order', category: 'Restrooms', impact: -5 },
  { label: 'Sheet Freezing / Extra Cold', category: 'Temperature', impact: -4 },
  { label: 'LiveBarn Stream Offline', category: 'Streaming', impact: -3 },
  { label: 'Parking Lot Full', category: 'Parking', impact: -3 },
  { label: 'Great Ice & Smooth Ops', category: 'Status', impact: 1 },
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

  // 2026 Material 3 Expressive Tonal Elevation & Rim Lighting
  const getScoreTheme = (score) => {
    if (score >= 85) {
      return {
        badge:
          'bg-gradient-to-b from-emerald-400/25 via-emerald-500/15 to-emerald-950/30 text-emerald-300 border-emerald-400/40 shadow-[0_8px_24px_-4px_rgba(16,185,129,0.28),inset_0_1px_0_0_rgba(255,255,255,0.2)]',
        rank: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
        glow: 'group-hover:border-emerald-400/40',
      };
    }
    if (score >= 70) {
      return {
        badge:
          'bg-gradient-to-b from-cyan-400/25 via-cyan-500/15 to-cyan-950/30 text-cyan-300 border-cyan-400/40 shadow-[0_8px_24px_-4px_rgba(34,211,238,0.28),inset_0_1px_0_0_rgba(255,255,255,0.2)]',
        rank: 'bg-cyan-400/15 text-cyan-300 border-cyan-400/30',
        glow: 'group-hover:border-cyan-400/40',
      };
    }
    if (score >= 60) {
      return {
        badge:
          'bg-gradient-to-b from-amber-400/25 via-amber-500/15 to-amber-950/30 text-amber-300 border-amber-400/40 shadow-[0_8px_24px_-4px_rgba(245,158,11,0.25),inset_0_1px_0_0_rgba(255,255,255,0.2)]',
        rank: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
        glow: 'group-hover:border-amber-400/40',
      };
    }
    return {
      badge:
        'bg-gradient-to-b from-rose-400/25 via-rose-500/15 to-rose-950/30 text-rose-300 border-rose-400/40 shadow-[0_8px_24px_-4px_rgba(244,63,94,0.25),inset_0_1px_0_0_rgba(255,255,255,0.2)]',
      rank: 'bg-rose-400/15 text-rose-300 border-rose-400/30',
      glow: 'group-hover:border-rose-400/40',
    };
  };

  const getContextualGear = (rink) => {
    const items = [];
    if (rink.cold_penalty < 0) {
      items.push({
        badge: 'ICEBOX ALERT',
        title: 'Heated Vests & Rechargeable Hand Warmers',
        reason: `${rink.name} runs cold (${rink.inside_temp_rating}). Layer up before puck drop.`,
        cta: 'Check Heated Gear',
        url: AFFILIATE_LINKS.heatedJacket,
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
      });
    }
    if (items.length === 0) {
      items.push({
        badge: 'TOURNAMENT ESSENTIALS',
        title: 'Portable Power Bank & Rink Bag Restock',
        reason: 'Keep phones charged for LiveBarn & tournament schedules all weekend.',
        cta: 'View Portable Chargers',
        url: AFFILIATE_LINKS.powerBank,
      });
    }
    return items;
  };

  const totalSheets = useMemo(
    () => rinks.reduce((acc, r) => acc + (r.sheets || 1), 0),
    [rinks]
  );

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-zinc-100 flex flex-col relative overflow-x-hidden">
      {/* 2026 Ambient Spatial Mesh Lighting (Subtle Glacial Cyan + Graphite Depth) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_75%_55%_at_50%_-15%,rgba(34,211,238,0.13),rgba(99,102,241,0.04)_45%,rgba(11,12,14,0)_80%)]"
      />

      {/* Floating Expressive Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1E2127]/95 backdrop-blur-xl border border-emerald-400/40 shadow-[0_16px_40px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.15)] text-white px-5 py-3 rounded-full text-sm font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 2026 Floating Frosted Top App Bar */}
      <header className="sticky top-0 z-30 bg-[#0B0C0E]/80 backdrop-blur-2xl border-b border-white/[0.07]">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-300 via-cyan-400 to-sky-500 flex items-center justify-center text-zinc-950 font-extrabold text-base shadow-[0_8px_24px_rgba(34,211,238,0.35),inset_0_1px_0_0_rgba(255,255,255,0.65)]">
              MR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg tracking-tight text-white">
                  MyRinkRankings
                </h1>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-400/12 text-cyan-300 border border-cyan-400/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                100-pt rink telemetry by travel hockey parents
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddRink(true)}
            className="flex items-center gap-1.5 bg-gradient-to-b from-cyan-300 to-cyan-400 hover:from-cyan-200 hover:to-cyan-300 active:scale-95 text-zinc-950 font-extrabold text-xs px-4 py-2.5 rounded-full shadow-[0_6px_20px_rgba(34,211,238,0.32),inset_0_1px_0_0_rgba(255,255,255,0.6)] transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Rink</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 py-5 space-y-5">
        {/* 2026 Bento Telemetry Header Strip */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-gradient-to-b from-[#191C21] to-[#131519] border border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.09)] rounded-[22px] p-3.5">
            <div className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Rinks Ranked</span>
            </div>
            <div className="font-mono-score text-xl sm:text-2xl font-extrabold text-white mt-1">
              {rinks.length}
              <span className="text-xs font-sans font-semibold text-zinc-500 ml-1.5">
                ({totalSheets} sheets)
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-b from-[#191C21] to-[#131519] border border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.09)] rounded-[22px] p-3.5">
            <div className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>Live Pulses</span>
            </div>
            <div className="font-mono-score text-xl sm:text-2xl font-extrabold text-white mt-1">
              {alerts.length}
              <span className="text-xs font-sans font-semibold text-zinc-500 ml-1.5">
                active
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-b from-[#191C21] to-[#131519] border border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.09)] rounded-[22px] p-3.5">
            <div className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
              <ThermometerSnowflake className="w-3.5 h-3.5 text-sky-400" />
              <span>Icebox Alerts</span>
            </div>
            <div className="font-mono-score text-xl sm:text-2xl font-extrabold text-white mt-1">
              {rinks.filter((r) => r.cold_penalty < 0).length}
              <span className="text-xs font-sans font-semibold text-zinc-500 ml-1.5">
                rinks
              </span>
            </div>
          </div>
        </div>

        {/* Live Rink Pulse Ticker */}
        {alerts.length > 0 && (
          <div className="bg-gradient-to-r from-[#1A1C20] via-[#211E1B] to-[#1A1C20] border border-amber-400/25 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(251,191,36,0.2)] rounded-full px-4 py-2.5 flex items-center gap-3 overflow-x-auto no-scrollbar">
            <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-300 bg-amber-400/15 px-3 py-1 rounded-full">
              <Flame className="w-3.5 h-3.5" /> Live Pulse
            </span>
            <div className="flex items-center gap-5 text-xs text-zinc-300 whitespace-nowrap">
              {alerts.slice(0, 5).map((al) => {
                const target = rinks.find((r) => r.id === al.rink_id);
                return (
                  <span key={al.id} className="inline-flex items-center gap-1.5">
                    <strong className="text-white font-bold">{target ? target.name : 'Rink'}:</strong>
                    <span>{al.message}</span>
                    <span
                      className={`font-mono-score font-extrabold ${
                        al.score_impact < 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
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

        {/* Search & Expressive Pill Controls */}
        <div className="space-y-3">
          <div className="relative group">
            <Search className="w-4 h-4 text-zinc-400 group-focus-within:text-cyan-400 transition-colors absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search rink name, town, or state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#15171B] focus:bg-[#1B1E24] border border-white/[0.08] focus:border-cyan-400/50 shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)] rounded-full pl-11 pr-5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* State Segmented Control */}
            <div className="inline-flex items-center gap-1 bg-[#14161A] p-1 rounded-full border border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              {['ALL', 'NJ', 'NY', 'PA', 'CT'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStateFilter(st)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all active:scale-95 ${
                    stateFilter === st
                      ? 'bg-gradient-to-b from-cyan-300 to-cyan-400 text-zinc-950 shadow-[0_4px_12px_rgba(34,211,238,0.3)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Expressive Feature Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
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
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 border ${
                    quickFilter === chip.id
                      ? 'bg-[#262A32] text-white border-cyan-400/45 shadow-[0_4px_14px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                      : 'bg-[#14161A] text-zinc-400 hover:text-zinc-200 border-white/[0.07]'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2026 Elevated Spatial Rink Cards */}
        {loading ? (
          <div className="py-16 text-center text-zinc-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <p className="text-sm font-medium">Loading live Tri-State rink telemetry...</p>
          </div>
        ) : errorMsg ? (
          <div className="bg-rose-950/40 border border-rose-500/40 rounded-[26px] p-4 text-sm text-rose-200">
            <strong>Connection check:</strong> {errorMsg}
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredRinks.map((rink, idx) => {
              const delta = rink.live_score - rink.baseline_score;
              const theme = getScoreTheme(rink.live_score);
              return (
                <div
                  key={rink.id}
                  onClick={() => setSelectedRink(rink)}
                  className={`group bg-gradient-to-b from-[#1D2026] to-[#15171B] hover:from-[#23272E] hover:to-[#191C21] hover:-translate-y-0.5 active:scale-[0.99] border border-white/[0.07] ${theme.glow} shadow-[0_14px_34px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.12)] rounded-[28px] p-4 sm:p-5 cursor-pointer transition-all duration-200`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      {/* Rank Pill */}
                      <div
                        className={`font-mono-score w-10 h-10 rounded-2xl border flex items-center justify-center font-extrabold text-sm shrink-0 mt-0.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] ${theme.rank}`}
                      >
                        #{idx + 1}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-extrabold text-base sm:text-lg text-white group-hover:text-cyan-200 transition-colors">
                            {rink.name}
                          </h2>
                          {rink.is_home_rink && (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-400/15 text-violet-300 border border-violet-400/30">
                              🏠 Home Rink
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                          <span>
                            {rink.city}, {rink.state} • {rink.sheets}{' '}
                            {rink.sheets === 1 ? 'Sheet' : 'Sheets'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* 2026 Glowing Tonal Score Pill */}
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <div
                        className={`font-mono-score inline-flex items-baseline gap-1 px-3.5 py-1.5 rounded-2xl border font-extrabold text-xl ${theme.badge}`}
                      >
                        <span>{rink.live_score}</span>
                        <span className="text-[11px] font-bold opacity-70">/100</span>
                      </div>
                      {delta !== 0 ? (
                        <div
                          className={`font-mono-score text-[11px] font-extrabold mt-1.5 ${
                            delta < 0 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : delta} live pulse
                        </div>
                      ) : (
                        <div className="text-[11px] text-zinc-400 font-semibold mt-1.5 inline-flex items-center gap-0.5 group-hover:text-cyan-300 transition-colors">
                          <span>Inspect</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tonal Scannable Chips */}
                  <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex flex-wrap gap-1.5 text-[11px] font-semibold">
                    <span className="px-3 py-1 rounded-full bg-[#242830] text-zinc-200 border border-white/[0.06]">
                      {rink.inside_temp_rating}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#242830] text-zinc-300 border border-white/[0.06]">
                      🏒 {rink.pro_shop_status.split('(')[0].trim()}
                    </span>
                    {rink.has_hockey_vending && (
                      <span className="px-3 py-1 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/25">
                        24/7 Gear Vending
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full bg-[#242830] text-zinc-300 border border-white/[0.06]">
                      📺 {rink.streaming_provider}
                    </span>
                    {rink.corner_padded_mats && (
                      <span className="px-3 py-1 rounded-full bg-cyan-400/12 text-cyan-300 border border-cyan-400/20">
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
      <footer className="relative z-10 border-t border-white/[0.06] bg-[#0B0C0E] py-7 px-4 text-center text-xs text-zinc-500 space-y-2.5">
        <p className="text-zinc-300 font-bold">
          MyRinkRankings — Built by Travel Hockey Parents
        </p>
        <div className="flex flex-wrap justify-center gap-5">
          <a
            href="mailto:myrinkrankings@gmail.com?subject=Rink%20Owner%20or%20Partner%20Inquiry"
            className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5" /> Rink Owner / Partner Contact
          </a>
          <button
            onClick={() => setShowLegalModal(true)}
            className="text-zinc-400 hover:text-white underline font-medium"
          >
            Affiliate Disclosure, Terms & Privacy
          </button>
        </div>
      </footer>

      {/* ===================================================================== */}
      {/* 2026 SPATIAL BENTO RINK DETAIL SHEET                                  */}
      {/* ===================================================================== */}
      {selectedRink && (
        <div
          onClick={() => setSelectedRink(null)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-b from-[#1E2127] to-[#121418] border border-white/[0.1] shadow-[0_-16px_60px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.16)] w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-[34px] sm:rounded-[34px] p-5 sm:p-6 space-y-5"
          >
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1 rounded-full bg-zinc-600 mx-auto sm:hidden -mt-1 mb-2" />

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {selectedRink.verification_status}
                  </span>
                  {selectedRink.is_home_rink && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-400/15 text-violet-300 border border-violet-400/25">
                      🏠 Home Rink
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-2">
                  {selectedRink.name}
                </h2>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                  {selectedRink.city}, {selectedRink.state} • {selectedRink.sheets} Ice{' '}
                  {selectedRink.sheets === 1 ? 'Sheet' : 'Sheets'}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <div
                  className={`font-mono-score px-4 py-1.5 rounded-2xl border font-extrabold text-2xl ${
                    getScoreTheme(selectedRink.live_score).badge
                  }`}
                >
                  {selectedRink.live_score}
                  <span className="text-xs font-bold opacity-70">/100</span>
                </div>
                <button
                  onClick={() => setSelectedRink(null)}
                  className="p-2.5 rounded-full bg-[#272B33] hover:bg-[#323741] text-zinc-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 1-Tap Live Rink Pulse */}
            <div className="bg-[#0F1114] border border-white/[0.07] shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] rounded-[24px] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4" /> At This Rink Right Now? Tap a Live Update
                </h3>
                <span className="text-[11px] text-zinc-500 font-medium">Updates score live</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PULSE_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => handlePulseReport(selectedRink, opt)}
                    className="text-xs font-bold px-3.5 py-2 rounded-full bg-[#1F2229] hover:bg-[#282C35] active:scale-95 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] text-zinc-200 transition-all flex items-center gap-1.5"
                  >
                    <span>{opt.label}</span>
                    <span
                      className={`font-mono-score font-extrabold ${
                        opt.impact < 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      ({opt.impact > 0 ? `+${opt.impact}` : opt.impact})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Complete v3.1 Tonal Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-gradient-to-b from-[#1B1E24] to-[#15171C] border border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] rounded-[24px] p-4 space-y-1.5">
                <div className="font-extrabold text-cyan-300 flex items-center gap-1.5 text-sm">
                  <Snowflake className="w-4 h-4" /> Viewing & Temperature
                </div>
                <p className="text-white font-bold">{selectedRink.inside_temp_rating}</p>
                <p className="text-zinc-400">{selectedRink.sheet_temp_notes}</p>
                <p className="text-zinc-300 pt-1">• {selectedRink.viewing_comfort}</p>
                <p className="text-zinc-300">
                  • Corner Standing Mats:{' '}
                  <strong className="text-white">
                    {selectedRink.corner_padded_mats ? 'Yes (Padded)' : 'Bare Concrete'}
                  </strong>
                </p>
              </div>

              <div className="bg-gradient-to-b from-[#1B1E24] to-[#15171C] border border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] rounded-[24px] p-4 space-y-1.5">
                <div className="font-extrabold text-cyan-300 flex items-center gap-1.5 text-sm">
                  <Eye className="w-4 h-4" /> Glass, Scoreboard & Stream
                </div>
                <p className="text-zinc-300">• Glass: {selectedRink.glass_clarity}</p>
                <p className="text-zinc-300">• Scoreboard: {selectedRink.corner_scoreboard}</p>
                <p className="text-zinc-300">
                  • Streaming: {selectedRink.streaming_provider} ({selectedRink.streaming_status})
                </p>
                <p className="text-zinc-300">• Monitors: {selectedRink.locker_room_monitors}</p>
              </div>

              <div className="bg-gradient-to-b from-[#1B1E24] to-[#15171C] border border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] rounded-[24px] p-4 space-y-1.5">
                <div className="font-extrabold text-cyan-300 flex items-center gap-1.5 text-sm">
                  <ShoppingBag className="w-4 h-4" /> Pro Shop, 24/7 Vending & Food
                </div>
                <p className="text-zinc-300">• Shop: {selectedRink.pro_shop_status}</p>
                <p className="text-zinc-300">
                  • 24/7 Gear Vending:{' '}
                  <strong className="text-white">
                    {selectedRink.has_hockey_vending ? 'Yes' : 'No'}
                  </strong>
                </p>
                <p className="text-zinc-300">• Food/Bar: {selectedRink.food_options}</p>
                <p className="text-zinc-400 italic pt-0.5">{selectedRink.nearby_fallback_notes}</p>
              </div>

              <div className="bg-gradient-to-b from-[#1B1E24] to-[#15171C] border border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] rounded-[24px] p-4 space-y-1.5">
                <div className="font-extrabold text-cyan-300 flex items-center gap-1.5 text-sm">
                  <Footprints className="w-4 h-4" /> Floors, Parking & Off-Ice
                </div>
                <p className="text-zinc-300">• Floors: {selectedRink.skate_friendly_floors}</p>
                <p className="text-zinc-300">• Cleanliness: {selectedRink.cleanliness_smell}</p>
                <p className="text-zinc-300">
                  • Water Bottle Filler:{' '}
                  <strong className="text-white">
                    {selectedRink.water_bottle_fillers ? 'Yes' : 'Check Lobby'}
                  </strong>
                </p>
                <p className="text-zinc-300">• Drop-Off/Lot: {selectedRink.parking_bag_drop}</p>
                <p className="text-zinc-300">• Off-Ice: {selectedRink.off_ice_training}</p>
              </div>
            </div>

            {/* Smart Contextual Gear Recommendations */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Smart Prep For This Rink
                </h3>
                <span className="text-[10px] text-zinc-500 font-medium">Reader-supported links</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {getContextualGear(selectedRink).map((gear, i) => (
                  <a
                    key={i}
                    href={gear.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-gradient-to-r from-[#18221F] to-[#16191F] hover:from-[#1E2B27] hover:to-[#1C2028] border border-emerald-400/25 shadow-[inset_0_1px_0_0_rgba(52,211,153,0.18)] rounded-[22px] p-4 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300">
                        {gear.badge}
                      </span>
                      <span className="text-xs font-extrabold text-cyan-300 inline-flex items-center gap-1">
                        {gear.cta} <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <p className="font-extrabold text-sm text-white mt-2">{gear.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{gear.reason}</p>
                  </a>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs">
              <button
                onClick={() => handleVerifyRink(selectedRink)}
                className="px-4 py-2.5 rounded-full bg-[#242830] hover:bg-[#2E333D] active:scale-95 text-zinc-100 font-bold inline-flex items-center gap-1.5 border border-white/[0.08] transition"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Confirm Info Accurate Today
              </button>

              <a
                href={`mailto:myrinkrankings@gmail.com?subject=Update%20or%20Claim%20Rink:%20${encodeURIComponent(
                  selectedRink.name
                )}`}
                className="text-zinc-400 hover:text-cyan-300 underline font-medium"
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
        <div
          onClick={() => setShowAddRink(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-b from-[#1E2127] to-[#121418] border border-white/[0.12] shadow-[0_24px_60px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.16)] w-full max-w-md rounded-[30px] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-white">Submit a Missing Rink</h3>
              <button
                onClick={() => setShowAddRink(false)}
                className="p-2 rounded-full bg-[#272B33] text-zinc-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddRinkSubmit} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">Rink Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g., Floyd Hall Arena"
                  value={newRink.name}
                  onChange={(e) => setNewRink({ ...newRink, name: e.target.value })}
                  className="w-full bg-[#0F1114] border border-white/[0.08] focus:border-cyan-400/50 rounded-2xl px-4 py-2.5 text-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">City / Town *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g., Little Falls"
                    value={newRink.city}
                    onChange={(e) => setNewRink({ ...newRink, city: e.target.value })}
                    className="w-full bg-[#0F1114] border border-white/[0.08] focus:border-cyan-400/50 rounded-2xl px-4 py-2.5 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">State</label>
                  <select
                    value={newRink.state}
                    onChange={(e) => setNewRink({ ...newRink, state: e.target.value })}
                    className="w-full bg-[#0F1114] border border-white/[0.08] focus:border-cyan-400/50 rounded-2xl px-3 py-2.5 text-white focus:outline-none"
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
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">
                  Quick Notes (Pro shop, coldness, LiveBarn, etc.)
                </label>
                <textarea
                  rows={3}
                  placeholder="Tell other parents what to expect..."
                  value={newRink.notes}
                  onChange={(e) => setNewRink({ ...newRink, notes: e.target.value })}
                  className="w-full bg-[#0F1114] border border-white/[0.08] focus:border-cyan-400/50 rounded-2xl px-4 py-2.5 text-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={submittingRink}
                className="w-full bg-gradient-to-b from-cyan-300 to-cyan-400 hover:from-cyan-200 hover:to-cyan-300 text-zinc-950 font-extrabold py-3 rounded-full shadow-lg transition"
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
        <div
          onClick={() => setShowLegalModal(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-b from-[#1E2127] to-[#121418] border border-white/[0.12] shadow-[0_24px_60px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.16)] w-full max-w-lg rounded-[30px] p-6 space-y-3 text-xs text-zinc-300"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-white">
                Affiliate Disclosure, Terms & Privacy
              </h3>
              <button
                onClick={() => setShowLegalModal(false)}
                className="p-2 rounded-full bg-[#272B33] text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p>
              <strong className="text-white">Affiliate Disclosure:</strong> MyRinkRankings is 100%
              free for hockey families. To keep the app free, some gear links (such as Amazon, Pure
              Hockey, or HockeyMonkey) may earn a small commission at zero extra cost to you.
            </p>
            <p>
              <strong className="text-white">Community Scores:</strong> Rink scores and live pulse
              updates reflect crowdsourced parent observations and may change throughout the day.
            </p>
            <p>
              <strong className="text-white">Privacy & Contact:</strong> We do not sell personal
              user data. Questions or rink verification requests can be sent to{' '}
              <span className="text-cyan-400">myrinkrankings@gmail.com</span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
