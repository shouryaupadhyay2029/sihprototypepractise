/* ----------------- Prediction Model Explanation ----------------- */
/*
  The yield prediction in this demo is currently based on a heuristic model
  (`mockPredict` function below) that uses predefined factors for soil type,
  rainfall, temperature, and irrigation. These factors are combined with a
  base yield for the selected crop to provide an estimated yield.

  For a production-ready application, this section would typically integrate
  with a machine learning model API (e.g., a TensorFlow, PyTorch, or Scikit-learn
  model deployed via Django REST Framework) that has been trained on historical
  agricultural data to provide more accurate and robust predictions.
*/
/* ----------------- Utility & Mock AI Logic ----------------- */
function scrollToSection(id){document.getElementById(id).scrollIntoView({behavior:'smooth',block:'start'})}

// This mockPredict function is no longer used for actual predictions
// It's kept for reference or if you want to revert to mock data temporarily
function mockPredict({crop,area,soil,rain,temp,irrigation}){
  // Mock heuristic-based predictor — weights can be replaced by your ML model API.
  const soilFactor = soil==='loamy'?1.05:(soil==='sandy'?0.9:0.95);
  const rainFactor = Math.tanh(rain/800)*1.2; // saturating
  const tempOpt = 25; // optimal temp sample
  const tempFactor = 1 - Math.abs(temp - tempOpt)/50;
  const irrigationFactor = Math.min(1, 0.6 + irrigation*0.06);

  // base yields by crop (kg/ha) rough placeholders
  const base = {wheat:3000,rice:4000,corn:5000,millet:1500,default:2800};
  const b = base[crop.toLowerCase()] || base.default;

  const yieldPerHa = b * soilFactor * rainFactor * tempFactor * irrigationFactor;
  const totalYield = yieldPerHa * Number(area);
  return {yieldPerHa:Math.max(0,Math.round(yieldPerHa)),totalYield:Math.round(totalYield)}
}

function fertilizerRecommendation({n,p,k,ph,om}){
  const recs=[];
  if(n<20) recs.push('Nitrogen low — add urea or organic manure (apply split doses).');
  if(p<15) recs.push('Phosphorus low — apply single super phosphate as basal.');
  if(k<120) recs.push('Potassium low — apply muriate of potash as per crop stage.');
  if(ph<5.5) recs.push('Soil acidic — apply lime (dose as per lab test).');
  if(ph>7.8) recs.push('Soil alkaline — consider gypsum and organic matter.');
  if(om<1.5) recs.push('Add compost/green manure to improve organic matter.');
  if(recs.length===0) recs.push('Soil appears balanced — maintain with crop rotation and compost.');
  return recs;
}

/* ----------------- Quick Form ----------------- */
async function handleQuick(e){
  e.preventDefault();
  const crop = document.getElementById('crop_q').value || 'Wheat';
  const area = Number(document.getElementById('area_q').value) || 1;
  const rain = Number(document.getElementById('rain_q').value) || 300;
  const temp = Number(document.getElementById('temp_q').value) || 25;
  const soil = document.getElementById('soil_q').value;

  try {
    const response = await fetch('/api/predict/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') // Include CSRF token for Django
      },
      body: JSON.stringify({ crop, area, soil, rain, temp, irrigation: 4 })
    });

    const data = await response.json();

    if (response.ok) {
      document.getElementById('quickResult').style.display='flex';
      document.getElementById('predYield').innerText = data.yieldPerHa + ' kg/ha';

      // Simple fertilizer rec based on quick heuristic (can be updated by AI model too)
      const recs = [];
      if(data.yieldPerHa < 2000) recs.push('Consider improving soil nutrients and irrigation.');
      else if(data.yieldPerHa < 3000) recs.push('Optimize planting density and fertilizer application.');
      else recs.push('Maintain good agricultural practices for optimal yield.');

      const q = document.getElementById('quickRec'); q.innerHTML='';
      recs.forEach(r=>{const li=document.createElement('li');li.innerText=r; q.appendChild(li)});

      // Save recent
      addRecent({crop:crop,perHa:data.yieldPerHa,total:data.totalYield,time:new Date().toLocaleString()});
    } else {
      alert('Error from API: ' + data.error);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred during prediction.');
  }
}

/* ----------------- Full Predict (dashboard & chart) ----------------- */
let yieldChart;
function initCharts(){
  const ctx = document.getElementById('yieldChart').getContext('2d');
  yieldChart = new Chart(ctx,{
    type:'line',data:{labels:['-4','-3','-2','-1','This'],datasets:[{label:'Historical yield (kg/ha)',data:[2100,2300,2600,2800,3000],fill:false,tension:0.3},{label:'Predicted (kg/ha)',data:[null,null,null,null,null],borderDash:[5,5],tension:0.3}]},options:{responsive:true,plugins:{legend:{position:'bottom'}}}
  });
}

async function handlePredict(e){
  e.preventDefault();
  const crop = document.getElementById('crop').value || 'Rice';
  const area = Number(document.getElementById('area').value) || 1;
  const soil = document.getElementById('soil').value;
  const rain = Number(document.getElementById('rain').value) || 400;
  const temp = Number(document.getElementById('temp').value) || 25;
  const irrigation = Number(document.getElementById('irrigation').value) || 4;

  try {
    const response = await fetch('/api/predict/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken')
      },
      body: JSON.stringify({ crop, area, soil, rain, temp, irrigation })
    });

    const data = await response.json();

    if (response.ok) {
      // update chart (put predicted value at last index)
      const hist = yieldChart.data.datasets[0].data; // Assuming this is still desired for historical data
      yieldChart.data.datasets[1].data[yieldChart.data.datasets[1].data.length-1] = data.yieldPerHa;
      yieldChart.update();

      // fill optimization suggestions
      const s = document.getElementById('optSuggestions'); s.innerHTML='';
      const suggestions = [
        `Expected ${data.yieldPerHa} kg/ha — analyze soil for nutrient deficiencies.`,
        `Based on current conditions, consider adjusting irrigation frequency for ${crop}.`,
        `Explore different crop varieties that are resilient to current climate patterns.`
      ];
      suggestions.forEach(t=>{const li=document.createElement('li');li.innerText=t;s.appendChild(li)});

      addRecent({crop:crop,perHa:data.yieldPerHa,total:data.totalYield,time:new Date().toLocaleString()});
    } else {
      alert('Error from API: ' + data.error);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred during prediction.');
  }
}

function fillSample(){
  document.getElementById('crop').value='Maize';
  document.getElementById('area').value='2';
  document.getElementById('soil').value='loamy';
  document.getElementById('rain').value='520';
  document.getElementById('temp').value='26';
  document.getElementById('irrigation').value='5';
}

/* ----------------- Soil Analyzer ----------------- */
function analyzeSoil(e){
  e.preventDefault();
  const ph = Number(document.getElementById('ph').value);
  const om = Number(document.getElementById('om').value);
  const n = Number(document.getElementById('n').value);
  const p = Number(document.getElementById('p').value);
  const k = Number(document.getElementById('k').value);

  // score heuristic
  let score = 50;
  if(ph>=6 && ph<=7.5) score += 20; else score -= 10;
  score += Math.min(20, Math.round((om/3)*10));
  score += Math.min(10, Math.round((Math.min(n,100)/100)*10));
  score = Math.max(0,Math.min(100,score));

  document.getElementById('soilScore').innerText = score;
  document.getElementById('nVal').innerText = n;
  document.getElementById('pVal').innerText = p;
  document.getElementById('kVal').innerText = k;

  // fertilizer recs
  const recs = fertilizerRecommendation({n,p,k,ph,om});
  const rBox = document.getElementById('fertRecs'); rBox.innerHTML='';
  recs.forEach(r=>{const li=document.createElement('li');li.innerText=r; rBox.appendChild(li)});
}

/* ----------------- Recent list & storage ----------------- */
function addRecent(item){
  const arr = JSON.parse(localStorage.getItem('recentPreds')||'[]');
  arr.unshift(item); if(arr.length>5) arr.pop();
  localStorage.setItem('recentPreds',JSON.stringify(arr));
  renderRecent();
}
function renderRecent(){
  const arr = JSON.parse(localStorage.getItem('recentPreds')||'[]');
  const out = document.getElementById('recentList'); out.innerHTML='';
  arr.forEach(a=>{const d=document.createElement('div');d.style.padding='8px 6px';d.style.borderBottom='1px dashed rgba(0,0,0,0.04)';d.innerHTML=`<strong>${a.crop}</strong> — ${a.perHa} kg/ha <br><small class='muted'>${a.time}</small>`; out.appendChild(d)});
}

/* ----------------- Community posts (localStorage) ----------------- */
function addPost(){
  const name = document.getElementById('postName').value||'Anonymous';
  const text = document.getElementById('postText').value||'';
  if(!text.trim()) return alert('Write something to post');
  const arr = JSON.parse(localStorage.getItem('posts')||'[]');
  arr.unshift({name,text,time:new Date().toLocaleString()});
  localStorage.setItem('posts',JSON.stringify(arr));
  document.getElementById('postText').value='';
  renderPosts();
}
function renderPosts(){
  const arr = JSON.parse(localStorage.getItem('posts')||'[]');
  const wrap = document.getElementById('posts'); wrap.innerHTML='';
  arr.forEach(p=>{const div=document.createElement('div');div.className='post';div.innerHTML=`<strong>${p.name}</strong> <small style='float:right;color:#94a3b8'>${p.time}</small><p style='margin:8px 0 0 0'>${p.text}</p>`;wrap.appendChild(div)});
}

function clearPosts(){
  if(confirm('Are you sure you want to clear all posts?')){
    localStorage.removeItem('posts');
    renderPosts();
    alert('All posts cleared!');
  }
}

// Function to get CSRF token from cookies
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

/* ----------------- Init ----------------- */
window.addEventListener('load',()=>{
  initCharts(); renderPosts(); renderRecent();
  // ensure predicted dataset length matches labels
  yieldChart.data.datasets[1].data = [null,null,null,null,null]; yieldChart.update();
});


const API_KEY = "f960ddb4f6c656be2cc4b75e1a5671c8";  // Replace with your key
const CITY = "Delhi";  // Try with "London", "New York" to test

async function getWeather() {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${API_KEY}&units=metric`
    );
    const data = await response.json();

    console.log(data); // 👈 This will show full API response in browser console

    if (data.cod !== 200) {
      document.getElementById("location").textContent = `⚠️ Error: ${data.message}`;
      return;
    }

    document.getElementById("location").textContent = `📍 Location: ${data.name}`;
    document.getElementById("temperature").textContent = `🌡️ Temp: ${data.main.temp}°C`;
    document.getElementById("humidity").textContent = `💧 Humidity: ${data.main.humidity}%`;

    const rain = data.rain ? data.rain["1h"] : "No data";
    document.getElementById("rain").textContent = `🌧️ Rain (1h): ${rain}`;
  } catch (error) {
    console.error("Error fetching weather:", error);
  }
}

getWeather();

// website2.html specific JavaScript

// Simple translations for demonstration
const translations = {
  en: {
    title: "AI Crop Yield Prototype",
    subtitle: "FarmEase",
    navHome: "Home",
    navDashboard: "Dashboard",
    navPredict: "Predict",
    navSoil: "Soil Analyzer",
    navCommunity: "Community",
    navProfile: "Profile",
    homeTitle: "Smart yield predictions for small farms",
    homeDesc: "Use minimal inputs — soil, weather window & seed variety — and get actionable recommendations to improve yield and profit.",
    homeStatAvg: "Avg increase",
    homeStatValue: "+18%",
    homeStatYield: "in predicted yield",
    homeStatTip: "Quick tip",
    homeStatTipValue: "Split Fertilizer",
    homeStatTipDesc: "Apply in 2 stages for maize",
    homeRecentPreds: "Recent Predictions",
    homeTipsTitle: "Tips for farmers",
    tip1: "Use well-decomposed compost with recommended dose.",
    tip2: "Monitor soil moisture using simple tensiometers.",
    tip3: "Rotate crops to reduce pests and maintain nutrients."
  },
  hi: {
    title: "एआई फसल उपज प्रोटोटाइप",
    subtitle: "किसान सहायक",
    navHome: "मुखपृष्ठ",
    navDashboard: "डैशबोर्ड",
    navPredict: "पूर्वानुमान",
    navSoil: "मृदा विश्लेषक",
    navCommunity: "समुदाय",
    navProfile: "प्रोफ़ाइल",
    homeTitle: "छोटे किसानों के लिए स्मार्ट उपज पूर्वानुमान",
    homeDesc: "न्यूनतम इनपुट — मिट्टी, मौसम विंडो और बीज किस्म — का उपयोग करें और उपज व लाभ बढ़ाने के लिए सुझाव प्राप्त करें।",
    homeStatAvg: "औसत वृद्धि",
    homeStatValue: "+१८%",
    homeStatYield: "अनुमानित उपज में",
    homeStatTip: "त्वरित सुझाव",
    homeStatTipValue: "खाद विभाजित करें",
    homeStatTipDesc: "मक्का के लिए 2 चरणों में लागू करें",
    homeRecentPreds: "हाल की भविष्यवाणियाँ",
    homeTipsTitle: "किसानों के लिए सुझाव",
    tip1: "सिफारिश की गई मात्रा के साथ अच्छी तरह से सड़ा हुआ कम्पोस्ट उपयोग करें।",
    tip2: "सरल टेंशियोमीटर से मिट्टी की नमी की निगरानी करें।",
    tip3: "कीटों को कम करने और पोषक तत्व बनाए रखने के लिए फसल चक्र बदलें।"
  },
  bn: {
    title: "এআই ফসল ফলন প্রোটোটাইপ",
    subtitle: "কৃষক সহায়ক",
    navHome: "হোম",
    navDashboard: "ড্যাশবোর্ড",
    navPredict: "পূর্বাভাস",
    navSoil: "মাটি বিশ্লেষক",
    navCommunity: "কমিউনিটি",
    navProfile: "প্রোফাইল",
    homeTitle: "ছোট কৃষকদের জন্য স্মার্ট ফলন পূর্বাভাস",
    homeDesc: "ন্যূনতম ইনপুট — মাটি, আবহাওয়া উইন্ডো এবং বীজের জাত — ব্যবহার করুন এবং ফলন ও লাভ বাড়াতে কার্যকর সুপারিশ পান।",
    homeStatAvg: "গড় বৃদ্ধি",
    homeStatValue: "+১৮%",
    homeStatYield: "অনুমানিত ফলনে",
    homeStatTip: "দ্রুত টিপস",
    homeStatTipValue: "সার ভাগ করুন",
    homeStatTipDesc: "ভুট্টার জন্য ২ ধাপে প্রয়োগ করুন",
    homeRecentPreds: "সাম্প্রতিক পূর্বাভাস",
    homeTipsTitle: "কৃষকদের জন্য টিপস",
    tip1: "প্রস্তাবিত ডোজে ভালভাবে পচা কম্পোস্ট ব্যবহার করুন।",
    tip2: "সহজ টেনসিয়ামিটার দিয়ে মাটির আর্দ্রতা পর্যবেক্ষণ করুন।",
    tip3: "পোকামাকড় কমাতে এবং পুষ্টি বজায় রাখতে ফসল ঘুরান।"
  },
  mr: {
    title: "एआय पीक उत्पादन प्रोटोटाइप",
    subtitle: "शेतकरी सहाय्यक",
    navHome: "मुख्यपृष्ठ",
    navDashboard: "डॅशबोर्ड",
    navPredict: "भविष्यवाणी",
    navSoil: "माती विश्लेषक",
    navCommunity: "समुदाय",
    navProfile: "प्रोफाइल",
    homeTitle: "लहान शेतकऱ्यांसाठी स्मार्ट उत्पादन अंदाज",
    homeDesc: "किमान इनपुट — माती, हवामान विंडो आणि बियाण्याची जात — वापरा आणि उत्पादन व नफा वाढवण्यासाठी सूचना मिळवा.",
    homeStatAvg: "सरासरी वाढ",
    homeStatValue: "+१८%",
    homeStatYield: "अनुमानित उत्पादनात",
    homeStatTip: "त्वरित टिप",
    homeStatTipValue: "खत विभाजित करा",
    homeStatTipDesc: "मक्यासाठी २ टप्प्यांत लागू करा",
    homeRecentPreds: "अलीकडील अंदाज",
    homeTipsTitle: "शेतकऱ्यांसाठी टिप्स",
    tip1: "शिफारस केलेल्या प्रमाणात चांगले कुजलेले कंपोस्ट वापरा.",
    tip2: "सोप्या टेन्शियोमीटरने मातीतील आर्द्रता तपासा.",
    tip3: "कीटक कमी करण्यासाठी आणि पोषक तत्व टिकवण्यासाठी पीक फेरफार करा."
  }
};

document.getElementById('langSelect').addEventListener('change', function() {
  const lang = this.value;
  const t = translations[lang];
  document.getElementById('title').textContent = t.title;
  document.getElementById('subtitle').textContent = t.subtitle;
  document.getElementById('navHome').textContent = t.navHome;
  document.getElementById('navDashboard').textContent = t.navDashboard;
  document.getElementById('navPredict').textContent = t.navPredict;
  document.getElementById('navSoil').textContent = t.navSoil;
  document.getElementById('navCommunity').textContent = t.navCommunity;
  document.getElementById('navProfile').textContent = t.navProfile;
  // Home page translations
  document.getElementById('homeTitle').textContent = t.homeTitle;
  document.getElementById('homeDesc').textContent = t.homeDesc;
  document.getElementById('homeStatAvg').textContent = t.homeStatAvg;
  document.getElementById('homeStatValue').textContent = t.homeStatValue;
  document.getElementById('homeStatYield').textContent = t.homeStatYield;
  document.getElementById('homeStatTip').textContent = t.homeStatTip;
  document.getElementById('homeStatTipValue').textContent = t.homeStatTipValue;
  document.getElementById('homeStatTipDesc').textContent = t.homeStatTipDesc;
  document.getElementById('homeRecentPreds').textContent = t.homeRecentPreds;
  document.getElementById('homeTipsTitle').textContent = t.homeTipsTitle;
  document.getElementById('tip1').textContent = t.tip1;
  document.getElementById('tip2').textContent = t.tip2;
  document.getElementById('tip3').textContent = t.tip3;
});
// --- Simple SPA routing ---
const links = document.querySelectorAll('.navlink');
const pages = document.querySelectorAll('.pages');
function setRoute(route){
  pages.forEach(p => p.classList.add('hidden'));
  document.getElementById(route).classList.remove('hidden');
  links.forEach(l=>l.classList.toggle('active', l.dataset.route===route));
}
links.forEach(l=>l.addEventListener('click',()=>setRoute(l.dataset.route)));

// --- demo charts ---
const heroCtx = document.getElementById('heroChart');
new Chart(heroCtx,{
  type:'line',data:{labels:['2019','2020','2021','2022','2023'],datasets:[{label:'Yield (t/ha)',data:[2.1,2.3,2.7,3.0,3.4],fill:true,tension:0.4}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}
});

const trendCtx = document.getElementById('trendChart');
new Chart(trendCtx,{type:'bar',data:{labels:['Jan','Mar','May','Jul','Sep','Nov'],datasets:[{label:'Yield',data:[2.4,2.6,2.8,3.0,3.2,3.4]}]},options:{plugins:{legend:{display:false}}}});

const gaugeCtx = document.getElementById('predGauge');
const gaugeChart = new Chart(gaugeCtx,{type:'doughnut',data:{labels:['Predicted','Remaining'],datasets:[{data:[60,40],cutout:'75%'}]},options:{plugins:{legend:{display:false}},rotation:-1.2*Math.PI}});

// --- recent predictions (local demo) ---
const recentPredsE = document.getElementById('recentPreds');
const RECENT_KEY = 'agri_recent_preds';
function loadRecent(){
  const arr = JSON.parse(localStorage.getItem(RECENT_KEY)||'[]');
  recentPredsE.innerHTML = arr.slice().reverse().map(r=>`<div style="padding:8px;border-radius:8px;background:var(--glass);margin-top:6px"><strong>${r.crop}</strong> — <span style="font-weight:700">${r.pred.toFixed(2)} t/ha</span><div style="color:var(--muted);font-size:13px">${r.note||''}</div></div>`).join('')||'<div style="color:var(--muted)">No predictions yet</div>';
}
loadRecent();

// --- Prediction simulation logic ---
function simulatePrediction({crop,area,ph,oc,lastYield}){
  // Lightweight heuristic + randomness to simulate ML
  let base = parseFloat(lastYield) || 2.0;
  // soil fertility multiplier
  const fertility = Math.max(0.6, Math.min(1.6, (parseFloat(oc)||1.0) * (1 + (7 - Math.abs((parseFloat(ph)||6.5)-6.5))/10)));
  let weatherFactor = 1 + (Math.random()-0.4)*0.12; // simulated
  let varietyFactor = crop.includes('Maize')?1.05: crop.includes('Rice')?0.98:1.0;
  let predPerHa = base * fertility * weatherFactor * varietyFactor;
  // small area scaling
  if(area && area<0.4) predPerHa *= 0.95;
  // clamp
  predPerHa = Math.max(0.3, Math.min(10, predPerHa));
  // recommendation
  let rec = [];
  if((parseFloat(ph)||6.5) < 6.0) rec.push('Apply lime to raise pH towards 6.5-7.0');
  if((parseFloat(oc)||1) < 1.2) rec.push('Add organic matter: compost/manure');
  if(rec.length===0) rec.push('Maintain current practices; monitor moisture');
  return {pred:predPerHa, rec:rec.join('. ')};
}

document.getElementById('predictBtn').addEventListener('click',()=>{
  const crop = document.getElementById('cropSelect').value;
  const area = parseFloat(document.getElementById('area').value)||1;
  const ph = parseFloat(document.getElementById('ph').value)||6.5;
  const oc = parseFloat(document.getElementById('oc').value)||1;
  const lastYield = parseFloat(document.getElementById('lastYield').value)||2.0;
  const out = simulatePrediction({crop,area,ph,oc,lastYield});
  document.querySelector('#predictionResult div').innerHTML = `<div style="font-size:28px;font-weight:800">${out.pred.toFixed(2)} t/ha</div>`;
  document.getElementById('recText').innerText = out.rec;
  gaugeChart.data.datasets[0].data[0] = Math.min(100, Math.max(0, (out.pred/8)*100));
  gaugeChart.data.datasets[0].data[1] = 100 - gaugeChart.data.datasets[0].data[0];
  gaugeChart.update();
  // save to recent
  const arr = JSON.parse(localStorage.getItem(RECENT_KEY)||'[]');
  arr.push({crop,area,pred:out.pred,note:out.rec,ts:Date.now()});
  localStorage.setItem(RECENT_KEY, JSON.stringify(arr.slice(-20)));
  loadRecent();
});

// --- Soil analyzer ---
document.getElementById('analyzeSoil').addEventListener('click',()=>{
  const n = parseFloat(document.getElementById('nVal').value)||40;
  const p = parseFloat(document.getElementById('pVal').value)||18;
  const k = parseFloat(document.getElementById('kVal').value)||120;
  const ph = parseFloat(document.getElementById('soilPH').value)||6.3;
  // simple scoring
  let score = 50;
  score += Math.max(-20, Math.min(20, (n-40)/2));
  score += Math.max(-15, Math.min(15, (p-15)/1.5));
  score += Math.max(-15, Math.min(15, (k-100)/5));
  score += (ph>=6 && ph<=7.5)?10: (ph<6? -8: -5);
  score = Math.round(Math.max(1,Math.min(100,score)));
  document.getElementById('soilScore').innerText = score;
  let advice = [];
  if(n<30) advice.push('Nitrogen low — consider urea/top-dressing');
  if(p<12) advice.push('Phosphorus low — apply DAP at recommended dose');
  if(k<90) advice.push('Potassium low — apply muriate of potash as per soil test');
  if(ph<6) advice.push('pH low — apply lime');
  if(advice.length===0) advice.push('Soil nutrients are in good range; continue balanced fertilization');
  document.getElementById('soilAnalysis').innerHTML = `<strong>Score: ${score}/100</strong><div style="margin-top:8px;color:var(--muted)">${advice.join('. ')}</div>`;
});

// --- Community posts local storage ---
const POSTS_KEY = 'agri_posts_v1';
function loadPosts(){
  const posts = JSON.parse(localStorage.getItem(POSTS_KEY)||'[]').slice().reverse();
  const el = document.getElementById('posts');
  el.innerHTML = posts.map(p=>`<div class="post"><div style="font-weight:700">${p.user||'Farmer'}</div><div style="color:var(--muted);font-size:14px;margin-top:6px">${p.text}</div></div>`).join('')||'<div style="color:var(--muted)">No posts</div>';
}
loadPosts();
document.getElementById('postBtn').addEventListener('click',()=>{
  const text = document.getElementById('postInput').value.trim();
  if(!text) return alert('Write something first');
  const posts = JSON.parse(localStorage.getItem(POSTS_KEY)||'[]');
  posts.push({user:localStorage.getItem('agri_user')||'Farmer',text,ts:Date.now()});
  localStorage.setItem(POSTS_KEY,JSON.stringify(posts.slice(-100)));
  document.getElementById('postInput').value='';
  loadPosts();
});

// --- Profile save ---
document.getElementById('saveBtn').addEventListener('click',()=>{
  const user = document.getElementById('farmerName').value || 'Farmer';
  const loc = document.getElementById('location').value || '';
  const size = document.getElementById('farmSize').value || '';
  localStorage.setItem('agri_user', user);
  localStorage.setItem('agri_profile', JSON.stringify({user: user, loc,size}));
  alert('Profile saved locally');
});

document.getElementById('saveProfileBtn').addEventListener('click',()=>{document.getElementById('saveBtn').click();});

// --- Quick actions ---
document.getElementById('quickPredict').addEventListener('click',()=>{ setRoute('predict'); document.getElementById('cropSelect').value='Maize'; document.getElementById('area').value='1'; document.getElementById('ph').value='6.4'; document.getElementById('oc').value='1.2'; document.getElementById('lastYield').value='2.6'; });
document.getElementById('soilQuick').addEventListener('click',()=>{ setRoute('soil'); document.getElementById('nVal').value=40; document.getElementById('pVal').value=18; document.getElementById('kVal').value=100; document.getElementById('soilPH').value=6.3; });

// --- Export report (demo) ---
document.getElementById('exportBtn').addEventListener('click',()=>{
  const profile = JSON.parse(localStorage.getItem('agri_profile')||'{}');
  const preds = JSON.parse(localStorage.getItem(RECENT_KEY)||'[]');
  const text = `AgriAI - Report\nFarmer: ${profile.user||'Unknown'}\nLocation: ${profile.loc||'N/A'}\nRecent predictions:\n` + preds.map(p=>`- ${p.crop}: ${p.pred.toFixed(2)} t/ha`).join('\n');
  const blob = new Blob([text],{type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'agri_report.txt'; a.click(); URL.revokeObjectURL(url);
});

// --- small UX ---
document.getElementById('planBtn').addEventListener('click',()=>{ alert('Resource plan created (demo). In production compute seed/fertilizer quantities from area & variety.'); });

// load profile to UI if present
const prof = JSON.parse(localStorage.getItem('agri_profile')||'null');
if(prof){ document.getElementById('farmerName').value = prof.user||''; document.getElementById('location').value = prof.loc||''; document.getElementById('farmSize').value = prof.size||''; }

// On first load, set home
setRoute('home');