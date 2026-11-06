import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { 
  Flame, Dumbbell, Utensils, Sparkles, Clock, Calendar, Droplet, 
  CheckCircle2, Play, Pause, RotateCcw, Volume2, Activity
} from 'lucide-react';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const playAlarmSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.log("Audio no soportado o bloqueado por el navegador");
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentDay, setCurrentDay] = useState(1);
  const [loading, setLoading] = useState(true);

  const [schedule] = useState([
    { id: 1, time: '06:00', title: 'Despertar, Hidratación (500ml) & Skin Care AM', category: 'glow' },
    { id: 2, time: '06:30', title: 'Gym / Entrenamiento de Fuerza (V-Taper)', category: 'gym' },
    { id: 3, time: '07:30', title: 'Ducha fría, Desayuno Proteico & Suplementos', category: 'food' },
    { id: 4, time: '08:30', title: 'Bloque de Estudio / Trabajo Profundo', category: 'work' },
    { id: 5, time: '13:00', title: 'Almuerzo de Fase & Caminata Ligera', category: 'food' },
    { id: 6, time: '18:00', title: 'Cena Liviana / Ayuno Intermitente', category: 'food' },
    { id: 7, time: '21:30', title: 'Skincare PM, Postura & Desconexión de Pantallas', category: 'glow' }
  ]);

  const [waterGlasses, setWaterGlasses] = useState(0); 
  const [gymLogs, setGymLogs] = useState({});
  const [dailyChecklist, setDailyChecklist] = useState({
    workout: false,
    nutrition: false,
    skincare: false,
    water: false,
    study: false
  });

  const [timerSeconds, setTimerSeconds] = useState(90);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        loadUserData(u.uid, currentDay);
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Error en autenticación anónima:", error);
          setLoading(false);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const loadUserData = async (uid, day) => {
    setLoading(true);
    try {
      const docRef = doc(db, 'users', uid, 'days', `day_${day}`);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setWaterGlasses(data.waterGlasses || 0);
        setDailyChecklist(data.checklist || { workout: false, nutrition: false, skincare: false, water: false, study: false });
        setGymLogs(data.gymLogs || {});
      } else {
        setWaterGlasses(0);
        setDailyChecklist({ workout: false, nutrition: false, skincare: false, water: false, study: false });
        setGymLogs({});
      }
    } catch (e) {
      console.error("Error cargando datos:", e);
    }
    setLoading(false);
  };

  const saveUserData = async (newWater, newChecklist, newGymLogs) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid, 'days', `day_${currentDay}`);
      await setDoc(docRef, {
        waterGlasses: newWater !== undefined ? newWater : waterGlasses,
        checklist: newChecklist !== undefined ? newChecklist : dailyChecklist,
        gymLogs: newGymLogs !== undefined ? newGymLogs : gymLogs,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error("Error guardando datos:", e);
    }
  };

  useEffect(() => {
    if (timerActive && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => s - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerActive) {
      setTimerActive(false);
      playAlarmSound();
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive, timerSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      schedule.forEach(item => {
        if (item.time === currentTime && now.getSeconds() === 0) {
          playAlarmSound();
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [schedule]);

  const handleDayChange = (day) => {
    setCurrentDay(day);
    if (user) {
      loadUserData(user.uid, day);
    }
  };

  const gymRoutine = [
    { exercise: 'Dominadas / Jalón al Pecho', sets: '4 series', reps: '8 - 10 reps', rest: '90s' },
    { exercise: 'Press Militar con Mancuernas', sets: '4 series', reps: '10 - 12 reps', rest: '90s' },
    { exercise: 'Remo en Polea Baja (Enfoque Espalda Alta)', sets: '3 series', reps: '12 reps', rest: '60s' },
    { exercise: 'Elevaciones Laterales (Hombros)', sets: '4 series', reps: '15 reps', rest: '60s' },
    { exercise: 'Curl de Bíceps Hammer', sets: '3 series', reps: '12 reps', rest: '60s' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-amber-500 to-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider bg-gradient-to-r from-amber-400 to-indigo-400 bg-clip-text text-transparent">
              GLOW UP 90
            </h1>
            <p className="text-xs text-slate-400">Transformación Integral (Día {currentDay} de 90)</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: 'dashboard', label: 'Hoy', icon: Activity },
            { id: 'schedule', label: 'Horarios', icon: Clock },
            { id: 'gym', label: 'Gym', icon: Dumbbell },
            { id: 'nutrition', label: 'Nutrición', icon: Utensils },
            { id: 'glow', label: 'Estilo', icon: Sparkles },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-6">
        <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl mb-6 backdrop-blur-md flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-bold text-slate-300">
              Fase Actual: {currentDay <= 30 ? 'Fase 1: Desintoxicación & Hábitos' : currentDay <= 60 ? 'Fase 2: Hipertrofia & Estilo' : 'Fase 3: Consolidación & Glow Up'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {[1, 15, 30, 45, 60, 75, 90].map(d => (
              <button
                key={d}
                onClick={() => handleDayChange(d)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  currentDay === d ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Día {d}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-indigo-400 font-semibold animate-pulse">Sincronizando con Firebase...</div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-400">
                      <CheckCircle2 className="w-5 h-5" /> Protocolo Diario de Hoy
                    </h2>
                    <div className="space-y-3">
                      {[
                        { key: 'workout', label: 'Entrenamiento de Fuerza / Gym completado' },
                        { key: 'nutrition', label: 'Cumplimiento nutricional & Macros' },
                        { key: 'skincare', label: 'Skincare AM/PM y Protector Solar' },
                        { key: 'water', label: '3 Litros de Agua alcanzados' },
                        { key: 'study', label: 'Bloque de Estudio / Trabajo Profundo' }
                      ].map(item => (
                        <label key={item.key} className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800/60 cursor-pointer hover:border-slate-700 transition-all">
                          <input
                            type="checkbox"
                            checked={dailyChecklist[item.key] || false}
                            onChange={(e) => {
                              const updated = { ...dailyChecklist, [item.key]: e.target.checked };
                              setDailyChecklist(updated);
                              saveUserData(undefined, updated, undefined);
                            }}
                            className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                          />
                          <span className={`text-sm ${dailyChecklist[item.key] ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col items-center text-center">
                    <div className="bg-cyan-500/10 p-4 rounded-full text-cyan-400 mb-3 border border-cyan-500/20">
                      <Droplet className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-slate-200">Control de Agua (3L)</h3>
                    <p className="text-xs text-slate-400 mt-1 mb-4">12 vasos de 250ml diarios</p>
                    <div className="text-3xl font-black text-cyan-400 mb-4">
                      {waterGlasses} <span className="text-sm font-normal text-slate-400">/ 12 vasos</span>
                    </div>
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => {
                          const newVal = Math.max(0, waterGlasses - 1);
                          setWaterGlasses(newVal);
                          saveUserData(newVal, undefined, undefined);
                        }}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 py-2 rounded-xl text-sm font-bold transition-all"
                      >
                        - Quitar
                      </button>
                      <button
                        onClick={() => {
                          const newVal = Math.min(12, waterGlasses + 1);
                          setWaterGlasses(newVal);
                          saveUserData(newVal, undefined, undefined);
                          playAlarmSound();
                        }}
                        className="flex-1 bg-cyan-600 hover:bg-cyan-500 py-2 rounded-xl text-sm font-bold text-slate-950 transition-all shadow-lg shadow-cyan-600/30"
                      >
                        + Vaso
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-400">
                  <Clock className="w-5 h-5" /> Cronograma Diario con Alarmas Activas
                </h2>
                <div className="space-y-3">
                  {schedule.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20 text-sm">
                          {item.time}
                        </span>
                        <span className="text-sm font-medium text-slate-200">{item.title}</span>
                      </div>
                      <Volume2 className="w-5 h-5 text-indigo-400 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'gym' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-400">
                    <Dumbbell className="w-5 h-5" /> Rutina Eficiente (50 min) - Enfoque V-Taper
                  </h2>
                  <div className="space-y-4">
                    {gymRoutine.map((ex, idx) => (
                      <div key={idx} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-slate-200 text-sm">{ex.exercise}</h4>
                          <p className="text-xs text-slate-400">{ex.sets} • {ex.reps} • Descanso: {ex.rest}</p>
                        </div>
                        <input
                          type="text"
                          placeholder="Registrar peso (kg)"
                          className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center">
                  <h3 className="font-bold text-slate-200 mb-2">Temporizador de Descanso</h3>
                  <div className="text-5xl font-black font-mono text-amber-400 my-4">
                    {Math.floor(timerSeconds / 60)}:{String(timerSeconds % 60).padStart(2, '0')}
                  </div>
                  <div className="flex gap-2 mb-4">
                    <button onClick={() => setTimerSeconds(60)} className="px-3 py-1 bg-slate-800 rounded-lg text-xs font-bold hover:bg-slate-700">60s</button>
                    <button onClick={() => setTimerSeconds(90)} className="px-3 py-1 bg-slate-800 rounded-lg text-xs font-bold hover:bg-slate-700">90s</button>
                    <button onClick={() => setTimerSeconds(120)} className="px-3 py-1 bg-slate-800 rounded-lg text-xs font-bold hover:bg-slate-700">120s</button>
                  </div>
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => setTimerActive(!timerActive)}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        timerActive ? 'bg-amber-500 text-slate-950' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      }`}
                    >
                      {timerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {timerActive ? 'Pausar' : 'Iniciar'}
                    </button>
                    <button
                      onClick={() => { setTimerActive(false); setTimerSeconds(90); }}
                      className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl transition-all"
                    >
                      <RotateCcw className="w-5 h-5 text-slate-300" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'nutrition' && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-400">
                  <Utensils className="w-5 h-5" /> Plan Nutricional & Suplementación
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <h3 className="font-bold text-amber-400 text-sm mb-2">Desayuno Proteico</h3>
                    <p className="text-xs text-slate-300">Omelette de 3 claras y 1 huevo entero, 50g de avena con frutos rojos y café negro sin azúcar.</p>
                  </div>
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <h3 className="font-bold text-amber-400 text-sm mb-2">Almuerzo de Fase</h3>
                    <p className="text-xs text-slate-300">200g de pechuga de pollo o carne magra, 150g de arroz integral y vegetales al vapor con aceite de oliva.</p>
                  </div>
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <h3 className="font-bold text-amber-400 text-sm mb-2">Cena Liviana</h3>
                    <p className="text-xs text-slate-300">200g de pescado blanco o salmón a la plancha con ensalada verde abundante y aguacate.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'glow' && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-400">
                  <Sparkles className="w-5 h-5" /> Protocolo de Rostro, Postura & Estilo
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <h3 className="font-bold text-indigo-400 text-sm mb-2">Skincare Diario (AM / PM)</h3>
                    <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                      <li>Limpiador facial suave según tipo de piel.</li>
                      <li>Hidratación con ácido hialurónico.</li>
                      <li>Protector solar SPF 50+ obligatorio cada mañana.</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <h3 className="font-bold text-indigo-400 text-sm mb-2">Postura & Mandíbula</h3>
                    <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                      <li>Ejercicios de retracción cervical (Chin Tucks): 3 series de 15 reps.</li>
                      <li>Postura de hombros hacia atrás durante todo el bloque de estudio.</li>
                      <li>Masticación consciente y postura lingual correcta (Mewing).</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}