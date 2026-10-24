/**
 * 檔案：app.js
 * 說明：前端核心邏輯 (精準校正卡片文字高度、恢復完整會員資訊列表)
 */

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwQKWOkyVSo7BNai0zUHgYNb9yqb9t7eu_6-qXEh9-S3bmijA0atMoeGs0M030IgMDloA/exec';
const LIFF_ID = '2012102588-g88gt5pQ'; 
let currentLiffProfile = null; 
const APPROVED_ROLES = ['一般會員', '她薈會員', '創始會員'];

// 調整 top 百分比將文字向上拉回對齊底線
const CARD_CONFIG = {
    '一般會員': {
        src: 'card_general.jpg',
        portrait: {
            name: { top: '40%', left: '68%', color: '#3A526A', size: 'clamp(1rem, 3.5vw, 1.2rem)' },
            id:   { top: '48%', left: '68%', color: '#3A526A', size: 'clamp(1rem, 3.5vw, 1.2rem)' }
        },
        landscape: {
            name: { top: '40%', left: '75%', color: '#3A526A', size: 'clamp(1.5rem, 5vh, 2rem)' },
            id:   { top: '46%', left: '75%', color: '#3A526A', size: 'clamp(1.5rem, 5vh, 2rem)' }
        }
    },
    '她薈會員': {
        src: 'card_annual.jpg',
        portrait: {
            name: { top: '40%', left: '68%', color: '#6A4B45', size: 'clamp(1rem, 3.5vw, 1.2rem)' },
            id:   { top: '48%', left: '68%', color: '#6A4B45', size: 'clamp(1rem, 3.5vw, 1.2rem)' }
        },
        landscape: {
            name: { top: '40%', left: '75%', color: '#6A4B45', size: 'clamp(1.5rem, 5vh, 2rem)' },
            id:   { top: '46%', left: '75%', color: '#6A4B45', size: 'clamp(1.5rem, 5vh, 2rem)' }
        }
    },
    '創始會員': {
        src: 'card_founder.jpg',
        portrait: {
            name: { top: '42%', left: '68%', color: '#664C28', size: 'clamp(1rem, 3.5vw, 1.2rem)' },
            id:   { top: '52%', left: '68%', color: '#664C28', size: 'clamp(1rem, 3.5vw, 1.2rem)' }
        },
        landscape: {
            name: { top: '42%', left: '68%', color: '#664C28', size: 'clamp(1.5rem, 5vh, 2rem)' },
            id:   { top: '52%', left: '68%', color: '#664C28', size: 'clamp(1.5rem, 5vh, 2rem)' }
        }
    }
};

let activityMediaBuffer = { base64: null, mimeType: null };
let adminNextIds = {}; 
let globalUserData = null; 
let isAdminVerified = false; 

document.addEventListener('DOMContentLoaded', () => { initializeApp(); });

async function initializeApp() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) { liff.login(); return; }
        currentLiffProfile = await liff.getProfile();
        await checkUserRoleAndStatus(currentLiffProfile.userId);
    } catch (error) {
        document.getElementById('app-content').innerHTML = `<p style="color:red; text-align:center; font-weight:bold;">系統連線異常，請確認是否在 LINE 內開啟。</p>`;
    }
}

async function checkUserRoleAndStatus(uid) {
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'checkUser', uid: uid }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        
        if (result.success && result.data.isRegistered) {
            globalUserData = result.data; 
            renderMemberDashboard(result.data);
        } else {
            document.getElementById('app-content').innerHTML = renderRegistrationForm();
        }
    } catch (error) { document.getElementById('app-content').innerHTML = `<p style="color:red; text-align:center;">伺服器連線發生錯誤。</p>`; }
}

function renderRegistrationForm() {
    const labelStyle = "font-size: 0.85rem; font-weight: bold; color: var(--text-inkblue); display: block; margin-bottom: 5px; text-align: left;";
    const inputStyle = "width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink); font-size: 1rem; margin-bottom: 1rem;";
    return `
        <div style="background-color: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(27, 39, 68, 0.05);">
            <h3 style="color: var(--accent-gold); margin-bottom: 0.5rem; text-align: center;">準會員申請表</h3>
            <p style="font-size: 0.9rem; margin-bottom: 1.5rem; text-align: center; color: #666;">請完整填寫以下資訊以完成系統綁定</p>
            <form id="reg-form">
                <div><label style="${labelStyle}">真實姓名</label><input type="text" id="input-name" style="${inputStyle}" required></div>
                <div><label style="${labelStyle}">手機號碼</label><input type="tel" id="input-phone" style="${inputStyle}" required></div>
                <div><label style="${labelStyle}">Email</label><input type="email" id="input-email" style="${inputStyle}" required></div>
                <div><label style="${labelStyle}">產業</label><input type="text" id="input-industry" style="${inputStyle}" required></div>
                <div><label style="${labelStyle}">公司名稱</label><input type="text" id="input-company" style="${inputStyle}" required></div>
                <div><label style="${labelStyle}">職稱</label><input type="text" id="input-jobtitle" style="${inputStyle}" required></div>
                <div style="margin-bottom: 0.5rem;"><label style="${labelStyle}">介紹人</label><input type="text" id="input-referrer" style="${inputStyle}" required></div>
                <button type="button" id="submit-btn" class="btn-primary" style="width: 100%; padding: 12px; font-size: 1.1rem; border-radius: 8px;" onclick="submitRegistration()">提交申請</button>
            </form>
        </div>
    `;
}

async function submitRegistration() {
    if (!currentLiffProfile) { alert("無法取得 LINE 授權資料，請重新載入頁面。"); return; }

    const actData = {
        realName: document.getElementById('input-name').value.trim(), phone: document.getElementById('input-phone').value.trim(),
        email: document.getElementById('input-email').value.trim(), industry: document.getElementById('input-industry').value.trim(),
        company: document.getElementById('input-company').value.trim(), jobTitle: document.getElementById('input-jobtitle').value.trim(),
        referrer: document.getElementById('input-referrer').value.trim()
    };

    if (!actData.realName || !actData.phone || !actData.email || !actData.industry || !actData.company || !actData.jobTitle || !actData.referrer) {
        alert("請確認所有欄位皆已填寫完畢！"); return;
    }

    const btn = document.getElementById('submit-btn');
    btn.innerText = "資料送出中..."; btn.disabled = true;

    const userData = { ...actData, uid: currentLiffProfile.userId, lineName: currentLiffProfile.displayName };

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'registerUser', userData: userData }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) {
            let newData = { isAdmin: result.data.isAdmin, status: '準會員', profile: { ...actData, '手機號碼': "'"+actData.phone, '授權到期日': '無', '會員編號': '核發中' } };
            globalUserData = newData;
            renderMemberDashboard(newData);
        } else { alert("註冊失敗：" + result.message); btn.innerText = "提交申請"; btn.disabled = false; }
    } catch (error) { alert("系統連線錯誤"); btn.innerText = "提交申請"; btn.disabled = false; }
}

window.showFullscreenCard = function(status, name, memberId) {
    let cfg = CARD_CONFIG[status];
    if(!cfg) return;

    const baseStyle = "position: absolute; transform: translate(-50%, -50%); font-weight: bold; font-family: 'Times New Roman', 'Noto Serif TC', serif; letter-spacing: 2px; white-space: nowrap;";

    let overlayHtml = `
        <div id="fullscreen-card-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); z-index: 10000; display: flex; justify-content: center; align-items: center; flex-direction: column;" onclick="this.remove()">
            <div style="position: relative; width: 95vh; max-width: 1000px; transform: rotate(90deg); transform-origin: center;">
                <img src="${cfg.src}" style="width: 100%; display: block; border-radius: 16px; box-shadow: 0 0 30px rgba(255,255,255,0.2);">
                <div style="${baseStyle} top: ${cfg.landscape.name.top}; left: ${cfg.landscape.name.left}; color: ${cfg.landscape.name.color}; font-size: ${cfg.landscape.name.size};">
                    ${name}
                </div>
                <div style="${baseStyle} top: ${cfg.landscape.id.top}; left: ${cfg.landscape.id.left}; color: ${cfg.landscape.id.color}; font-size: ${cfg.landscape.id.size};">
                    ${memberId}
                </div>
            </div>
            <div style="position: absolute; bottom: 30px; color: rgba(255,255,255,0.6); font-size: 0.9rem; letter-spacing: 2px;">點擊任意處關閉返回</div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', overlayHtml);
};

function renderMemberDashboard(userData) {
    const topNav = document.getElementById('top-nav');
    if (userData.isAdmin) {
        topNav.classList.remove('hidden');
        
        const btnAdmin = document.getElementById('btn-admin-area');
        if (btnAdmin) {
            btnAdmin.onclick = () => {
                if (isAdminVerified) fetchAndRenderAdminData(); 
                else showAdminLoginModal(); 
            };
        }
        
        const btnMember = document.getElementById('btn-member-area');
        if (btnMember) {
            btnMember.onclick = () => {
                if (globalUserData) renderMemberDashboard(globalUserData);
            };
        }
    } else {
        topNav.classList.add('hidden');
    }

    let expiryWarningHtml = '';
    let formattedExpDate = '無';
    let rawExpDate = userData.profile['授權到期日'];
    let isApprovedMember = APPROVED_ROLES.includes(userData.status);
    let memberIdDisplay = userData.profile['會員編號'] || '核發中';
    let displayPhone = userData.profile['手機號碼'] ? String(userData.profile['手機號碼']).replace(/^'/, '') : '-';
    let realNameDisplay = userData.profile['真實姓名'] || '-';

    if (isApprovedMember && rawExpDate && rawExpDate !== '無') {
        let expDate = new Date(rawExpDate);
        formattedExpDate = expDate.toISOString().split('T')[0];
        let twoMonthsLater = new Date(); twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);
        
        if (expDate <= twoMonthsLater) {
            expiryWarningHtml = `
                <div style="background-color: #fdf2f2; border-left: 4px solid #d9534f; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <p style="color: #d9534f; font-weight: bold; font-size: 0.95rem; margin: 0;">⚠️ 續約提醒</p>
                    <p style="color: #d9534f; font-size: 0.85rem; margin-top: 5px;">您的${userData.status}資格即將於 <strong>${formattedExpDate}</strong> 到期。</p>
                </div>
            `;
        }
    }

    let profileHtml = '';

    if (CARD_CONFIG[userData.status]) {
        let cfg = CARD_CONFIG[userData.status];
        const baseStyle = "position: absolute; transform: translate(-50%, -50%); font-weight: bold; font-family: 'Times New Roman', 'Noto Serif TC', serif; letter-spacing: 2px; white-space: nowrap;";

        profileHtml += `
            <div onclick="window.showFullscreenCard('${userData.status}', '${realNameDisplay}', '${memberIdDisplay}')" style="position: relative; width: 100%; max-width: 600px; margin: 0 auto 1.5rem auto; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.15); overflow: hidden; cursor: pointer;">
                <img src="${cfg.src}" alt="${userData.status}憑證" style="width: 100%; height: auto; display: block;">
                
                <div style="${baseStyle} top: ${cfg.portrait.name.top}; left: ${cfg.portrait.name.left}; color: ${cfg.portrait.name.color}; font-size: ${cfg.portrait.name.size};">
                    ${realNameDisplay}
                </div>
                
                <div style="${baseStyle} top: ${cfg.portrait.id.top}; left: ${cfg.portrait.id.left}; color: ${cfg.portrait.id.color}; font-size: ${cfg.portrait.id.size};">
                    ${memberIdDisplay}
                </div>
                
                <div style="position: absolute; bottom: 8px; right: 12px; background: rgba(255,255,255,0.7); padding: 4px 8px; border-radius: 12px; font-size: 0.7rem; color: #333; font-weight: bold; pointer-events: none;">
                    🔍 點擊放大
                </div>
            </div>
        `;
    }

    profileHtml += `
        <div style="background: #fff; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(27, 39, 68, 0.05); text-align: left; margin-bottom: 2rem; border-top: 4px solid var(--accent-gold);">
            <h4 style="color: var(--text-inkblue); margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 8px;">👤 會員基本資料</h4>
            <p style="border-bottom: 1px dashed #eee; padding-bottom: 8px; font-size: 0.9rem;"><strong>會員身分：</strong> <span style="float: right; color: var(--accent-gold); font-weight: bold;">${userData.status}</span></p>
            <p style="border-bottom: 1px dashed #eee; padding-bottom: 8px; font-size: 0.9rem;"><strong>會員編號：</strong> <span style="float: right;">${memberIdDisplay}</span></p>
            <p style="border-bottom: 1px dashed #eee; padding-bottom: 8px; font-size: 0.9rem;"><strong>姓名：</strong> <span style="float: right;">${realNameDisplay}</span></p>
            <p style="border-bottom: 1px dashed #eee; padding-bottom: 8px; font-size: 0.9rem;"><strong>手機號碼：</strong> <span style="float: right;">${displayPhone}</span></p>
            <p style="border-bottom: 1px dashed #eee; padding-bottom: 8px; font-size: 0.9rem;"><strong>Email：</strong> <span style="float: right;">${userData.profile['Email'] || '-'}</span></p>
            <p style="border-bottom: 1px dashed #eee; padding-bottom: 8px; font-size: 0.9rem;"><strong>產業：</strong> <span style="float: right;">${userData.profile['產業'] || '-'}</span></p>
            <p style="border-bottom: 1px dashed #eee; padding-bottom: 8px; font-size: 0.9rem;"><strong>公司名稱：</strong> <span style="float: right;">${userData.profile['公司名稱'] || '-'}</span></p>
            <p style="border-bottom: 1px dashed #eee; padding-bottom: 8px; font-size: 0.9rem;"><strong>職稱：</strong> <span style="float: right;">${userData.profile['職稱'] || '-'}</span></p>
            <p style="border-bottom: 1px dashed #eee; padding-bottom: 8px; font-size: 0.9rem;"><strong>介紹人：</strong> <span style="float: right;">${userData.profile['介紹人'] || '-'}</span></p>
            
            <div style="background: rgba(191,154,90,0.05); padding: 10px; border-radius: 8px; text-align: center; margin-top: 15px;">
                <span style="font-size: 0.85rem; color: #666;">授權到期日</span><br>
                <span style="font-weight:bold; font-size: 1.1rem; color: var(--accent-gold);">${formattedExpDate}</span>
            </div>
        </div>
    `;

    let html = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <h2 style="color: var(--text-inkblue); margin-bottom: 0.5rem;">您好，${realNameDisplay}</h2>
        </div>
        ${expiryWarningHtml}
        ${profileHtml}
    `;

    if (isApprovedMember || userData.isAdmin) {
        html += `
            <div id="member-loading" class="loading-text">正在載入最新活動與歷史紀錄...</div>
            <div id="activity-section" style="display:none; text-align: left;"></div>
            <div id="history-section" style="display:none; margin-top: 2rem; text-align: left;"></div>
        `;
        document.getElementById('app-content').innerHTML = html;
        fetchMemberActivitiesAndHistory(currentLiffProfile.userId);
    } else {
        html += `
            <div style="background-color: #fff; padding: 2rem; border-radius: 12px; text-align: center; border: 1px dashed var(--accent-gold);">
                <h4 style="color: var(--text-inkblue); margin-bottom: 1rem;">功能鎖定中</h4>
                <p style="font-size: 0.95rem; color: #666; line-height: 1.6;">狀態為「準會員」。<br>請等待審核核發專屬編號後解鎖功能。</p>
            </div>
        `;
        document.getElementById('app-content').innerHTML = html;
    }
}

async function fetchMemberActivitiesAndHistory(uid) {
    try {
        const [actRes, histRes] = await Promise.all([
            fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getActivities' }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } }),
            fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getUserHistory', uid: uid }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } })
        ]);
        const actResult = await actRes.json();
        const histResult = await histRes.json();

        document.getElementById('member-loading').style.display = 'none';

        let actHtml = `<h4 style="color: var(--text-inkblue); margin-bottom: 15px;">📅 最新活動與報名</h4>`;
        if (actResult.data.length === 0) {
            actHtml += `<p style="font-size:0.9rem; color:#666;">近期尚無活動發布。</p>`;
        } else {
            actResult.data.forEach(act => {
                let mediaDisplay = act.media ? `<img src="${act.media}" style="width: 100%; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">` : '';
                let formattedDate = act.date.replace('T', ' ');
                let formattedDeadline = act.deadline.replace('T', ' ');

                actHtml += `
                    <div class="data-card" style="border-left-color: var(--accent-gold);">
                        ${mediaDisplay}
                        <h4 style="color: var(--text-inkblue); margin-bottom: 5px;">${act.name}</h4>
                        <p style="font-size: 0.85rem; color: #666;">📍 ${act.location} | 🕒 ${formattedDate}</p>
                        <p style="font-size: 0.85rem; color: #666; margin-bottom: 10px;">💵 費用: ${act.fee} (截止: ${formattedDeadline})</p>
                        <p style="font-size: 0.9rem; margin-bottom: 15px;">${act.desc}</p>
                        <button class="btn-primary" style="width: 100%;" onclick="registerActivityBtn('${act.id}', '${act.name}')">立即報名</button>
                    </div>
                `;
            });
        }
        document.getElementById('activity-section').innerHTML = actHtml;
        document.getElementById('activity-section').style.display = 'block';

        let histHtml = `<h4 style="color: var(--text-inkblue); margin-bottom: 15px;">🕒 過往歷史紀錄</h4>`;
        if (histResult.data.length === 0) {
            histHtml += `<p style="font-size:0.9rem; color:#666;">目前尚無紀錄。</p>`;
        } else {
            histResult.data.forEach(h => {
                histHtml += `
                    <div class="data-card" style="border-left-color: var(--accent-pink); padding: 1rem;">
                        <p style="margin-bottom: 4px;"><strong>${h.name}</strong> <span style="font-size: 0.8rem; color:#999;">(${h.type})</span></p>
                        <p style="font-size: 0.85rem; color: #666;">報名時間：${h.date} | 金額：${h.fee}</p>
                    </div>
                `;
            });
        }
        document.getElementById('history-section').innerHTML = histHtml;
        document.getElementById('history-section').style.display = 'block';

    } catch (error) { alert('載入資料失敗，請稍後重試。'); }
}

async function registerActivityBtn(activityId, activityName) {
    if (!confirm(`確定要報名「${activityName}」嗎？`)) return;
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'registerActivity', uid: currentLiffProfile.userId, activityId: activityId }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) {
            alert('報名成功！');
            document.getElementById('activity-section').style.display = 'none';
            document.getElementById('history-section').style.display = 'none';
            document.getElementById('member-loading').style.display = 'block';
            fetchMemberActivitiesAndHistory(currentLiffProfile.userId);
        } else alert('報名失敗：' + result.message);
    } catch (error) { alert('系統連線異常'); }
}

/* ================= 管理員專區邏輯 ================= */

function showAdminLoginModal() {
    if (document.getElementById('admin-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `
        <div id="admin-modal" class="modal-overlay">
            <div class="modal-content">
                <h3 style="color: var(--text-inkblue); margin-bottom: 10px;">管理員權限驗證</h3>
                <input type="password" id="admin-pwd" class="modal-input" placeholder="••••••••">
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
                    <button class="btn-secondary" style="background-color: #999;" onclick="closeAdminModal()">取消</button>
                    <button class="btn-primary" id="login-admin-btn" onclick="verifyAdminPassword()">確認進入</button>
                </div>
            </div>
        </div>
    `);
}
function closeAdminModal() { const m = document.getElementById('admin-modal'); if (m) m.remove(); }

async function verifyAdminPassword() {
    const pwd = document.getElementById('admin-pwd').value;
    const btn = document.getElementById('login-admin-btn');
    btn.innerText = "驗證中...";
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'adminLogin', uid: currentLiffProfile.userId, password: pwd }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) { 
            isAdminVerified = true; 
            closeAdminModal(); 
            fetchAndRenderAdminData(); 
        }
        else { alert('密碼錯誤或無權限！'); btn.innerText = "確認進入"; }
    } catch (error) { alert('系統連線異常'); btn.innerText = "確認進入"; }
}

async function fetchAndRenderAdminData() {
    const contentArea = document.getElementById('app-content');
    contentArea.innerHTML = `<div class="loading-text">資料讀取中，請稍候...</div>`;
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'getAdminData' }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) buildAdminDashboardUI(result.data);
        else contentArea.innerHTML = `<p style="color:red; text-align:center;">讀取資料失敗。</p>`;
    } catch (error) { contentArea.innerHTML = `<p style="color:red; text-align:center;">網路連線異常。</p>`; }
}

function updatePreviewId(uid) {
    const level = document.getElementById(`level-${uid}`).value;
    document.getElementById(`preview-id-${uid}`).innerText = adminNextIds[level];
}

function buildAdminDashboardUI(data) {
    let nextYear = new Date(); nextYear.setFullYear(nextYear.getFullYear() + 1);
    let defaultDate = nextYear.toISOString().split('T')[0];
    const labelStyle = "font-size: 0.8rem; font-weight:bold; display:block; margin-bottom:5px; margin-top: 10px;";
    
    adminNextIds = data.nextIds;

    let html = `<h2 style="text-align: center; color: var(--accent-gold); margin-bottom: 1.5rem;">⚙️ 系統管理員專區</h2>`;

    html += `<h4 style="color: #d9534f; margin-bottom: 10px;">⚠️ 即將到期會員提醒 (${data.expiring.length} 筆)</h4>`;
    if (data.expiring.length === 0) html += `<p style="font-size:0.9rem; color:#666; margin-bottom:1rem;">目前無即將到期的會員。</p>`;
    else data.expiring.forEach(m => html += `<div class="data-card data-card-danger"><p><strong>${m.name}</strong> (${m.phone}) - [${m.status}] 到期日: ${m.expiryDate}</p></div>`);

    html += `<h4 style="color: var(--text-inkblue); margin: 20px 0 10px;">⏳ 準會員審核區 (${data.pending.length} 筆)</h4>`;
    if (data.pending.length === 0) html += `<p style="font-size:0.9rem; color:#666; margin-bottom:1rem;">目前無待審核的會員。</p>`;
    else data.pending.forEach(m => {
        html += `
            <div class="data-card" id="pending-card-${m.uid}" style="text-align: left;">
                <p style="margin-bottom: 4px; font-size: 1.05rem;"><strong>${m.name}</strong> (${m.phone})</p>
                <p style="font-size: 0.85rem; color: #666; margin-bottom: 4px;">Email: ${m.email}</p>
                <p style="font-size: 0.85rem; color: #666; margin-bottom: 4px;">公司 / 職稱: ${m.company} / ${m.jobTitle}</p>
                <p style="font-size: 0.85rem; color: #666; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #ddd;">產業: ${m.industry} | 介紹人: ${m.referrer}</p>
                
                <label style="font-size: 0.9rem; font-weight: bold; display: block; margin-bottom: 5px;">
                    選擇會員等級 (預計編號: <span id="preview-id-${m.uid}" style="color:var(--accent-gold);">${adminNextIds['一般會員']}</span>)：
                </label>
                <select id="level-${m.uid}" class="admin-search-bar" style="margin-bottom: 15px;" onchange="updatePreviewId('${m.uid}')">
                    <option value="一般會員">一般會員</option>
                    <option value="她薈會員">她薈會員</option>
                    <option value="創始會員">創始會員</option>
                </select>
                
                <label style="font-size: 0.9rem; font-weight: bold; display: block; margin-bottom: 5px;">設定授權到期日：</label>
                <input type="date" id="date-${m.uid}" class="admin-search-bar" value="${defaultDate}" style="margin-bottom: 15px;">
                <div style="display: flex; gap: 8px;">
                    <button class="btn-secondary" style="background-color: #d9534f; flex: 1; padding: 10px 5px;" onclick="rejectMemberBtn('${m.uid}')">駁回</button>
                    <button class="btn-secondary" style="flex: 2; padding: 10px 5px;" onclick="approveMemberBtn('${m.uid}')">確認核准</button>
                </div>
            </div>
        `;
    });

    html += `
        <h4 style="color: var(--text-inkblue); margin: 20px 0 10px;">📢 活動及通告發布設定</h4>
        <div class="data-card" style="border-left-color: var(--accent-pink); text-align: left;">
            <label style="${labelStyle}">活動/通告名稱</label>
            <input type="text" id="act-name" class="admin-search-bar" placeholder="請輸入活動名稱" required>
            
            <label style="${labelStyle}">上傳活動媒體 (照片/海報)</label>
            <input type="file" id="act-media" class="admin-search-bar" accept="image/*,video/*" onchange="handleFileUpload(event)">
            
            <label style="${labelStyle}">活動類型</label>
            <select id="act-type" class="admin-search-bar">
                <option value="實體課程">實體課程</option><option value="線上講座">線上講座</option>
                <option value="內部通告">內部通告</option><option value="跨產業聯誼">跨產業聯誼</option>
            </select>
            
            <label style="${labelStyle}">活動日期時間</label>
            <input type="datetime-local" id="act-date" class="admin-search-bar">
            
            <label style="${labelStyle}">報名截止時間</label>
            <input type="datetime-local" id="act-deadline" class="admin-search-bar">
            
            <label style="${labelStyle}">活動地點 (或線上連結)</label>
            <input type="text" id="act-location" class="admin-search-bar" placeholder="輸入地點">
            
            <label style="${labelStyle}">費用 (如: 500或免費)</label>
            <input type="text" id="act-fee" class="admin-search-bar" placeholder="設定費用">
            
            <label style="${labelStyle}">人數限制</label>
            <input type="number" id="act-capacity" class="admin-search-bar" placeholder="設定名額上限">
            
            <label style="${labelStyle}">活動簡介與大綱</label>
            <textarea id="act-desc" class="admin-search-bar" placeholder="在此輸入活動詳情..." rows="4"></textarea>
            
            <button class="btn-primary" id="submit-act-btn" style="width: 100%; margin-top: 15px;" onclick="submitActivity()">發布活動</button>
        </div>
    `;

    let founderList = '', annualList = '', generalList = '';

    data.active.forEach(m => {
        let cardHtml = `
            <div class="data-card member-item" id="active-card-${m.uid}" style="text-align: left;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
                    <p style="margin: 0; font-size: 1.05rem;"><strong>${m.name}</strong></p>
                    <span style="font-size: 0.8rem; background: #eee; padding: 2px 6px; border-radius: 4px; color: #555;">${m.phone}</span>
                </div>
                <p style="font-size: 0.85rem; color: #666; margin-bottom: 4px;">公司: ${m.company || '-'}</p>
                <p style="font-size: 0.85rem; color: #666; margin-bottom: 4px;">編號: <strong style="color: var(--text-inkblue);">${m.memberId}</strong></p>
                <p style="font-size: 0.85rem; color: #666; margin-bottom: 10px;">目前到期日: <strong id="display-date-${m.uid}">${m.expiryDate}</strong></p>
                
                <div style="background: #fdfdfd; padding: 10px; border-radius: 6px; border: 1px dashed #ddd;">
                    <label style="font-size: 0.85rem; font-weight: bold; display: block; margin-bottom: 5px;">延長到期日：</label>
                    <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                        <input type="date" id="extend-date-${m.uid}" class="admin-search-bar" value="${m.expiryDate}" style="margin-bottom: 0; flex: 2; padding: 8px;">
                        <button class="btn-secondary" style="flex: 1; padding: 8px; font-size: 0.85rem;" onclick="extendMemberBtn('${m.uid}')">更新延期</button>
                    </div>
                    <button class="btn-secondary" style="background-color: #d9534f; width: 100%; padding: 8px; font-size: 0.85rem;" onclick="terminateMemberBtn('${m.uid}', '${m.name}')">停止會籍 (停權)</button>
                </div>
            </div>
        `;
        
        if (m.status === '創始會員') founderList += cardHtml;
        else if (m.status === '她薈會員') annualList += cardHtml;
        else generalList += cardHtml;
    });

    html += `<h4 style="color: var(--text-inkblue); margin: 30px 0 10px;">👥 正式會員名單總覽</h4>
             <input type="text" id="member-search" class="admin-search-bar" placeholder="🔍 搜尋姓名、電話、公司..." onkeyup="filterMembers()">
             
             <h5 style="color: var(--accent-gold); margin-top: 20px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">👑 創始會員</h5>
             <div id="member-list-founder">${founderList || '<p style="font-size: 0.9rem; color: #999;">暫無名單</p>'}</div>
             
             <h5 style="color: var(--accent-gold); margin-top: 20px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">🌸 她薈會員</h5>
             <div id="member-list-annual">${annualList || '<p style="font-size: 0.9rem; color: #999;">暫無名單</p>'}</div>
             
             <h5 style="color: var(--accent-gold); margin-top: 20px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">💎 一般會員</h5>
             <div id="member-list-general">${generalList || '<p style="font-size: 0.9rem; color: #999;">暫無名單</p>'}</div>
             `;

    document.getElementById('app-content').innerHTML = html;
}

function filterMembers() {
    const input = document.getElementById('member-search').value.toLowerCase();
    document.querySelectorAll('.member-item').forEach(item => {
        item.style.display = item.innerText.toLowerCase().includes(input) ? "block" : "none";
    });
}

async function approveMemberBtn(targetUid) {
    const dateInput = document.getElementById(`date-${targetUid}`).value;
    const levelInput = document.getElementById(`level-${targetUid}`).value;
    if (!dateInput) return alert('請選擇到期日');
    if (!confirm(`確認將此人升級為「${levelInput}」嗎？系統將自動配發對應會員編號。`)) return;
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'approveMember', targetUid: targetUid, expiryDate: dateInput, memberLevel: levelInput }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) { alert('已成功核准並配發會員編號！'); document.getElementById(`pending-card-${targetUid}`).remove(); }
        else alert('核准失敗，請稍後重試。');
    } catch (error) { alert('連線異常'); }
}

async function rejectMemberBtn(targetUid) {
    if (!confirm('確定要駁回此會員的申請嗎？')) return;
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'rejectMember', targetUid: targetUid }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) { alert('已成功駁回！'); document.getElementById(`pending-card-${targetUid}`).remove(); }
    } catch (error) { alert('連線異常'); }
}

async function extendMemberBtn(targetUid) {
    const newDate = document.getElementById(`extend-date-${targetUid}`).value;
    if (!newDate) return alert('請選擇新的到期日');
    if (!confirm(`確認將到期日延長至 ${newDate} 嗎？`)) return;

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'extendMemberExpiry', targetUid: targetUid, newDate: newDate }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) { 
            alert('已成功延長到期日！'); 
            document.getElementById(`display-date-${targetUid}`).innerText = newDate;
        } else alert('更新失敗');
    } catch (error) { alert('連線異常'); }
}

async function terminateMemberBtn(targetUid, memberName) {
    if (!confirm(`⚠️ 警告：確定要停止「${memberName}」的會籍嗎？此動作會將其狀態改為「已停權」。`)) return;

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'terminateMember', targetUid: targetUid }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) { 
            alert('會籍已終止。'); 
            document.getElementById(`active-card-${targetUid}`).remove();
        } else alert('停權失敗');
    } catch (error) { alert('連線異常'); }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        activityMediaBuffer.base64 = e.target.result.split(',')[1];
        activityMediaBuffer.mimeType = file.type;
    };
    reader.readAsDataURL(file);
}

async function submitActivity() {
    const actName = document.getElementById('act-name').value.trim();
    if (!actName) return alert('活動名稱為必填項目！');

    const btn = document.getElementById('submit-act-btn');
    btn.innerText = "發布中 (若有圖片需稍候)..."; btn.disabled = true;

    const actData = {
        name: actName, type: document.getElementById('act-type').value,
        date: document.getElementById('act-date').value, deadline: document.getElementById('act-deadline').value,
        location: document.getElementById('act-location').value.trim(), fee: document.getElementById('act-fee').value.trim(),
        capacity: document.getElementById('act-capacity').value.trim(), description: document.getElementById('act-desc').value.trim(),
        mediaBase64: activityMediaBuffer.base64, mediaMime: activityMediaBuffer.mimeType
    };

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'createActivity', activityData: actData }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) {
            alert('活動發布成功！');
            ['act-name','act-date','act-deadline','act-location','act-fee','act-capacity','act-desc','act-media'].forEach(id => document.getElementById(id).value = '');
            activityMediaBuffer = { base64: null, mimeType: null };
        } else alert('發布失敗：' + result.message);
    } catch (error) { alert('連線異常'); }
    
    btn.innerText = "發布活動"; btn.disabled = false;
}
