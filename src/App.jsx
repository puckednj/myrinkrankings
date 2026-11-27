import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './supabaseClient';
import {
  Search, Snowflake, ShoppingBag, Plus, X, Flame,
  ShieldCheck, Eye, Footprints, ExternalLink, Sparkles,
  Mail, MapPin, RefreshCw, CheckCircle2,
  Radio, Layers, ThermometerSnowflake, AlertCircle, RotateCcw,
  Clock, Star, Info, Ban, Lock, ChevronLeft, Users, Tv, Car,
  Sun, Moon, Building2
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
  pureHockeySticksGear: 'https://www.purehockey.com/c/hockey-sticks',
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
    accentDark: 'text-cyan-300 border-cyan-400/25 bg-cyan-400/10',
    accentLight: 'text-cyan-700 border-cyan-500/30 bg-cyan-50',
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
    subtitle: 'Heaters, foggy glass, corner mats',
    icon: ThermometerSnowflake,
    accentDark: 'text-sky-300 border-sky-400/25 bg-sky-400/10',
    accentLight: 'text-sky-700 border-sky-500/30 bg-sky-50',
    options: [
      { id: 'temp_freezing', label: 'Arena Freezing / Heaters Off', impact: -3, type: 'issue', ttlHours: 48 },
      { id: 'temp_glass', label: 'Foggy / Scratched Viewing Glass', impact: -2, type: 'issue', ttlHours: 48 },
      { id: 'temp_bleachers', label: 'Standing Room / Bleachers Full', impact: 0, type: 'info', ttlHours: 4 },
      { id: 'temp_warm', label: 'Warm Viewing / Heaters On', impact: 2, type: 'positive', ttlHours: 48 },
      { id: 'fact_corner_mats_yes', label: 'Padded Mats in Spectator Corners (Excl. Zamboni)', impact: 0, type: 'facility_fact', matDelta: 1 },
      { id: 'fact_corner_mats_no', label: 'Bare Concrete in Corners (Walkways Only)', impact: 0, type: 'facility_fact', matDelta: -1 },
    ],
  },
  {
    id: 'Restrooms',
    title: 'Restrooms & Rooms',
    subtitle: 'Outages, locker room heat/cleanliness',
    icon: Users,
    accentDark: 'text-violet-300 border-violet-400/25 bg-violet-400/10',
    accentLight: 'text-violet-700 border-violet-500/30 bg-violet-50',
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
    accentDark: 'text-emerald-300 border-emerald-400/25 bg-emerald-400/10',
    accentLight: 'text-emerald-700 border-emerald-500/30 bg-emerald-50',
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
    accentDark: 'text-amber-300 border-amber-400/25 bg-amber-400/10',
    accentLight: 'text-amber-700 border-amber-500/30 bg-amber-50',
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
    accentDark: 'text-rose-300 border-rose-400/25 bg-rose-400/10',
    accentLight: 'text-rose-700 border-rose-500/30 bg-rose-50',
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

const CONDITION_LABELS = {
  1: 'Dated / Needs TLC',
  2: 'Below Average Upkeep',
  3: 'Solid Standard Rink',
  4: 'Clean & Well-Kept',
  5: 'Modern & Spotless',
};

const CORNER_MATS_THRESHOLD = 3;
const COOLDOWN_MS = 2 * 60 * 60 * 1000;
const COOLDOWN_STORAGE_KEY = 'mrr_waze_cooldowns_v2';
const CONDITION_VOTE_STORAGE_KEY = 'mrr_condition_votes_v1';
const WATCHED_STORAGE_KEY = 'mrr_watched_rinks_v1';
const THEME_STORAGE_KEY = 'mrr_theme_mode_v1';

// Resize & compress large phone photos in-browser before uploading to Supabase
function compressExteriorImage(file, maxWidth = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let targetWidth = img.width;
      let targetHeight = img.height;

      if (targetWidth > maxWidth) {
        const scale = maxWidth / targetWidth;
        targetWidth = Math.round(targetWidth * scale);
        targetHeight = Math.round(targetHeight * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not initialize image compressor.'));
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Image compression failed.'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unsupported image format. Please use JPG, PNG, or WebP.'));
    };

    img.src = objectUrl;
  });
}

// Classify 4-Tier Hockey Services (0 = None, 1 = Vending, 2 = Sharpening & Essentials, 3 = Full Pro Shop)
function getHockeyServiceTier(rink) {
  if (rink?.pro_shop_tier !== null && rink?.pro_shop_tier !== undefined) {
    return Number(rink.pro_shop_tier);
  }
  const status = (rink?.pro_shop_status || '').toLowerCase();
  if (
    status.includes('sharpening & essentials') ||
    (status.includes('sharpening') && !status.includes('no sharpening') && status.includes('no pro shop'))
  ) {
    return 2;
  }
  if (status !== '' && !status.includes('no pro shop') && !status.includes('vending only')) {
    return 3;
  }
  if (rink?.has_hockey_vending || status.includes('vending')) {
    return 1;
  }
  return 0;
}

// Progressive Blended Facility Condition Rating (1.0 - 5.0)
function getBlendedConditionRating(rink) {
  const seed = Number(rink?.condition_tier) || 3;
  const sum = Number(rink?.condition_rating_sum) || 0;
  const count = Number(rink?.condition_rating_count) || 0;
  return (seed * 5 + sum) / (5 + count);
}

// Format regulation + mini rink counts and total sheets in the building
function formatMainCardSheets(rink) {
  const notes = (rink.sheet_temp_notes || '').toLowerCase();
  const regLabel = `${rink.sheets} ${rink.sheets === 1 ? 'Sheet' : 'Sheets'}`;
  let miniCount = 0;

  const miniMatch = notes.match(/\+\s*(\d+)\s*(?:studio\/)?mini/);
  if (miniMatch) {
    miniCount = Number(miniMatch[1]);
  } else if (rink?.has_mini_rink || notes.includes('gaudreau') || notes.includes('mini')) {
    miniCount = 1;
  }

  if (miniCount > 0) {
    const total = (rink.sheets || 1) + miniCount;
    const miniLabel = `${miniCount} ${miniCount === 1 ? 'Mini Rink' : 'Mini Rinks'}`;
    return `${regLabel} + ${miniLabel} (${total} Total)`;
  }
  return regLabel;
}

// Helper to check if a rink has any posted amenity/building hours
function hasAnyHours(rink) {
  const h = rink?.amenity_hours;
  if (!h || typeof h !== 'object') return false;
  return Boolean(
    (h.building && h.building.trim()) ||
    (h.pro_shop && h.pro_shop.trim()) ||
    (h.snack_bar && h.snack_bar.trim()) ||
    (h.bar_restaurant && h.bar_restaurant.trim())
  );
}

// Encode & decode metadata inside `rink_alerts.message`
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

  // Per-device Theme Mode (defaults to 'dark' Obsidian Mode)
  const [isLight, setIsLight] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'light';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isLight ? 'light' : 'dark');
    } catch {
      // ignore storage errors
    }
    const bgHex = isLight ? '#F3F5F8' : '#0B0C0E';
    document.body.style.backgroundColor = bgHex;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', bgHex);
  }, [isLight]);

  // Local device state: Cooldowns, Condition Votes & Watched Weekend Rinks
  const [cooldowns, setCooldowns] = useState(() => {
    try {
      const saved = localStorage.getItem(COOLDOWN_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [conditionVotes, setConditionVotes] = useState(() => {
    try {
      const saved = localStorage.getItem(CONDITION_VOTE_STORAGE_KEY);
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
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [staffPinPromptAlertId, setStaffPinPromptAlertId] = useState(null);
  const [staffPinInput, setStaffPinInput] = useState('');

  const [showAddRink, setShowAddRink] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);

  // Founder Admin Modal State
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPhotoRinkId, setAdminPhotoRinkId] = useState('');
  const [uploadingExterior, setUploadingExterior] = useState(false);

  // Founder Admin Amenity Hours Editor State
  const [adminHoursRinkId, setAdminHoursRinkId] = useState('');
  const [adminHoursForm, setAdminHoursForm] = useState({
    building: '',
    pro_shop: '',
    snack_bar: '',
    bar_restaurant: '',
  });
  const [savingHours, setSavingHours] = useState(false);

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
        if (quickFilter === 'SHOP' && getHockeyServiceTier(r) < 2) return false;
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
  // CROWDSOURCED FACILITY CONDITION & AESTHETICS RATING (1-5 Progressive Blend)
  // ============================================================================
  const handleRateCondition = async (rink, stars) => {
    if (busyAction) return;

    const prevVote = conditionVotes[rink.id];
    const seed = Number(rink.condition_tier) || 3;
    const oldSum = Number(rink.condition_rating_sum) || 0;
    const oldCount = Number(rink.condition_rating_count) || 0;

    const newSum = prevVote ? oldSum - prevVote + stars : oldSum + stars;
    const newCount = prevVote ? oldCount : oldCount + 1;

    const oldBlended = (seed * 5 + oldSum) / (5 + oldCount);
    const newBlended = (seed * 5 + newSum) / (5 + newCount);

    const oldPts = Math.round(oldBlended * 3.5);
    const newPts = Math.round(newBlended * 3.5);
    const ptsDelta = newPts - oldPts;

    const nextBaseline = Math.max(0, Math.min(100, rink.baseline_score + ptsDelta));
    const nextLive = Math.max(0, Math.min(100, rink.live_score + ptsDelta));

    setBusyAction(true);
    try {
      const { error } = await supabase
        .from('rinks')
        .update({
          condition_rating_sum: newSum,
          condition_rating_count: newCount,
          baseline_score: nextBaseline,
          live_score: nextLive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rink.id);

      if (error) throw error;

      const updatedVotes = { ...conditionVotes, [rink.id]: stars };
      setConditionVotes(updatedVotes);
      try {
        localStorage.setItem(CONDITION_VOTE_STORAGE_KEY, JSON.stringify(updatedVotes));
      } catch {
        // ignore storage errors
      }

      showToast(`Facility condition rated ${stars}/5 (${CONDITION_LABELS[stars]})`);
      await fetchData();
    } catch (err) {
      showToast('Could not save condition rating: ' + err.message);
    } finally {
      setBusyAction(false);
    }
  };

  // ============================================================================
  // WAZE-STYLE REPORT HANDLER (Facility Facts + Single-Deduction Alert Lock)
  // ============================================================================
  const handleWazeOptionTap = async (rink, categoryObj, option) => {
    if (busyAction) return;

    const minsLeft = getRemainingCooldownMins(rink.id, option.id);
    if (minsLeft > 0) {
      showToast(`You already logged this update. Available again in ${minsLeft}m.`);
      return;
    }

    // Handle persistent crowdsourced facility facts (e.g., Corner Standing Mats)
    if (option.type === 'facility_fact') {
      setBusyAction(true);
      try {
        const currentConfirms = Number(rink.corner_mats_confirmations) || 0;
        const nextConfirms = Math.max(0, currentConfirms + (option.matDelta || 0));
        const isNowVerified = nextConfirms >= CORNER_MATS_THRESHOLD;

        const { error: factErr } = await supabase
          .from('rinks')
          .update({
            corner_mats_confirmations: nextConfirms,
            corner_padded_mats: isNowVerified,
            updated_at: new Date().toISOString(),
          })
          .eq('id', rink.id);

        if (factErr) throw factErr;

        recordCooldown(rink.id, option.id);
        setActiveCategory(null);

        if (option.matDelta > 0) {
          showToast(
            isNowVerified
              ? `✓ Corner Mats verified (${nextConfirms}/${CORNER_MATS_THRESHOLD} parents)! Badge live on card.`
              : `Logged! (${nextConfirms}/${CORNER_MATS_THRESHOLD} confirmations needed to verify Corner Mats badge)`
          );
        } else {
          showToast(
            isNowVerified
              ? `Logged bare concrete report (${nextConfirms} confirmations remaining).`
              : `Logged bare concrete corners (${nextConfirms}/${CORNER_MATS_THRESHOLD} confirmations).`
          );
        }

        await fetchData();
      } catch (err) {
        showToast('Error updating facility info: ' + err.message);
      } finally {
        setBusyAction(false);
      }
      return;
    }

    const existingActive = alerts.find((al) => {
      if (al.rink_id !== rink.id) return false;
      const meta = parseAlertMeta(al);
      return meta.cleanLabel.toLowerCase() === option.label.toLowerCase();
    });

    setBusyAction(true);
    try {
      if (existingActive) {
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
  // FOUNDER ADMIN: 1-TAP PERMANENT CLOSURE APPROVAL & TRIGGER-SYNCED RECALC
  // ============================================================================
  const handleAdminApproveClosure = async (alertItem) => {
    const targetRink = rinks.find((r) => r.id === alertItem.rink_id);
    if (!targetRink || busyAction) return;

    const meta = parseAlertMeta(alertItem);
    const labelLower = meta.cleanLabel.toLowerCase();
    const rinkUpdates = { updated_at: new Date().toISOString() };

    if (labelLower.includes('pro shop')) {
      if (targetRink.has_hockey_vending) {
        rinkUpdates.pro_shop_tier = 1;
        rinkUpdates.pro_shop_status = 'No Pro Shop (24/7 Vending Only)';
      } else {
        rinkUpdates.pro_shop_tier = 0;
        rinkUpdates.pro_shop_status = 'No Pro Shop / No Sharpening';
      }
    } else if (labelLower.includes('restaurant') || labelLower.includes('bar')) {
      rinkUpdates.hospitality_tier = 0;
      rinkUpdates.has_bar_restaurant = false;
      rinkUpdates.food_options = 'Vending / Snack Bar Only';
    } else if (labelLower.includes('snack')) {
      rinkUpdates.hospitality_tier = 0;
      rinkUpdates.food_options = 'No On-Site Food (Vending Only)';
    } else if (labelLower.includes('gym') || labelLower.includes('off-ice')) {
      rinkUpdates.has_off_ice = false;
      rinkUpdates.off_ice_training = 'None (Closed)';
    }

    setBusyAction(true);
    try {
      const { error: aErr } = await supabase
        .from('rink_alerts')
        .update({ status: 'approved_permanent' })
        .eq('id', alertItem.id);
      if (aErr) throw aErr;

      const { error: rErr } = await supabase
        .from('rinks')
        .update(rinkUpdates)
        .eq('id', targetRink.id);
      if (rErr) throw rErr;

      showToast(`Approved permanent change & recalculated ${targetRink.name} automatically.`);
      await fetchData();
    } catch (err) {
      showToast('Admin update failed: ' + err.message);
    } finally {
      setBusyAction(false);
    }
  };

  // ============================================================================
  // FOUNDER ADMIN: 1-TAP APPROVE & PUBLISH SUBMITTED RINK
  // ============================================================================
  const handleAdminPublishPendingRink = async (pendingItem) => {
    if (busyAction) return;
    setBusyAction(true);
    try {
      const sheetsCount = Math.max(1, Number(pendingItem.sheets) || 1);
      const { error: insertErr } = await supabase.from('rinks').insert([
        {
          name: pendingItem.name,
          city: pendingItem.city,
          state: pendingItem.state || 'NJ',
          sheets: sheetsCount,
          has_mini_rink: false,
          corner_padded_mats: false,
          corner_mats_confirmations: 0,
          condition_tier: 3,
          pro_shop_tier: 2,
          hospitality_tier: 0,
          viewing_tier: 1,
          has_off_ice: false,
          sheet_temp_notes:
            pendingItem.submitted_notes || `${sheetsCount} Regulation Sheet(s)`,
          pro_shop_status: 'Sharpening & Essentials (Tape, Laces, Blades)',
          food_options: 'Basic Concession Stand / Vending Only',
          viewing_comfort: 'Standard Heated Lobby Viewing',
          off_ice_training: 'None',
          inside_temp_rating: 'Standard Rink Temp',
          glass_clarity: 'Clear Standard Glass',
          corner_scoreboard: 'Standard Scoreboard',
          streaming_provider: 'LiveBarn',
          streaming_status: 'Active',
          locker_room_monitors: 'Lobby Monitor',
          skate_friendly_floors: 'Rubber Matting',
          cleanliness_smell: 'Standard Arena Cleanliness',
          parking_bag_drop: 'On-Site Lot',
          nearby_fallback_notes: '',
          verification_status: 'Verified by Hockey Parents',
          cold_penalty: 0,
          amenity_hours: {
            building: 'Opens ~30–45 min before first ice · Closes ~10:30 PM',
            pro_shop: 'Weekdays ~4p–8p · Weekends ~8a–5p (Varies by schedule)',
            snack_bar: 'Open weekends & tournament hours',
            bar_restaurant: 'Check facility details',
            updated_at: 'Baseline',
          },
        },
      ]);
      if (insertErr) throw insertErr;

      await supabase.from('pending_rinks').delete().eq('id', pendingItem.id);

      showToast(`Published ${pendingItem.name} to live leaderboard!`);
      await Promise.all([fetchData(), fetchPendingRinks()]);
    } catch (err) {
      showToast('Could not publish rink: ' + err.message);
    } finally {
      setBusyAction(false);
    }
  };

  // ============================================================================
  // FOUNDER ADMIN: AUTO-COMPRESS & UPLOAD EXTERIOR PHOTO TO SUPABASE STORAGE
  // ============================================================================
  const handleAdminUploadExterior = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !adminPhotoRinkId) return;

    setUploadingExterior(true);
    try {
      const compressedBlob = await compressExteriorImage(file, 1400, 0.82);
      const filePath = `rink-${adminPhotoRinkId}-${Date.now()}.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from('rink-exteriors')
        .upload(filePath, compressedBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (uploadErr) throw uploadErr;

      const { data: pubData } = supabase.storage
        .from('rink-exteriors')
        .getPublicUrl(filePath);

      const { error: dbErr } = await supabase
        .from('rinks')
        .update({
          exterior_image_url: pubData.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', adminPhotoRinkId);
      if (dbErr) throw dbErr;

      const kbSize = Math.max(1, Math.round(compressedBlob.size / 1024));
      showToast(`Optimized (${kbSize} KB) & published exterior photo!`);
      await fetchData();
    } catch (err) {
      showToast('Photo upload failed: ' + err.message);
    } finally {
      setUploadingExterior(false);
      e.target.value = '';
    }
  };

  // ============================================================================
  // FOUNDER ADMIN: SAVE RINK & AMENITY HOURS
  // ============================================================================
  const handleSelectAdminHoursRink = (rinkId) => {
    setAdminHoursRinkId(rinkId);
    const target = rinks.find((r) => String(r.id) === String(rinkId));
    const existing = target?.amenity_hours || {};
    setAdminHoursForm({
      building: existing.building || '',
      pro_shop: existing.pro_shop || '',
      snack_bar: existing.snack_bar || '',
      bar_restaurant: existing.bar_restaurant || '',
    });
  };

  const handleAdminSaveHours = async (e) => {
    e.preventDefault();
    if (!adminHoursRinkId || savingHours) return;

    setSavingHours(true);
    try {
      const monthYear = new Date().toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });

      const payload = {
        building: adminHoursForm.building.trim(),
        pro_shop: adminHoursForm.pro_shop.trim(),
        snack_bar: adminHoursForm.snack_bar.trim(),
        bar_restaurant: adminHoursForm.bar_restaurant.trim(),
        updated_at: monthYear,
      };

      const { error } = await supabase
        .from('rinks')
        .update({
          amenity_hours: payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', adminHoursRinkId);

      if (error) throw error;

      showToast('Amenity & rink hours saved!');
      await fetchData();
    } catch (err) {
      showToast('Could not save hours: ' + err.message);
    } finally {
      setSavingHours(false);
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
      showToast('Rink submitted! Thanks for helping hockey families.');
    } catch (err) {
      showToast('Could not submit rink: ' + err.message);
    } finally {
      setSubmittingRink(false);
    }
  };

  const getScoreTheme = (score) => {
    if (isLight) {
      if (score >= 85) {
        return {
          badge: 'bg-gradient-to-b from-emerald-50 to-emerald-100/80 text-emerald-800 border-emerald-300 shadow-sm',
          rank: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          glow: 'group-hover:border-emerald-400',
        };
      }
      if (score >= 70) {
        return {
          badge: 'bg-gradient-to-b from-cyan-50 to-sky-100/80 text-sky-900 border-sky-300 shadow-sm',
          rank: 'bg-sky-50 text-sky-700 border-sky-200',
          glow: 'group-hover:border-sky-400',
        };
      }
      if (score >= 60) {
        return {
          badge: 'bg-gradient-to-b from-amber-50 to-amber-100/80 text-amber-900 border-amber-300 shadow-sm',
          rank: 'bg-amber-50 text-amber-700 border-amber-200',
          glow: 'group-hover:border-amber-400',
        };
      }
      return {
        badge: 'bg-gradient-to-b from-rose-50 to-rose-100/80 text-rose-900 border-rose-300 shadow-sm',
        rank: 'bg-rose-50 text-rose-700 border-rose-200',
        glow: 'group-hover:border-rose-400',
      };
    }

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
    const hasShopIssue = rinkAlerts.some(
      (a) =>
        parseAlertMeta(a).cleanLabel.toLowerCase().includes('pro shop') ||
        parseAlertMeta(a).cleanLabel.toLowerCase().includes('sharpening')
    );
    const serviceTier = getHockeyServiceTier(rink);

    if (rink.cold_penalty < 0) {
      items.push({
        badge: 'ICEBOX ALERT',
        title: 'Heated Vests & Rechargeable Hand Warmers',
        reason: `${rink.name} runs cold (${rink.inside_temp_rating}). Layer up before puck drop.`,
        cta: 'Check Heated Gear',
        url: AFFILIATE_LINKS.heatedJacket,
      });
    }
    if (hasShopIssue || serviceTier <= 1) {
      items.push({
        badge: 'NO ON-SITE SHARPENING / SHOP',
        title: 'Pack Spare Tape, Waxed Laces & Edge Care',
        reason: 'Pro shop or sharpening unavailable at this facility. Stock your bag before leaving home.',
        cta: 'Stock Up at Pure Hockey',
        url: AFFILIATE_LINKS.pureHockeyTapeLaces,
      });
    } else if (serviceTier === 2) {
      items.push({
        badge: 'SHARPENING & ESSENTIALS ONLY',
        title: 'Pack Backup Sticks & Protective Gear',
        reason: 'On-site counter handles sharpening, tape, laces & blades—but does not stock full gear, skates, or sticks.',
        cta: 'Browse Backup Sticks at Pure Hockey',
        url: AFFILIATE_LINKS.pureHockeySticksGear,
      });
    }
    if (
      (rink.skate_friendly_floors || '').toLowerCase().includes('partial') ||
      (rink.skate_friendly_floors || '').toLowerCase().includes('concrete')
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
    setShowHoursModal(false);
    setActiveCategory(null);
    setStaffPinPromptAlertId(null);
    setStaffPinInput('');
  };

  return (
    <div
      className={`min-h-screen flex flex-col relative overflow-x-hidden transition-colors duration-200 ${
        isLight ? 'bg-[#F3F5F8] text-slate-900' : 'bg-[#0B0C0E] text-zinc-100'
      }`}
    >
      {/* 2026 Ambient Spatial Mesh Lighting */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 top-0 h-[420px] ${
          isLight
            ? 'bg-[radial-gradient(ellipse_75%_55%_at_50%_-15%,rgba(14,165,233,0.14),rgba(99,102,241,0.04)_45%,rgba(243,245,248,0)_80%)]'
            : 'bg-[radial-gradient(ellipse_75%_55%_at_50%_-15%,rgba(34,211,238,0.13),rgba(99,102,241,0.04)_45%,rgba(11,12,14,0)_80%)]'
        }`}
      />

      {/* Floating Expressive Toast */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 backdrop-blur-xl px-5 py-3 rounded-full text-sm font-semibold flex items-center gap-2.5 max-w-[92vw] border ${
            isLight
              ? 'bg-slate-900/95 border-emerald-400/40 text-white shadow-xl'
              : 'bg-[#1E2127]/95 border-emerald-400/40 shadow-[0_16px_40px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.15)] text-white'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 2026 Floating Frosted Top App Bar */}
      <header
        className={`sticky top-0 z-30 backdrop-blur-2xl border-b transition-colors ${
          isLight
            ? 'bg-[#F3F5F8]/85 border-slate-200/80'
            : 'bg-[#0B0C0E]/80 border-white/[0.07]'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-300 via-cyan-400 to-sky-500 flex items-center justify-center p-1 shrink-0 ${
                isLight
                  ? 'shadow-[0_6px_16px_rgba(14,165,233,0.28)]'
                  : 'shadow-[0_8px_24px_rgba(34,211,238,0.35),inset_0_1px_0_0_rgba(255,255,255,0.65)]'
              }`}
            >
              <img
                src="/MRR.png"
                alt="MRR Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1
                  className={`font-extrabold text-base sm:text-lg tracking-tight truncate ${
                    isLight ? 'text-slate-950' : 'text-white'
                  }`}
                >
                  MyRinkRankings
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shrink-0 ${
                    isLight
                      ? 'bg-sky-500/10 text-sky-700 border-sky-500/25'
                      : 'bg-cyan-400/12 text-cyan-300 border-cyan-400/25'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      isLight ? 'bg-sky-600' : 'bg-cyan-400'
                    }`}
                  />
                  Live
                </span>
              </div>
              <p
                className={`text-xs font-medium truncate ${
                  isLight ? 'text-slate-500' : 'text-zinc-400'
                }`}
              >
                100-pt rink telemetry by travel hockey parents
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 1-Tap Light / Dark Mode Toggle */}
            <button
              onClick={() => setIsLight((prev) => !prev)}
              aria-label={isLight ? 'Switch to Obsidian Dark Mode' : 'Switch to Glacial Light Mode'}
              title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              className={`p-2.5 rounded-full border transition-all active:scale-95 ${
                isLight
                  ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm'
                  : 'bg-[#181B20] hover:bg-[#22262E] border-white/[0.09] text-amber-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
              }`}
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setShowAddRink(true)}
              className={`flex items-center gap-1.5 font-extrabold text-xs px-4 py-2.5 rounded-full transition-all active:scale-95 ${
                isLight
                  ? 'bg-slate-950 hover:bg-slate-800 text-white shadow-md'
                  : 'bg-gradient-to-b from-cyan-300 to-cyan-400 hover:from-cyan-200 hover:to-cyan-300 text-zinc-950 shadow-[0_6px_20px_rgba(34,211,238,0.32),inset_0_1px_0_0_rgba(255,255,255,0.6)]'
              }`}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Rink</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 py-5 space-y-5">
        {/* ⭐ My Weekend Rinks Watchlist Strip */}
        {watchedRinksList.length > 0 && (
          <div
            className={`rounded-[26px] p-4 space-y-2.5 border ${
              isLight
                ? 'bg-gradient-to-b from-amber-50 to-white border-amber-300/80 shadow-sm'
                : 'bg-gradient-to-b from-[#1E1D17] to-[#141412] border-amber-400/30 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(251,191,36,0.22)]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                  isLight ? 'text-amber-800' : 'text-amber-300'
                }`}
              >
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> My Weekend Rinks (
                {watchedRinksList.length})
              </span>
              <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                48h practice-to-game intel
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {watchedRinksList.map((wr) => {
                const wrAlerts = alerts.filter((a) => a.rink_id === wr.id);
                return (
                  <div
                    key={wr.id}
                    onClick={() => openRinkSheet(wr)}
                    className={`flex items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 cursor-pointer transition border ${
                      isLight
                        ? 'bg-white hover:bg-amber-50/60 border-amber-200/80'
                        : 'bg-[#0E0F12]/90 hover:bg-[#181A20] border-white/[0.08]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-extrabold truncate ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        {wr.name}
                      </p>
                      <p
                        className={`text-[11px] truncate mt-0.5 ${
                          isLight ? 'text-slate-500' : 'text-zinc-400'
                        }`}
                      >
                        {wrAlerts.length > 0
                          ? `🔥 ${wrAlerts.length} active update${
                              wrAlerts.length > 1 ? 's' : ''
                            } (${parseAlertMeta(wrAlerts[0]).cleanLabel})`
                          : '✓ No active alerts in last 48h'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono-score text-sm font-extrabold ${
                          isLight ? 'text-sky-700' : 'text-cyan-300'
                        }`}
                      >
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
          <div
            className={`rounded-[22px] p-3.5 border ${
              isLight
                ? 'bg-white border-slate-200/90 shadow-sm'
                : 'bg-gradient-to-b from-[#191C21] to-[#131519] border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.09)]'
            }`}
          >
            <div
              className={`text-[11px] font-bold flex items-center gap-1.5 ${
                isLight ? 'text-slate-500' : 'text-zinc-400'
              }`}
            >
              <Layers className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
              <span>Rinks Ranked</span>
            </div>
            <div
              className={`font-mono-score text-xl sm:text-2xl font-extrabold mt-1 ${
                isLight ? 'text-slate-950' : 'text-white'
              }`}
            >
              {rinks.length}
              <span
                className={`text-xs font-sans font-semibold ml-1.5 ${
                  isLight ? 'text-slate-400' : 'text-zinc-500'
                }`}
              >
                ({totalSheets} sheets)
              </span>
            </div>
          </div>

          <div
            className={`rounded-[22px] p-3.5 border ${
              isLight
                ? 'bg-white border-slate-200/90 shadow-sm'
                : 'bg-gradient-to-b from-[#191C21] to-[#131519] border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.09)]'
            }`}
          >
            <div
              className={`text-[11px] font-bold flex items-center gap-1.5 ${
                isLight ? 'text-slate-500' : 'text-zinc-400'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-amber-500" />
              <span>Live Pulses</span>
            </div>
            <div
              className={`font-mono-score text-xl sm:text-2xl font-extrabold mt-1 ${
                isLight ? 'text-slate-950' : 'text-white'
              }`}
            >
              {alerts.length}
              <span
                className={`text-xs font-sans font-semibold ml-1.5 ${
                  isLight ? 'text-slate-400' : 'text-zinc-500'
                }`}
              >
                active
              </span>
            </div>
          </div>

          <div
            className={`rounded-[22px] p-3.5 border ${
              isLight
                ? 'bg-white border-slate-200/90 shadow-sm'
                : 'bg-gradient-to-b from-[#191C21] to-[#131519] border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.09)]'
            }`}
          >
            <div
              className={`text-[11px] font-bold flex items-center gap-1.5 ${
                isLight ? 'text-slate-500' : 'text-zinc-400'
              }`}
            >
              <ThermometerSnowflake
                className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-sky-400'}`}
              />
              <span>Icebox Alerts</span>
            </div>
            <div
              className={`font-mono-score text-xl sm:text-2xl font-extrabold mt-1 ${
                isLight ? 'text-slate-950' : 'text-white'
              }`}
            >
              {rinks.filter((r) => r.cold_penalty < 0).length}
              <span
                className={`text-xs font-sans font-semibold ml-1.5 ${
                  isLight ? 'text-slate-400' : 'text-zinc-500'
                }`}
              >
                rinks
              </span>
            </div>
          </div>
        </div>

        {/* Live Rink Pulse Ticker */}
        {alerts.length > 0 && (
          <div
            className={`rounded-full px-4 py-2.5 flex items-center gap-3 overflow-x-auto no-scrollbar border ${
              isLight
                ? 'bg-gradient-to-r from-amber-50 via-white to-amber-50 border-amber-300/80 shadow-sm'
                : 'bg-gradient-to-r from-[#1A1C20] via-[#211E1B] to-[#1A1C20] border-amber-400/25 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(251,191,36,0.2)]'
            }`}
          >
            <span
              className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full ${
                isLight ? 'text-amber-800 bg-amber-200/60' : 'text-amber-300 bg-amber-400/15'
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> Live Pulse
            </span>
            <div
              className={`flex items-center gap-5 text-xs whitespace-nowrap ${
                isLight ? 'text-slate-700' : 'text-zinc-300'
              }`}
            >
              {alerts.slice(0, 6).map((al) => {
                const target = rinks.find((r) => r.id === al.rink_id);
                const meta = parseAlertMeta(al);
                return (
                  <button
                    key={al.id}
                    onClick={() => target && openRinkSheet(target)}
                    className={`inline-flex items-center gap-1.5 transition ${
                      isLight ? 'hover:text-slate-950' : 'hover:text-white'
                    }`}
                  >
                    <strong
                      className={`font-bold underline ${
                        isLight
                          ? 'text-slate-950 decoration-slate-300'
                          : 'text-white decoration-white/25'
                      }`}
                    >
                      {target ? target.name : 'Rink'}:
                    </strong>
                    <span>{meta.cleanLabel}</span>
                    <span
                      className={`font-mono-score font-extrabold ${
                        al.score_impact < 0
                          ? isLight
                            ? 'text-rose-600'
                            : 'text-rose-400'
                          : al.score_impact > 0
                          ? isLight
                            ? 'text-emerald-600'
                            : 'text-emerald-400'
                          : isLight
                          ? 'text-sky-700'
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
            <Search
              className={`w-4 h-4 transition-colors absolute left-4 top-1/2 -translate-y-1/2 ${
                isLight
                  ? 'text-slate-400 group-focus-within:text-sky-600'
                  : 'text-zinc-400 group-focus-within:text-cyan-400'
              }`}
            />
            <input
              type="text"
              placeholder="Search rink name, town, or state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-full pl-11 pr-5 py-3 text-sm focus:outline-none transition-all border ${
                isLight
                  ? 'bg-white border-slate-200/90 focus:border-sky-500 text-slate-900 placeholder-slate-400 shadow-sm'
                  : 'bg-[#15171B] focus:bg-[#1B1E24] border-white/[0.08] focus:border-cyan-400/50 shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)] text-white placeholder-zinc-500'
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* State Segmented Control */}
            <div
              className={`inline-flex items-center gap-1 p-1 rounded-full border ${
                isLight
                  ? 'bg-white border-slate-200/90 shadow-sm'
                  : 'bg-[#14161A] border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
              }`}
            >
              {['ALL', 'NJ', 'NY', 'PA', 'CT'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStateFilter(st)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all active:scale-95 ${
                    stateFilter === st
                      ? isLight
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'bg-gradient-to-b from-cyan-300 to-cyan-400 text-zinc-950 shadow-[0_4px_12px_rgba(34,211,238,0.3)]'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-950'
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
                { id: 'SHOP', label: '🏒 Shop / Sharpening' },
                { id: 'BAR', label: '🍔 Bar/Cafe' },
                { id: 'COLD', label: '🥶 Cold Alert' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setQuickFilter(chip.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 border ${
                    quickFilter === chip.id
                      ? isLight
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                        : 'bg-[#262A32] text-white border-cyan-400/45 shadow-[0_4px_14px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                      : isLight
                      ? 'bg-white text-slate-600 hover:text-slate-950 border-slate-200/90 shadow-sm'
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
          <div
            className={`py-16 text-center flex flex-col items-center gap-3 ${
              isLight ? 'text-slate-500' : 'text-zinc-400'
            }`}
          >
            <RefreshCw
              className={`w-6 h-6 animate-spin ${isLight ? 'text-sky-600' : 'text-cyan-400'}`}
            />
            <p className="text-sm font-medium">Loading live rink telemetry...</p>
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
              const serviceTier = getHockeyServiceTier(rink);
              const conditionScore = getBlendedConditionRating(rink);

              return (
                <div
                  key={rink.id}
                  onClick={() => openRinkSheet(rink)}
                  className={`group hover:-translate-y-0.5 active:scale-[0.99] rounded-[28px] p-4 sm:p-5 cursor-pointer transition-all duration-200 border ${
                    isLight
                      ? `bg-white hover:bg-slate-50/90 border-slate-200/90 ${theme.glow} shadow-[0_8px_24px_-10px_rgba(15,23,42,0.1)]`
                      : `bg-gradient-to-b from-[#1D2026] to-[#15171B] hover:from-[#23272E] hover:to-[#191C21] border-white/[0.07] ${theme.glow} shadow-[0_14px_34px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.12)]`
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Rank Pill */}
                      <div
                        className={`font-mono-score w-10 h-10 rounded-2xl border flex items-center justify-center font-extrabold text-sm shrink-0 mt-0.5 ${theme.rank}`}
                      >
                        #{idx + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2
                            className={`font-extrabold text-base sm:text-lg transition-colors ${
                              isLight
                                ? 'text-slate-950 group-hover:text-sky-700'
                                : 'text-white group-hover:text-cyan-200'
                            }`}
                          >
                            {rink.name}
                          </h2>
                          {rink.is_home_rink && (
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                isLight
                                  ? 'bg-violet-50 text-violet-700 border-violet-200'
                                  : 'bg-violet-400/15 text-violet-300 border-violet-400/30'
                              }`}
                            >
                              🏠 Home Rink
                            </span>
                          )}
                          {hasPermFlag && (
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                                isLight
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-400/35'
                              }`}
                            >
                              <Ban className="w-3 h-3" /> Amenity Closure Flagged
                            </span>
                          )}
                          {rinkAlerts.length > 0 && (
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                                isLight
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                              }`}
                            >
                              <Flame className="w-3 h-3" /> {rinkAlerts.length} Live
                            </span>
                          )}
                        </div>

                        {/* Line 1: Location */}
                        <p
                          className={`text-xs mt-1 flex items-center gap-1.5 font-medium ${
                            isLight ? 'text-slate-500' : 'text-zinc-400'
                          }`}
                        >
                          <MapPin
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isLight ? 'text-slate-400' : 'text-zinc-500'
                            }`}
                          />
                          <span>
                            {rink.city}, {rink.state}
                          </span>
                        </p>

                        {/* Line 2: Ice Sheets & Total Building Capacity */}
                        <p
                          className={`text-xs mt-0.5 flex items-center gap-1.5 font-semibold ${
                            isLight ? 'text-sky-700' : 'text-cyan-300/90'
                          }`}
                        >
                          <Layers
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isLight ? 'text-sky-600' : 'text-cyan-400'
                            }`}
                          />
                          <span>{formatMainCardSheets(rink)}</span>
                        </p>
                      </div>
                    </div>

                    {/* 2026 Glowing Tonal Score Pill + Compact Right-Aligned Watch Action */}
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <div
                        className={`font-mono-score inline-flex items-baseline gap-1 px-3.5 py-1.5 rounded-2xl border font-extrabold text-xl ${theme.badge}`}
                      >
                        <span>{rink.live_score}</span>
                        <span className="text-[11px] font-bold opacity-70">/100</span>
                      </div>

                      {delta !== 0 && (
                        <div
                          className={`font-mono-score text-[11px] font-extrabold mt-1 ${
                            delta < 0
                              ? isLight
                                ? 'text-rose-600'
                                : 'text-rose-400'
                              : isLight
                              ? 'text-emerald-600'
                              : 'text-emerald-400'
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : delta} live pulse
                        </div>
                      )}

                      <button
                        onClick={(e) => toggleWatchRink(e, rink)}
                        title={isWatched ? 'Remove from Weekend Rinks' : 'Watch Rink for Weekend'}
                        className={`mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 transition active:scale-95 ${
                          isWatched
                            ? isLight
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-amber-400/20 text-amber-200 border-amber-400/40'
                            : isLight
                            ? 'bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-amber-800 border-slate-200 hover:border-amber-300'
                            : 'bg-[#20242C] hover:bg-amber-400/10 text-zinc-400 hover:text-amber-200 border-white/[0.08] hover:border-amber-400/35'
                        }`}
                      >
                        <Star
                          className={`w-2.5 h-2.5 shrink-0 ${
                            isWatched ? 'fill-amber-400 text-amber-400' : ''
                          }`}
                        />
                        <span>{isWatched ? 'Watching' : 'Watch Rink'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Tonal Scannable Chips */}
                  <div
                    className={`mt-3.5 pt-3 border-t flex flex-wrap gap-1.5 text-[11px] font-semibold ${
                      isLight ? 'border-slate-100' : 'border-white/[0.06]'
                    }`}
                  >
                    <span
                      className={`px-3 py-1 rounded-full border ${
                        isLight
                          ? 'bg-slate-100 text-slate-800 border-slate-200/80'
                          : 'bg-[#242830] text-zinc-200 border-white/[0.06]'
                      }`}
                    >
                      {rink.inside_temp_rating}
                    </span>

                    {/* 4-Tier Hockey Services Pill */}
                    <span
                      className={`px-3 py-1 rounded-full border ${
                        serviceTier === 3
                          ? isLight
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-emerald-400/15 text-emerald-300 border-emerald-400/25'
                          : serviceTier === 2
                          ? isLight
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : 'bg-sky-400/15 text-sky-300 border-sky-400/25'
                          : isLight
                          ? 'bg-slate-100 text-slate-700 border-slate-200/80'
                          : 'bg-[#242830] text-zinc-300 border-white/[0.06]'
                      }`}
                    >
                      🏒{' '}
                      {serviceTier === 3
                        ? 'Full Pro Shop'
                        : serviceTier === 2
                        ? 'Sharpening & Essentials'
                        : serviceTier === 1
                        ? '24/7 Gear Vending Only'
                        : 'No Pro Shop / Sharpening'}
                    </span>

                    {/* Facility Condition & Upkeep Score Pill */}
                    <span
                      className={`px-3 py-1 rounded-full border ${
                        conditionScore >= 3.8
                          ? isLight
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : 'bg-indigo-400/15 text-indigo-300 border-indigo-400/25'
                          : isLight
                          ? 'bg-slate-100 text-slate-700 border-slate-200/80'
                          : 'bg-[#242830] text-zinc-300 border-white/[0.06]'
                      }`}
                    >
                      ✨ Upkeep {conditionScore.toFixed(1)}/5
                    </span>

                    <span
                      className={`px-3 py-1 rounded-full border ${
                        isLight
                          ? 'bg-slate-100 text-slate-700 border-slate-200/80'
                          : 'bg-[#242830] text-zinc-300 border-white/[0.06]'
                      }`}
                    >
                      📺 {rink.streaming_provider}
                    </span>

                    {/* Only display Corner Mats once 3+ parents verify spectator corners */}
                    {rink.corner_padded_mats && (
                      <span
                        className={`px-3 py-1 rounded-full border ${
                          isLight
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-cyan-400/12 text-cyan-300 border-cyan-400/20'
                        }`}
                      >
                        ✓ Corner Mats
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
      <footer
        className={`relative z-10 border-t py-7 px-4 text-center text-xs space-y-2.5 transition-colors ${
          isLight
            ? 'border-slate-200/80 bg-[#F3F5F8] text-slate-500'
            : 'border-white/[0.06] bg-[#0B0C0E] text-zinc-500'
        }`}
      >
        <p className={`font-bold ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
          MyRinkRankings — Built by Travel Hockey Parents
        </p>
        <div className="flex flex-wrap justify-center items-center gap-5">
          <a
            href="mailto:myrinkrankings@gmail.com?subject=Rink%20Owner%20or%20Partner%20Inquiry"
            className={`font-semibold inline-flex items-center gap-1.5 ${
              isLight ? 'text-sky-700 hover:text-sky-600' : 'text-cyan-400 hover:text-cyan-300'
            }`}
          >
            <Mail className="w-3.5 h-3.5" /> Rink Owner / Partner Contact
          </a>
          <button
            onClick={() => setShowLegalModal(true)}
            className={`underline font-medium ${
              isLight ? 'text-slate-500 hover:text-slate-900' : 'text-zinc-400 hover:text-white'
            }`}
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
            className={`inline-flex items-center gap-1 font-medium transition ${
              isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-600 hover:text-zinc-300'
            }`}
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
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-[34px] sm:rounded-[34px] p-5 sm:p-6 space-y-5 border ${
              isLight
                ? 'bg-[#F8FAFC] border-slate-200 shadow-2xl text-slate-900'
                : 'bg-gradient-to-b from-[#1E2127] to-[#121418] border-white/[0.1] shadow-[0_-16px_60px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.16)] text-zinc-100'
            }`}
          >
            {/* Mobile Drag Handle */}
            <div
              className={`w-10 h-1 rounded-full mx-auto sm:hidden -mt-1 mb-2 ${
                isLight ? 'bg-slate-300' : 'bg-zinc-600'
              }`}
            />

            {/* Modal Header */}
            <div
              className={`space-y-2 border-b pb-4 ${
                isLight ? 'border-slate-200' : 'border-white/[0.08]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                        isLight
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {selectedRink.verification_status}
                    </span>
                    <button
                      onClick={(e) => toggleWatchRink(e, selectedRink)}
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 transition ${
                        watchedIds.includes(selectedRink.id)
                          ? isLight
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-amber-400/20 text-amber-200 border-amber-400/40'
                          : isLight
                          ? 'bg-white text-slate-700 border-slate-200 hover:border-amber-400'
                          : 'bg-[#252932] text-zinc-300 border-white/[0.1] hover:border-amber-400/35'
                      }`}
                    >
                      <Star
                        className={`w-3 h-3 ${
                          watchedIds.includes(selectedRink.id) ? 'fill-amber-400 text-amber-400' : ''
                        }`}
                      />
                      {watchedIds.includes(selectedRink.id) ? 'Watching Weekend' : 'Watch Rink'}
                    </button>
                  </div>
                  <h2
                    className={`text-xl sm:text-2xl font-extrabold mt-2 ${
                      isLight ? 'text-slate-950' : 'text-white'
                    }`}
                  >
                    {selectedRink.name}
                  </h2>
                  <p
                    className={`text-xs font-medium mt-0.5 ${
                      isLight ? 'text-slate-500' : 'text-zinc-400'
                    }`}
                  >
                    {selectedRink.city}, {selectedRink.state} • Baseline{' '}
                    {selectedRink.baseline_score}/100
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
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
                    className={`p-2.5 rounded-full transition ${
                      isLight
                        ? 'bg-slate-200/80 hover:bg-slate-300 text-slate-800'
                        : 'bg-[#272B33] hover:bg-[#323741] text-zinc-200'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Sheet Pill + Right-Justified Hours Pill */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                {selectedRink.sheet_temp_notes ? (
                  <p
                    className={`text-xs font-bold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${
                      isLight
                        ? 'bg-sky-50 text-sky-900 border-sky-200'
                        : 'bg-cyan-400/10 text-cyan-200 border-cyan-400/25'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 shrink-0" />
                    <span>{selectedRink.sheet_temp_notes}</span>
                  </p>
                ) : (
                  <div />
                )}

                <button
                  onClick={() => setShowHoursModal(true)}
                  className={`ml-auto shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border transition active:scale-95 ${
                    hasAnyHours(selectedRink)
                      ? isLight
                        ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300'
                        : 'bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-300 border-cyan-400/35'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      : 'bg-[#252932] hover:bg-[#2F3440] text-zinc-300 border-white/[0.1]'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Hours</span>
                </button>
              </div>
            </div>

            {/* ================================================================= */}
            {/* FACILITY EXTERIOR PHOTO ("HAVE I BEEN HERE?" RECOGNITION BANNER)  */}
            {/* ================================================================= */}
            <div
              className={`relative overflow-hidden rounded-[24px] border ${
                isLight ? 'border-slate-200 bg-slate-100' : 'border-white/[0.08] bg-[#0F1114]'
              }`}
            >
              {selectedRink.exterior_image_url ? (
                <div className="relative h-44 sm:h-56 w-full">
                  <img
                    src={selectedRink.exterior_image_url}
                    alt={`${selectedRink.name} exterior entrance`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                  <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/60 text-cyan-300 backdrop-blur-md border border-white/15">
                        Building Exterior · Entrance View
                      </span>
                      {selectedRink.address && (
                        <p className="text-xs text-white/90 font-medium mt-1 truncate">
                          {selectedRink.address}
                        </p>
                      )}
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${selectedRink.name} ${selectedRink.city} ${selectedRink.state}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/95 hover:bg-white text-slate-950 font-extrabold text-[11px] shadow-md transition"
                    >
                      <MapPin className="w-3.5 h-3.5 text-sky-600" />
                      <span>Maps / Street View</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isLight ? 'bg-sky-100 text-sky-700' : 'bg-cyan-400/15 text-cyan-300'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-extrabold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Need to see the outside first?
                      </p>
                      <p className={`text-[11px] truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        Open Street View or exterior photos on Google Maps
                      </p>
                    </div>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${selectedRink.name} ${selectedRink.city} ${selectedRink.state}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-extrabold text-[11px] border transition ${
                      isLight
                        ? 'bg-white hover:bg-slate-50 text-slate-900 border-slate-300 shadow-sm'
                        : 'bg-[#1D2026] hover:bg-[#262A33] text-cyan-300 border-cyan-400/30'
                    }`}
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Street View</span>
                  </a>
                </div>
              )}
            </div>

            {/* ================================================================= */}
            {/* ACTIVE UPDATES LIST (Single-Deduction Lock + Dual Resolution)     */}
            {/* ================================================================= */}
            {selectedRinkAlerts.length > 0 && (
              <div
                className={`rounded-[24px] p-4 space-y-2.5 border ${
                  isLight
                    ? 'bg-amber-50/90 border-amber-300'
                    : 'bg-gradient-to-b from-[#231D18] to-[#171412] border-amber-400/30 shadow-[inset_0_1px_0_0_rgba(251,191,36,0.2)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3
                    className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                      isLight ? 'text-amber-900' : 'text-amber-300'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" /> Active Rink Updates ({selectedRinkAlerts.length})
                  </h3>
                  <span className={`text-[11px] ${isLight ? 'text-amber-800/80' : 'text-zinc-400'}`}>
                    Visible to all parents
                  </span>
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
                            ? isLight
                              ? 'bg-rose-50 border-rose-300'
                              : 'bg-rose-950/35 border-rose-400/35'
                            : isLight
                            ? 'bg-white border-amber-200'
                            : 'bg-[#12100E]/90 border-white/[0.07]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {meta.isPermanent && (
                                <span
                                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                    isLight
                                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                                      : 'bg-rose-500/25 text-rose-200 border-rose-400/40'
                                  }`}
                                >
                                  Permanent Closure Flag
                                </span>
                              )}
                              <span
                                className={`font-extrabold text-sm ${
                                  isLight ? 'text-slate-950' : 'text-white'
                                }`}
                              >
                                {meta.cleanLabel}
                              </span>
                              <span
                                className={`font-mono-score font-extrabold ${
                                  al.score_impact < 0
                                    ? isLight
                                      ? 'text-rose-600'
                                      : 'text-rose-400'
                                    : al.score_impact > 0
                                    ? isLight
                                      ? 'text-emerald-600'
                                      : 'text-emerald-400'
                                    : isLight
                                    ? 'text-sky-700'
                                    : 'text-sky-300'
                                }`}
                              >
                                ({al.score_impact > 0 ? `+${al.score_impact}` : `${al.score_impact} pts`})
                              </span>
                            </div>

                            <div
                              className={`text-[11px] flex flex-wrap items-center gap-2 ${
                                isLight ? 'text-slate-500' : 'text-zinc-400'
                              }`}
                            >
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTimeAgo(al.created_at)}
                              </span>
                              <span>•</span>
                              <span
                                className={`font-semibold ${
                                  isLight ? 'text-slate-700' : 'text-zinc-300'
                                }`}
                              >
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

                        {/* Dual Resolution Controls */}
                        <div
                          className={`flex flex-wrap items-center gap-2 pt-2 border-t ${
                            isLight ? 'border-slate-100' : 'border-white/[0.06]'
                          }`}
                        >
                          <button
                            disabled={busyAction}
                            onClick={() => handleConfirmStillActive(selectedRink, al)}
                            className={`px-3 py-1.5 rounded-full font-bold text-[11px] transition active:scale-95 ${
                              isLight
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                : 'bg-white/[0.06] hover:bg-white/[0.11] text-zinc-200'
                            }`}
                          >
                            Still Active (+1 Confirm)
                          </button>

                          <button
                            disabled={busyAction}
                            onClick={() => handleResolveAlert(selectedRink, al, false)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border font-extrabold text-[11px] transition active:scale-95 ${
                              isLight
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-emerald-400/15 hover:bg-emerald-400/25 text-emerald-300 border-emerald-400/35'
                            }`}
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Mark Resolved</span>
                          </button>

                          <button
                            onClick={() => {
                              setStaffPinPromptAlertId(isStaffPromptOpen ? null : al.id);
                              setStaffPinInput('');
                            }}
                            className={`ml-auto text-[11px] font-semibold underline ${
                              isLight
                                ? 'text-slate-500 hover:text-sky-700'
                                : 'text-zinc-400 hover:text-cyan-300'
                            }`}
                          >
                            Rink Staff PIN
                          </button>
                        </div>

                        {isStaffPromptOpen && (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="password"
                              maxLength={4}
                              placeholder="4-digit Staff PIN"
                              value={staffPinInput}
                              onChange={(e) => setStaffPinInput(e.target.value)}
                              className={`w-36 border rounded-full px-3 py-1.5 text-xs focus:outline-none ${
                                isLight
                                  ? 'bg-white border-sky-400 text-slate-900'
                                  : 'bg-[#0B0C0E] border-cyan-400/40 text-white'
                              }`}
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
            {/* CROWDSOURCED FACILITY CONDITION & UPKEEP (25% PILLAR BLEND)       */}
            {/* ================================================================= */}
            <div
              className={`rounded-[24px] p-4 space-y-2.5 border ${
                isLight
                  ? 'bg-white border-slate-200 shadow-sm'
                  : 'bg-[#0F1114] border-white/[0.07] shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3
                    className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                      isLight ? 'text-indigo-700' : 'text-indigo-300'
                    }`}
                  >
                    <Building2 className="w-4 h-4" /> Facility Condition & Aesthetics
                  </h3>
                  <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Cleanliness, locker room upkeep & modernization ({selectedRink.condition_rating_count || 0}{' '}
                    parent {(selectedRink.condition_rating_count || 0) === 1 ? 'rating' : 'ratings'})
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`font-mono-score text-sm font-extrabold px-3 py-1 rounded-full border ${
                      isLight
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        : 'bg-indigo-400/15 text-indigo-300 border-indigo-400/30'
                    }`}
                  >
                    {getBlendedConditionRating(selectedRink).toFixed(1)} / 5.0
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((num) => {
                  const userVoted = conditionVotes[selectedRink.id] === num;
                  return (
                    <button
                      key={num}
                      disabled={busyAction}
                      onClick={() => handleRateCondition(selectedRink, num)}
                      className={`py-2 px-1 rounded-xl border text-center transition active:scale-95 ${
                        userVoted
                          ? isLight
                            ? 'bg-indigo-600 text-white border-indigo-600 font-extrabold shadow-sm'
                            : 'bg-indigo-500 text-white border-indigo-400 font-extrabold shadow-md'
                          : isLight
                          ? 'bg-slate-50 hover:bg-indigo-50 text-slate-700 border-slate-200 font-bold'
                          : 'bg-[#1A1D24] hover:bg-[#232732] text-zinc-300 border-white/[0.08] font-bold'
                      }`}
                    >
                      <div className="font-mono-score text-xs">{num}★</div>
                      <div className="text-[9px] leading-tight opacity-85 truncate mt-0.5">
                        {num === 1 ? 'Dump' : num === 3 ? 'Average' : num === 5 ? 'Modern' : '\u00A0'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ================================================================= */}
            {/* WAZE-STYLE 6-CATEGORY REPORT & UPDATE ENGINE                      */}
            {/* ================================================================= */}
            <div
              className={`rounded-[24px] p-4 space-y-3.5 border ${
                isLight
                  ? 'bg-white border-slate-200 shadow-sm'
                  : 'bg-[#0F1114] border-white/[0.07] shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]'
              }`}
            >
              {!activeCategory ? (
                <>
                  <div className="flex items-center justify-between">
                    <h3
                      className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                        isLight ? 'text-sky-800' : 'text-cyan-300'
                      }`}
                    >
                      <Flame className="w-4 h-4 text-amber-500" /> At This Rink? Tap a Category to Report
                    </h3>
                    <span className={`text-[11px] font-medium ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                      Waze-style 2-tap pulse
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {WAZE_CATEGORIES.map((cat) => {
                      const IconComp = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setActiveCategory(cat)}
                          className={`text-left active:scale-[0.98] rounded-2xl p-3 transition-all space-y-1.5 border ${
                            isLight
                              ? 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/90 hover:border-sky-400'
                              : 'bg-gradient-to-b from-[#1B1E24] to-[#15171C] hover:from-[#232730] hover:to-[#1A1D24] border-white/[0.08] hover:border-cyan-400/35'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
                              isLight ? cat.accentLight : cat.accentDark
                            }`}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div>
                            <p
                              className={`text-xs font-extrabold ${
                                isLight ? 'text-slate-900' : 'text-white'
                              }`}
                            >
                              {cat.title}
                            </p>
                            <p
                              className={`text-[10px] leading-tight mt-0.5 ${
                                isLight ? 'text-slate-500' : 'text-zinc-400'
                              }`}
                            >
                              {cat.subtitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div
                    className={`flex items-center justify-between border-b pb-2.5 ${
                      isLight ? 'border-slate-200' : 'border-white/[0.07]'
                    }`}
                  >
                    <button
                      onClick={() => setActiveCategory(null)}
                      className={`inline-flex items-center gap-1 text-xs font-extrabold ${
                        isLight ? 'text-sky-700 hover:text-sky-600' : 'text-cyan-300 hover:text-cyan-200'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>All Categories</span>
                    </button>
                    <span className={`text-xs font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {activeCategory.title}
                    </span>
                  </div>

                  {activeCategory.showPostedHoursNote && (
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-[11px] flex items-start gap-2 border ${
                        isLight
                          ? 'bg-sky-50 border-sky-200 text-sky-900'
                          : 'bg-sky-950/40 border-sky-400/25 text-sky-200'
                      }`}
                    >
                      <Info
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isLight ? 'text-sky-600' : 'text-sky-300'
                        }`}
                      />
                      <div>
                        <strong>Facility Pro Shop Info:</strong> {selectedRink.pro_shop_status}.{' '}
                        <span className="opacity-90">
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

                      let pillStyle = isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
                        : 'bg-[#1D2026] hover:bg-[#262A33] border-white/[0.09] text-zinc-100';
                      let badgeText = '';
                      let badgeColor = isLight ? 'text-slate-700' : 'text-zinc-300';

                      if (opt.type === 'issue') {
                        pillStyle = isLight
                          ? 'bg-rose-50/70 hover:bg-rose-100/70 border-rose-200 text-slate-900'
                          : 'bg-[#221B1E] hover:bg-[#2C2126] border-rose-400/25 text-zinc-100';
                        badgeText = alreadyActive ? 'Active (Tap to Confirm)' : `${opt.impact} pts`;
                        badgeColor = alreadyActive
                          ? isLight
                            ? 'text-amber-700'
                            : 'text-amber-300'
                          : isLight
                          ? 'text-rose-600'
                          : 'text-rose-400';
                      } else if (opt.type === 'info' || opt.type === 'facility_fact') {
                        pillStyle = isLight
                          ? 'bg-sky-50/80 hover:bg-sky-100/80 border-sky-200 text-sky-950'
                          : 'bg-[#182026] hover:bg-[#1E2932] border-sky-400/25 text-sky-100';
                        badgeText =
                          opt.type === 'facility_fact'
                            ? `${Number(selectedRink.corner_mats_confirmations) || 0}/${CORNER_MATS_THRESHOLD} Verified`
                            : '0 pts · Info Tag';
                        badgeColor = isLight ? 'text-sky-700' : 'text-sky-300';
                      } else if (opt.type === 'positive') {
                        pillStyle = isLight
                          ? 'bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-200 text-emerald-950'
                          : 'bg-[#182320] hover:bg-[#1E2E2A] border-emerald-400/25 text-emerald-100';
                        badgeText = `+${opt.impact} pts`;
                        badgeColor = isLight ? 'text-emerald-700' : 'text-emerald-400';
                      } else if (opt.type === 'permanent') {
                        pillStyle = isLight
                          ? 'bg-rose-100/80 hover:bg-rose-200/70 border-rose-300 text-rose-950'
                          : 'bg-rose-950/40 hover:bg-rose-950/60 border-rose-500/35 text-rose-200';
                        badgeText = 'Flag Permanent';
                        badgeColor = isLight ? 'text-rose-700' : 'text-rose-300';
                      }

                      return (
                        <button
                          key={opt.id}
                          disabled={busyAction || onCooldown}
                          onClick={() => handleWazeOptionTap(selectedRink, activeCategory, opt)}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-left text-xs font-bold transition-all active:scale-[0.99] ${
                            onCooldown
                              ? isLight
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-[#14161A] border-white/[0.04] text-zinc-500 cursor-not-allowed'
                              : pillStyle
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {(opt.type === 'info' || opt.type === 'facility_fact') && (
                              <Info
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isLight ? 'text-sky-600' : 'text-sky-400'
                                }`}
                              />
                            )}
                            {opt.type === 'permanent' && (
                              <Ban
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isLight ? 'text-rose-600' : 'text-rose-400'
                                }`}
                              />
                            )}
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
              <div
                className={`rounded-[24px] p-4 space-y-1.5 border ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-sm text-slate-700'
                    : 'bg-gradient-to-b from-[#1B1E24] to-[#15171C] border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] text-zinc-300'
                }`}
              >
                <div
                  className={`font-extrabold flex items-center gap-1.5 text-sm ${
                    isLight ? 'text-sky-700' : 'text-cyan-300'
                  }`}
                >
                  <Snowflake className="w-4 h-4" /> Ice Sheets & Temperature
                </div>
                <p className={`font-bold ${isLight ? 'text-slate-950' : 'text-white'}`}>
                  {selectedRink.inside_temp_rating}
                </p>
                <p className={isLight ? 'text-slate-500' : 'text-zinc-400'}>
                  {selectedRink.sheet_temp_notes}
                </p>
                <p className="pt-1">• {selectedRink.viewing_comfort}</p>
                <p>
                  • Corner Standing Mats:{' '}
                  <strong className={isLight ? 'text-slate-950' : 'text-white'}>
                    {selectedRink.corner_padded_mats
                      ? `Verified (${selectedRink.corner_mats_confirmations || CORNER_MATS_THRESHOLD}+ parents · Excl. Zamboni)`
                      : `Unverified / Walkways Only (${selectedRink.corner_mats_confirmations || 0}/${CORNER_MATS_THRESHOLD})`}
                  </strong>
                </p>
              </div>

              <div
                className={`rounded-[24px] p-4 space-y-1.5 border ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-sm text-slate-700'
                    : 'bg-gradient-to-b from-[#1B1E24] to-[#15171C] border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] text-zinc-300'
                }`}
              >
                <div
                  className={`font-extrabold flex items-center gap-1.5 text-sm ${
                    isLight ? 'text-sky-700' : 'text-cyan-300'
                  }`}
                >
                  <Eye className="w-4 h-4" /> Glass, Scoreboard & Stream
                </div>
                <p>• Glass: {selectedRink.glass_clarity}</p>
                <p>• Scoreboard: {selectedRink.corner_scoreboard}</p>
                <p>
                  • Streaming: {selectedRink.streaming_provider} ({selectedRink.streaming_status})
                </p>
                <p>• Monitors: {selectedRink.locker_room_monitors}</p>
              </div>

              {/* Pro Shop, 24/7 Vending & Food */}
              <div
                className={`rounded-[24px] p-4 space-y-1.5 border ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-sm text-slate-700'
                    : 'bg-gradient-to-b from-[#1B1E24] to-[#15171C] border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] text-zinc-300'
                }`}
              >
                <div
                  className={`font-extrabold flex items-center gap-1.5 text-sm ${
                    isLight ? 'text-sky-700' : 'text-cyan-300'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" /> Pro Shop, 24/7 Vending & Food
                </div>
                <p>• Shop: {selectedRink.pro_shop_status}</p>
                <p>
                  • 24/7 Gear Vending:{' '}
                  <strong className={isLight ? 'text-slate-950' : 'text-white'}>
                    {selectedRink.has_hockey_vending ? 'Yes' : 'No'}
                  </strong>
                </p>
                <p>• Food/Bar: {selectedRink.food_options}</p>
                <p className={`italic pt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  {selectedRink.nearby_fallback_notes}
                </p>
              </div>

              <div
                className={`rounded-[24px] p-4 space-y-1.5 border ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-sm text-slate-700'
                    : 'bg-gradient-to-b from-[#1B1E24] to-[#15171C] border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] text-zinc-300'
                }`}
              >
                <div
                  className={`font-extrabold flex items-center gap-1.5 text-sm ${
                    isLight ? 'text-sky-700' : 'text-cyan-300'
                  }`}
                >
                  <Footprints className="w-4 h-4" /> Floors, Parking & Off-Ice
                </div>
                <p>• Floors: {selectedRink.skate_friendly_floors}</p>
                <p>• Cleanliness: {selectedRink.cleanliness_smell}</p>
                <p>
                  • Water Bottle Filler:{' '}
                  <strong className={isLight ? 'text-slate-950' : 'text-white'}>
                    {selectedRink.water_bottle_fillers ? 'Yes' : 'Check Lobby'}
                  </strong>
                </p>
                <p>• Drop-Off/Lot: {selectedRink.parking_bag_drop}</p>
                <p>• Off-Ice: {selectedRink.off_ice_training}</p>
              </div>
            </div>

            {/* Smart Contextual Gear Recommendations */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3
                  className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                    isLight ? 'text-emerald-700' : 'text-emerald-300'
                  }`}
                >
                  <Sparkles className="w-4 h-4" /> Smart Prep For This Rink
                </h3>
                <span className={`text-[10px] font-medium ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
                  Reader-supported links
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {getContextualGear(selectedRink).map((gear, i) => (
                  <a
                    key={i}
                    href={gear.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block rounded-[22px] p-4 transition-all border ${
                      isLight
                        ? 'bg-gradient-to-r from-emerald-50/90 to-white hover:from-emerald-100/70 border-emerald-200 shadow-sm'
                        : 'bg-gradient-to-r from-[#18221F] to-[#16191F] hover:from-[#1E2B27] hover:to-[#1C2028] border-emerald-400/25 shadow-[inset_0_1px_0_0_rgba(52,211,153,0.18)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          isLight
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-emerald-400/15 text-emerald-300'
                        }`}
                      >
                        {gear.badge}
                      </span>
                      <span
                        className={`text-xs font-extrabold inline-flex items-center gap-1 ${
                          isLight ? 'text-sky-700' : 'text-cyan-300'
                        }`}
                      >
                        {gear.cta} <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    <p
                      className={`font-extrabold text-sm mt-2 ${
                        isLight ? 'text-slate-950' : 'text-white'
                      }`}
                    >
                      {gear.title}
                    </p>
                    <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                      {gear.reason}
                    </p>
                  </a>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div
              className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
                isLight ? 'border-slate-200' : 'border-white/[0.08]'
              }`}
            >
              <button
                onClick={() => handleVerifyRink(selectedRink)}
                className={`px-4 py-2.5 rounded-full active:scale-95 font-bold inline-flex items-center gap-1.5 border transition ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-900 border-slate-200 shadow-sm'
                    : 'bg-[#242830] hover:bg-[#2E333D] text-zinc-100 border-white/[0.08]'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Confirm Info Accurate Today
              </button>

              <a
                href={`mailto:myrinkrankings@gmail.com?subject=Update%20or%20Claim%20Rink:%20${encodeURIComponent(
                  selectedRink.name
                )}`}
                className={`underline font-medium ${
                  isLight
                    ? 'text-slate-500 hover:text-sky-700'
                    : 'text-zinc-400 hover:text-cyan-300'
                }`}
              >
                Rink Manager? Claim or Request Staff PIN
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FACILITY & AMENITY HOURS POPUP MODAL                                  */}
      {/* ===================================================================== */}
      {selectedRink && showHoursModal && (
        <div
          onClick={() => setShowHoursModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-[30px] p-6 space-y-4 border ${
              isLight
                ? 'bg-white border-slate-200 shadow-2xl text-slate-900'
                : 'bg-gradient-to-b from-[#1E2127] to-[#121418] border-white/[0.14] shadow-2xl text-zinc-100'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div
                  className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider ${
                    isLight ? 'text-sky-700' : 'text-cyan-300'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" /> Facility & Amenity Hours
                </div>
                <h3
                  className={`font-extrabold text-lg mt-0.5 ${
                    isLight ? 'text-slate-950' : 'text-white'
                  }`}
                >
                  {selectedRink.name}
                </h3>
              </div>
              <button
                onClick={() => setShowHoursModal(false)}
                className={`p-2 rounded-full ${
                  isLight
                    ? 'bg-slate-100 text-slate-600 hover:text-slate-950'
                    : 'bg-[#272B33] text-zinc-300 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {hasAnyHours(selectedRink) ? (
              <div className="space-y-2.5 text-xs">
                {[
                  {
                    label: 'Building / Rink Doors',
                    value: selectedRink.amenity_hours?.building,
                    fallback: 'Typically opens 30–45 min before first ice slot',
                  },
                  {
                    label: 'Pro Shop & Sharpening',
                    value: selectedRink.amenity_hours?.pro_shop,
                    fallback: selectedRink.pro_shop_status || 'Hours not listed',
                  },
                  {
                    label: 'Snack Bar / Coffee',
                    value: selectedRink.amenity_hours?.snack_bar,
                    fallback: 'Varies by game/tournament schedule',
                  },
                  {
                    label: 'Restaurant / Bar',
                    value: selectedRink.amenity_hours?.bar_restaurant,
                    fallback: selectedRink.has_bar_restaurant ? 'Hours not listed' : 'None on-site',
                  },
                ].map((row, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl p-3.5 border ${
                      isLight
                        ? 'bg-slate-50 border-slate-200/80'
                        : 'bg-[#0F1114] border-white/[0.07]'
                    }`}
                  >
                    <p
                      className={`text-[11px] font-extrabold uppercase tracking-wider ${
                        isLight ? 'text-slate-500' : 'text-zinc-400'
                      }`}
                    >
                      {row.label}
                    </p>
                    <p
                      className={`font-bold text-sm mt-0.5 ${
                        row.value
                          ? isLight
                            ? 'text-slate-950'
                            : 'text-white'
                          : isLight
                          ? 'text-slate-400 font-medium text-xs'
                          : 'text-zinc-500 font-medium text-xs'
                      }`}
                    >
                      {row.value || row.fallback}
                    </p>
                  </div>
                ))}

                <p className={`text-[11px] pt-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Hours can shift during tournament weekends & holidays
                  {selectedRink.amenity_hours?.updated_at
                    ? ` · Last verified ${selectedRink.amenity_hours.updated_at}`
                    : ''}
                  .
                </p>
              </div>
            ) : (
              <div
                className={`rounded-2xl p-4 space-y-2 text-xs border ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-600'
                    : 'bg-[#0F1114] border-white/[0.07] text-zinc-300'
                }`}
              >
                <p className={`font-extrabold text-sm ${isLight ? 'text-slate-950' : 'text-white'}`}>
                  Posted hours not added yet
                </p>
                <p>
                  Know when the pro shop, snack bar, or doors open here? Send us a quick note and
                  we will add it for all hockey families.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <a
                href={`mailto:myrinkrankings@gmail.com?subject=${encodeURIComponent(
                  `Rink Hours Update: ${selectedRink.name} (${selectedRink.city}, ${selectedRink.state})`
                )}&body=${encodeURIComponent(
                  `Building Doors:\nPro Shop / Sharpening:\nSnack Bar / Coffee:\nRestaurant / Bar:\n`
                )}`}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full font-extrabold text-xs transition ${
                  isLight
                    ? 'bg-slate-950 hover:bg-slate-800 text-white'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-zinc-950'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Submit / Update Hours</span>
              </a>
              <button
                onClick={() => setShowHoursModal(false)}
                className={`px-4 py-2.5 rounded-full font-bold text-xs ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    : 'bg-[#242830] hover:bg-[#2F343E] text-zinc-200'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FOUNDER ADMIN MODAL (PIN-Protected Photos, Hours, Closures & Queue)   */}
      {/* ===================================================================== */}
      {showAdminPinModal && (
        <div
          onClick={() => setShowAdminPinModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-[30px] p-6 space-y-4 border ${
              isLight
                ? 'bg-white border-slate-200 shadow-2xl text-slate-900'
                : 'bg-gradient-to-b from-[#1E2127] to-[#121418] border-white/[0.14] shadow-2xl text-zinc-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3
                className={`font-extrabold text-lg flex items-center gap-2 ${
                  isLight ? 'text-slate-950' : 'text-white'
                }`}
              >
                <Lock className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} /> Founder
                Admin Panel
              </h3>
              <button
                onClick={() => setShowAdminPinModal(false)}
                className={`p-2 rounded-full ${
                  isLight
                    ? 'bg-slate-100 text-slate-600 hover:text-slate-950'
                    : 'bg-[#272B33] text-zinc-300 hover:text-white'
                }`}
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
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Enter your 4-digit Founder PIN to upload exterior photos, edit amenity hours,
                  review permanent closure flags, and publish newly submitted rinks.
                </p>
                <input
                  type="password"
                  maxLength={4}
                  autoFocus
                  placeholder="••••"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  className={`w-full border rounded-2xl px-4 py-3 text-center font-mono-score text-xl tracking-widest focus:outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 focus:border-sky-500 text-slate-950'
                      : 'bg-[#0F1114] border-white/[0.1] focus:border-cyan-400/50 text-white'
                  }`}
                />
                <button
                  type="submit"
                  className={`w-full font-extrabold py-3 rounded-full ${
                    isLight
                      ? 'bg-slate-950 text-white'
                      : 'bg-gradient-to-b from-cyan-300 to-cyan-400 text-zinc-950'
                  }`}
                >
                  Unlock Admin Queue
                </button>
              </form>
            ) : (
              <div className="space-y-5 text-xs">
                {/* Upload / Replace Rink Exterior Photo */}
                <div
                  className={`space-y-2.5 border rounded-2xl p-3.5 ${
                    isLight ? 'bg-sky-50/70 border-sky-200' : 'bg-[#0F1114] border-cyan-400/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`font-extrabold uppercase tracking-wider ${
                        isLight ? 'text-sky-800' : 'text-cyan-300'
                      }`}
                    >
                      Upload / Replace Rink Exterior Photo
                    </h4>
                    <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      Auto-compressed
                    </span>
                  </div>
                  <select
                    value={adminPhotoRinkId}
                    onChange={(e) => setAdminPhotoRinkId(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-[#181B20] border-white/[0.1] text-white'
                    }`}
                  >
                    <option value="">-- Select a Rink --</option>
                    {[...rinks]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.exterior_image_url ? '✓ ' : '○ '} {r.name} ({r.city}, {r.state})
                        </option>
                      ))}
                  </select>

                  {adminPhotoRinkId && (
                    <label
                      className={`block w-full text-center py-2.5 px-4 rounded-full font-extrabold text-xs cursor-pointer transition ${
                        uploadingExterior
                          ? 'opacity-50 cursor-wait bg-slate-400 text-white'
                          : isLight
                          ? 'bg-slate-950 hover:bg-slate-800 text-white'
                          : 'bg-cyan-400 hover:bg-cyan-300 text-zinc-950'
                      }`}
                    >
                      {uploadingExterior
                        ? 'Compressing & Uploading...'
                        : 'Choose Exterior Photo (Auto-Resizes)'}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingExterior}
                        onChange={handleAdminUploadExterior}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Edit Rink & Amenity Hours */}
                <div
                  className={`space-y-2.5 border rounded-2xl p-3.5 ${
                    isLight ? 'bg-indigo-50/60 border-indigo-200' : 'bg-[#0F1114] border-indigo-400/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`font-extrabold uppercase tracking-wider ${
                        isLight ? 'text-indigo-800' : 'text-indigo-300'
                      }`}
                    >
                      Edit Rink & Amenity Hours
                    </h4>
                    <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      Leave blank if N/A
                    </span>
                  </div>

                  <select
                    value={adminHoursRinkId}
                    onChange={(e) => handleSelectAdminHoursRink(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-[#181B20] border-white/[0.1] text-white'
                    }`}
                  >
                    <option value="">-- Select a Rink to Set Hours --</option>
                    {[...rinks]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {hasAnyHours(r) ? '✓ ' : '○ '} {r.name} ({r.city}, {r.state})
                        </option>
                      ))}
                  </select>

                  {adminHoursRinkId && (
                    <form onSubmit={handleAdminSaveHours} className="space-y-2 pt-1">
                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                          Building / Rink Doors
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Opens 30m before first ice · Closes 11 PM"
                          value={adminHoursForm.building}
                          onChange={(e) => setAdminHoursForm({ ...adminHoursForm, building: e.target.value })}
                          className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-900'
                              : 'bg-[#181B20] border-white/[0.1] text-white'
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                          Pro Shop & Sharpening
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Mon-Fri 4p-8p · Sat-Sun 8a-6p"
                          value={adminHoursForm.pro_shop}
                          onChange={(e) => setAdminHoursForm({ ...adminHoursForm, pro_shop: e.target.value })}
                          className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-900'
                              : 'bg-[#181B20] border-white/[0.1] text-white'
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                          Snack Bar / Coffee Counter
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Sat-Sun 7:30a-5p · Closed Weeknights"
                          value={adminHoursForm.snack_bar}
                          onChange={(e) => setAdminHoursForm({ ...adminHoursForm, snack_bar: e.target.value })}
                          className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-900'
                              : 'bg-[#181B20] border-white/[0.1] text-white'
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                          Restaurant / Bar
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Thu-Sun 12p-10p (or None)"
                          value={adminHoursForm.bar_restaurant}
                          onChange={(e) => setAdminHoursForm({ ...adminHoursForm, bar_restaurant: e.target.value })}
                          className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-900'
                              : 'bg-[#181B20] border-white/[0.1] text-white'
                          }`}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={savingHours}
                        className={`w-full py-2.5 px-4 rounded-full font-extrabold text-xs transition ${
                          isLight
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            : 'bg-indigo-500 hover:bg-indigo-400 text-white'
                        }`}
                      >
                        {savingHours ? 'Saving Hours...' : 'Save Rink & Amenity Hours'}
                      </button>
                    </form>
                  )}
                </div>

                {/* Pending Permanent Closures */}
                <div className="space-y-2.5">
                  <h4
                    className={`font-extrabold uppercase tracking-wider ${
                      isLight ? 'text-rose-700' : 'text-rose-300'
                    }`}
                  >
                    Pending Permanent Closures ({permanentClosureFlags.length})
                  </h4>
                  {permanentClosureFlags.length === 0 ? (
                    <p
                      className={`rounded-2xl p-3 ${
                        isLight ? 'text-slate-500 bg-slate-100' : 'text-zinc-500 bg-[#0F1114]'
                      }`}
                    >
                      No permanent closure flags waiting for review.
                    </p>
                  ) : (
                    permanentClosureFlags.map((flag) => {
                      const target = rinks.find((r) => r.id === flag.rink_id);
                      const meta = parseAlertMeta(flag);
                      return (
                        <div
                          key={flag.id}
                          className={`border rounded-2xl p-3.5 space-y-2.5 ${
                            isLight
                              ? 'bg-rose-50/70 border-rose-200'
                              : 'bg-[#0F1114] border-rose-400/30'
                          }`}
                        >
                          <div>
                            <p
                              className={`font-extrabold text-sm ${
                                isLight ? 'text-slate-950' : 'text-white'
                              }`}
                            >
                              {target ? target.name : 'Unknown Rink'}
                            </p>
                            <p
                              className={`font-bold mt-0.5 ${
                                isLight ? 'text-rose-700' : 'text-rose-300'
                              }`}
                            >
                              {meta.cleanLabel}
                            </p>
                            <p className={`mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
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
                              className={`px-3.5 py-2 rounded-full font-bold ${
                                isLight
                                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                                  : 'bg-[#242830] hover:bg-[#2F343E] text-zinc-200'
                              }`}
                            >
                              Dismiss (False Alarm)
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Submitted Missing Rinks */}
                <div
                  className={`space-y-2.5 border-t pt-4 ${
                    isLight ? 'border-slate-200' : 'border-white/[0.08]'
                  }`}
                >
                  <h4
                    className={`font-extrabold uppercase tracking-wider ${
                      isLight ? 'text-sky-700' : 'text-cyan-300'
                    }`}
                  >
                    Submitted Missing Rinks ({pendingRinks.length})
                  </h4>
                  {pendingRinks.length === 0 ? (
                    <p
                      className={`rounded-2xl p-3 ${
                        isLight ? 'text-slate-500 bg-slate-100' : 'text-zinc-500 bg-[#0F1114]'
                      }`}
                    >
                      No new rink submissions yet.
                    </p>
                  ) : (
                    pendingRinks.map((pr) => (
                      <div
                        key={pr.id}
                        className={`border rounded-2xl p-3.5 space-y-2.5 ${
                          isLight
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-[#0F1114] border-white/[0.08]'
                        }`}
                      >
                        <div>
                          <p className={`font-extrabold text-sm ${isLight ? 'text-slate-950' : 'text-white'}`}>
                            {pr.name} ({pr.city}, {pr.state}) • {pr.sheets || 1} Sheet(s)
                          </p>
                          {pr.submitted_notes && (
                            <p className={`mt-1 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                              {pr.submitted_notes}
                            </p>
                          )}
                        </div>
                        <button
                          disabled={busyAction}
                          onClick={() => handleAdminPublishPendingRink(pr)}
                          className="px-3.5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold"
                        >
                          Approve & Publish to Live Board
                        </button>
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
            className={`w-full max-w-md rounded-[30px] p-6 space-y-4 border ${
              isLight
                ? 'bg-white border-slate-200 shadow-2xl text-slate-900'
                : 'bg-gradient-to-b from-[#1E2127] to-[#121418] border-white/[0.12] shadow-[0_24px_60px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.16)] text-zinc-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`font-extrabold text-lg ${isLight ? 'text-slate-950' : 'text-white'}`}>
                Submit a Missing Rink
              </h3>
              <button
                onClick={() => setShowAddRink(false)}
                className={`p-2 rounded-full ${
                  isLight
                    ? 'bg-slate-100 text-slate-600 hover:text-slate-950'
                    : 'bg-[#272B33] text-zinc-300 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddRinkSubmit} className="space-y-3.5 text-sm">
              <div>
                <label
                  className={`block text-xs font-bold mb-1.5 ${
                    isLight ? 'text-slate-600' : 'text-zinc-400'
                  }`}
                >
                  Rink Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g., Floyd Hall Arena"
                  value={newRink.name}
                  onChange={(e) => setNewRink({ ...newRink, name: e.target.value })}
                  className={`w-full border rounded-2xl px-4 py-2.5 focus:outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 focus:border-sky-500 text-slate-950'
                      : 'bg-[#0F1114] border-white/[0.08] focus:border-cyan-400/50 text-white'
                  }`}
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label
                    className={`block text-xs font-bold mb-1.5 ${
                      isLight ? 'text-slate-600' : 'text-zinc-400'
                    }`}
                  >
                    City / Town *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g., Little Falls"
                    value={newRink.city}
                    onChange={(e) => setNewRink({ ...newRink, city: e.target.value })}
                    className={`w-full border rounded-2xl px-4 py-2.5 focus:outline-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 focus:border-sky-500 text-slate-950'
                        : 'bg-[#0F1114] border-white/[0.08] focus:border-cyan-400/50 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label
                    className={`block text-xs font-bold mb-1.5 ${
                      isLight ? 'text-slate-600' : 'text-zinc-400'
                    }`}
                  >
                    State
                  </label>
                  <select
                    value={newRink.state}
                    onChange={(e) => setNewRink({ ...newRink, state: e.target.value })}
                    className={`w-full border rounded-2xl px-3 py-2.5 focus:outline-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 focus:border-sky-500 text-slate-950'
                        : 'bg-[#0F1114] border-white/[0.08] focus:border-cyan-400/50 text-white'
                    }`}
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
                <label
                  className={`block text-xs font-bold mb-1.5 ${
                    isLight ? 'text-slate-600' : 'text-zinc-400'
                  }`}
                >
                  Quick Notes (Pro shop, coldness, LiveBarn, etc.)
                </label>
                <textarea
                  rows={3}
                  placeholder="Tell other parents what to expect..."
                  value={newRink.notes}
                  onChange={(e) => setNewRink({ ...newRink, notes: e.target.value })}
                  className={`w-full border rounded-2xl px-4 py-2.5 focus:outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 focus:border-sky-500 text-slate-950'
                      : 'bg-[#0F1114] border-white/[0.08] focus:border-cyan-400/50 text-white'
                  }`}
                />
              </div>
              <button
                type="submit"
                disabled={submittingRink}
                className={`w-full font-extrabold py-3 rounded-full shadow-lg transition ${
                  isLight
                    ? 'bg-slate-950 hover:bg-slate-800 text-white'
                    : 'bg-gradient-to-b from-cyan-300 to-cyan-400 hover:from-cyan-200 hover:to-cyan-300 text-zinc-950'
                }`}
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
            className={`w-full max-w-lg rounded-[30px] p-6 space-y-3 text-xs border ${
              isLight
                ? 'bg-white border-slate-200 shadow-2xl text-slate-600'
                : 'bg-gradient-to-b from-[#1E2127] to-[#121418] border-white/[0.12] shadow-[0_24px_60px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.16)] text-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`font-extrabold text-base ${isLight ? 'text-slate-950' : 'text-white'}`}>
                Affiliate Disclosure, Terms & Privacy
              </h3>
              <button
                onClick={() => setShowLegalModal(false)}
                className={`p-2 rounded-full ${
                  isLight ? 'bg-slate-100 text-slate-600' : 'bg-[#272B33] text-zinc-300'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p>
              <strong className={isLight ? 'text-slate-950' : 'text-white'}>
                Affiliate Disclosure:
              </strong>{' '}
              MyRinkRankings is 100% free for hockey families. To keep the app free, some gear links
              (such as Amazon, Pure Hockey, or HockeyMonkey) may earn a small commission at zero
              extra cost to you.
            </p>
            <p>
              <strong className={isLight ? 'text-slate-950' : 'text-white'}>
                Community Scores:
              </strong>{' '}
              Rink scores and live pulse updates reflect crowdsourced parent observations and
              automatically expire after 4 to 48 hours unless confirmed permanent.
            </p>
            <p>
              <strong className={isLight ? 'text-slate-950' : 'text-white'}>
                Privacy & Contact:
              </strong>{' '}
              We do not sell personal user data. Questions or rink verification requests can be sent
              to{' '}
              <span className={isLight ? 'text-sky-700 font-semibold' : 'text-cyan-400'}>
                myrinkrankings@gmail.com
              </span>
              .
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
