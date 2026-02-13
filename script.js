/**
 * [2026-02-14] LOA CUBE ARCHIVE - FULL CODE (Level Fix Focus)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyC_YOUR_ACTUAL_API_KEY", 
    authDomain: "lostark-manager-f4f67.firebaseapp.com",
    projectId: "lostark-manager-f4f67",
    storageBucket: "lostark-manager-f4f67.appspot.com",
    messagingSenderId: "610467209036",
    appId: "1:610467209036:web:YOUR_ACTUAL_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. 로스트아크 API 및 데이터 정의
const LostarkApiKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IktYMk40TkRDSTJ5NTA5NWpjTWk5TllqY2lyZyIsImtpZCI6IktYMk40TkRDSTJ5NTA5NWpjTWk5TllqY2lyZyJ9.eyJpc3MiOiJodHRwczovL2x1ZHkuZ2FtZS5vbnN0b3ZlLmNvbSIsImF1ZCI6Imh0dHBzOi8vbHVkeS5nYW1lLm9uc3RvdmUuY29tL3Jlc291cmNlcyIsImNsaWVudF9pZCI6IjEwMDAwMDAwMDAzMzkyMzYifQ.mJQIEV41gXwuDJzECKWhBGgYqIB3ikA0pYc82aKndYQE5ArlZ9r4ARyI8G-0ITpL6VndJZ2JtnQ89D5xNNy3XX5tk_07JLC5Zo4nBrd1S9o3YQxO6Tl9g4GStPGL-pjLAixv314i8leM8JVmbeSNhQecsPwRdoAFRnvuPJ5UX6bGs9qyRW-mOBLay47xOMUnmzvGCf8WnYzmwnldOejZNDLNjf0M2R4BAfdIrdXMASU8RL9JqoBZOjlyUcZmiNLlM2l3ShKuUAPdE0vRGcQfMh6B0l16Xkftlyau_b9iifjgAp9hVRXB4qnUJPK3gyD2oPSdLm_AWo_um1-Pc3R9-g";
const DEFAULT_CHAR_IMG = "https://img.lostark.co.kr/armory/default_character.png";

const CUBE_REWARDS = {
    "1금제": { gemType: "멸홍", gemLvl: 2, gemQty: 7, leap: "위명돌", leapQty: 20, exp: 3000, sil: 79859, s1: 6, s2: 3, s3: 1 },
    "2금제": { gemType: "멸홍", gemLvl: 3, gemQty: 4, leap: "경명돌", leapQty: 15, exp: 9000, sil: 100142, s1: 8, s2: 4, s3: 2 },
    "3금제": { gemType: "멸홍", gemLvl: 3, gemQty: 6, leap: "경명돌", leapQty: 25, exp: 12000, sil: 110370, s1: 11, s2: 6, s3: 2 },
    "4금제": { gemType: "멸홍", gemLvl: 3, gemQty: 8, leap: "찬명돌", leapQty: 14, exp: 13000, sil: 120518, s1: 12, s2: 7, s3: 3 },
    "5금제": { gemType: "멸홍", gemLvl: 3, gemQty: 9, leap: "찬명돌", leapQty: 25, exp: 13500, sil: 129802, s1: 13, s2: 8, s3: 4 },
    "1해금": { gemType: "겁작", gemLvl: 1, gemQty: 9, leap: "운돌", leapQty: 14, exp: 14000, sil: 140173, s4: 4, s5: 4 },
    "2해금": { gemType: "겁작", gemLvl: 2, gemQty: 6, leap: "운돌", leapQty: 25, exp: 14500, sil: 151741, s4: 5, s5: 5 },
    "3해금": { gemType: "겁작", gemLvl: 2, gemQty: 8, leap: "운돌", leapQty: 32, exp: 15000, sil: 161235, s4: 6, s5: 6 },
    "4해금": { gemType: "겁작", gemLvl: 2, gemQty: 11, leap: "운돌", leapQty: 41, exp: 15500, sil: 190000, s4: 8, s5: 8 }
};

const GUM_TYPES = ["1금제", "2금제", "3금제", "4금제", "5금제"];
const HAE_TYPES = ["1해금", "2해금", "3해금", "4해금"];
const ALL_TYPES = [...GUM_TYPES, ...HAE_TYPES];

let currentUser = null;
let characters = [];
let excludedList = [];
let currentEditingId = null;

// --- [초기화] ---
window.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('LOA_CURRENT_ID');
    if (session) { 
        currentUser = session; 
        loadUserData(); 
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
    }
});

// --- [레벨 파싱 유틸리티: 가장 중요] ---
function parseLevel(lvl) {
    if (!lvl) return 0;
    // 쉼표 제거 및 숫자가 아닌 모든 문자 제거 (단, 마침표는 유지)
    const cleaned = String(lvl).replace(/,/g, "").replace(/[^0-9.]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

// --- [동기화 로직: 레벨 누락 해결] ---
window.fetchLoaData = async function() {
    const nameInput = document.getElementById('main-char').value.trim();
    if (!nameInput) return;
    try {
        const res = await fetch(`https://developer-lostark.game.onstove.com/characters/${encodeURIComponent(nameInput)}/siblings`, {
            headers: { 'authorization': `Bearer ${LostarkApiKey}`, 'accept': 'application/json' }
        });
        const siblings = await res.json();
        if(!siblings) return;

        const updated = [];
        for (const char of siblings) {
            if (excludedList.includes(char.CharacterName)) continue;

            // 1차 레벨 데이터 (siblings에서 가져옴)
            let accurateLevel = parseLevel(char.ItemMaxLevel || char.ItemAvgLevel);
            let charImage = DEFAULT_CHAR_IMG;

            // 2차 상세 데이터 (Profiles API로 소수점 및 이미지 보정)
            try {
                const pRes = await fetch(`https://developer-lostark.game.onstove.com/armories/characters/${encodeURIComponent(char.CharacterName)}/profiles`, {
                    headers: { 'authorization': `Bearer ${LostarkApiKey}`, 'accept': 'application/json' }
                });
                const prof = await pRes.json();
                if(prof) {
                    if(prof.ItemMaxLevel) accurateLevel = parseLevel(prof.ItemMaxLevel);
                    if(prof.CharacterImage) charImage = prof.CharacterImage;
                }
            } catch(e) { console.error("상세로딩실패:", char.CharacterName); }

            updated.push({
                actorId: `ACTOR_${char.CharacterName}`,
                name: char.CharacterName, 
                server: char.ServerName, 
                level: accurateLevel, // 숫자로 저장
                job: char.CharacterClassName, 
                image: charImage,
                cubes: characters.find(c => c.name === char.CharacterName)?.cubes || ALL_TYPES.reduce((acc, t) => ({...acc, [t]: 0}), {})
            });
        }
        // 레벨순 정렬
        characters = updated.sort((a,b) => b.level - a.level);
        await saveUserData(); 
        alert("레벨 동기화 및 원정대 로드 완료!");
    } catch (e) { alert("API 오류가 발생했습니다."); }
};

// --- [캐릭터 카드 렌더링] ---
window.renderCharacters = function() {
    const list = document.getElementById('char-list');
    if (!list) return; list.innerHTML = '';
    
    characters.forEach(char => {
        const div = document.createElement('div');
        div.className = 'char-card';
        
        // 레벨 표시 포맷
        const dispLvl = char.level > 0 ? char.level.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "?.??";
        
        const gumHtml = GUM_TYPES.map(t => `<div style="display:flex; justify-content:space-between; font-size:11px; color:${char.cubes[t]>0?'#00ff41':'#444'};"><span>${t}:</span><b>${char.cubes[t]||0}</b></div>`).join('');
        const haeHtml = HAE_TYPES.map(t => `<div style="display:flex; justify-content:space-between; font-size:11px; color:${char.cubes[t]>0?'#00ccff':'#444'};"><span>${t}:</span><b>${char.cubes[t]||0}</b></div>`).join('');

        div.innerHTML = `
            <span class="server-tag"><b>${char.server}</b></span>
            <span class="del-char-btn" style="position:absolute; top:5px; right:25px; cursor:pointer;" onclick="window.removeCharacter('${char.actorId}', '${char.name}', event)">×</span>
            <div class="img-wrapper"><img src="${char.image}" onerror="this.src='${DEFAULT_CHAR_IMG}'"></div>
            <div class="char-info-box">
                <div class="char-name" style="font-size:17px;"><b>${char.name}</b></div>
                <div class="char-details"><b>${char.job} | <span style="color:#00ff41;">Lv.${dispLvl}</span></b></div>
                <div style="display:flex; margin-top:10px; padding:8px; background:rgba(0,0,0,0.6); border:1px solid #333; gap:10px; border-radius:4px;">
                    <div style="flex:1; border-right:1px solid #444; padding-right:8px;">${gumHtml}</div>
                    <div style="flex:1; padding-left:8px;">${haeHtml}</div>
                </div>
            </div>`;
        div.onclick = () => window.openCmd(char.actorId);
        list.appendChild(div);
    });
};

// --- [모달 UI: 요청하신 금제 / 해금 좌우 정렬] ---
window.updateCubeDisplay = function() {
    const char = characters.find(c => c.actorId === currentEditingId);
    if(!char) return;

    // 모달 내부를 감싸는 컨테이너 스타일 강제 설정
    const container = document.querySelector('.cube-grid-container');
    if (container) {
        container.style.display = 'grid';
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gap = '15px';
        container.style.padding = '10px';
    }

    const createItem = (t, color) => `
        <div class="cube-item" style="border-color:${char.cubes[t]>0?color:'#333'}; margin-bottom:8px; width:100%; box-sizing:border-box;" 
             onclick="window.modifyCube('${t}',1)" oncontextmenu="event.preventDefault();window.modifyCube('${t}',-1)">
            <div style="font-size:10px; color:#666;">${t}</div>
            <div style="font-size:22px; color:${char.cubes[t]>0?color:'#444'}"><b>${char.cubes[t]}</b></div>
        </div>`;

    // 왼쪽 열: 금제
    const leftGrid = document.getElementById('grid-gum');
    leftGrid.style.display = 'flex';
    leftGrid.style.flexDirection = 'column';
    leftGrid.innerHTML = `<div style="color:#00ff41; font-size:12px; margin-bottom:10px; text-align:center; border-bottom:1px solid #333;">금제 (1-5)</div>` + 
                          GUM_TYPES.map(t => createItem(t, '#00ff41')).join('');

    // 오른쪽 열: 해금
    const rightGrid = document.getElementById('grid-hae');
    rightGrid.style.display = 'flex';
    rightGrid.style.flexDirection = 'column';
    rightGrid.innerHTML = `<div style="color:#00ccff; font-size:12px; margin-bottom:10px; text-align:center; border-bottom:1px solid #333;">해금 (1-4)</div>` + 
                           HAE_TYPES.map(t => createItem(t, '#00ccff')).join('');
};

// --- [통계 렌더링: 디자인 보존] ---
window.renderStats = function() {
    const headerTitleSection = document.querySelector('.header-section > div:first-child');
    if (!headerTitleSection) return;

    let statsBox = document.getElementById('total-stats-box');
    if (!statsBox) {
        statsBox = document.createElement('div');
        statsBox.id = 'total-stats-box';
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex'; btnContainer.style.gap = '8px';
        btnContainer.innerHTML = `
            <button class="btn" onclick="window.exportData()" style="padding:5px 10px; font-size:11px;">내보내기</button>
            <button class="btn" onclick="window.importData()" style="padding:5px 10px; font-size:11px;">불러오기</button>
            <button class="btn" onclick="window.logout()" style="border-color:#a00; color:#a00; padding:5px 10px; font-size:11px;">LOGOUT</button>
        `;
        headerTitleSection.innerHTML = '';
        headerTitleSection.appendChild(statsBox);
        headerTitleSection.appendChild(btnContainer);
        headerTitleSection.style.cssText = "display:flex; align-items:center; justify-content:space-between; width:100%;";
    }

    let m_base = {1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0}, g_base = {1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0};
    let leaps = { "위명돌":0, "경명돌":0, "찬명돌":0, "운돌":0 }, mats = { "은총":0, "축복":0, "가호":0, "용암":0, "빙결":0 };
    let totalSil = 0, totalExp = 0, totals = {};

    ALL_TYPES.forEach(t => {
        const count = characters.reduce((sum, char) => sum + (char.cubes[t] || 0), 0);
        totals[t] = count;
        const r = CUBE_REWARDS[t];
        if (r && count > 0) {
            if(r.gemType === "멸홍") m_base[r.gemLvl] += r.gemQty * count;
            else g_base[r.gemLvl] += r.gemQty * count;
            if(r.leap) leaps[r.leap] += r.leapQty * count;
            totalSil += (r.sil || 0) * count; totalExp += (r.exp || 0) * count;
            if(r.s1) mats["은총"] += r.s1 * count; if(r.s2) mats["축복"] += r.s2 * count; if(r.s3) mats["가호"] += r.s3 * count;
            if(r.s4) mats["용암"] += r.s4 * count; if(r.s5) mats["빙결"] += r.s5 * count;
        }
    });

    const fM = calculateCombinedGems(m_base), fG = calculateCombinedGems(g_base);
    const fmtG = (obj) => Object.entries(obj).filter(e => e[1]>0).sort((a,b)=>b[0]-a[0]).map(e => `${e[0]}L(${e[1]})`).join(', ') || "없음";

    let rowsHtml = "";
    for(let i=0; i<5; i++) {
        const gum = GUM_TYPES[i] || "", hae = HAE_TYPES[i] || "";
        rowsHtml += `<div style="display:flex; gap:20px; font-size:12px; margin-bottom:3px;">
            <div style="width:85px; color:#00ff41; display:flex; justify-content:space-between;"><span>${gum}</span><b>${totals[gum]||0}</b></div>
            <div style="width:85px; color:#00ccff; display:flex; justify-content:space-between;"><span>${hae}</span><b>${hae?totals[hae]||0:""}</b></div>
        </div>`;
    }

    statsBox.innerHTML = `
        <div style="background:#0a0a0a; border:1px solid #444; padding:15px 20px; display:flex; gap:35px; box-shadow: 0 0 15px rgba(0,0,0,0.7); border-radius:4px; align-items:flex-start;">
            <div><div style="font-size:10px; color:#aaa; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:3px; text-align:center;"><b>[ TICKETS ]</b></div>${rowsHtml}</div>
            <div style="border-left:1px solid #333; padding-left:25px; min-width:350px;">
                <div style="font-size:10px; color:#aaa; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:3px; text-align:center;"><b>[ REWARDS ]</b></div>
                <div style="font-size:12px; line-height:1.8;">
                    <span style="color:#00ff41;">• 멸홍: ${fmtG(fM)}</span><br><span style="color:#00ccff;">• 겁작: ${fmtG(fG)}</span><br>
                    <span style="color:#ffd700;">• 돌파석: ${Object.entries(leaps).filter(e=>e[1]>0).map(e=>`${e[0]}(${e[1]})`).join(' ')}</span><br>
                    <span style="color:#ff66cc;">• 보조재: 은/축/가(${mats.은총}/${mats.축복}/${mats.가호}) | 용/빙(${mats.용암}/${mats.빙결})</span><br>
                    <span style="color:#aaa;">• 실링: ${totalSil.toLocaleString()} | 카경: ${totalExp.toLocaleString()}</span>
                </div>
            </div>
        </div>`;
};

// --- [Firebase 및 공통함수] ---
async function loadUserData() {
    const docSnap = await getDoc(doc(db, "users", currentUser));
    if (docSnap.exists()) {
        const d = docSnap.data();
        characters = (d.characters || []).map(c => ({...c, level: parseLevel(c.level)}));
        excludedList = d.excludedList || [];
    }
    window.renderAll();
}

async function saveUserData() {
    if (!currentUser) return;
    const docRef = doc(db, "users", currentUser);
    const snap = await getDoc(docRef);
    await setDoc(docRef, { password: snap.data().password, characters, excludedList }, { merge: true });
    window.renderAll();
}

window.renderAll = () => { window.renderStats(); window.renderCharacters(); };
window.openCmd = (id) => { currentEditingId = id; const char = characters.find(c => c.actorId === id); document.getElementById('modal-title').innerText = `C:\\Users\\${char.name}\\Status`; document.getElementById('cmd-modal').style.display = 'block'; document.getElementById('modal-overlay').style.display = 'block'; window.updateCubeDisplay(); };
window.closeModal = () => { document.getElementById('cmd-modal').style.display = 'none'; document.getElementById('modal-overlay').style.display = 'none'; };
window.modifyCube = async (type, amt) => { const char = characters.find(c => c.actorId === currentEditingId); char.cubes[type] = Math.max(0, (char.cubes[type]||0) + parseInt(amt)); saveUserData(); window.updateCubeDisplay(); };
window.handleLogin = async function() {
    const id = document.getElementById('login-id').value.trim(), pw = document.getElementById('login-pw').value.trim();
    const docSnap = await getDoc(doc(db, "users", id));
    if (docSnap.exists() && docSnap.data().password === pw) {
        currentUser = id; localStorage.setItem('LOA_CURRENT_ID', id);
        await loadUserData(); document.getElementById('login-container').style.display='none'; document.getElementById('app-container').style.display='block';
    } else alert("로그인 실패");
};
window.handleRegister = async function() {
    const id = document.getElementById('login-id').value.trim(), pw = document.getElementById('login-pw').value.trim();
    if(!id || !pw) return;
    await setDoc(doc(db, "users", id), { password: pw, characters: [], excludedList: [] });
    alert("가입 성공");
};
window.importData = function() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = e => {
        const reader = new FileReader();
        reader.onload = async ev => {
            const data = JSON.parse(ev.target.result);
            if (data.characters) { characters = data.characters; excludedList = data.excludedList || []; await saveUserData(); alert("복구 완료"); }
        };
        reader.readAsText(e.target.files[0]);
    };
    input.click();
};
window.exportData = function() {
    const b = new Blob([JSON.stringify({ characters, excludedList }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `LOA_BACKUP.json`; a.click();
};
window.logout = () => { localStorage.removeItem('LOA_CURRENT_ID'); location.reload(); };
window.removeCharacter = (id, name, ev) => { ev.stopPropagation(); if(confirm("제외할까요?")) { excludedList.push(name); characters = characters.filter(c => c.actorId !== id); saveUserData(); } };

function calculateCombinedGems(baseGems) {
    let gems = { ...baseGems };
    for (let lvl = 1; lvl <= 9; lvl++) {
        if (gems[lvl] >= 3) {
            let next = Math.floor(gems[lvl] / 3);
            gems[lvl + 1] = (gems[lvl + 1] || 0) + next;
            gems[lvl] = gems[lvl] % 3;
        }
    }
    return gems;
}
