// App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';

// Tailwind classes used for styling, no extra CSS needed.

const API_BASE = 'http://127.0.0.1:8000/api'; // Django REST API base

/* ------------------- Components ------------------- */

const Navbar = () => (
  <nav className="bg-green-600 text-white p-4 flex justify-between items-center">
    <h1 className="text-xl font-bold">AgriAI</h1>
    <div className="space-x-4">
      <Link className="hover:underline" to="/">Home</Link>
      <Link className="hover:underline" to="/dashboard">Dashboard</Link>
      <Link className="hover:underline" to="/prediction">Prediction</Link>
      <Link className="hover:underline" to="/soil">Soil Analyzer</Link>
      <Link className="hover:underline" to="/community">Community</Link>
    </div>
  </nav>
);

const Home = () => (
  <div className="p-8 text-center">
    <h2 className="text-3xl font-bold mb-4">Welcome to AgriAI</h2>
    <p className="mb-6">AI-powered Crop Yield Optimization and Prediction Platform</p>
    <Link to="/dashboard" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition">Go to Dashboard</Link>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({ yield: 0, soilHealth: 0 });

  useEffect(() => {
    // Fetch dashboard stats from Django backend
    fetch(`${API_BASE}/dashboard/`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.log(err));
  }, []);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <h3 className="font-bold text-lg mb-2">Predicted Crop Yield</h3>
          <p className="text-3xl text-green-600">{stats.yield} tons</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <h3 className="font-bold text-lg mb-2">Soil Health Score</h3>
          <p className="text-3xl text-green-600">{stats.soilHealth}</p>
        </div>
      </div>
    </div>
  );
};

const Prediction = () => {
  const [input, setInput] = useState({ rainfall: '', temperature: '', soilType: '' });
  const [result, setResult] = useState(null);

  const handlePredict = () => {
    fetch(`${API_BASE}/predict/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })
      .then(res => res.json())
      .then(data => setResult(data))
      .catch(err => console.log(err));
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Yield Prediction</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <input type="number" placeholder="Rainfall (mm)" value={input.rainfall} onChange={e => setInput({...input, rainfall: e.target.value})} className="p-2 border rounded"/>
        <input type="number" placeholder="Temperature (°C)" value={input.temperature} onChange={e => setInput({...input, temperature: e.target.value})} className="p-2 border rounded"/>
        <input type="text" placeholder="Soil Type" value={input.soilType} onChange={e => setInput({...input, soilType: e.target.value})} className="p-2 border rounded"/>
      </div>
      <button onClick={handlePredict} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition">Predict</button>
      {result && (
        <div className="mt-4 bg-white p-4 rounded shadow">
          <h3 className="font-bold text-lg">Predicted Yield: {result.yield} tons</h3>
        </div>
      )}
    </div>
  );
};

const SoilAnalyzer = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold mb-4">Soil Health Analyzer</h2>
    <p>Upload soil data to analyze nutrient content and health.</p>
    {/* Implement file upload and analysis here */}
  </div>
);

const Community = () => (
  <div className="p-8">
    <h2 className="text-2xl font-bold mb-4">Community Forum</h2>
    <p>Discuss tips, share insights, and collaborate with other farmers.</p>
    {/* Could fetch posts from Django REST API */}
  </div>
);

/* ------------------- Main App ------------------- */

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/prediction" element={<Prediction />} />
          <Route path="/soil" element={<SoilAnalyzer />} />
          <Route path="/community" element={<Community />} />
        </Routes>
      </div>
    </Router>
  );
}
