/**
 * [2026-02-13] 최종 통합 버전 (데이터 내보내기/불러오기 추가)
 * 1. 데이터 이관: JSON 파일 내보내기 및 불러오기 기능 구현
 * 2. 레벨 표시 버그 수정: 콤마 제거 및 정규화
 * 3. 보석 합성 및 재료 데이터 통합
 * 4. ACTOR_ID 유지 및 세션 관리
 */

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

const STORAGE_KEYS = { USERS: 'LOA_USER_DB', SESSION: 'LOA_CURRENT_ID' };
const GUM_TYPES = ["1금제", "2금제", "3금제", "4금제", "5금제"];
const HAE_TYPES = ["1해금", "2해금", "3해금", "4해금"];
const ALL_TYPES = [...GUM_TYPES, ...HAE_TYPES];

let currentUser = null;
let characters = [];
let excludedList = [];
let currentEditingId = null;

window.onload = function() {
    const session = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (session) { currentUser = session; loadUserData(); showMainApp(); } else { showLoginForm(); }
};

// --- [추가] 데이터 내보내기 (JSON 파일 다운로드) ---
function exportData() {
    const data = {
        characters: characters,
        excludedList: excludedList,
        exportedAt: new Date().toISOString(),
        user: currentUser
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LOA_CUBE_DATA_${currentUser}_${new Date().toLocaleDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// --- [추가] 데이터 불러오기 (JSON 파일 읽기) ---
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const imported = JSON.parse(event.target.result);
                if (imported.characters) {
                    if (confirm("기존 데이터를 덮어쓰고 불러오시겠습니까?")) {
                        characters = imported.characters;
                        excludedList = imported.excludedList || [];
                        saveUserData();
                        alert("데이터를 성공적으로 불러왔습니다!");
                    }
                } else {
                    alert("올바른 데이터 형식이 아닙니다.");
                }
            } catch (err) {
                alert("파일 읽기 실패: " + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// --- 보석 합성 로직 ---
function calculateCombinedGems(baseGems) {
    let gems = { ...baseGems };
    for (let lvl = 1; lvl <= 9; lvl++) {
        if (gems[lvl] >= 3) {
            let nextLvlGain = Math.floor(gems[lvl] / 3);
            gems[lvl + 1] = (gems[lvl + 1] || 0) + nextLvlGain;
            gems[lvl] = gems[lvl] % 3;
        }
    }
    return gems;
}

// --- 통계 렌더링 ---
function renderStats() {
    const headerTitleSection = document.querySelector('.header-section > div:first-child');
    if (!headerTitleSection) return;

    let statsBox = document.getElementById('total-stats-box');
    if (!statsBox) {
        statsBox = document.createElement('div');
        statsBox.id = 'total-stats-box';
        
        // 버튼 영역 (내보내기/불러오기 추가)
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '8px';
        btnContainer.innerHTML = `
            <button onclick="exportData()" style="background:#333; color:#fff; border:1px solid #555; padding:5px 10px; cursor:pointer; font-size:11px;">내보내기</button>
            <button onclick="importData()" style="background:#333; color:#fff; border:1px solid #555; padding:5px 10px; cursor:pointer; font-size:11px;">불러오기</button>
            <button onclick="logout()" style="background:#a00; color:#fff; border:none; padding:5px 10px; cursor:pointer; font-size:11px;">LOGOUT</button>
        `;

        headerTitleSection.innerHTML = ''; // 초기화 후 재구성
        headerTitleSection.appendChild(statsBox);
        headerTitleSection.appendChild(btnContainer);
    }

    let m_base = {1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0};
    let g_base = {1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0};
    let leaps = { "위명돌":0, "경명돌":0, "찬명돌":0, "운돌":0 };
    let mats = { "은총":0, "축복":0, "가호":0, "용암":0, "빙결":0 };
    let totalSil = 0, totalExp = 0;

    const totals = ALL_TYPES.reduce((acc, type) => {
        const count = characters.reduce((sum, char) => sum + (char.cubes[type] || 0), 0);
        acc[type] = count;
        const r = CUBE_REWARDS[type];
        if (r && count > 0) {
            if(r.gemType === "멸홍") m_base[r.gemLvl] += r.gemQty * count;
            else g_base[r.gemLvl] += r.gemQty * count;
            if(r.leap) leaps[r.leap] += r.leapQty * count;
            totalSil += (r.sil || 0) * count;
            totalExp += (r.exp || 0) * count;
            if(r.s1) mats["은총"] += r.s1 * count;
            if(r.s2) mats["축복"] += r.s2 * count;
            if(r.s3) mats["가호"] += r.s3 * count;
            if(r.s4) mats["용암"] += r.s4 * count;
            if(r.s5) mats["빙결"] += r.s5 * count;
        }
        return acc;
    }, {});

    const finalM = calculateCombinedGems(m_base);
    const finalG = calculateCombinedGems(g_base);

    const getGemResult = (obj) => {
        const sorted = Object.entries(obj).filter(e => e[1] > 0).sort((a, b) => b[0] - a[0]);
        if (sorted.length === 0) return "없음";
        return sorted.map(e => `${e[0]}레벨(${e[1]}개)`).join(', ');
    };

    let rowsHtml = "";
    for(let i=0; i < 5; i++) {
        const gum = GUM_TYPES[i] || "";
        const hae = HAE_TYPES[i] || "";
        rowsHtml += `
            <div style="display:flex; gap:20px; font-size:12px; margin-bottom:3px;">
                <div style="width:85px; color:#00ff41; display:flex; justify-content:space-between;"><span>${gum}</span><b>${totals[gum]||0}</b></div>
                <div style="width:85px; color:#00ccff; display:flex; justify-content:space-between;"><span>${hae}</span><b>${hae?totals[hae]||0:""}</b></div>
            </div>`;
    }

    statsBox.innerHTML = `
        <div style="background:#0a0a0a; border:1px solid #444; padding:15px 20px; display:flex; gap:35px; box-shadow: 0 0 15px rgba(0,0,0,0.7); border-radius:4px; align-items:flex-start;">
            <div>
                <div style="font-size:10px; color:#aaa; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:3px; text-align:center;"><b>[ TICKETS ]</b></div>
                ${rowsHtml}
            </div>
            <div style="border-left:1px solid #333; padding-left:25px; min-width:350px;">
                <div style="font-size:10px; color:#aaa; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:3px; text-align:center;"><b>[ REWARDS ]</b></div>
                <div style="font-size:12px; line-height:1.8;">
                    <span style="color:#00ff41;">• 멸홍(3T): ${getGemResult(finalM)}</span><br>
                    <span style="color:#00ccff;">• 겁작(4T): ${getGemResult(finalG)}</span><br>
                    <span style="color:#ffd700;">• 돌파석: ${Object.entries(leaps).filter(e=>e[1]>0).map(e=>`${e[0]}(${e[1]})`).join(' ')}</span><br>
                    <span style="color:#ff66cc;">• 보조재: 은/축/가(${mats.은총}/${mats.축복}/${mats.가호}) | 용/빙(${mats.용암}/${mats.빙결})</span><br>
                    <span style="color:#aaa;">• 실링: ${totalSil.toLocaleString()} | 카경: ${totalExp.toLocaleString()}</span>
                </div>
            </div>
        </div>`;
    headerTitleSection.style.cssText = "display:flex; align-items:center; justify-content:space-between; width:100%;";
}

// --- 캐릭터 정보 렌더링 ---
function renderCharacters() {
    const list = document.getElementById('char-list');
    if (!list) return;
    list.innerHTML = '';

    characters.forEach(char => {
        const div = document.createElement('div');
        div.className = 'char-card';
        const numLevel = parseFloat(String(char.level || "0").replace(/,/g, ""));
        const displayLevel = (isNaN(numLevel) || numLevel === 0) ? "?.??" : numLevel.toLocaleString(undefined, { minimumFractionDigits: 2 });

        const gumHtml = GUM_TYPES.map(t => `<div style="display:flex; justify-content:space-between; font-size:11px; color:${char.cubes[t]>0?'#00ff41':'#444'};"><span>${t}:</span><b>${char.cubes[t]||0}</b></div>`).join('');
        const haeHtml = HAE_TYPES.map(t => `<div style="display:flex; justify-content:space-between; font-size:11px; color:${char.cubes[t]>0?'#00ccff':'#444'};"><span>${t}:</span><b>${char.cubes[t]||0}</b></div>`).join('');

        div.innerHTML = `
            <span class="server-tag"><b>${char.server}</b></span>
            <span class="del-char-btn" onclick="removeCharacter('${char.actorId}', '${char.name}', event)">×</span>
            <div class="img-wrapper"><img src="${char.image}"></div>
            <div class="char-info-box">
                <div class="char-name" style="font-size:17px;"><b>${char.name}</b></div>
                <div class="char-details"><b>${char.job} | <span style="color:#00ff41;">Lv.${displayLevel}</span></b></div>
                <div style="display:flex; margin-top:10px; padding:8px; background:rgba(0,0,0,0.6); border:1px solid #333; gap:10px; border-radius:4px;">
                    <div style="flex:1; border-right:1px solid #444; padding-right:8px;">${gumHtml}</div>
                    <div style="flex:1; padding-left:8px;">${haeHtml}</div>
                </div>
            </div>`;
        div.onclick = () => openCmd(char.actorId);
        list.appendChild(div);
    });
}

// --- API 동기화 ---
async function fetchLoaData() {
    const nameInput = document.getElementById('main-char').value.trim();
    if (!nameInput) return alert("캐릭터명을 입력하세요.");
    try {
        const res = await fetch(`https://developer-lostark.game.onstove.com/characters/${encodeURIComponent(nameInput)}/siblings`, {
            headers: { 'authorization': `Bearer ${LostarkApiKey}`, 'accept': 'application/json' }
        });
        const siblings = await res.json();
        if (!siblings) return;
        const updatedList = [];
        for (const char of siblings) {
            if (excludedList.includes(char.CharacterName)) continue;
            let itemLevel = String(char.ItemMaxLevel || "0").replace(/,/g, ""); 
            let charImage = DEFAULT_CHAR_IMG;
            try {
                const pRes = await fetch(`https://developer-lostark.game.onstove.com/armories/characters/${encodeURIComponent(char.CharacterName)}/profiles`, {
                    headers: { 'authorization': `Bearer ${LostarkApiKey}`, 'accept': 'application/json' }
                });
                const prof = await pRes.json();
                if (prof) {
                    if (prof.CharacterImage) charImage = prof.CharacterImage;
                    if (prof.ItemMaxLevel) itemLevel = String(prof.ItemMaxLevel).replace(/,/g, "");
                }
            } catch(e) {}
            updatedList.push({
                actorId: `ACTOR_${char.CharacterName}`,
                name: char.CharacterName, server: char.ServerName, level: itemLevel, job: char.CharacterClassName, image: charImage,
                cubes: characters.find(c => c.name === char.CharacterName)?.cubes || ALL_TYPES.reduce((acc, t) => ({...acc, [t]: 0}), {})
            });
        }
        updatedList.sort((a, b) => parseFloat(b.level) - parseFloat(a.level));
        characters = updatedList;
        saveUserData();
        alert("원정대 동기화 성공!");
    } catch (e) { alert(e.message); }
}

// --- 공통 기능 ---
function loadUserData() {
    characters = JSON.parse(localStorage.getItem(`data_${currentUser}_chars`)) || [];
    excludedList = JSON.parse(localStorage.getItem(`data_${currentUser}_excl`)) || [];
}
function saveUserData() {
    localStorage.setItem(`data_${currentUser}_chars`, JSON.stringify(characters));
    localStorage.setItem(`data_${currentUser}_excl`, JSON.stringify(excludedList));
    renderAll();
}
function renderAll() { renderStats(); renderCharacters(); }
function removeCharacter(id, name, event) {
    event.stopPropagation();
    if (confirm(`[${name}] 목록에서 제외하시겠습니까?`)) {
        excludedList.push(name);
        characters = characters.filter(c => c.actorId !== id);
        saveUserData();
    }
}
function openCmd(id) {
    currentEditingId = id;
    const char = characters.find(c => c.actorId === id);
    document.getElementById('modal-title').innerText = `C:\\Users\\${char.name}\\Status`;
    document.getElementById('cmd-modal').style.display = 'block';
    document.getElementById('modal-overlay').style.display = 'block';
    updateCubeDisplay();
}
function updateCubeDisplay() {
    const char = characters.find(c => c.actorId === currentEditingId);
    const render = (types, gridId, color) => {
        document.getElementById(gridId).innerHTML = types.map(t => `
            <div class="cube-item" style="border-color:${char.cubes[t]>0?color:'#333'}" onclick="modifyCube('${t}',1)" oncontextmenu="event.preventDefault();modifyCube('${t}',-1)">
                <div style="font-size:10px; color:#555;">${t}</div>
                <div style="font-size:20px; color:${char.cubes[t]>0?color:'#444'}"><b>${char.cubes[t]}</b></div>
            </div>`).join('');
    };
    render(GUM_TYPES, 'grid-gum', '#00ff41');
    render(HAE_TYPES, 'grid-hae', '#00ccff');
}
function modifyCube(type, amt) {
    const char = characters.find(c => c.actorId === currentEditingId);
    char.cubes[type] = Math.max(0, (char.cubes[type] || 0) + parseInt(amt));
    saveUserData(); updateCubeDisplay();
}
function closeModal() {
    document.getElementById('cmd-modal').style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'none';
}
function handleLogin() {
    const id = document.getElementById('login-id').value.trim();
    const pw = document.getElementById('login-pw').value.trim();
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || {};
    if (users[id] && users[id].password === pw) {
        currentUser = id;
        localStorage.setItem(STORAGE_KEYS.SESSION, id);
        loadUserData(); showMainApp();
    } else { alert("인증 실패"); }
}
function handleRegister() {
    const id = document.getElementById('login-id').value.trim();
    const pw = document.getElementById('login-pw').value.trim();
    if (!id || !pw) return alert("정보 부족");
    let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || {};
    if (users[id]) return alert("중복 아이디");
    users[id] = { password: pw };
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    alert("등록 완료");
}
function logout() { localStorage.removeItem(STORAGE_KEYS.SESSION); location.reload(); }
function showLoginForm() { 
    document.getElementById('login-container').style.display = 'flex'; 
    document.getElementById('app-container').style.display = 'none'; 
}
function showMainApp() { 
    document.getElementById('login-container').style.display = 'none'; 
    document.getElementById('app-container').style.display = 'block'; 
    renderAll(); 
}
