/**
 * 檔案：JS/app.js
 * 說明：前端核心邏輯 (精確回報管理員專區資料讀取錯誤)
 */

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwQKWOkyVSo7BNai0zUHgYNb9yqb9t7eu_6-qXEh9-S3bmijA0atMoeGs0M030IgMDloA/exec';
const LIFF_ID = '2012102588-g88gt5pQ'; 
let currentLiffProfile = null; 
const APPROVED_ROLES = ['一般會員', '她薈會員', '創始會員'];

let adminNextIds = {}; 
let globalUserData = null; 
let isAdminVerified = false; 
let globalActivities = []; 
let adminActivitiesData = []; 

let currentImageAssets = []; 
let editingActivityId = null; 

let appStartTime = Date.now();
let isFirstLoad = true;

async function applyMinimumDelay() {
    if (!isFirstLoad) return;
    const elapsed = Date.now() - appStartTime;
    const remaining = 5000 - elapsed;
    if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
    isFirstLoad = false;
}

document.addEventListener('DOMContentLoaded', () => { initializeApp(); });

async function initializeApp() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) { liff.login(); return; }
        currentLiffProfile = await liff.getProfile();
        await checkUserRoleAndStatus(currentLiffProfile.userId);
    } catch (error) {
        await applyMinimumDelay();
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
        await applyMinimumDelay();
        if (result.success && result.data.isRegistered) {
            globalUserData = result.data; 
            renderMemberDashboard(result.data);
        } else {
            document.getElementById('app-content').innerHTML = renderRegistrationForm();
        }
    } catch (error) { 
        await applyMinimumDelay();
        document.getElementById('app-content').innerHTML = `<p style="color:red; text-align:center;">伺服器連線發生錯誤。</p>`; 
    }
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

function renderMemberDashboard(userData) {
    const topNav = document.getElementById('top-nav');
    if (userData.isAdmin) {
        topNav.classList.remove('hidden');
        const btnAdmin = document.getElementById('btn-admin-area');
        if (btnAdmin) btnAdmin.onclick = () => { if (isAdminVerified) fetchAndRenderAdminData(); else showAdminLoginModal(); };
        const btnMember = document.getElementById('btn-member-area');
        if (btnMember) btnMember.onclick = () => { if (globalUserData) renderMemberDashboard(globalUserData); };
    } else { topNav.classList.add('hidden'); }

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
    if (typeof window.CardManager !== 'undefined') {
        profileHtml += window.CardManager.getDashboardCardHtml(userData.status, realNameDisplay, memberIdDisplay);
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
        html += `<div id="member-loading" class="loading-text">正在載入最新活動...</div>
                 <div id="activity-section" style="display:none; text-align: left;"></div>
                 <div id="history-section" style="display:none; margin-top: 2rem; text-align: left;"></div>`;
        document.getElementById('app-content').innerHTML = html;
        fetchMemberActivitiesAndHistory(currentLiffProfile.userId);
    } else {
        html += `<div style="background-color: #fff; padding: 2rem; border-radius: 12px; text-align: center; border: 1px dashed var(--accent-gold);">
                    <h4 style="color: var(--text-inkblue); margin-bottom: 1rem;">功能鎖定中</h4>
                    <p style="font-size: 0.95rem; color: #666; line-height: 1.6;">狀態為「準會員」。<br>請等待審核解鎖功能。</p>
                </div>`;
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

        globalActivities = actResult.data || [];
        let historyData = histResult.data || [];
        document.getElementById('member-loading').style.display = 'none';

        let actHtml = `<h4 style="color: var(--text-inkblue); margin-bottom: 15px;">📅 最新活動與報名</h4>`;
        if (globalActivities.length === 0) {
            actHtml += `<p style="font-size:0.9rem; color:#666;">近期尚無活動發布。</p>`;
        } else {
            globalActivities.forEach(act => {
                let imgUrls = act.media ? act.media.split(',') : [];
                let mainImg = imgUrls.length > 0 ? `<img src="${imgUrls[0]}" style="width: 100%; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">` : '';
                let formattedDate = act.date.replace('T', ' ');
                
                let isRegistered = historyData.some(h => h.id === act.id);
                let btnText = isRegistered ? '查看詳情 / 異動申請' : '查看詳情與報名';
                let btnColor = isRegistered ? 'background-color: var(--accent-gold);' : '';

                actHtml += `
                    <div class="data-card" style="border-left-color: var(--accent-gold); cursor: pointer;" onclick="openActivityDetailModal('${act.id}', ${isRegistered})">
                        ${mainImg}
                        <h4 style="color: var(--text-inkblue); margin-bottom: 5px;">${act.name}</h4>
                        <p style="font-size: 0.85rem; color: #666;">📍 ${act.location} | 🕒 ${formattedDate}</p>
                        <button class="btn-primary" style="width: 100%; margin-top: 10px; ${btnColor}">${btnText}</button>
                    </div>
                `;
            });
        }
        document.getElementById('activity-section').innerHTML = actHtml;
        document.getElementById('activity-section').style.display = 'block';

        let histHtml = `<h4 style="color: var(--text-inkblue); margin-bottom: 15px;">🕒 過往歷史紀錄</h4>`;
        if (historyData.length === 0) {
            histHtml += `<p style="font-size:0.9rem; color:#666;">目前尚無紀錄。</p>`;
        } else {
            historyData.forEach(h => {
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

window.openActivityDetailModal = function(actId, isRegistered) {
    let act = globalActivities.find(a => a.id === actId);
    if(!act) return;

    let imgUrls = act.media ? act.media.split(',') : [];
    let mainImg = imgUrls.length > 0 ? `<img src="${imgUrls[0]}" style="width:100%; border-radius:12px; margin-bottom:10px;">` : '';
    let subImgsHtml = '';
    if(imgUrls.length > 1) {
        subImgsHtml = `<div style="display:flex; gap:10px; overflow-x:auto; margin-bottom:15px; padding-bottom:10px;">`;
        for(let i=1; i<imgUrls.length; i++) {
            subImgsHtml += `<img src="${imgUrls[i]}" style="width:80px; height:80px; object-fit:cover; border-radius:8px; flex-shrink:0;">`;
        }
        subImgsHtml += `</div>`;
    }

    const inputStyle = "width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ddd; font-size: 1rem; margin-bottom: 15px; box-sizing:border-box;";
    let formHtml = '';

    if (isRegistered) {
        formHtml = `
            <div style="background: rgba(191,154,90,0.1); padding: 15px; border-radius: 12px; margin-top: 20px; text-align:left;">
                <h4 style="color: var(--text-inkblue); margin-top:0; border-bottom:1px solid #ddd; padding-bottom:8px;">📝 提出人數異動申請</h4>
                <p style="font-size:0.8rem; color:#666;">您已報名此活動。若需修改參加人數，請填寫下方新的人數並送出申請，管理員將為您審核並處理退補費用。</p>
                <label style="font-size:0.85rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:5px;">欲修改之新參加人數：</label>
                <input type="number" id="mod-pax" style="${inputStyle}" value="1" min="0">
                <button class="btn-primary" style="width: 100%; background-color: #d9534f;" onclick="submitModRequest('${act.id}')">送出異動申請</button>
            </div>
        `;
    } else {
        formHtml = `
            <div style="background: #fdfdfd; padding: 15px; border-radius: 12px; border: 1px solid #eee; margin-top: 20px; text-align:left;">
                <h4 style="color: var(--text-inkblue); margin-top:0; border-bottom:1px solid #ddd; padding-bottom:8px;">報名表單</h4>
                <p style="font-size:0.85rem; color:#666; margin-bottom:15px;">基本資料已由系統自動帶入：${globalUserData.profile['真實姓名']} / ${globalUserData.profile['手機號碼'].replace(/^'/, '')}</p>
                <label style="font-size:0.85rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:5px;">參加人數 (含本人)：</label>
                <input type="number" id="reg-pax" style="${inputStyle}" value="1" min="1">
                <label style="font-size:0.85rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:5px;">繳費方式 (文字描述，如: 現場繳費、轉帳後五碼)：</label>
                <input type="text" id="reg-payment" style="${inputStyle}" placeholder="請輸入繳費方式">
                <button class="btn-primary" style="width: 100%;" onclick="submitActivityRegistration('${act.id}')">確認送出報名</button>
            </div>
        `;
    }

    let modalHtml = `
        <div id="act-detail-modal" class="modal-overlay" style="align-items: flex-end;" onclick="if(event.target===this) this.remove()">
            <div class="modal-content" style="width:100%; max-width:100%; border-radius: 24px 24px 0 0; padding:2rem 1.5rem; max-height:85vh; overflow-y:auto; position:relative; text-align:left;">
                <button onclick="document.getElementById('act-detail-modal').remove()" style="position:absolute; top:15px; right:20px; background:none; border:none; font-size:1.8rem; color:#999; cursor:pointer;">&times;</button>
                ${mainImg}
                ${subImgsHtml}
                <h3 style="color:var(--text-inkblue); margin: 10px 0 5px;">${act.name}</h3>
                <p style="font-size:0.9rem; color:#666; margin-bottom:5px;">📍 ${act.location} | 🕒 ${act.date.replace('T', ' ')}</p>
                <p style="font-size:0.9rem; color:#666; margin-bottom:15px;">💵 費用: <span style="color:var(--accent-gold); font-weight:bold;">${act.fee}</span> | 截止: ${act.deadline.replace('T', ' ')}</p>
                <div style="font-size:0.95rem; line-height:1.6; color:#444; border-top:1px dashed #ddd; padding-top:15px;">
                    ${act.desc.replace(/\n/g, '<br>')}
                </div>
                ${formHtml}
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

async function submitActivityRegistration(activityId) {
    const pax = document.getElementById('reg-pax').value;
    const payment = document.getElementById('reg-payment').value.trim();
    if(!pax || pax < 1) return alert('參加人數必須大於 0');
    if(!payment) return alert('請填寫繳費方式');
    if (!confirm(`確認送出報名嗎？\n人數：${pax}\n繳費方式：${payment}`)) return;

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'registerActivityAdvanced', uid: currentLiffProfile.userId, activityId: activityId, participants: pax, payment: payment }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) {
            alert('報名成功！');
            document.getElementById('act-detail-modal').remove();
            fetchMemberActivitiesAndHistory(currentLiffProfile.userId);
        } else alert('報名失敗：' + result.message);
    } catch (error) { alert('系統連線異常'); }
}

async function submitModRequest(activityId) {
    const newPax = document.getElementById('mod-pax').value;
    if(newPax === '') return alert('請輸入新的人數');
    if (!confirm(`確認提出異動申請？新的人數為 ${newPax} 人。\n送出後將由管理員為您審核並聯繫退補費用事宜。`)) return;

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'submitModRequest', uid: currentLiffProfile.userId, activityId: activityId, newPax: newPax }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) {
            alert('異動申請已送出！請等候管理員聯繫。');
            document.getElementById('act-detail-modal').remove();
        } else alert('申請失敗：' + result.message);
    } catch (error) { alert('系統連線異常'); }
}

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
        } else { 
            alert('登入失敗：\n' + (result.message || '請確認密碼或權限')); 
            btn.innerText = "確認進入"; 
        }
    } catch (error) { alert('系統連線異常'); btn.innerText = "確認進入"; }
}

// 🌟 核心修復：精確顯示出讀取失敗的後端錯誤訊息
async function fetchAndRenderAdminData() {
    const contentArea = document.getElementById('app-content');
    contentArea.innerHTML = `<div class="loading-text">資料讀取中，請稍候...</div>`;
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'getAdminData' }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) {
            adminActivitiesData = result.data.activities || [];
            buildAdminDashboardUI(result.data);
        } else {
            // 這裡將精確顯示後端拋出的錯誤
            contentArea.innerHTML = `<p style="color:red; text-align:center; font-weight:bold;">讀取資料失敗：<br>${result.message || '未知錯誤'}</p>`;
        }
    } catch (error) { 
        contentArea.innerHTML = `<p style="color:red; text-align:center;">網路連線異常。</p>`; 
    }
}

function updatePreviewId(uid) {
    const level = document.getElementById(`level-${uid}`).value;
    document.getElementById(`preview-id-${uid}`).innerText = adminNextIds[level];
}

window.switchAdminTab = function(tabName) {
    document.getElementById('admin-member-sec').style.display = (tabName === 'members') ? 'block' : 'none';
    document.getElementById('admin-act-sec').style.display = (tabName === 'activities') ? 'block' : 'none';
    
    document.getElementById('tab-btn-members').style.opacity = (tabName === 'members') ? '1' : '0.5';
    document.getElementById('tab-btn-activities').style.opacity = (tabName === 'activities') ? '1' : '0.5';
};

function buildAdminDashboardUI(data) {
    let nextYear = new Date(); nextYear.setFullYear(nextYear.getFullYear() + 1);
    let defaultDate = nextYear.toISOString().split('T')[0];
    const labelStyle = "font-size: 0.8rem; font-weight:bold; display:block; margin-bottom:5px; margin-top: 10px;";
    
    adminNextIds = data.nextIds;
    editingActivityId = null; 
    currentImageAssets = []; 

    let html = `<h2 style="text-align: center; color: var(--accent-gold); margin-bottom: 1.5rem;">⚙️ 系統管理員專區</h2>`;

    html += `
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <button id="tab-btn-members" class="btn-primary" style="flex: 1; border-radius: 20px; transition: 0.3s;" onclick="switchAdminTab('members')">👥 會員管理</button>
            <button id="tab-btn-activities" class="btn-primary" style="flex: 1; border-radius: 20px; opacity: 0.5; background-color: var(--accent-gold); transition: 0.3s;" onclick="switchAdminTab('activities')">📢 活動管理</button>
        </div>
    `;

    // ================== 會員管理區塊 ==================
    html += `<div id="admin-member-sec">`;
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
                <label style="font-size: 0.9rem; font-weight: bold; display: block; margin-bottom: 5px;">選擇會員等級 (預計編號: <span id="preview-id-${m.uid}" style="color:var(--accent-gold);">${adminNextIds['一般會員']}</span>)：</label>
                <select id="level-${m.uid}" class="admin-search-bar" style="margin-bottom: 15px;" onchange="updatePreviewId('${m.uid}')">
                    <option value="一般會員">一般會員</option><option value="她薈會員">她薈會員</option><option value="創始會員">創始會員</option>
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
             </div>`;

    // ================== 活動管理區塊 ==================
    html += `<div id="admin-act-sec" style="display:none;">`;

    if(data.modRequests && data.modRequests.length > 0) {
        html += `<h4 style="color: #d9534f; margin: 20px 0 10px;">⚠️ 報名異動審核區 (${data.modRequests.length} 筆)</h4>`;
        data.modRequests.forEach(req => {
            html += `
                <div class="data-card data-card-danger" id="req-card-${req.rowIdx}">
                    <p style="margin-bottom:5px;"><strong>${req.name}</strong> 申請修改報名</p>
                    <p style="font-size:0.85rem; color:#666;">原人數: ${req.oldPax} ➔ <strong style="color:#d9534f;">新申請人數: ${req.newPax}</strong></p>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button class="btn-primary" style="flex:1; padding:8px;" onclick="alert('已審核通過 (此為展示功能)')">通過並更新</button>
                    </div>
                </div>
            `;
        });
    }

    html += `
        <h4 id="act-form-title" style="color: var(--text-inkblue); margin: 20px 0 10px;">📢 新增活動發布</h4>
        <div class="data-card" style="border-left-color: var(--accent-pink); text-align: left;" id="act-form-container">
            <label style="${labelStyle}">活動/通告名稱</label>
            <input type="text" id="act-name" class="admin-search-bar" placeholder="請輸入活動名稱" required>
            
            <label style="${labelStyle}">活動類型</label>
            <select id="act-type" class="admin-search-bar">
                <option value="實體課程">實體課程</option><option value="線上講座">線上講座</option>
                <option value="內部通告">內部通告</option><option value="跨產業聯誼">跨產業聯誼</option>
            </select>
            
            <label style="${labelStyle}">活動日期時間</label>
            <input type="datetime-local" id="act-date" class="admin-search-bar">
            
            <div style="background: #fdfdfd; padding: 15px; border-radius: 8px; border: 1px dashed #BF9A5A; margin-bottom: 15px;">
                <label style="font-size: 0.85rem; font-weight:bold; color:var(--accent-gold); display:block; margin-bottom:10px;">📷 上傳活動媒體 (最多10張)</label>
                <p style="font-size: 0.75rem; color: #666; margin-top:-5px; margin-bottom:10px;">⚠️ 第一張固定為「主圖」。可點選左右箭頭排序或點 X 刪除。</p>
                <input type="file" id="act-media" class="admin-search-bar" accept="image/*" multiple onchange="handleMultipleFileUpload(event)">
                
                <div id="upload-preview-area" style="display:flex; gap:12px; overflow-x:auto; margin-bottom:15px; padding:10px 5px; min-height:80px; align-items:center;">
                    <p style="font-size:0.8rem; color:#999; width:100%; text-align:center;">尚無選擇圖片</p>
                </div>
                
                <button id="btn-upload-images" class="btn-secondary" style="width:100%;" onclick="uploadImagesToServer()">確認上傳並鎖定照片</button>
            </div>

            <label style="${labelStyle}">報名截止時間</label>
            <input type="datetime-local" id="act-deadline" class="admin-search-bar">
            
            <label style="${labelStyle}">活動地點 (或線上連結)</label>
            <input type="text" id="act-location" class="admin-search-bar" placeholder="輸入地點">
            
            <label style="${labelStyle}">費用 (如: 一般1500, 她薈600)</label>
            <input type="text" id="act-fee" class="admin-search-bar" placeholder="設定費用">
            
            <label style="${labelStyle}">人數限制</label>
            <input type="number" id="act-capacity" class="admin-search-bar" placeholder="設定名額上限">
            
            <label style="${labelStyle}">活動詳細簡介</label>
            <textarea id="act-desc" class="admin-search-bar" placeholder="在此輸入活動詳情..." rows="6"></textarea>
            
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button id="btn-cancel-edit" class="btn-secondary" style="background-color:#999; flex:1; display:none;" onclick="cancelEditActivity()">取消編輯</button>
                <button class="btn-primary" id="submit-act-btn" style="flex:2;" onclick="submitActivity()">發布活動</button>
            </div>
        </div>
    `;

    html += `<h4 style="color: var(--text-inkblue); margin: 30px 0 10px;">📋 現有活動管理</h4>`;
    if(adminActivitiesData.length === 0) {
        html += `<p style="font-size:0.9rem; color:#666;">目前尚無活動資料。</p>`;
    } else {
        adminActivitiesData.forEach(act => {
            html += `
                <div class="data-card" style="border-left-color: var(--accent-gold); text-align: left;" id="admin-act-${act.id}">
                    <h5 style="margin: 0 0 5px; color: var(--text-inkblue); font-size:1.1rem;">${act.name}</h5>
                    <p style="font-size: 0.85rem; color: #666; margin-bottom: 4px;">📅 ${act.date.replace('T', ' ')}</p>
                    <p style="font-size: 0.85rem; color: #666; margin-bottom: 12px;">📍 ${act.location} | 👥 限額: ${act.capacity}</p>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-secondary" style="flex:1; padding:8px; font-size:0.85rem;" onclick="loadActivityForEdit('${act.id}')">✏️ 編輯內容</button>
                        <button class="btn-primary" style="background-color:#d9534f; flex:1; padding:8px; font-size:0.85rem;" onclick="deleteAdminActivity('${act.id}', '${act.name}')">🗑️ 刪除活動</button>
                    </div>
                </div>
            `;
        });
    }

    html += `</div>`;
    document.getElementById('app-content').innerHTML = html;
}

function renderImagePreviews() {
    let area = document.getElementById('upload-preview-area');
    if (currentImageAssets.length === 0) {
        area.innerHTML = `<p style="font-size:0.8rem; color:#999; width:100%; text-align:center;">尚無選擇圖片</p>`;
        return;
    }
    let html = '';
    currentImageAssets.forEach((asset, idx) => {
        let isMain = idx === 0;
        let imgSrc = asset.type === 'url' ? asset.url : asset.previewUrl;
        let borderColor = isMain ? 'var(--accent-gold)' : '#ddd';
        let borderWidth = isMain ? '3px' : '1px';
        
        html += `
            <div style="position:relative; display:inline-block; width:75px; flex-shrink:0;">
                <img src="${imgSrc}" style="width:75px; height:75px; object-fit:cover; border-radius:8px; border:${borderWidth} solid ${borderColor}; box-sizing:border-box;">
                ${isMain ? `<span style="position:absolute; top:-8px; left:-5px; background:var(--accent-gold); color:white; font-size:0.65rem; padding:2px 6px; border-radius:10px; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.2);">主圖</span>` : ''}
                <button onclick="removeImage(${idx})" style="position:absolute; top:-8px; right:-5px; background:#d9534f; color:white; border:none; border-radius:50%; width:20px; height:20px; font-size:0.6rem; font-weight:bold; cursor:pointer; line-height:1; box-shadow:0 2px 4px rgba(0,0,0,0.2);">X</button>
                <div style="display:flex; justify-content:space-between; margin-top:5px; padding:0 2px;">
                    <button onclick="moveImage(${idx}, -1)" ${idx === 0 ? 'disabled style="opacity:0.3;"' : 'style="cursor:pointer;"'} style="background:none; border:none; font-size:1rem; padding:0;">⬅️</button>
                    <button onclick="moveImage(${idx}, 1)" ${idx === currentImageAssets.length - 1 ? 'disabled style="opacity:0.3;"' : 'style="cursor:pointer;"'} style="background:none; border:none; font-size:1rem; padding:0;">➡️</button>
                </div>
            </div>
        `;
    });
    area.innerHTML = html;
}

window.removeImage = function(index) {
    currentImageAssets.splice(index, 1);
    renderImagePreviews();
};

window.moveImage = function(index, direction) {
    if (direction === -1 && index > 0) {
        [currentImageAssets[index], currentImageAssets[index - 1]] = [currentImageAssets[index - 1], currentImageAssets[index]];
    } else if (direction === 1 && index < currentImageAssets.length - 1) {
        [currentImageAssets[index], currentImageAssets[index + 1]] = [currentImageAssets[index + 1], currentImageAssets[index]];
    }
    renderImagePreviews();
};

function handleMultipleFileUpload(event) {
    let files = event.target.files;
    if (currentImageAssets.length + files.length > 10) {
        alert('總共最多只能上傳 10 張照片！');
        event.target.value = ''; return;
    }
    Array.from(files).forEach(file => {
        let reader = new FileReader();
        reader.onload = function(e) {
            currentImageAssets.push({ type: 'file', base64: e.target.result.split(',')[1], mimeType: file.type, previewUrl: e.target.result });
            renderImagePreviews();
        };
        reader.readAsDataURL(file);
    });
    event.target.value = ''; 
}

async function uploadImagesToServer() {
    let actName = document.getElementById('act-name').value.trim();
    let actDate = document.getElementById('act-date').value;
    if (!actName || !actDate) return alert('請先填寫「活動名稱」與「活動日期」再進行圖片鎖定上傳！');
    
    let filesToUpload = currentImageAssets.filter(asset => asset.type === 'file');
    if (filesToUpload.length === 0) return alert('沒有偵測到新的照片需要上傳。');

    let btn = document.getElementById('btn-upload-images');
    let originalText = btn.innerText;
    btn.innerText = "照片上傳中，請稍候..."; btn.disabled = true;

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'uploadImages', imagesData: filesToUpload, activityName: actName, dateStr: actDate }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) {
            let urlIdx = 0;
            currentImageAssets.forEach(asset => {
                if(asset.type === 'file') { asset.type = 'url'; asset.url = result.urls[urlIdx++]; delete asset.base64; delete asset.previewUrl; }
            });
            alert('照片上傳並鎖定成功！');
            btn.innerText = "已鎖定上傳 ✅"; btn.style.backgroundColor = "#4CAF50";
            setTimeout(() => { btn.innerText = "確認上傳並鎖定照片"; btn.style.backgroundColor = ""; btn.disabled = false; }, 3000);
        } else { alert('上傳失敗：' + result.message); btn.innerText = originalText; btn.disabled = false; }
    } catch (error) { alert('連線異常，圖片無法上傳'); btn.innerText = originalText; btn.disabled = false; }
}

window.loadActivityForEdit = function(actId) {
    let act = adminActivitiesData.find(a => a.id === actId);
    if(!act) return;

    editingActivityId = actId;
    document.getElementById('act-form-title').innerText = "✏️ 編輯現有活動";
    document.getElementById('submit-act-btn').innerText = "💾 儲存更新";
    document.getElementById('btn-cancel-edit').style.display = "block";

    document.getElementById('act-name').value = act.name;
    document.getElementById('act-type').value = act.type;
    document.getElementById('act-date').value = act.date.substring(0, 16); 
    document.getElementById('act-deadline').value = act.deadline.substring(0, 16);
    document.getElementById('act-location').value = act.location;
    document.getElementById('act-fee').value = act.fee;
    document.getElementById('act-capacity').value = act.capacity;
    document.getElementById('act-desc').value = act.desc;

    currentImageAssets = [];
    if(act.media) {
        let urls = act.media.split(',');
        urls.forEach(url => { if(url.trim() !== '') currentImageAssets.push({ type: 'url', url: url.trim() }); });
    }
    renderImagePreviews();
    document.getElementById('act-form-container').scrollIntoView({ behavior: 'smooth' });
};

window.cancelEditActivity = function() {
    editingActivityId = null;
    document.getElementById('act-form-title').innerText = "📢 新增活動發布";
    document.getElementById('submit-act-btn').innerText = "發布活動";
    document.getElementById('btn-cancel-edit').style.display = "none";
    ['act-name','act-date','act-deadline','act-location','act-fee','act-capacity','act-desc'].forEach(id => document.getElementById(id).value = '');
    currentImageAssets = []; renderImagePreviews();
};

window.deleteAdminActivity = async function(actId, actName) {
    if (!confirm(`⚠️ 確定要刪除活動「${actName}」嗎？此動作無法復原！`)) return;
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'deleteActivity', actId: actId }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) { alert('活動已刪除！'); fetchAndRenderAdminData(); } 
        else alert('刪除失敗');
    } catch (error) { alert('系統連線異常'); }
};

async function submitActivity() {
    const actName = document.getElementById('act-name').value.trim();
    if (!actName) return alert('活動名稱為必填項目！');
    if (currentImageAssets.some(a => a.type === 'file')) return alert('您有圖片尚未點擊「確認上傳」，請先上傳鎖定後再發布！');

    const btn = document.getElementById('submit-act-btn');
    btn.innerText = "資料處理中..."; btn.disabled = true;

    let finalUrls = currentImageAssets.map(a => a.url);

    const actData = {
        name: actName, type: document.getElementById('act-type').value,
        date: document.getElementById('act-date').value, deadline: document.getElementById('act-deadline').value,
        location: document.getElementById('act-location').value.trim(), fee: document.getElementById('act-fee').value.trim(),
        capacity: document.getElementById('act-capacity').value.trim(), description: document.getElementById('act-desc').value.trim(),
        mediaUrls: finalUrls
    };

    let actionName = editingActivityId ? 'updateActivity' : 'createActivity';
    let reqBody = { action: actionName, activityData: actData };
    if (editingActivityId) reqBody.actId = editingActivityId;

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify(reqBody),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) {
            alert(editingActivityId ? '活動更新成功！' : '活動發布成功！');
            cancelEditActivity(); 
            fetchAndRenderAdminData(); 
        } else alert('操作失敗：' + result.message);
    } catch (error) { alert('連線異常'); }
    
    btn.disabled = false;
}

function filterMembers() {
    const input = document.getElementById('member-search').value.toLowerCase();
    document.querySelectorAll('.member-item').forEach(item => { item.style.display = item.innerText.toLowerCase().includes(input) ? "block" : "none"; });
}
async function approveMemberBtn(targetUid) {
    const dateInput = document.getElementById(`date-${targetUid}`).value;
    const levelInput = document.getElementById(`level-${targetUid}`).value;
    if (!dateInput) return alert('請選擇到期日');
    if (!confirm(`確認升級為「${levelInput}」嗎？`)) return;
    try {
        const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'approveMember', targetUid: targetUid, expiryDate: dateInput, memberLevel: levelInput }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        if ((await response.json()).success) { alert('核准成功！'); fetchAndRenderAdminData(); }
    } catch (error) { alert('連線異常'); }
}
async function rejectMemberBtn(targetUid) {
    if (!confirm('確定要駁回嗎？')) return;
    try {
        const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'rejectMember', targetUid: targetUid }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        if ((await response.json()).success) { alert('已駁回！'); fetchAndRenderAdminData(); }
    } catch (error) { alert('連線異常'); }
}
async function extendMemberBtn(targetUid) {
    const newDate = document.getElementById(`extend-date-${targetUid}`).value;
    if (!newDate) return alert('請選擇到期日');
    try {
        const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'extendMemberExpiry', targetUid: targetUid, newDate: newDate }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        if ((await response.json()).success) { alert('更新成功！'); fetchAndRenderAdminData(); }
    } catch (error) { alert('連線異常'); }
}
async function terminateMemberBtn(targetUid, memberName) {
    if (!confirm(`警告：確定停止「${memberName}」會籍嗎？`)) return;
    try {
        const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'terminateMember', targetUid: targetUid }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        if ((await response.json()).success) { alert('已停權。'); fetchAndRenderAdminData(); }
    } catch (error) { alert('連線異常'); }
}
