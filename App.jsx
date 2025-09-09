import React, { useEffect, useState, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';

// Single-file example app tailored for a Django REST backend.
// - Default export: App
// - Tailwind CSS utility classes used throughout (no imports here)
// - Assumes Django REST endpoints described in README section below

/* ----------------- Utilities & API wrapper ----------------- */
const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000/api';

async function api(path, opts = {}) {
  const token = localStorage.getItem('token');
  const headers = opts.headers || {};
    if (token) headers['Authorization'] = `Token ${token}`; // or Bearer
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(API_BASE + path, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  // no content
  if (res.status === 204) return null;
  return res.json();
}

/* ----------------- Contexts ----------------- */
const UserContext = createContext();

function useUser() {
  return useContext(UserContext);
}

/* ----------------- Small UI components ----------------- */
function Nav() {
  const { user, logout } = useUser();
  return (
    <nav className="bg-green-700 text-white p-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <Link to="/" className="font-bold text-lg">AgriAI</Link>
        <Link to="/dashboard" className="hover:underline">Dashboard</Link>
        <Link to="/predict" className="hover:underline">Predict</Link>
        <Link to="/soil" className="hover:underline">Soil Analyzer</Link>
        <Link to="/community" className="hover:underline">Community</Link>
      </div>
      <div>
        {user ? (
          <div className="flex items-center gap-3">
            <span>{user.username}</span>
            <button onClick={logout} className="bg-white text-green-700 px-3 py-1 rounded">Logout</button>
          </div>
        ) : (
          <Link to="/login" className="bg-white text-green-700 px-3 py-1 rounded">Login</Link>
        )}
      </div>
    </nav>
  );
}

function Card({ children, title }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      {title && <h3 className="font-semibold mb-2">{title}</h3>}
      {children}
    </div>
  );
}

/* ----------------- Pages ----------------- */
function Home() {
  return (
    <div className="p-6 grid gap-6 md:grid-cols-3">
      <Card title="Welcome">
        <p>AI powered Crop Yield Optimization & Prediction system built for farmers.</p>
      </Card>
      <Card title="Quick Actions">
        <ul className="list-disc pl-5">
          <li><Link to="/predict" className="text-green-700 underline">Run yield prediction</Link></li>
          <li><Link to="/soil" className="text-green-700 underline">Analyze soil</Link></li>
          <li><Link to="/community" className="text-green-700 underline">Ask community</Link></li>
        </ul>
      </Card>
      <Card title="Tips & Alerts">
        <Tips short />
      </Card>
    </div>
  );
}

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { setUser } = useUser();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    try {
      const data = await api('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem('token', data.token);
      const profile = await api('/profile/me/');
      setUser(profile);
      navigate('/dashboard');
    } catch (err) {
      alert('Login failed: ' + err.message);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <Card title="Login">
        <form onSubmit={submit} className="space-y-3">
          <input className="w-full p-2 border rounded" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" />
          <input className="w-full p-2 border rounded" value={password} onChange={e => setPassword(e.target.value)} placeholder="password" type="password" />
          <button className="w-full bg-green-700 text-white p-2 rounded">Login</button>
        </form>
      </Card>
    </div>
  );
}

function Dashboard() {
  const [predictions, setPredictions] = useState([]);
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const p = await api('/predictions/recent/');
        setPredictions(p);
      } catch (e) { console.warn(e); }
      try {
        const w = await api('/weather/latest/');
        setWeather(w);
      } catch (e) { console.warn(e); }
    }
    load();
  }, []);

  return (
    <div className="p-6 grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card title="Recent Predictions">
          <ul className="space-y-2">
            {predictions.length === 0 && <li>No recent predictions.</li>}
            {predictions.map(p => (
                <li key={p.id} className="p-2 border rounded flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{p.crop} — {p.estimated_yield} kg/ha</div>
                    <div className="text-sm text-gray-600">On {new Date(p.created_at).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <Link to={`/predict/${p.id}`} className="text-green-700 underline">View</Link>
                  </div>
                </li>
            ))}
          </ul>
        </Card>

        <Card title="Smart Yield Prediction (Quick)">
          <QuickPredict onResult={r => setPredictions(prev => [r, ...prev])} />
        </Card>
      </div>

      <div>
        <Card title="Weather">
          {weather ? (
            <div>
              <div className="font-semibold">{weather.location}</div>
              <div>Temp: {weather.temperature} °C</div>
              <div>Condition: {weather.condition}</div>
            </div>
          ) : (
            <div>Loading weather...</div>
          )}
        </Card>

        <Card title="Tips">
          <Tips />
        </Card>
      </div>
    </div>
  );
}

function QuickPredict({ onResult }) {
  const [crop, setCrop] = useState('wheat');
  const [area, setArea] = useState(1);
  const [loading, setLoading] = useState(false);

  async function go() {
    setLoading(true);
    try {
      const res = await api('/predictions/', { method: 'POST', body: JSON.stringify({ crop, area }) });
      onResult(res);
    } catch (e) { alert('Prediction failed: ' + e.message); }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <select value={crop} onChange={e => setCrop(e.target.value)} className="w-full p-2 border rounded">
        <option value="wheat">Wheat</option>
        <option value="rice">Rice</option>
        <option value="maize">Maize</option>
      </select>
      <input type="number" value={area} onChange={e => setArea(e.target.value)} className="w-full p-2 border rounded" />
      <button disabled={loading} onClick={go} className="w-full bg-green-700 text-white p-2 rounded">{loading ? 'Predicting...' : 'Predict'}</button>
    </div>
  );
}

function PredictPage() {
  const [inputs, setInputs] = useState({ crop: 'wheat', area: 1, moisture: '', nitrogen: '' });
  const [result, setResult] = useState(null);

  async function run(e) {
    e.preventDefault();
    try {
      const r = await api('/predictions/', { method: 'POST', body: JSON.stringify(inputs) });
      setResult(r);
    } catch (err) { alert('Error: ' + err.message); }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Card title="Smart Yield Prediction">
        <form onSubmit={run} className="space-y-3">
          <select value={inputs.crop} onChange={e => setInputs(s => ({ ...s, crop: e.target.value }))} className="w-full p-2 border rounded">
            <option value="wheat">Wheat</option>
            <option value="rice">Rice</option>
            <option value="maize">Maize</option>
          </select>
          <input className="w-full p-2 border rounded" placeholder="Area (ha)" value={inputs.area} onChange={e => setInputs(s => ({ ...s, area: e.target.value }))} />
          <input className="w-full p-2 border rounded" placeholder="Soil moisture (%)" value={inputs.moisture} onChange={e => setInputs(s => ({ ...s, moisture: e.target.value }))} />
          <input className="w-full p-2 border rounded" placeholder="Soil nitrogen (mg/kg)" value={inputs.nitrogen} onChange={e => setInputs(s => ({ ...s, nitrogen: e.target.value }))} />
          <button className="w-full bg-green-700 text-white p-2 rounded">Run Prediction</button>
        </form>
      </Card>

      {result && (
        <Card title="Prediction Result">
          <div className="font-semibold">Estimated yield: {result.estimated_yield} kg/ha</div>
          <div className="text-sm text-gray-600">Confidence: {(result.confidence * 100).toFixed(1)}%</div>
          <div className="mt-3">Recommendations:</div>
          <ul className="list-disc pl-5">
            {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Tips({ short = false }) {
  const [tips, setTips] = useState([]);
  useEffect(() => {
    async function load() {
      try {
        const t = await api('/tips/');
        setTips(t);
      } catch (e) { console.warn(e); }
    }
    load();
  }, []);

  if (short) return <ul className="text-sm">{tips.slice(0,3).map((t,i)=><li key={i}>• {t.title}</li>)}</ul>;

  return (
    <div>
      {tips.map(t => (
        <div key={t.id} className="mb-2">
          <div className="font-semibold">{t.title}</div>
          <div className="text-sm text-gray-600">{t.summary}</div>
        </div>
      ))}
    </div>
  );
}

function SoilAnalyzer() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!file) return alert('Attach a soil sample image or CSV');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('sample', file);
      const res = await fetch(API_BASE + '/soil/analyze/', {
        method: 'POST',
        headers: { 'Authorization': `Token ${localStorage.getItem('token')}` },
        body: fd,
      });
      const data = await res.json();
      setResult(data);
    } catch (e) { alert('Soil analysis error: ' + e.message); }
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Card title="Soil Health Analyzer">
        <form onSubmit={submit} className="space-y-3">
          <input type="file" accept="image/*,.csv" onChange={e => setFile(e.target.files[0])} />
          <button disabled={loading} className="bg-green-700 text-white p-2 rounded">{loading ? 'Analyzing...' : 'Analyze'}</button>
        </form>
      </Card>

      {result && (
        <Card title="Soil Report">
          <div>pH: {result.ph}</div>
          <div>Nitrogen: {result.n}</div>
          <div>Phosphorous: {result.p}</div>
          <div>Potassium: {result.k}</div>
          <div className="mt-2">Suggestion: {result.suggestion}</div>
        </Card>
      )}
    </div>
  );
}

function Community() {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => { api('/community/').then(setPosts).catch(() => {}); }, []);

  async function post() {
    if (!text) return;
    try {
      const p = await api('/community/', { method: 'POST', body: JSON.stringify({ text }) });
      setPosts(prev => [p, ...prev]);
      setText('');
    } catch (e) { alert('Post failed'); }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <Card title="Community">
        <div className="space-y-2">
          <textarea value={text} onChange={e => setText(e.target.value)} className="w-full p-2 border rounded" rows={3} placeholder="Share a tip or question"></textarea>
          <div className="flex gap-2">
            <button onClick={post} className="bg-green-700 text-white px-3 py-1 rounded">Post</button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {posts.map(p => (
          <Card key={p.id}>
            <div className="font-semibold">{p.author_name}</div>
            <div className="text-sm text-gray-700">{p.text}</div>
            <div className="text-xs text-gray-500">{new Date(p.created_at).toLocaleString()}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Profile() {
  const { user, setUser } = useUser();
  const [edit, setEdit] = useState({});

  useEffect(()=> setEdit(user || {}), [user]);

  async function save() {
    try {
      const updated = await api('/profile/me/', { method: 'PUT', body: JSON.stringify(edit) });
      setUser(updated);
      alert('Saved');
    } catch (e) { alert('Save failed: ' + e.message); }
  }

  if (!user) return <div className="p-6">Login to edit profile</div>;

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <Card title="Profile">
        <input className="w-full p-2 border rounded" value={edit.full_name||''} onChange={e=>setEdit(s=>({...s, full_name:e.target.value}))} />
        <input className="w-full p-2 border rounded" value={edit.farm_location||''} onChange={e=>setEdit(s=>({...s, farm_location:e.target.value}))} />
        <div className="flex gap-2 mt-2">
          <button onClick={save} className="bg-green-700 text-white px-3 py-1 rounded">Save</button>
        </div>
      </Card>
    </div>
  );
}

/* ----------------- Root App ----------------- */
export default function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const p = await api('/profile/me/');
        setUser(p);
      } catch (e) { console.warn('Auto-load profile failed', e); }
    }
    load();
  }, []);

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  }

  const value = { user, setUser, logout };

  return (
    <UserContext.Provider value={value}>
      <div className="min-h-screen bg-gray-100">
        <Nav />
        <main className="p-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/predict" element={<PredictPage />} />
            <Route path="/soil" element={<SoilAnalyzer />} />
            <Route path="/community" element={<Community />} />
            <Route path="/profile" element={<Profile />} />
            {/* fallback */}
            <Route path="*" element={<div className="p-6">Page not found</div>} />
          </Routes>
        </main>
      </div>
    </UserContext.Provider>


  );
}



/* ----------------- README / Integration Notes (in-file) -----------------

This single-file React example is meant to be used inside a create-react-app or Vite React project.

Tailwind:
- Install Tailwind in your React app (follow Tailwind docs). This file uses Tailwind utility classes.

Expected Django (DRF) endpoints (suggested):
- POST /api/auth/login/  -> { username, password } returns { token }
- GET  /api/profile/me/ -> returns { id, username, full_name, farm_location }
- PUT  /api/profile/me/ -> update profile
- GET  /api/predictions/recent/ -> list of recent predictions
- POST /api/predictions/ -> body: { crop, area, moisture?, nitrogen? } returns prediction object
- GET  /api/weather/latest/ -> { location, temperature, condition }
- GET  /api/tips/ -> [] of tips
- POST /api/soil/analyze/ -> FormData { sample } -> returns soil report
- GET/POST /api/community/ -> list and create posts

Authentication:
- Uses Token in Authorization header as Token <token> by default. Change api() wrapper if you use JWT (Bearer).
- Enable CORS (django-cors-headers) on Django to allow the React dev server.

Notes on model fields returned by endpoints (example prediction):
{
  id: 12,
  crop: 'wheat',
  estimated_yield: 2400,
  confidence: 0.87,
  recommendations: ['Apply 20kg/ha nitrogen at tillering', 'Avoid waterlogging'],
  created_at: '2025-09-01T12:00:00Z'
}

Deployment tips:
- Build React and serve static files from Django's staticfiles or serve separately and proxy API requests.
- Set REACT_APP_API_BASE env var when building for production.

Accessibility & Performance:
- Add form validation and loading indicators where needed.
- Paginate community & predictions for large datasets.

Animations & polish suggestions:
- Use framer-motion for smooth, light animations.
- Add charts (recharts) to show historical yields and prediction trends.

Security:
- Use HTTPS in production.
- Secure token storage (consider httpOnly cookies + CSRF if needed).

*/