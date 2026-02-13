

const LostarkApiKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IktYMk40TkRDSTJ5NTA5NWpjTWk5TllqY2lyZyIsImtpZCI6IktYMk40TkRDSTJ5NTA5NWpjTWk5TllqY2lyZyJ9.eyJpc3MiOiJodHRwczovL2x1ZHkuZ2FtZS5vbnN0b3ZlLmNvbSIsImF1ZCI6Imh0dHBzOi8vbHVkeS5nYW1lLm9uc3RvdmUuY29tL3Jlc291cmNlcyIsImNsaWVudF9pZCI6IjEwMDAwMDAwMDAzMzkyMzYifQ.mJQIEV41gXwuDJzECKWhBGgYqIB3ikA0pYc82aKndYQE5ArlZ9r4ARyI8G-0ITpL6VndJZ2JtnQ89D5xNNy3XX5tk_07JLC5Zo4nBrd1S9o3YQxO6Tl9g4GStPGL-pjLAixv314i8leM8JVmbeSNhQecsPwRdoAFRnvuPJ5UX6bGs9qyRW-mOBLay47xOMUnmzvGCf8WnYzmwnldOejZNDLNjf0M2R4BAfdIrdXMASU8RL9JqoBZOjlyUcZmiNLlM2l3ShKuUAPdE0vRGcQfMh6B0l16Xkftlyau_b9iifjgAp9hVRXB4qnUJPK3gyD2oPSdLm_AWo_um1-Pc3R9-g";
const DEFAULT_CHAR_IMG = "https://img.lostark.co.kr/armory/default_character.png";

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
    if (session) {
        currentUser = session;
        loadUserData();
        showMainApp();
    } else {
        showLoginForm();
    }
};

// --- 로그인/UI 제어 ---
function handleLogin() {
    const id = document.getElementById('login-id').value.trim();
    const pw = document.getElementById('login-pw').value.trim();
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || {};
    if (users[id] && users[id].password === pw) {
        currentUser = id;
        localStorage.setItem(STORAGE_KEYS.SESSION, id);
        loadUserData();
        showMainApp();
    } else { alert("인증 실패: 아이디 또는 비밀번호를 확인하세요."); }
}

function handleRegister() {
    const id = document.getElementById('login-id').value.trim();
    const pw = document.getElementById('login-pw').value.trim();
    if (!id || !pw) return alert("입력 필요");
    let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || {};
    if (users[id]) return alert("이미 존재하는 ID입니다.");
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

// --- 데이터 관리 ---
function loadUserData() {
    characters = JSON.parse(localStorage.getItem(`data_${currentUser}_chars`)) || [];
    excludedList = JSON.parse(localStorage.getItem(`data_${currentUser}_excl`)) || [];
    const mainH2 = document.querySelector('.header-section h2');
    if(mainH2) mainH2.innerHTML = `<b>[ 큐브 ]</b>`;
}

function saveUserData() {
    localStorage.setItem(`data_${currentUser}_chars`, JSON.stringify(characters));
    localStorage.setItem(`data_${currentUser}_excl`, JSON.stringify(excludedList));
    renderAll();
}

/** 3. 원정대 동기화 (오류 진단 강화) */
async function fetchLoaData() {
    const nameInput = document.getElementById('main-char').value.trim();
    if (!nameInput) return alert("캐릭터명을 입력하세요.");

    try {
        const res = await fetch(`https://developer-lostark.game.onstove.com/characters/${encodeURIComponent(nameInput)}/siblings`, {
            headers: { 'authorization': `Bearer ${LostarkApiKey}`, 'accept': 'application/json' }
        });

        if (!res.ok) {
            if (res.status === 401) throw new Error("API 키가 만료되었거나 올바르지 않습니다. (401)");
            if (res.status === 429) throw new Error("요청이 너무 잦습니다. 잠시 후 다시 시도하세요. (429)");
            if (res.status === 503) throw new Error("로아 API 서버 점검 중입니다. (503)");
            throw new Error(`통신 에러가 발생했습니다. (Code: ${res.status})`);
        }

        const siblings = await res.json();
        if (!siblings || siblings.length === 0) return alert("캐릭터 정보를 찾을 수 없습니다.");

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
                if (prof && prof.CharacterImage) charImage = prof.CharacterImage;
            } catch(e) {}

            updatedList.push({
                actorId: `ACTOR_${char.CharacterName}`,
                name: char.CharacterName,
                server: char.ServerName,
                level: itemLevel,
                job: char.CharacterClassName,
                image: charImage,
                cubes: characters.find(c => c.name === char.CharacterName)?.cubes || 
                       ALL_TYPES.reduce((acc, t) => ({...acc, [t]: 0}), {})
            });
        }

        updatedList.sort((a, b) => parseFloat(b.level) - parseFloat(a.level));
        characters = updatedList;
        saveUserData();
        alert("원정대 동기화 성공!");

    } catch (e) {
        console.error(e);
        if (e.message.includes("Failed to fetch")) {
            alert("동기화 실패: 깃허브 보안 정책(CORS) 차단 혹은 API 키 정지 상태입니다. 리포지토리를 Private으로 설정했는지 확인하세요.");
        } else {
            alert(`동기화 실패: ${e.message}`);
        }
    }
}

// --- 렌더링 ---
function renderAll() {
    renderStats();
    renderCharacters();
}

function renderStats() {
    const headerTitleSection = document.querySelector('.header-section > div:first-child');
    if (!headerTitleSection) return;

    let statsBox = document.getElementById('total-stats-box');
    if (!statsBox) {
        statsBox = document.createElement('div');
        statsBox.id = 'total-stats-box';
        const logoutBtn = headerTitleSection.querySelector('button');
        headerTitleSection.insertBefore(statsBox, logoutBtn);
    }

    const totals = ALL_TYPES.reduce((acc, type) => {
        acc[type] = characters.reduce((sum, char) => sum + (char.cubes[type] || 0), 0);
        return acc;
    }, {});

    let rowsHtml = "";
    for(let i=0; i < 5; i++) {
        const gum = GUM_TYPES[i] || "";
        const hae = HAE_TYPES[i] || "";
        rowsHtml += `
            <div style="display:flex; gap:25px; font-size:13px; margin-bottom:4px;">
                <div style="width:95px; color:#00ff41; display:flex; justify-content:space-between; align-items:flex-end;">
                    <span><b>${gum}</b></span> <span style="font-size:16px;"><b>${totals[gum] || 0}</b></span>
                </div>
                <div style="width:95px; color:#00ccff; display:flex; justify-content:space-between; align-items:flex-end;">
                    <span><b>${hae}</b></span> <span style="font-size:16px;"><b>${hae ? (totals[hae] || 0) : ""}</b></span>
                </div>
            </div>`;
    }

    statsBox.innerHTML = `
        <div style="background:#0a0a0a; border:1px solid #444; padding:15px 25px; margin-right:20px; display:flex; flex-direction:column; justify-content:center; box-shadow: 0 0 15px rgba(0,0,0,0.7); border-radius:4px;">
            <div style="font-size:11px; color:#aaa; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px; text-align:center;"><b>[ EXPEDITION TOTAL ]</b></div>
            ${rowsHtml}
        </div>
    `;

    headerTitleSection.style.display = 'flex';
    headerTitleSection.style.alignItems = 'center';
    headerTitleSection.style.justifyContent = 'space-between';
}

function renderCharacters() {
    const list = document.getElementById('char-list');
    if (!list) return;
    list.innerHTML = '';

    characters.forEach(char => {
        const div = document.createElement('div');
        div.className = 'char-card';
        
        const numLevel = parseFloat(char.level);
        const displayLevel = isNaN(numLevel) ? "0.00" : numLevel.toLocaleString(undefined, { minimumFractionDigits: 2 });

        const gumHtml = GUM_TYPES.map(t => {
            const count = char.cubes[t] || 0;
            return `<div style="display:flex; justify-content:space-between; font-size:11px; color:${count>0?'#00ff41':'#444'}; margin-bottom:2px; align-items:flex-end;"><span><b>${t}:</b></span><b>${count}</b></div>`;
        }).join('');
        
        const haeHtml = HAE_TYPES.map(t => {
            const count = char.cubes[t] || 0;
            return `<div style="display:flex; justify-content:space-between; font-size:11px; color:${count>0?'#00ccff':'#444'}; margin-bottom:2px; align-items:flex-end;"><span><b>${t}:</b></span><b>${count}</b></div>`;
        }).join('');

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
            </div>
        `;
        div.onclick = () => openCmd(char.actorId);
        list.appendChild(div);
    });
}

function removeCharacter(id, name, event) {
    event.stopPropagation();
    if (confirm(`[${name}] 캐릭터를 목록에서 제외하시겠습니까?`)) {
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
    setTimeout(() => document.getElementById('cmd-input').focus(), 50);
}

function updateCubeDisplay() {
    const char = characters.find(c => c.actorId === currentEditingId);
    const renderGrid = (types, gridId, color) => {
        document.getElementById(gridId).innerHTML = types.map(t => `
            <div class="cube-item" style="border-color:${char.cubes[t]>0?color:'#333'}" onclick="modifyCube('${t}',1)" oncontextmenu="event.preventDefault();modifyCube('${t}',-1)">
                <div style="font-size:10px; color:#555;"><b>${t}</b></div>
                <div style="font-size:20px; color:${char.cubes[t]>0?color:'#444'}"><b>${char.cubes[t]}</b></div>
            </div>`).join('');
    };
    renderGrid(GUM_TYPES, 'grid-gum', '#00ff41');
    renderGrid(HAE_TYPES, 'grid-hae', '#00ccff');
}

function modifyCube(type, amt) {
    const char = characters.find(c => c.actorId === currentEditingId);
    char.cubes[type] = Math.max(0, (char.cubes[type] || 0) + parseInt(amt));
    saveUserData();
    updateCubeDisplay();
}

function closeModal() {
    document.getElementById('cmd-modal').style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'none';
}

document.getElementById('cmd-input')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const val = this.value.trim().split(' ');
        if (ALL_TYPES.includes(val[0])) {
            modifyCube(val[0], parseInt(val[1]) || 1);
            this.value = '';
        }
    }
});
