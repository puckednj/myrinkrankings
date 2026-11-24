import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './supabaseClient';
import {
  Search, Snowflake, ShoppingBag, Plus, X, Flame,
  ShieldCheck, Eye, Footprints, ExternalLink, Sparkles,
  Mail, MapPin, RefreshCw, CheckCircle2, ArrowUpRight,
  Radio, Layers, ThermometerSnowflake, AlertCircle, RotateCcw,
  Clock, Star, Info, Ban, Lock, ChevronLeft, Users, Tv, Car
} from 'lucide-react';

// ============================================================================
// PINS & AFFILIATE CONFIGURATION
// ============================================================================
const FOUNDER_ADMIN_PIN = '2026'; // Change this to your private 4-digit Admin PIN
const RINK_STAFF_PIN = '7777';    // Default 4-digit PIN given to claimed Rink Managers

const AFFILIATE_LINKS = {
  heatedJacket: 'https://www.amazon.com/s?k=mens+womens+heated+jacket+battery+pack',
  handWarmers: 'https://www.amazon.com/s?k=rechargeable+hand+warmers+2+pack',
  pureHockeyTapeLaces: 'https://www.purehockey.com/c/hockey-tape-laces-accessories',
  hockeyMonkeySharpening: 'https://www.hockeymonkey.com/accessories/skate-accessories/skate-sharpeners.html',
  skateGuards: 'https://www.purehockey.com/c/skate-guards-soakers',
  powerBank: 'https://www.amazon.com/s?k=portable+charger+power+bank+fast+charging',
};

// ============================================================================
// WAZE-STYLE 6 CATEGORIES + SUBMENUS (Issues, 0-pt Neutral Info, Positives, Perm)
// ============================================================================
const WAZE_CATEGORIES = [
  {
    id: 'Ice',
    title: 'Ice & Sheet',
    subtitle: 'Cut quality, Zamboni, sheet swaps',
    icon: Snowflake,
    accent: 'text-cyan-300 border-cyan-400/25 bg-cyan-400/10',
    options: [
      { id: 'ice_rutted', label: 'Rutted / Slushy / Wet Ice', impact: -3, type: 'issue', ttlHours: 48 },
      { id: 'ice_zamboni', label: 'Zamboni / Ice Cut Delayed', impact: -2, type: 'issue', ttlHours: 4 },
      { id: 'ice_sheet_swap', label: 'Multi-Sheet — Check Monitor for Sheet', impact: 0, type: 'info', ttlHours: 4 },
      { id: 'ice_fast', label: 'Fast, Crisp Ice Sheet', impact: 2, type: 'positive', ttlHours: 48 },
    ],
  },
  {
    id: 'Temperature',
    title: 'Temp & Viewing',
    subtitle: 'Heaters, foggy glass, seating',
    icon: ThermometerSnowflake,
    accent: 'text-sky-300 border-sky-400/25 bg-sky-400/10',
    options: [
      { id: 'temp_freezing', label: 'Arena Freezing / Heaters Off', impact: -3, type: 'issue', ttlHours: 48 },
      { id: 'temp_glass', label: 'Foggy / Scratched Viewing Glass', impact: -2, type: 'issue', ttlHours: 48 },
      { id: 'temp_bleachers', label: 'Standing Room / Bleachers Full', impact: 0, type: 'info', ttlHours: 4 },
      { id: 'temp_warm', label: 'Warm Viewing / Heaters On', impact: 2, type: 'positive', ttlHours: 48 },
    ],
  },
  {
    id: 'Restrooms',
    title: 'Restrooms & Rooms',
    subtitle: 'Outages, locker room heat/cleanliness',
    icon: Users,
    accent: 'text-violet-300 border-violet-400/25 bg-violet-400/10',
    options: [
      { id: 'rr_out', label: 'Restroom Out of Order / Flooded', impact: -4, type: 'issue', ttlHours: 48 },
      { id: 'rr_locker', label: 'Locker Room Dirty / No Heat', impact: -3, type: 'issue', ttlHours: 48 },
      { id: 'rr_clean', label: 'Spotless Restrooms & Locker Rooms', impact: 1, type: 'positive', ttlHours: 48 },
    ],
  },
  {
    id: 'Pro Shop',
    title: 'Pro Shop & Gear',
    subtitle: 'Sharpening, tape/laces, vending',
    icon: ShoppingBag,
    accent: 'text-emerald-300 border-emerald-400/25 bg-emerald-400/10',
    showPostedHoursNote: true,
    options: [
      { id: 'shop_no_sharp', label: 'No Skate Sharpening (Tape & Laces OK)', impact: -2, type: 'issue', ttlHours: 48 },
      { id: 'shop_closed_hours', label: 'Pro Shop Closed (During Posted Hours)', impact: -3, type: 'issue', ttlHours: 48 },
      { id: 'shop_vending_down', label: '24/7 Gear Vending Empty / Jammed', impact: -2, type: 'issue', ttlHours: 48 },
      { id: 'shop_early_info', label: 'Early Game — Shop Not Open Yet', impact: 0, type: 'info', ttlHours: 4 },
      { id: 'shop_open', label: 'Sharpening & Pro Shop Open', impact: 2, type: 'positive', ttlHours: 48 },
      { id: 'perm_pro_shop', label: 'Pro Shop Permanently Closed', impact: -3, type: 'permanent', permKind: 'pro_shop' },
    ],
  },
  {
    id: 'Streaming',
    title: 'Stream & Clock',
    subtitle: 'LiveBarn, Black Bear, scoreboard',
    icon: Tv,
    accent: 'text-amber-300 border-amber-400/25 bg-amber-400/10',
    options: [
      { id: 'stream_offline', label: 'LiveBarn / Stream Offline', impact: -3, type: 'issue', ttlHours: 48 },
      { id: 'stream_clock', label: 'Scoreboard / Horn Malfunction', impact: -2, type: 'issue', ttlHours: 48 },
      { id: 'stream_ok', label: 'Stream & Scoreboard Working', impact: 1, type: 'positive', ttlHours: 48 },
    ],
  },
  {
    id: 'Operations',
    title: 'Parking, Food & Ops',
    subtitle: 'Lots, delays, snack bar, bar/gym',
    icon: Car,
    accent: 'text-rose-300 border-rose-400/25 bg-rose-400/10',
    options: [
      { id: 'ops_parking', label: 'Parking Lot Gridlock / Full', impact: -2, type: 'issue', ttlHours: 4 },
      { id: 'ops_behind', label: 'Games Running 30+ Min Behind', impact: -2, type: 'issue', ttlHours: 4 },
      { id: 'ops_overflow_info', label: 'Overflow Lot Active — Skip Main Lot', impact: 0, type: 'info', ttlHours: 4 },
      { id: 'ops_snack_info', label: 'Snack Bar Closed — Vending / Coffee Only', impact: 0, type: 'info', ttlHours: 4 },
      { id: 'ops_smooth', label: 'Smooth Ops / On Schedule', impact: 1, type: 'positive', ttlHours: 48 },
      { id: 'perm_bar_rest', label: 'Restaurant / Bar Permanently Closed', impact: -3, type: 'permanent', permKind: 'bar_rest' },
      { id: 'perm_snack', label: 'Snack Bar / Coffee Permanently Closed', impact: -3, type: 'permanent', permKind: 'snack' },
      { id: 'perm_gym', label: 'Off-Ice Gym / Amenity Permanently Closed', impact: -3, type: 'permanent', permKind: 'gym' },
    ],
  },
];

const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours per rink + option
const COOLDOWN_STORAGE_KEY = 'mrr_waze_cooldowns_v2';
const WATCHED_STORAGE_KEY = 'mrr_watched_rinks_v1';

// Encode & decode metadata inside `rink_alerts.message` so zero DB migrations are needed
function encodeAlertMessage(cleanLabel, ttlTag, confirmations = 1) {
  return `${cleanLabel} [${ttlTag}] · ${confirmations} ${confirmations === 1 ? 'parent' : 'parents'}`;
}

function parseAlertMeta(alertRow) {
  const raw = alertRow?.message || '';
  const match = raw.match(/^(.*?)\s*\[(4h|48h|PERM)\](?:\s*·\s*(\d+)\s*parents?)?$/i);
  if (match) {
    const ttlTag = match[2].toUpperCase();
    return {
      cleanLabel: match[1].trim(),
      ttlTag,
      isPermanent: ttlTag === 'PERM' || alertRow.category === 'Permanent Closure',
      ttlHours: ttlTag === '4H' ? 4 : ttlTag === '48H' ? 48 : null,
      confirmations: Number(match[3]) || 1,
    };
  }
  const isPerm = alertRow.category === 'Permanent Closure';
  return {
    cleanLabel: raw,
    ttlTag: isPerm ? 'PERM' : '48H',
    isPermanent: isPerm,
    ttlHours: isPerm ? null : 48,
    confirmations: 1,
  };
}

function formatTimeAgo(isoString) {
  if (!isoString) return 'Just now';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function App() {
  const [rinks, setRinks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [pendingRinks, setPendingRinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [busyAction, setBusyAction] = useState(false);

  // Local device state: Cooldowns & Watched Weekend Rinks
  const [cooldowns, setCooldowns] = useState(() => {
    try {
      const saved = localStorage.getItem(COOLDOWN_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [watchedIds, setWatchedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(WATCHED_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [quickFilter, setQuickFilter] = useState('ALL');

  // Modals & Waze Submenu State
  const [selectedRink, setSelectedRink] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [staffPinPromptAlertId, setStaffPinPromptAlertId] = useState(null);
  const [staffPinInput, setStaffPinInput] = useState('');

  const [showAddRink, setShowAddRink] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);

  // Founder Admin Modal State
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // Add Rink Form State
  const [newRink, setNewRink] = useState({ name: '', city: '', state: 'NJ', sheets: 1, notes: '' });
  const [submittingRink, setSubmittingRink] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const toggleWatchRink = (e, rink) => {
    if (e) e.stopPropagation();
    setWatchedIds((prev) => {
      const exists = prev.includes(rink.id);
      const next = exists ? prev.filter((id) => id !== rink.id) : [...prev, rink.id];
      try {
        localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      showToast(
        exists
          ? `Removed ${rink.name} from Weekend Watchlist`
          : `⭐ Watching ${rink.name} for weekend updates`
      );
      return next;
    });
  };

  const getRemainingCooldownMins = (rinkId, optionId) => {
    const key = `${rinkId}_${optionId}`;
    const lastTs = cooldowns[key];
    if (!lastTs) return 0;
    const remaining = COOLDOWN_MS - (Date.now() - lastTs);
    return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
  };

  const recordCooldown = (rinkId, optionId) => {
    const key = `${rinkId}_${optionId}`;
    const updated = { ...cooldowns, [key]: Date.now() };
    setCooldowns(updated);
    try {
      localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Load rinks + alerts and automatically expire stale 4h/48h alerts while restoring score
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
        .limit(100);

      if (alertsError) throw alertsError;

      const now = Date.now();
      const validAlerts = [];
      const expiredAlerts = [];

      (alertsData || []).forEach((al) => {
        const meta = parseAlertMeta(al);
        if (!meta.isPermanent && meta.ttlHours && al.created_at) {
          const ageMs = now - new Date(al.created_at).getTime();
          if (ageMs > meta.ttlHours * 60 * 60 * 1000) {
            expiredAlerts.push(al);
            return;
          }
        }
        validAlerts.push(al);
      });

      let workingRinks = rinksData || [];

      // Silently expire stale alerts and restore their temporary score impact
      if (expiredAlerts.length > 0) {
        const expiredIds = expiredAlerts.map((a) => a.id);
        await supabase
          .from('rink_alerts')
          .update({ status: 'expired' })
          .in('id', expiredIds);

        const scoreAdjustments = {};
        expiredAlerts.forEach((a) => {
          if (a.score_impact) {
            scoreAdjustments[a.rink_id] = (scoreAdjustments[a.rink_id] || 0) - a.score_impact;
          }
        });

        for (const [rinkId, deltaBack] of Object.entries(scoreAdjustments)) {
          if (deltaBack !== 0) {
            const target = workingRinks.find((r) => String(r.id) === String(rinkId));
            if (target) {
              const restored = Math.max(0, Math.min(100, target.live_score + deltaBack));
              await supabase
                .from('rinks')
                .update({ live_score: restored, updated_at: new Date().toISOString() })
                .eq('id', target.id);
              target.live_score = restored;
            }
          }
        }
      }

      setRinks(workingRinks);
      setAlerts(validAlerts);

      if (selectedRink) {
        const refreshed = workingRinks.find((r) => r.id === selectedRink.id);
        if (refreshed) setSelectedRink(refreshed);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Could not load rinks from Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRinks = async () => {
    try {
      const { data } = await supabase
        .from('pending_rinks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);
      setPendingRinks(data || []);
    } catch {
      // ignore if table empty
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRinks = useMemo(() => {
    return rinks
      .filter((r) => {
        if (stateFilter !== 'ALL' && r.state !== stateFilter) return false;
        if (quickFilter === 'WATCHED' && !watchedIds.includes(r.id)) return false;
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
  }, [rinks, stateFilter, quickFilter, searchQuery, watchedIds]);

  // ============================================================================
  // WAZE-STYLE REPORT HANDLER (Single-Deduction Lock + Confirmation Increment)
  // ============================================================================
  const handleWazeOptionTap = async (rink, categoryObj, option) => {
    if (busyAction) return;

    const minsLeft = getRemainingCooldownMins(rink.id, option.id);
    if (minsLeft > 0) {
      showToast(`You already logged this update. Available again in ${minsLeft}m.`);
      return;
    }

    // Check if this exact issue is ALREADY active at this rink (Single-Deduction Lock!)
    const existingActive = alerts.find((al) => {
      if (al.rink_id !== rink.id) return false;
      const meta = parseAlertMeta(al);
      return meta.cleanLabel.toLowerCase() === option.label.toLowerCase();
    });

    setBusyAction(true);
    try {
      if (existingActive) {
        // Already active -> Increment confirmation count with ZERO extra point deduction!
        const meta = parseAlertMeta(existingActive);
        const nextCount = meta.confirmations + 1;
        const updatedMsg = encodeAlertMessage(meta.cleanLabel, meta.ttlTag, nextCount);

        const { error: confErr } = await supabase
          .from('rink_alerts')
          .update({ message: updatedMsg })
          .eq('id', existingActive.id);

        if (confErr) throw confErr;

        recordCooldown(rink.id, option.id);
        showToast(`Confirmed active (${nextCount} parents) — no duplicate penalty deducted.`);
        await fetchData();
        return;
      }

      // Brand-new report -> Insert active alert & apply single score impact
      const isPerm = option.type === 'permanent';
      const ttlTag = isPerm ? 'PERM' : `${option.ttlHours || 48}h`;
      const dbCategory = isPerm ? 'Permanent Closure' : categoryObj.id;
      const encodedMsg = encodeAlertMessage(option.label, ttlTag, 1);

      const { error: alertErr } = await supabase.from('rink_alerts').insert([
        {
          rink_id: rink.id,
          category: dbCategory,
          message: encodedMsg,
          score_impact: option.impact,
          status: 'active',
        },
      ]);
      if (alertErr) throw alertErr;

      if (option.impact !== 0) {
        const updatedScore = Math.max(0, Math.min(100, rink.live_score + option.impact));
        const { error: updateErr } = await supabase
          .from('rinks')
          .update({ live_score: updatedScore, updated_at: new Date().toISOString() })
          .eq('id', rink.id);
        if (updateErr) throw updateErr;
      }

      recordCooldown(rink.id, option.id);
      setActiveCategory(null);

      if (isPerm) {
        showToast(`Permanent closure flagged for Admin review (-3 pt hold applied).`);
      } else if (option.impact === 0) {
        showToast(`Heads-up info tag posted for arriving parents (0 pts).`);
      } else {
        showToast(
          `Live update posted (${option.impact > 0 ? `+${option.impact}` : option.impact} pts) for ${rink.name}`
        );
      }

      await fetchData();
    } catch (err) {
      showToast('Error saving update: ' + err.message);
    } finally {
      setBusyAction(false);
    }
  };

  // Increment "Still Active" confirmation directly from an Active Alert card
  const handleConfirmStillActive = async (rink, alertItem) => {
    if (busyAction) return;
    const meta = parseAlertMeta(alertItem);
    const lockKey = `confirm_${alertItem.id}`;
    const minsLeft = getRemainingCooldownMins(rink.id, lockKey);
    if (minsLeft > 0) {
      showToast(`You already confirmed this alert (${minsLeft}m cooldown).`);
      return;
    }

    setBusyAction(true);
    try {
      const nextCount = meta.confirmations + 1;
      const updatedMsg = encodeAlertMessage(meta.cleanLabel, meta.ttlTag, nextCount);
      const { error } = await supabase
        .from('rink_alerts')
        .update({ message: updatedMsg })
        .eq('id', alertItem.id);
      if (error) throw error;

      recordCooldown(rink.id, lockKey);
      showToast(`Confirmed still active (${nextCount} parents).`);
      await fetchData();
    } catch (err) {
      showToast('Could not confirm alert: ' + err.message);
    } finally {
      setBusyAction(false);
    }
  };

  // Resolve Alert (Parent or Verified Rink Staff PIN) and restore deducted points
  const handleResolveAlert = async (rink, alertItem, byStaff = false) => {
    if (busyAction) return;
    setBusyAction(true);
    try {
      const { error: resolveErr } = await supabase
        .from('rink_alerts')
        .update({ status: byStaff ? 'resolved_by_staff' : 'resolved' })
        .eq('id', alertItem.id);

      if (resolveErr) throw resolveErr;

      const restoredScore = Math.max(
        0,
        Math.min(100, rink.live_score - (alertItem.score_impact || 0))
      );

      const { error: scoreErr } = await supabase
        .from('rinks')
        .update({ live_score: restoredScore, updated_at: new Date().toISOString() })
        .eq('id', rink.id);

      if (scoreErr) throw scoreErr;

      const deltaBack = -(alertItem.score_impact || 0);
      setStaffPinPromptAlertId(null);
      setStaffPinInput('');

      showToast(
        byStaff
          ? `✓ Verified Resolved by Rink Staff (${deltaBack > 0 ? `+${deltaBack}` : deltaBack} pts restored)`
          : `Marked resolved (${deltaBack > 0 ? `+${deltaBack}` : deltaBack} pts restored)`
      );
      await fetchData();
    } catch (err) {
      showToast('Could not resolve alert: ' + err.message);
    } finally {
      setBusyAction(false);
    }
  };

  // ============================================================================
  // FOUNDER ADMIN: 1-TAP PERMANENT CLOSURE APPROVAL & BASELINE RECALCULATION
  // ============================================================================
  const handleAdminApproveClosure = async (alertItem) => {
    const targetRink = rinks.find((r) => r.id === alertItem.rink_id);
    if (!targetRink || busyAction) return;

    const meta = parseAlertMeta(alertItem);
    const labelLower = meta.cleanLabel.toLowerCase();

    // Determine exact v3.1 permanent baseline adjustment & column updates
    let permDelta = -3;
    const rinkUpdates = { updated_at: new Date().toISOString() };

    if (labelLower.includes('pro shop')) {
      if (targetRink.has_hockey_vending) {
        permDelta = -5;
        rinkUpdates.pro_shop_status = 'No Pro Shop (24/7 Vending Only)';
      } else {
        permDelta = -8;
        rinkUpdates.pro_shop_status = 'No Pro Shop / No Sharpening';
      }
    } else if (labelLower.includes('restaurant') || labelLower.includes('bar')) {
      permDelta = -5;
      rinkUpdates.has_bar_restaurant = false;
      rinkUpdates.food_options = 'Vending / Snack Bar Only';
    } else if (labelLower.includes('snack')) {
      permDelta = -3;
      rinkUpdates.food_options = 'No On-Site Food (Vending Only)';
    } else if (labelLower.includes('gym') || labelLower.includes('off-ice')) {
      permDelta = -3;
      rinkUpdates.off_ice_training = 'None (Closed)';
    }

    // Remove the temporary -3 hold first, then apply the permanent baseline deduction
    const holdReversed = targetRink.live_score - (alertItem.score_impact || 0);
    const newBaseline = Math.max(0, Math.min(100, targetRink.baseline_score + permDelta));
    const newLive = Math.max(0, Math.min(100, holdReversed + permDelta));

    rinkUpdates.baseline_score = newBaseline;
    rinkUpdates.live_score = newLive;

    setBusyAction(true);
    try {
      const { error: rErr } = await supabase
        .from('rinks')
        .update(rinkUpdates)
        .eq('id', targetRink.id);
      if (rErr) throw rErr;

      const { error: aErr } = await supabase
        .from('rink_alerts')
        .update({ status: 'approved_permanent' })
        .eq('id', alertItem.id);
      if (aErr) throw aErr;

      showToast(
        `Updated ${targetRink.name}: Baseline ${targetRink.baseline_score} → ${newBaseline} (${permDelta} pts)`
      );
      await fetchData();
    } catch (err) {
      showToast('Admin update failed: ' + err.message);
    } finally {
      setBusyAction(false);
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
    const rinkAlerts = alerts.filter((a) => a.rink_id === rink.id);
    const hasShopIssue = rinkAlerts.some((a) =>
      parseAlertMeta(a).cleanLabel.toLowerCase().includes('pro shop') ||
      parseAlertMeta(a).cleanLabel.toLowerCase().includes('sharpening')
    );

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
      hasShopIssue ||
      rink.pro_shop_status.toLowerCase().includes('no pro shop') ||
      rink.pro_shop_status.toLowerCase().includes('no sharpening')
    ) {
      items.push({
        badge: 'NO ON-SITE SHARPENING / SHOP',
        title: 'Pack Spare Tape, Waxed Laces & Edge Care',
        reason: 'Pro shop or sharpening unavailable at this facility. Stock your bag before leaving home.',
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

  const watchedRinksList = useMemo(
    () => rinks.filter((r) => watchedIds.includes(r.id)),
    [rinks, watchedIds]
  );

  const permanentClosureFlags = useMemo(
    () => alerts.filter((a) => parseAlertMeta(a).isPermanent),
    [alerts]
  );

  const selectedRinkAlerts = useMemo(() => {
    if (!selectedRink) return [];
    return alerts.filter((a) => a.rink_id === selectedRink.id);
  }, [alerts, selectedRink]);

  const openRinkSheet = (rink) => {
    setSelectedRink(rink);
    setActiveCategory(null);
    setStaffPinPromptAlertId(null);
    setStaffPinInput('');
  };

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-zinc-100 flex flex-col relative overflow-x-hidden">
      {/* 2026 Ambient Spatial Mesh Lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_75%_55%_at_50%_-15%,rgba(34,211,238,0.13),rgba(99,102,241,0.04)_45%,rgba(11,12,14,0)_80%)]"
      />

      {/* Floating Expressive Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1E2127]/95 backdrop-blur-xl border border-emerald-400/40 shadow-[0_16px_40px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.15)] text-white px-5 py-3 rounded-full text-sm font-semibold flex items-center gap-2.5 max-w-[92vw]">
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
        {/* ⭐ My Weekend Rinks Watchlist Strip (Shows whenever 1+ rinks are starred) */}
        {watchedRinksList.length > 0 && (
          <div className="bg-gradient-to-b from-[#1E1D17] to-[#141412] border border-amber-400/30 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(251,191,36,0.22)] rounded-[26px] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> My Weekend Rinks ({watchedRinksList.length})
              </span>
              <span className="text-[11px] text-zinc-400">48h practice-to-game intel</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {watchedRinksList.map((wr) => {
                const wrAlerts = alerts.filter((a) => a.rink_id === wr.id);
                return (
                  <div
                    key={wr.id}
                    onClick={() => openRinkSheet(wr)}
                    className="flex items-center justify-between gap-2 bg-[#0E0F12]/90 hover:bg-[#181A20] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 cursor-pointer transition"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-white truncate">{wr.name}</p>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        {wrAlerts.length > 0
                          ? `🔥 ${wrAlerts.length} active update${wrAlerts.length > 1 ? 's' : ''} (${parseAlertMeta(wrAlerts[0]).cleanLabel})`
                          : '✓ No active alerts in last 48h'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono-score text-sm font-extrabold text-cyan-300">
                        {wr.live_score}
                      </span>
                      <button
                        onClick={(e) => toggleWatchRink(e, wr)}
                        title="Unwatch rink"
                        className="p-1 text-amber-400 hover:text-zinc-400"
                      >
                        <Star className="w-4 h-4 fill-amber-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
              {alerts.slice(0, 6).map((al) => {
                const target = rinks.find((r) => r.id === al.rink_id);
                const meta = parseAlertMeta(al);
                return (
                  <button
                    key={al.id}
                    onClick={() => target && openRinkSheet(target)}
                    className="inline-flex items-center gap-1.5 hover:text-white transition"
                  >
                    <strong className="text-white font-bold underline decoration-white/25">
                      {target ? target.name : 'Rink'}:
                    </strong>
                    <span>{meta.cleanLabel}</span>
                    <span
                      className={`font-mono-score font-extrabold ${
                        al.score_impact < 0
                          ? 'text-rose-400'
                          : al.score_impact > 0
                          ? 'text-emerald-400'
                          : 'text-sky-300'
                      }`}
                    >
                      ({al.score_impact > 0 ? `+${al.score_impact}` : `${al.score_impact} pts`})
                    </span>
                  </button>
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
                { id: 'WATCHED', label: `⭐ Watched (${watchedIds.length})` },
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
              const rinkAlerts = alerts.filter((a) => a.rink_id === rink.id);
              const hasPermFlag = rinkAlerts.some((a) => parseAlertMeta(a).isPermanent);
              const isWatched = watchedIds.includes(rink.id);

              return (
                <div
                  key={rink.id}
                  onClick={() => openRinkSheet(rink)}
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
                          <button
                            onClick={(e) => toggleWatchRink(e, rink)}
                            title={isWatched ? 'Remove from Weekend Rinks' : 'Watch for Weekend'}
                            className={`p-1 rounded-full border transition ${
                              isWatched
                                ? 'bg-amber-400/15 border-amber-400/35 text-amber-300'
                                : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-amber-300'
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${isWatched ? 'fill-amber-300' : ''}`} />
                          </button>
                          {rink.is_home_rink && (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-400/15 text-violet-300 border border-violet-400/30">
                              🏠 Home Rink
                            </span>
                          )}
                          {hasPermFlag && (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/35 inline-flex items-center gap-1">
                              <Ban className="w-3 h-3" /> Amenity Closure Flagged
                            </span>
                          )}
                          {rinkAlerts.length > 0 && (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 inline-flex items-center gap-1">
                              <Flame className="w-3 h-3" /> {rinkAlerts.length} Live
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

      {/* Footer with Subtle Founder Admin Lock */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-[#0B0C0E] py-7 px-4 text-center text-xs text-zinc-500 space-y-2.5">
        <p className="text-zinc-300 font-bold">
          MyRinkRankings — Built by Travel Hockey Parents
        </p>
        <div className="flex flex-wrap justify-center items-center gap-5">
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
          <button
            onClick={() => {
              if (isAdminUnlocked) {
                fetchPendingRinks();
                setShowAdminPinModal(true);
              } else {
                setAdminPinInput('');
                setShowAdminPinModal(true);
              }
            }}
            className="text-zinc-600 hover:text-zinc-300 inline-flex items-center gap-1 font-medium transition"
          >
            <Lock className="w-3 h-3" /> Admin
          </button>
        </div>
      </footer>

      {/* ===================================================================== */}
      {/* 2026 SPATIAL BENTO RINK DETAIL SHEET + WAZE SUBMENU REPORTING         */}
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
                  <button
                    onClick={(e) => toggleWatchRink(e, selectedRink)}
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 transition ${
                      watchedIds.includes(selectedRink.id)
                        ? 'bg-amber-400/20 text-amber-200 border-amber-400/40'
                        : 'bg-[#252932] text-zinc-300 border-white/[0.1] hover:border-amber-400/35'
                    }`}
                  >
                    <Star
                      className={`w-3 h-3 ${
                        watchedIds.includes(selectedRink.id) ? 'fill-amber-300 text-amber-300' : ''
                      }`}
                    />
                    {watchedIds.includes(selectedRink.id) ? 'Watching Weekend' : 'Watch Rink'}
                  </button>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-2">
                  {selectedRink.name}
                </h2>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                  {selectedRink.city}, {selectedRink.state} • {selectedRink.sheets} Ice{' '}
                  {selectedRink.sheets === 1 ? 'Sheet' : 'Sheets'} • Baseline{' '}
                  {selectedRink.baseline_score}/100
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

            {/* ================================================================= */}
            {/* ACTIVE UPDATES LIST (Single-Deduction Lock + Dual Resolution)     */}
            {/* ================================================================= */}
            {selectedRinkAlerts.length > 0 && (
              <div className="bg-gradient-to-b from-[#231D18] to-[#171412] border border-amber-400/30 shadow-[inset_0_1px_0_0_rgba(251,191,36,0.2)] rounded-[24px] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Active Rink Updates ({selectedRinkAlerts.length})
                  </h3>
                  <span className="text-[11px] text-zinc-400">Visible to all parents</span>
                </div>

                <div className="space-y-2.5">
                  {selectedRinkAlerts.map((al) => {
                    const meta = parseAlertMeta(al);
                    const isStaffPromptOpen = staffPinPromptAlertId === al.id;

                    return (
                      <div
                        key={al.id}
                        className={`border rounded-2xl p-3.5 text-xs space-y-2.5 ${
                          meta.isPermanent
                            ? 'bg-rose-950/35 border-rose-400/35'
                            : 'bg-[#12100E]/90 border-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {meta.isPermanent && (
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/25 text-rose-200 border border-rose-400/40">
                                  Permanent Closure Flag
                                </span>
                              )}
                              <span className="font-extrabold text-white text-sm">
                                {meta.cleanLabel}
                              </span>
                              <span
                                className={`font-mono-score font-extrabold ${
                                  al.score_impact < 0
                                    ? 'text-rose-400'
                                    : al.score_impact > 0
                                    ? 'text-emerald-400'
                                    : 'text-sky-300'
                                }`}
                              >
                                ({al.score_impact > 0 ? `+${al.score_impact}` : `${al.score_impact} pts`})
                              </span>
                            </div>

                            <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTimeAgo(al.created_at)}
                              </span>
                              <span>•</span>
                              <span className="text-zinc-300 font-semibold">
                                Confirmed by {meta.confirmations}{' '}
                                {meta.confirmations === 1 ? 'parent' : 'parents'}
                              </span>
                              {!meta.isPermanent && (
                                <>
                                  <span>•</span>
                                  <span>Auto-expires ({meta.ttlTag})</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Dual Resolution Controls: Still Active / Parent Resolved / Staff PIN */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/[0.06]">
                          <button
                            disabled={busyAction}
                            onClick={() => handleConfirmStillActive(selectedRink, al)}
                            className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200 font-bold text-[11px] transition active:scale-95"
                          >
                            Still Active (+1 Confirm)
                          </button>

                          <button
                            disabled={busyAction}
                            onClick={() => handleResolveAlert(selectedRink, al, false)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-400/15 hover:bg-emerald-400/25 text-emerald-300 border border-emerald-400/35 font-extrabold text-[11px] transition active:scale-95"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Mark Resolved</span>
                          </button>

                          <button
                            onClick={() => {
                              setStaffPinPromptAlertId(isStaffPromptOpen ? null : al.id);
                              setStaffPinInput('');
                            }}
                            className="ml-auto text-[11px] text-zinc-400 hover:text-cyan-300 font-semibold underline"
                          >
                            Rink Staff PIN
                          </button>
                        </div>

                        {/* Rink Manager 4-Digit PIN Verification Inline Box */}
                        {isStaffPromptOpen && (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="password"
                              maxLength={4}
                              placeholder="4-digit Staff PIN"
                              value={staffPinInput}
                              onChange={(e) => setStaffPinInput(e.target.value)}
                              className="w-36 bg-[#0B0C0E] border border-cyan-400/40 rounded-full px-3 py-1.5 text-xs text-white focus:outline-none"
                            />
                            <button
                              disabled={busyAction}
                              onClick={() => {
                                if (staffPinInput === RINK_STAFF_PIN || staffPinInput === FOUNDER_ADMIN_PIN) {
                                  handleResolveAlert(selectedRink, al, true);
                                } else {
                                  showToast('Invalid Rink Staff PIN.');
                                }
                              }}
                              className="px-3.5 py-1.5 rounded-full bg-cyan-400 text-zinc-950 font-extrabold text-[11px]"
                            >
                              Verify Resolved
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* WAZE-STYLE 6-CATEGORY REPORT & UPDATE ENGINE                      */}
            {/* ================================================================= */}
            <div className="bg-[#0F1114] border border-white/[0.07] shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] rounded-[24px] p-4 space-y-3.5">
              {!activeCategory ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amber-400" /> At This Rink? Tap a Category to Report
                    </h3>
                    <span className="text-[11px] text-zinc-500 font-medium">Waze-style 2-tap pulse</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {WAZE_CATEGORIES.map((cat) => {
                      const IconComp = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setActiveCategory(cat)}
                          className="text-left bg-gradient-to-b from-[#1B1E24] to-[#15171C] hover:from-[#232730] hover:to-[#1A1D24] active:scale-[0.98] border border-white/[0.08] hover:border-cyan-400/35 rounded-2xl p-3 transition-all space-y-1.5"
                        >
                          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${cat.accent}`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-white">{cat.title}</p>
                            <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                              {cat.subtitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Submenu View for Selected Waze Category */
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.07] pb-2.5">
                    <button
                      onClick={() => setActiveCategory(null)}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-cyan-300 hover:text-cyan-200"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>All Categories</span>
                    </button>
                    <span className="text-xs font-extrabold text-white">
                      {activeCategory.title}
                    </span>
                  </div>

                  {/* Posted Hours Guardrail Note for Pro Shop */}
                  {activeCategory.showPostedHoursNote && (
                    <div className="bg-sky-950/40 border border-sky-400/25 rounded-2xl px-3.5 py-2.5 text-[11px] text-sky-200 flex items-start gap-2">
                      <Info className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
                      <div>
                        <strong>Facility Pro Shop Info:</strong> {selectedRink.pro_shop_status}.{' '}
                        <span className="text-sky-300/90">
                          If it’s an early game before normal shop hours, use the neutral{' '}
                          <strong>0 pt info tag</strong> below instead of reporting it closed.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {activeCategory.options.map((opt) => {
                      const minsLeft = getRemainingCooldownMins(selectedRink.id, opt.id);
                      const onCooldown = minsLeft > 0;
                      const alreadyActive = alerts.some(
                        (al) =>
                          al.rink_id === selectedRink.id &&
                          parseAlertMeta(al).cleanLabel.toLowerCase() === opt.label.toLowerCase()
                      );

                      let pillStyle =
                        'bg-[#1D2026] hover:bg-[#262A33] border-white/[0.09] text-zinc-100';
                      let badgeText = '';
                      let badgeColor = 'text-zinc-300';

                      if (opt.type === 'issue') {
                        pillStyle =
                          'bg-[#221B1E] hover:bg-[#2C2126] border-rose-400/25 text-zinc-100';
                        badgeText = alreadyActive ? 'Active (Tap to Confirm)' : `${opt.impact} pts`;
                        badgeColor = alreadyActive ? 'text-amber-300' : 'text-rose-400';
                      } else if (opt.type === 'info') {
                        pillStyle =
                          'bg-[#182026] hover:bg-[#1E2932] border-sky-400/25 text-sky-100';
                        badgeText = '0 pts · Info Tag';
                        badgeColor = 'text-sky-300';
                      } else if (opt.type === 'positive') {
                        pillStyle =
                          'bg-[#182320] hover:bg-[#1E2E2A] border-emerald-400/25 text-emerald-100';
                        badgeText = `+${opt.impact} pts`;
                        badgeColor = 'text-emerald-400';
                      } else if (opt.type === 'permanent') {
                        pillStyle =
                          'bg-rose-950/40 hover:bg-rose-950/60 border-rose-500/35 text-rose-200';
                        badgeText = 'Flag Permanent';
                        badgeColor = 'text-rose-300';
                      }

                      return (
                        <button
                          key={opt.id}
                          disabled={busyAction || onCooldown}
                          onClick={() => handleWazeOptionTap(selectedRink, activeCategory, opt)}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-left text-xs font-bold transition-all active:scale-[0.99] ${
                            onCooldown
                              ? 'bg-[#14161A] border-white/[0.04] text-zinc-500 cursor-not-allowed'
                              : pillStyle
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {opt.type === 'info' && <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                            {opt.type === 'permanent' && <Ban className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                            <span>{opt.label}</span>
                          </span>
                          <span className={`font-mono-score font-extrabold shrink-0 ${badgeColor}`}>
                            {onCooldown ? `Wait ${minsLeft}m` : badgeText}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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
                Rink Manager? Claim or Request Staff PIN
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FOUNDER ADMIN MODAL (PIN-Protected Permanent Closure & Rink Queue)    */}
      {/* ===================================================================== */}
      {showAdminPinModal && (
        <div
          onClick={() => setShowAdminPinModal(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-b from-[#1E2127] to-[#121418] border border-white/[0.14] shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-[30px] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" /> Founder Admin Panel
              </h3>
              <button
                onClick={() => setShowAdminPinModal(false)}
                className="p-2 rounded-full bg-[#272B33] text-zinc-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isAdminUnlocked ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (adminPinInput === FOUNDER_ADMIN_PIN) {
                    setIsAdminUnlocked(true);
                    fetchPendingRinks();
                  } else {
                    showToast('Incorrect Founder PIN.');
                  }
                }}
                className="space-y-3 text-sm"
              >
                <p className="text-xs text-zinc-400">
                  Enter your 4-digit Founder PIN to review permanent amenity closure flags and
                  newly submitted rinks.
                </p>
                <input
                  type="password"
                  maxLength={4}
                  autoFocus
                  placeholder="••••"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  className="w-full bg-[#0F1114] border border-white/[0.1] focus:border-cyan-400/50 rounded-2xl px-4 py-3 text-center font-mono-score text-xl tracking-widest text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full bg-gradient-to-b from-cyan-300 to-cyan-400 text-zinc-950 font-extrabold py-3 rounded-full"
                >
                  Unlock Admin Queue
                </button>
              </form>
            ) : (
              <div className="space-y-5 text-xs">
                {/* Section 1: Permanent Closure Queue */}
                <div className="space-y-2.5">
                  <h4 className="font-extrabold uppercase tracking-wider text-rose-300">
                    Pending Permanent Closures ({permanentClosureFlags.length})
                  </h4>
                  {permanentClosureFlags.length === 0 ? (
                    <p className="text-zinc-500 bg-[#0F1114] rounded-2xl p-3">
                      No permanent closure flags waiting for review.
                    </p>
                  ) : (
                    permanentClosureFlags.map((flag) => {
                      const target = rinks.find((r) => r.id === flag.rink_id);
                      const meta = parseAlertMeta(flag);
                      return (
                        <div
                          key={flag.id}
                          className="bg-[#0F1114] border border-rose-400/30 rounded-2xl p-3.5 space-y-2.5"
                        >
                          <div>
                            <p className="font-extrabold text-white text-sm">
                              {target ? target.name : 'Unknown Rink'}
                            </p>
                            <p className="text-rose-300 font-bold mt-0.5">{meta.cleanLabel}</p>
                            <p className="text-zinc-400 mt-0.5">
                              Flagged {formatTimeAgo(flag.created_at)} • Confirmed by{' '}
                              {meta.confirmations}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              disabled={busyAction}
                              onClick={() => handleAdminApproveClosure(flag)}
                              className="px-3.5 py-2 rounded-full bg-rose-500 hover:bg-rose-400 text-white font-extrabold"
                            >
                              Approve & Update Baseline
                            </button>
                            <button
                              disabled={busyAction}
                              onClick={() => target && handleResolveAlert(target, flag, true)}
                              className="px-3.5 py-2 rounded-full bg-[#242830] hover:bg-[#2F343E] text-zinc-200 font-bold"
                            >
                              Dismiss (False Alarm)
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Section 2: Submitted Missing Rinks */}
                <div className="space-y-2.5 border-t border-white/[0.08] pt-4">
                  <h4 className="font-extrabold uppercase tracking-wider text-cyan-300">
                    Submitted Missing Rinks ({pendingRinks.length})
                  </h4>
                  {pendingRinks.length === 0 ? (
                    <p className="text-zinc-500 bg-[#0F1114] rounded-2xl p-3">
                      No new rink submissions yet.
                    </p>
                  ) : (
                    pendingRinks.map((pr) => (
                      <div
                        key={pr.id}
                        className="bg-[#0F1114] border border-white/[0.08] rounded-2xl p-3 space-y-1"
                      >
                        <p className="font-extrabold text-white">
                          {pr.name} ({pr.city}, {pr.state})
                        </p>
                        {pr.submitted_notes && (
                          <p className="text-zinc-400">{pr.submitted_notes}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
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
              updates reflect crowdsourced parent observations and automatically expire after 4 to
              48 hours unless confirmed permanent.
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
