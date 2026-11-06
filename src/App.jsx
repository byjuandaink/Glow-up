import React, { useState, useEffect, useRef, useMemo } from 'react';
import './theme.css';
import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import {
  Dumbbell, Utensils, Sparkles, Clock, CalendarDays, Droplet, Check,
  Play, Pause, RotateCcw, Volume2, Activity, ChevronLeft, ChevronRight,
  Cloud, CloudOff, HardDrive, Moon, LogOut
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Firebase                                                           */
/* ------------------------------------------------------------------ */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const firebaseReady = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
const app = firebaseReady ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const googleProvider = new GoogleAuthProvider();

/* ------------------------------------------------------------------ */
/*  Constantes                                                         */
/* ------------------------------------------------------------------ */
const LS_KEY = 'glowup90_v3';
const TOTAL_DAYS = 90;
const DAY_MS = 86400000;

const CHECKS = [
  { key: 'workout', label: 'Entrené según la rutina del día' },
  { key: 'nutrition', label: 'Cumplí las comidas y el superávit calórico' },
  { key: 'skincare', label: 'Skincare de la mañana y la noche, con protector solar' },
  { key: 'water', label: 'Tomé 3 litros de agua' },
  { key: 'study', label: 'Hice mi bloque de estudio o trabajo profundo' }
];

const EMPTY_DAY = {
  water: 0,
  checklist: { workout: false, nutrition: false, skincare: false, water: false, study: false },
  weights: {}
};

const SCHEDULE = [
  { id: 1, time: '06:00', title: 'Despertar, agua (500 ml) y skincare de la mañana' },
  { id: 2, time: '06:30', title: 'Entrenamiento de fuerza' },
  { id: 3, time: '07:45', title: 'Ducha y desayuno alto en calorías y proteína' },
  { id: 4, time: '08:30', title: 'Bloque de estudio o trabajo profundo' },
  { id: 5, time: '11:00', title: 'Merienda: batido o fruta con frutos secos' },
  { id: 6, time: '13:00', title: 'Almuerzo completo y caminata corta' },
  { id: 7, time: '16:30', title: 'Merienda con proteína' },
  { id: 8, time: '19:00', title: 'Cena completa' },
  { id: 9, time: '21:30', title: 'Skincare de la noche, postura y pantallas fuera' },
  { id: 10, time: '22:30', title: 'A dormir (7 a 9 horas)' }
];

// getDay(): 0 = domingo ... 6 = sábado
const ROUTINE = {
  1: {
    name: 'Pecho y hombro',
    exercises: [
      { name: 'Press de banca plano con barra', sets: 4, reps: '6-8', rest: 150, note: 'Pesado' },
      { name: 'Press inclinado con mancuernas', sets: 3, reps: '8-10', rest: 120 },
      { name: 'Aperturas en polea o contractora', sets: 3, reps: '10-12', rest: 90 },
      { name: 'Press militar con barra o mancuernas', sets: 4, reps: '6-8', rest: 150 },
      { name: 'Elevaciones laterales con mancuernas', sets: 4, reps: '12-15', rest: 90 }
    ]
  },
  2: {
    name: 'Pierna completa (cuádriceps)',
    exercises: [
      { name: 'Sentadilla libre con barra', sets: 4, reps: '6-8', rest: 180 },
      { name: 'Prensa de piernas 45°', sets: 3, reps: '8-10', rest: 150 },
      { name: 'Extensiones de cuádriceps en máquina', sets: 3, reps: '10-12', rest: 90 },
      { name: 'Curl de isquiosurales tumbado', sets: 4, reps: '10-12', rest: 90 },
      { name: 'Elevación de talones de pie', sets: 4, reps: '12-15', rest: 90, note: 'Pantorrillas' }
    ]
  },
  3: {
    name: 'Espalda y brazo',
    exercises: [
      { name: 'Dominadas o jalón al pecho', sets: 4, reps: '8-10', rest: 120 },
      { name: 'Remo con barra o remo en polea baja', sets: 4, reps: '6-8', rest: 150 },
      { name: 'Remo con mancuerna a una mano', sets: 3, reps: '8-10', rest: 90 },
      { name: 'Curl de bíceps con barra EZ', sets: 3, reps: '8-10', rest: 90 },
      { name: 'Press francés o extensión de tríceps en polea', sets: 3, reps: '8-10', rest: 90 },
      { name: 'Curl martillo con mancuernas', sets: 2, reps: '10-12', rest: 60 }
    ]
  },
  4: {
    name: 'Pecho y abdomen',
    exercises: [
      { name: 'Press inclinado con barra', sets: 4, reps: '6-8', rest: 150 },
      { name: 'Press de banca plano con mancuernas', sets: 3, reps: '8-10', rest: 120 },
      { name: 'Fondos en paralelas, torso inclinado', sets: 3, reps: 'Fallo técnico (máx. 12)', rest: 120 },
      { name: 'Crunches en polea alta', sets: 3, reps: '12-15', rest: 60 },
      { name: 'Elevación de piernas colgado en barra', sets: 3, reps: '10-12', rest: 60 }
    ]
  },
  5: {
    name: 'Pierna (isquios y glúteos)',
    exercises: [
      { name: 'Peso muerto rumano con barra', sets: 4, reps: '6-8', rest: 180 },
      { name: 'Sentadilla búlgara con mancuernas', sets: 3, reps: '8-10 por pierna', rest: 120 },
      { name: 'Hip thrust con barra', sets: 3, reps: '8-10', rest: 120 },
      { name: 'Curl de isquiosurales sentado', sets: 3, reps: '10-12', rest: 90 },
      { name: 'Elevación de talones sentado', sets: 4, reps: '12-15', rest: 60, note: 'Sóleo' }
    ]
  }
};

const WEEK_LABELS = [
  { d: 1, label: 'Lunes' }, { d: 2, label: 'Martes' }, { d: 3, label: 'Miércoles' },
  { d: 4, label: 'Jueves' }, { d: 5, label: 'Viernes' }, { d: 6, label: 'Sábado' }, { d: 0, label: 'Domingo' }
];

const NUTRITION = [
  { t: 'Desayuno', d: '3 huevos enteros, 80 g de avena con banano y mantequilla de maní, leche entera y una fruta.' },
  { t: 'Almuerzo', d: '200 g de pollo o carne magra, 250 g de arroz o pasta cocida, legumbres y vegetales con aceite de oliva.' },
  { t: 'Cena', d: '200 g de pescado o carne, papa o arroz, ensalada con aguacate. Nada de ayuno: la cena cuenta para el superávit.' },
  { t: 'Meriendas', d: 'Batido con leche, avena y banano; yogur griego con frutos secos; sándwich de atún o pavo.' },
  { t: 'Antes de entrenar', d: 'Carbohidrato fácil (banano, pan o avena) y café si te funciona.' },
  { t: 'Suplementos', d: 'Creatina monohidratada y proteína en polvo si no llegas a tu meta diaria. Consulta con un profesional de la salud.' }
];

/* ------------------------------------------------------------------ */
/*  Utilidades                                                         */
/* ------------------------------------------------------------------ */
const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const parseISO = (s) => new Date(`${s}T00:00:00`);
const dateForDay = (start, n) => new Date(parseISO(start).getTime() + (n - 1) * DAY_MS);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const fmtDate = (d) => d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtClock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const dayScore = (d) => (d ? Object.values(d.checklist || {}).filter(Boolean).length : 0);
const hhmmNow = () => {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
};

const playAlarmSound = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) { /* audio bloqueado por el navegador */ }
};

const readLocal = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignorar */ }
  return null;
};

// Por cada día gana el registro más reciente (updatedAt)
const mergeDays = (a, b) => {
  const out = { ...a };
  Object.entries(b || {}).forEach(([k, v]) => {
    if (!out[k] || (v.updatedAt || 0) >= (out[k].updatedAt || 0)) out[k] = v;
  });
  return out;
};

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */
export default function App() {
  const initial = useMemo(() => readLocal(), []);
  const [startDate, setStartDate] = useState(initial?.startDate || toISO(new Date()));
  const [days, setDays] = useState(initial?.days || {});
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentDay, setCurrentDay] = useState(() => {
    const s = initial?.startDate || toISO(new Date());
    return clamp(Math.floor((Date.now() - parseISO(s).getTime()) / DAY_MS) + 1, 1, TOTAL_DAYS);
  });
  const [user, setUser] = useState(firebaseReady ? undefined : null); // undefined = cargando
  const [sync, setSync] = useState(firebaseReady ? 'connecting' : 'local');
  const [syncError, setSyncError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [clock, setClock] = useState(hhmmNow());

  const [timerSeconds, setTimerSeconds] = useState(150);
  const [timerActive, setTimerActive] = useState(false);
  const [timerDone, setTimerDone] = useState(false);

  const daysRef = useRef(days);
  const startRef = useRef(startDate);
  const pending = useRef({});
  const saveTimer = useRef(null);

  useEffect(() => { daysRef.current = days; }, [days]);
  useEffect(() => { startRef.current = startDate; }, [startDate]);

  // Copia local siempre
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ startDate, days })); } catch (e) { /* lleno */ }
  }, [startDate, days]);

  /* ---------- Escritura en Firestore (solo lo que cambió) ---------- */
  const queuePush = (patch) => {
    if (!db || !user) return;
    pending.current = {
      ...pending.current,
      ...patch,
      days: { ...(pending.current.days || {}), ...(patch.days || {}) }
    };
    setSync('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const p = pending.current;
      pending.current = {};
      try {
        await setDoc(doc(db, 'users', user.uid), { ...p, updatedAt: Date.now() }, { merge: true });
        setSync('synced');
        setSyncError('');
      } catch (e) {
        console.error('Error guardando en Firebase:', e);
        setSync('error');
        setSyncError(e.code || e.message);
      }
    }, 500);
  };

  const updateDay = (n, patch) => {
    const prev = days[n] || EMPTY_DAY;
    const next = { ...prev, ...patch, updatedAt: Date.now() };
    setDays((d) => ({ ...d, [n]: next }));
    queuePush({ days: { [n]: next } });
  };

  const changeStartDate = (value) => {
    if (!value) return;
    setStartDate(value);
    queuePush({ startDate: value });
  };

  /* ---------- Sesión ---------- */
  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const login = async () => {
    setLoginError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setLoginError(e.code || e.message);
    }
  };

  /* ---------- Escucha en tiempo real ---------- */
  useEffect(() => {
    if (!db || !user) return undefined;
    setSync('connecting');
    let first = true;
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.metadata.hasPendingWrites) return; // eco de mi propio cambio
        const remote = snap.data() || {};
        const merged = mergeDays(daysRef.current, remote.days);
        setDays(merged);
        if (remote.startDate) setStartDate(remote.startDate);

        if (first) {
          first = false;
          // Sube lo local que sea más nuevo o que la nube no tenga
          const newer = {};
          Object.entries(merged).forEach(([k, v]) => {
            if (!remote.days?.[k] || (v.updatedAt || 0) > (remote.days[k].updatedAt || 0)) newer[k] = v;
          });
          const patch = {};
          if (Object.keys(newer).length) patch.days = newer;
          if (!remote.startDate) patch.startDate = startRef.current;
          if (Object.keys(patch).length) queuePush(patch);
        }
        setSync('synced');
        setSyncError('');
      },
      (e) => {
        console.error('Error escuchando Firestore:', e);
        setSync('error');
        setSyncError(e.code || e.message);
      }
    );
    return () => { unsub(); clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* ---------- Temporizador ---------- */
  useEffect(() => {
    if (!timerActive) return undefined;
    if (timerSeconds <= 0) {
      setTimerActive(false);
      setTimerDone(true);
      playAlarmSound();
      return undefined;
    }
    const t = setTimeout(() => setTimerSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timerActive, timerSeconds]);

  const setTimer = (s, run = false) => {
    setTimerDone(false);
    setTimerSeconds(s);
    setTimerActive(run);
  };

  /* ---------- Alarmas del cronograma ---------- */
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hhmm = hhmmNow();
      setClock(hhmm);
      if (now.getSeconds() === 0 && SCHEDULE.some((s) => s.time === hhmm)) playAlarmSound();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /* ---------- Derivados ---------- */
  const today = clamp(Math.floor((Date.now() - parseISO(startDate).getTime()) / DAY_MS) + 1, 1, TOTAL_DAYS);
  const dayData = days[currentDay] || EMPTY_DAY;
  const dateOfCurrent = dateForDay(startDate, currentDay);
  const weekday = dateOfCurrent.getDay();
  const routine = ROUTINE[weekday] || null;

  const completedDays = Object.keys(days).filter((k) => dayScore(days[k]) === CHECKS.length).length;
  const streak = (() => {
    let s = 0;
    for (let d = today; d >= 1; d--) {
      if (dayScore(days[d]) === CHECKS.length) s++;
      else if (d !== today) break;
    }
    return s;
  })();

  const phase = currentDay <= 30
    ? 'Fase 1: Técnica y hábitos'
    : currentDay <= 60
      ? 'Fase 2: Sobrecarga progresiva'
      : 'Fase 3: Intensidad y consolidación';

  const toggleCheck = (key, value) =>
    updateDay(currentDay, { checklist: { ...dayData.checklist, [key]: value } });

  const setWater = (n) => {
    const v = clamp(n, 0, 12);
    updateDay(currentDay, {
      water: v,
      checklist: { ...dayData.checklist, water: v >= 12 ? true : dayData.checklist.water }
    });
  };

  const setWeight = (exIdx, value) =>
    updateDay(currentDay, { weights: { ...dayData.weights, [`${weekday}-${exIdx}`]: value } });

  const previousWeight = (exIdx) => {
    const key = `${weekday}-${exIdx}`;
    for (let d = currentDay - 1; d >= 1; d--) {
      const w = days[d]?.weights?.[key];
      if (w) return w;
    }
    return null;
  };

  const goToDay = (n) => setCurrentDay(clamp(n, 1, TOTAL_DAYS));
  const currentSlot = [...SCHEDULE].reverse().find((s) => s.time <= clock)?.id;

  const tabs = [
    { id: 'dashboard', label: 'Hoy', icon: Activity },
    { id: 'calendar', label: 'Calendario', icon: CalendarDays },
    { id: 'gym', label: 'Entrenamiento', icon: Dumbbell },
    { id: 'schedule', label: 'Horarios', icon: Clock },
    { id: 'nutrition', label: 'Nutrición', icon: Utensils },
    { id: 'glow', label: 'Estilo', icon: Sparkles }
  ];

  const syncBadge = {
    local: { icon: HardDrive, text: 'Guardado en este dispositivo' },
    connecting: { icon: Cloud, text: 'Conectando' },
    saving: { icon: Cloud, text: 'Guardando' },
    synced: { icon: Cloud, text: 'Sincronizado' },
    error: { icon: CloudOff, text: 'Sin nube, guardado local' }
  }[sync];
  const SyncIcon = syncBadge.icon;

  /* ---------- Acceso ---------- */
  if (user === undefined) return <div className="login"><p className="muted">Cargando…</p></div>;

  if (firebaseReady && user === null) {
    return (
      <div className="login">
        <div className="login-box">
          <h1 className="display">Glow up 90</h1>
          <p>Inicia sesión con Google para ver tu progreso en cualquier dispositivo.</p>
          <button className="btn btn-primary" onClick={login}>Entrar con Google</button>
          {loginError && <div className="err">No se pudo iniciar sesión: {loginError}</div>}
        </div>
      </div>
    );
  }

  /* ---------- UI ---------- */
  return (
    <div className="app">
      <header className="header">
        <div className="wrap">
          <div className="header-top">
            <div className="brand">
              <h1 className="display">Glow up 90</h1>
              <span className="xs muted">Reto de 3 meses</span>
            </div>
            <div className="account">
              <div className={`sync ${sync}`} title={syncError}>
                <SyncIcon size={16} />
                <span>{syncBadge.text}</span>
              </div>
              {user && (
                <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => signOut(auth)} aria-label="Cerrar sesión" title="Cerrar sesión">
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
          <nav className="nav">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`tab ${activeTab === t.id ? 'active' : ''}`}>
                  <Icon />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="wrap">
        <section className="daybar">
          <div className="daybar-left">
            <button className="icon-btn" onClick={() => goToDay(currentDay - 1)} disabled={currentDay === 1} aria-label="Día anterior">
              <ChevronLeft />
            </button>
            <div>
              <div className="display daybar-num">
                Día {currentDay}<small> / {TOTAL_DAYS}</small>
              </div>
              <div className="small muted cap" style={{ marginTop: 4 }}>{fmtDate(dateOfCurrent)}</div>
            </div>
            <button className="icon-btn" onClick={() => goToDay(currentDay + 1)} disabled={currentDay === TOTAL_DAYS} aria-label="Día siguiente">
              <ChevronRight />
            </button>
          </div>
          <div className="daybar-right">
            <span>{phase}</span>
            {currentDay !== today && (
              <button className="btn btn-primary btn-small" onClick={() => goToDay(today)}>Ir a hoy</button>
            )}
          </div>
        </section>

        {/* HOY */}
        {activeTab === 'dashboard' && (
          <div className="grid-main">
            <section className="panel">
              <h2 className="display">Tu protocolo del día</h2>
              <p className="panel-lead">
                {routine ? `Entrenamiento de hoy: ${routine.name}.` : 'Hoy es día de descanso total. Come bien y duerme.'}
              </p>
              <div className="checks">
                {CHECKS.map((item) => {
                  const on = dayData.checklist[item.key];
                  return (
                    <button key={item.key} onClick={() => toggleCheck(item.key, !on)} className={`check ${on ? 'on' : ''}`}>
                      <span className="check-box">{on && <Check strokeWidth={3} />}</span>
                      <span className="check-label">{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(dayScore(dayData) / CHECKS.length) * 100}%` }} />
                </div>
                <span>{dayScore(dayData)} de {CHECKS.length}</span>
              </div>
            </section>

            <div className="stack">
              <section className="panel">
                <div className="btn-row" style={{ alignItems: 'center', marginBottom: 12 }}>
                  <Droplet size={20} className="crimson" />
                  <h3>Agua</h3>
                </div>
                <div className="display big-num">{dayData.water}<small> / 12 vasos</small></div>
                <div className="glasses">
                  {Array.from({ length: 12 }, (_, i) => (
                    <button
                      key={i}
                      className={`glass ${i < dayData.water ? 'full' : ''}`}
                      onClick={() => setWater(dayData.water === i + 1 ? i : i + 1)}
                      aria-label={`Marcar ${i + 1} vasos`}
                    />
                  ))}
                </div>
                <p className="xs muted" style={{ margin: '0 0 12px' }}>Cada vaso es de 250 ml. Los 12 suman 3 litros.</p>
                <div className="btn-row">
                  <button className="btn btn-block" onClick={() => setWater(dayData.water - 1)}>Quitar vaso</button>
                  <button className="btn btn-primary btn-block" onClick={() => setWater(dayData.water + 1)}>Sumar vaso</button>
                </div>
              </section>

              <section className="panel">
                <h3>Tu avance</h3>
                <div className="stats">
                  <div>
                    <div className="display stat-num crimson">{completedDays}</div>
                    <div className="xs muted">días completos</div>
                  </div>
                  <div>
                    <div className="display stat-num">{streak}</div>
                    <div className="xs muted">días seguidos</div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* CALENDARIO */}
        {activeTab === 'calendar' && (
          <section className="panel">
            <div className="cal-head">
              <div>
                <h2 className="display">Los 90 días</h2>
                <p className="panel-lead" style={{ marginBottom: 0 }}>
                  Llevas {completedDays} de {TOTAL_DAYS} días completos. Toca un día para ver o editar su registro.
                </p>
              </div>
              <label className="field">
                Fecha de inicio del reto
                <input type="date" className="input" value={startDate} onChange={(e) => changeStartDate(e.target.value)} />
              </label>
            </div>

            <div className="day-grid">
              {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((n) => {
                const score = dayScore(days[n]);
                const full = score === CHECKS.length;
                const partial = score > 0 && !full;
                const date = dateForDay(startDate, n);
                const isRest = !ROUTINE[date.getDay()];
                return (
                  <button
                    key={n}
                    onClick={() => { setCurrentDay(n); setActiveTab('dashboard'); }}
                    title={`Día ${n}: ${score} de ${CHECKS.length}`}
                    className={`day-cell ${full ? 'full' : ''} ${partial ? 'partial' : ''} ${n === currentDay ? 'selected' : ''}`}
                  >
                    <span className="display n">{n}</span>
                    <span className="d">{date.getDate()}/{date.getMonth() + 1}</span>
                    {n === today && <span className="dot" />}
                    {isRest && !full && !partial && <Moon className="moon" />}
                  </button>
                );
              })}
            </div>

            <div className="legend">
              <span><i style={{ background: 'var(--crimson)' }} /> Día completo</span>
              <span><i style={{ background: 'rgba(122,12,34,.5)', border: '1px solid var(--crimson-deep)' }} /> Parcial</span>
              <span><i style={{ background: 'var(--surface-2)', border: '1px solid var(--line-strong)' }} /> Sin registro</span>
              <span><i style={{ background: '#fff', borderRadius: '50%', width: 6, height: 6 }} /> Hoy</span>
              <span><Moon size={12} /> Descanso (sábado y domingo)</span>
            </div>
          </section>
        )}

        {/* ENTRENAMIENTO */}
        {activeTab === 'gym' && (
          <div className="grid-main">
            <section className="panel">
              {routine ? (
                <>
                  <h2 className="display">{routine.name}</h2>
                  <p className="panel-lead cap">
                    {fmtDate(dateOfCurrent)}. Deja 1 o 2 repeticiones en reserva y busca subir peso o una repetición cada semana.
                  </p>
                  <div className="ex-list">
                    {routine.exercises.map((ex, idx) => {
                      const prev = previousWeight(idx);
                      return (
                        <div key={idx} className="ex">
                          <div>
                            <h4>{ex.name}</h4>
                            <p className="xs muted" style={{ margin: '4px 0 0' }}>
                              {ex.sets} series de {ex.reps} · descanso {fmtClock(ex.rest)}{ex.note ? ` · ${ex.note}` : ''}
                            </p>
                            {prev && <p className="prev-weight">Última vez: {prev} kg</p>}
                          </div>
                          <div className="ex-actions">
                            <button className="btn btn-small" onClick={() => setTimer(ex.rest, true)}>Descanso</button>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="Peso (kg)"
                              className="input"
                              value={dayData.weights[`${weekday}-${idx}`] || ''}
                              onChange={(e) => setWeight(idx, e.target.value)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="rest">
                  <Moon />
                  <h2 className="display">Descanso total</h2>
                  <p className="panel-lead" style={{ margin: '8px auto 0' }}>
                    El músculo crece mientras descansas. Come en superávit, duerme bien y evita el cardio extra.
                  </p>
                </div>
              )}

              <h3 className="display" style={{ fontSize: '1.25rem', margin: '32px 0 0' }}>Semana tipo</h3>
              <div className="week">
                {WEEK_LABELS.map(({ d, label }) => (
                  <div key={d} className={`week-day ${d === weekday ? 'today' : ''}`}>
                    <strong>{label}</strong>
                    <span className="muted">{ROUTINE[d]?.name || 'Descanso'}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel timer">
              <h3>Temporizador de descanso</h3>
              <div className={`display timer-time ${timerActive ? 'running' : ''} ${timerDone ? 'done' : ''}`}>
                {fmtClock(timerSeconds)}
              </div>
              <div className="presets">
                {[60, 90, 120, 150, 180].map((s) => (
                  <button key={s} className="btn btn-small" onClick={() => setTimer(s)}>{s}s</button>
                ))}
              </div>
              <div className="btn-row">
                <button
                  className={`btn btn-block ${timerActive ? 'btn-light' : 'btn-primary'}`}
                  onClick={() => { setTimerDone(false); setTimerActive(!timerActive); }}
                >
                  {timerActive ? <Pause /> : <Play />}
                  {timerActive ? 'Pausar' : 'Iniciar'}
                </button>
                <button className="icon-btn" onClick={() => setTimer(150)} aria-label="Reiniciar temporizador">
                  <RotateCcw />
                </button>
              </div>
            </section>
          </div>
        )}

        {/* HORARIOS */}
        {activeTab === 'schedule' && (
          <section className="panel">
            <h2 className="display">Cronograma diario</h2>
            <p className="panel-lead">Suena una alarma a cada hora marcada mientras esta página esté abierta.</p>
            <div className="schedule">
              {SCHEDULE.map((item) => (
                <div key={item.id} className={`slot ${item.id === currentSlot ? 'now' : ''}`}>
                  <div className="slot-left">
                    <span className="display slot-time">{item.time}</span>
                    <span>{item.title}</span>
                  </div>
                  <Volume2 size={16} className="muted" style={{ flex: 'none' }} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* NUTRICIÓN */}
        {activeTab === 'nutrition' && (
          <section className="panel">
            <h2 className="display">Nutrición para ganar volumen</h2>
            <p className="panel-lead">
              Para subir de peso necesitas comer más de lo que gastas. Apunta a entre 1,6 y 2,0 g de proteína por kilo de peso corporal
              y evita el cardio excesivo. Si pasadas 2 o 3 semanas no subes de peso, aumenta un poco las porciones.
            </p>
            <div className="grid-3">
              {NUTRITION.map((c) => (
                <div key={c.t} className="card">
                  <h3>{c.t}</h3>
                  <p>{c.d}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ESTILO */}
        {activeTab === 'glow' && (
          <section className="panel">
            <h2 className="display" style={{ marginBottom: 20 }}>Rostro, postura y estilo</h2>
            <div className="grid-2">
              <div className="card">
                <h3>Skincare de la mañana y la noche</h3>
                <ul>
                  <li>Limpiador facial suave según tu tipo de piel.</li>
                  <li>Hidratante con ácido hialurónico.</li>
                  <li>Protector solar SPF 50+ cada mañana, sin excepción.</li>
                </ul>
              </div>
              <div className="card">
                <h3>Postura y mandíbula</h3>
                <ul>
                  <li>Retracción cervical (chin tucks): 3 series de 15 repeticiones.</li>
                  <li>Hombros atrás durante todo el bloque de estudio.</li>
                  <li>Masticación consciente y postura lingual correcta.</li>
                </ul>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}