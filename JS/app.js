/**
 * 檔案：JS/app.js
 * 說明：前端核心邏輯 (修復生日格式顯示、徹底解決編輯活動按鈕死機問題，完整保留所有功能)
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

// ==========================================
// 🌟 共用輔助函數
// ==========================================
function getDriveImageUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    let url = rawUrl.trim();
    if (url.includes('drive.google.com')) {
        let match = url.match(/id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
        if (match && match[1]) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }
    return url;
}

function formatDateTime(dateString) {
    if (!dateString) return '';
    let cleanString = String(dateString).replace('.000Z', '').replace('T', ' ');
    try {
        let d = new Date(dateString);
        if (isNaN(d.getTime())) return cleanString.substring(0, 16);
        let year = d.getFullYear();
        let month = String(d.getMonth() + 1).padStart(2, '0');
        let day = String(d.getDate()).padStart(2, '0');
        let hours = String(d.getHours()).padStart(2, '0');
        let mins = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${mins}`;
    } catch (e) { return cleanString.substring(0, 16); }
}

// 🌟 專門處理生日，強制只取 YYYY-MM-DD
function cleanDateOnly(dateVal) {
    if (!dateVal || dateVal === '無') return '尚未填寫';
    let str = String(dateVal);
    return str.split('T')[0]; // 切除時間部分，保留日期
}

window.viewFullscreenImage = function(url) {
    let overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.95); z-index:99999; display:flex; justify-content:center; align-items:center; cursor:zoom-out;";
    overlay.onclick = () => overlay.remove();
    let img = document.createElement('img');
    img.src = url;
    img.style.cssText = "max-width:95%; max-height:95%; object-fit:contain; border-radius:12px; box-shadow:0 15px 40px rgba(0,0,0,0.6);";
    overlay.appendChild(img);
    document.body.appendChild(overlay);
};

async function applyMinimumDelay() {
    if (!isFirstLoad) return;
    const elapsed = Date.now() - appStartTime;
    const remaining = 5000 - elapsed;
    if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
    isFirstLoad = false;
}

function getPremiumHeader(icon, title) {
    return `
        <div style="display: flex; align-items: center; margin-bottom: 18px; border-bottom: 2px solid #f5f5f5; padding-bottom: 12px;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #BF9A5A 0%, #E2C792 100%); display: flex; justify-content: center; align-items: center; color: white; font-size: 1.1rem; margin-right: 12px; box-shadow: 0 4px 10px rgba(191,154,90,0.3);">
                ${icon}
            </div>
            <h4 style="color: var(--text-inkblue); margin: 0; font-size: 1.25rem; font-weight: bold; letter-spacing: 1px;">${title}</h4>
        </div>
    `;
}

// ==========================================
// 🌟 系統初始化與登入邏輯
// ==========================================
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
        const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'checkUser', uid: uid }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        const result = await response.json();
        await applyMinimumDelay();
        if (result.success && result.data.isRegistered) { globalUserData = result.data; renderMemberDashboard(result.data); } 
        else document.getElementById('app-content').innerHTML = renderRegistrationForm();
    } catch (error) { 
        await applyMinimumDelay();
        document.getElementById('app-content').innerHTML = `<p style="color:red; text-align:center;">伺服器連線發生錯誤。</p>`; 
    }
}

// ==========================================
// 🌟 會員前台與註冊邏輯
// ==========================================
function renderRegistrationForm() {
    const labelStyle = "font-size: 0.9rem; font-weight: bold; color: var(--text-inkblue); display: block; margin-bottom: 6px; text-align: left;";
    const inputStyle = "width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #BF9A5A; font-size: 1rem; margin-bottom: 1.2rem; box-sizing: border-box;";
    return `
        <div style="background-color: #fff; padding: 2rem 1.5rem; border-radius: 16px; box-shadow: 0 8px 25px rgba(27, 39, 68, 0.08);">
            <h3 style="color: var(--text-inkblue); margin-bottom: 0.5rem; text-align: center; font-size: 1.4rem;">準會員申請表</h3>
            <p style="font-size: 0.95rem; margin-bottom: 2rem; text-align: center; color: #666;">請完整填寫以下資訊，加入我們</p>
            <form id="reg-form">
                <div><label style="${labelStyle}">真實姓名</label><input type="text" id="input-name" style="${inputStyle}" required></div>
                <div><label style="${labelStyle}">生理性別</label><select id="input-gender" style="${inputStyle}" required><option value="女性">女性</option><option value="男性">男性</option><option value="其他">其他</option></select></div>
                <div><label style="${labelStyle}">生日 (YYYY-MM-DD)</label><input type="date" id="input-birthday" style="${inputStyle}" required></div>
                <div><label style="${labelStyle}">手機號碼</label><input type="tel" id="input-phone" style="${inputStyle}" required></div>
                <div><label style="${labelStyle}">Email</label><input type="email" id="input-email" style="${inputStyle}" required></div>
                <div><label style="${labelStyle}">產業</label><input type="text" id="input-industry" style="${inputStyle}" required></div>
                <div><label style="${labelStyle}">公司名稱</label><input type="text" id="input-company" style="${inputStyle}" required></div>
                <div><label style="${labelStyle}">職稱</label><input type="text" id="input-jobtitle" style="${inputStyle}" required></div>
                <div style="margin-bottom: 1rem;"><label style="${labelStyle}">介紹人</label><input type="text" id="input-referrer" style="${inputStyle}" required></div>
                <button type="button" id="submit-btn" class="btn-primary" style="width: 100%; padding: 14px; font-size: 1.15rem; border-radius: 8px; font-weight: bold;" onclick="submitRegistration()">送出申請</button>
            </form>
        </div>
    `;
}

async function submitRegistration() {
    if (!currentLiffProfile) return alert("無法取得 LINE 授權資料");
    const actData = {
        realName: document.getElementById('input-name').value.trim(), gender: document.getElementById('input-gender').value,
        birthday: document.getElementById('input-birthday').value, phone: document.getElementById('input-phone').value.trim(),
        email: document.getElementById('input-email').value.trim(), industry: document.getElementById('input-industry').value.trim(),
        company: document.getElementById('input-company').value.trim(), jobTitle: document.getElementById('input-jobtitle').value.trim(),
        referrer: document.getElementById('input-referrer').value.trim()
    };
    if (!actData.realName || !actData.phone || !actData.email || !actData.industry || !actData.company || !actData.jobTitle || !actData.referrer || !actData.birthday || !actData.gender) {
        return alert("請填寫所有欄位！");
    }
    const btn = document.getElementById('submit-btn'); btn.innerText = "資料送出中..."; btn.disabled = true;
    try {
        const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'registerUser', userData: { ...actData, uid: currentLiffProfile.userId, lineName: currentLiffProfile.displayName } }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        const result = await response.json();
        if (result.success) {
            let newData = { isAdmin: result.data.isAdmin, status: '準會員', profile: { ...actData, '手機號碼': "'"+actData.phone, '授權到期日': '無', '會員編號': '核發中', '生日': actData.birthday, '性別': actData.gender } };
            globalUserData = newData; renderMemberDashboard(newData);
        } else { alert("註冊失敗：" + result.message); btn.innerText = "送出申請"; btn.disabled = false; }
    } catch (error) { alert("系統連線錯誤"); btn.innerText = "送出申請"; btn.disabled = false; }
}

function renderMemberDashboard(userData) {
    const topNav = document.getElementById('top-nav');
    if (userData.isAdmin) {
        topNav.classList.remove('hidden');
        document.getElementById('btn-admin-area').onclick = () => { if (isAdminVerified) fetchAndRenderAdminData(); else showAdminLoginModal(); };
        document.getElementById('btn-member-area').onclick = () => { if (globalUserData) renderMemberDashboard(globalUserData); };
    } else { topNav.classList.add('hidden'); }

    let expiryWarningHtml = ''; let formattedExpDate = '無';
    let isApprovedMember = APPROVED_ROLES.includes(userData.status);
    let missingDataWarning = '';
    
    if (!userData.profile['生日'] || !userData.profile['性別']) {
        missingDataWarning = `<div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; box-shadow: 0 4px 10px rgba(0,0,0,0.05);"><p style="color: #856404; font-weight: bold; font-size: 0.95rem; margin: 0;">⚠️ 您的會員資料尚未完整，請盡速展開下方詳細資料並「編輯個人資料」補充生日與性別。</p></div>`;
    }

    if (isApprovedMember && userData.profile['授權到期日'] && userData.profile['授權到期日'] !== '無') {
        let expDate = new Date(userData.profile['授權到期日']);
        formattedExpDate = cleanDateOnly(expDate);
        
        let today = new Date(); today.setHours(0,0,0,0);
        let twoMonthsLater = new Date(); twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);
        
        if (expDate < today) {
            expiryWarningHtml = `<div style="background-color: #fdf2f2; border-left: 4px solid #d9534f; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;"><p style="color: #d9534f; font-weight: bold; font-size: 0.95rem; margin: 0;">🚫 您的${userData.status}資格已於 ${formattedExpDate} 到期。部分功能已限制。</p></div>`;
        } else if (expDate <= twoMonthsLater) {
            expiryWarningHtml = `<div style="background-color: #fdf2f2; border-left: 4px solid #d9534f; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;"><p style="color: #d9534f; font-weight: bold; font-size: 0.95rem; margin: 0;">⚠️ 您的${userData.status}資格即將於 ${formattedExpDate} 到期。</p></div>`;
        }
    }

    let profileHtml = '';
    if (typeof window.CardManager !== 'undefined') profileHtml += window.CardManager.getDashboardCardHtml(userData.status, userData.profile['真實姓名'] || '-', userData.profile['會員編號'] || '核發中');

    let displayPhone = userData.profile['手機號碼'] ? String(userData.profile['手機號碼']).replace(/^'/, '') : '-';
    let displayBirth = cleanDateOnly(userData.profile['生日']);
    let displayGender = userData.profile['性別'] || '尚未填寫';

    let extraInfoHtml = `
        <details style="margin-top: 15px; cursor: pointer;" ${(!userData.profile['生日'] || !userData.profile['性別']) ? 'open' : ''}>
            <summary style="color: var(--accent-gold); font-weight: bold; padding: 5px 0; outline: none; font-size: 1rem;">📂 點擊展開/編輯詳細資料</summary>
            <div style="background: #F8F5EF; padding: 18px; border-radius: 12px; margin-top: 12px; border: 1px dashed var(--accent-gold);">
                <p style="margin: 0 0 10px; font-size: 0.95rem; color: #444;"><strong>生日：</strong> ${displayBirth}</p>
                <p style="margin: 0 0 10px; font-size: 0.95rem; color: #444;"><strong>性別：</strong> ${displayGender}</p>
                <p style="margin: 0 0 10px; font-size: 0.95rem; color: #444;"><strong>手機：</strong> ${displayPhone}</p>
                <p style="margin: 0 0 10px; font-size: 0.95rem; color: #444;"><strong>Email：</strong> ${userData.profile['Email'] || '-'}</p>
                <p style="margin: 0 0 10px; font-size: 0.95rem; color: #444;"><strong>產業：</strong> ${userData.profile['產業'] || '-'}</p>
                <p style="margin: 0 0 10px; font-size: 0.95rem; color: #444;"><strong>公司：</strong> ${userData.profile['公司名稱'] || '-'}</p>
                <p style="margin: 0 0 10px; font-size: 0.95rem; color: #444;"><strong>職稱：</strong> ${userData.profile['職稱'] || '-'}</p>
                <p style="margin: 0 0 20px; font-size: 0.95rem; color: #444;"><strong>介紹人：</strong> ${userData.profile['介紹人'] || '-'}</p>
                <button class="btn-secondary" style="width: 100%; padding: 12px; font-size: 1rem; border-radius: 8px;" onclick="openEditProfileModal()">✏️ 編輯個人資料</button>
            </div>
        </details>
    `;

    profileHtml += `
        <div style="background: #fff; border-radius: 20px; padding: 1.8rem; box-shadow: 0 8px 25px rgba(27, 39, 68, 0.05); text-align: left; margin-bottom: 2rem;">
            ${getPremiumHeader('👑', '會員專屬檔案')}
            <p style="border-bottom: 1px dashed #eee; padding-bottom: 10px; font-size: 1rem;"><strong>會員身分：</strong> <span style="float: right; color: var(--accent-gold); font-weight: bold;">${userData.status}</span></p>
            <p style="border-bottom: 1px dashed #eee; padding-bottom: 10px; font-size: 1rem;"><strong>姓名：</strong> <span style="float: right; font-weight: bold; color: var(--text-inkblue);">${userData.profile['真實姓名'] || '-'}</span></p>
            ${extraInfoHtml}
            <div style="background: rgba(191,154,90,0.08); padding: 15px; border-radius: 12px; text-align: center; margin-top: 20px;">
                <span style="font-size: 0.9rem; color: #666; font-weight: bold;">授權到期日</span><br><span style="font-weight:bold; font-size: 1.25rem; color: var(--accent-gold);">${formattedExpDate}</span>
            </div>
        </div>
    `;

    let html = `<div style="text-align: center; margin-bottom: 2rem;"><h2 style="color: var(--text-inkblue); margin-bottom: 0.5rem; font-size: 1.8rem; font-weight: bold;">您好，${userData.profile['真實姓名'] || '-'}</h2></div>${missingDataWarning}${expiryWarningHtml}${profileHtml}`;

    if (isApprovedMember || userData.isAdmin) {
        html += `<div id="member-loading" class="loading-text">正在載入最新活動...</div><div id="activity-section" style="display:none; text-align: left;"></div><div id="history-section" style="display:none; margin-top: 2.5rem; text-align: left;"></div>`;
        document.getElementById('app-content').innerHTML = html;
        fetchMemberActivitiesAndHistory(currentLiffProfile.userId);
    } else {
        html += `<div style="background: #fff; padding: 2.5rem; border-radius: 16px; text-align: center; border: 1px dashed var(--accent-gold); box-shadow: 0 4px 15px rgba(0,0,0,0.05);"><h4 style="color: var(--text-inkblue); margin-bottom: 1rem; font-size: 1.3rem;">功能鎖定中</h4><p style="font-size: 1rem; color: #666; line-height: 1.8;">您的狀態目前為「準會員」。<br>請靜候管理員審核，通過後將自動解鎖完整功能。</p></div>`;
        document.getElementById('app-content').innerHTML = html;
    }
}

window.openEditProfileModal = function() {
    let p = globalUserData.profile;
    let displayPhone = p['手機號碼'] ? String(p['手機號碼']).replace(/^'/, '') : '';
    let displayBirth = cleanDateOnly(p['生日']);
    if (displayBirth === '尚未填寫') displayBirth = '';

    const inputStyle = "width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd; font-size: 1rem; margin-bottom: 15px; box-sizing:border-box;";
    const labelStyle = "font-size:0.9rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:6px;";

    let html = `
        <div id="edit-profile-modal" class="modal-overlay" style="align-items: flex-end;" onclick="if(event.target===this) this.remove()">
            <div class="modal-content" style="width:100%; max-width:100%; border-radius: 24px 24px 0 0; padding:2rem 1.5rem; max-height:85vh; overflow-y:auto; position:relative; text-align:left;">
                <button onclick="document.getElementById('edit-profile-modal').remove()" style="position:absolute; top:20px; right:20px; background:none; border:none; font-size:2rem; color:#999; cursor:pointer;">&times;</button>
                ${getPremiumHeader('✏️', '編輯個人資料')}
                <p style="font-size:0.85rem; color:#666; margin-bottom:20px;">此處不會修改您的到期日與編號，請安心編輯。</p>
                <label style="${labelStyle}">真實姓名</label><input type="text" id="edit-name" style="${inputStyle}" value="${p['真實姓名']||''}">
                <label style="${labelStyle}">性別</label>
                <select id="edit-gender" style="${inputStyle}">
                    <option value="女性" ${(p['性別']==='女性')?'selected':''}>女性</option>
                    <option value="男性" ${(p['性別']==='男性')?'selected':''}>男性</option>
                    <option value="其他" ${(p['性別']==='其他')?'selected':''}>其他</option>
                </select>
                <label style="${labelStyle}">生日 (YYYY-MM-DD)</label><input type="date" id="edit-birthday" style="${inputStyle}" value="${displayBirth}">
                <label style="${labelStyle}">手機號碼</label><input type="text" id="edit-phone" style="${inputStyle}" value="${displayPhone}">
                <label style="${labelStyle}">Email</label><input type="email" id="edit-email" style="${inputStyle}" value="${p['Email']||''}">
                <label style="${labelStyle}">產業</label><input type="text" id="edit-industry" style="${inputStyle}" value="${p['產業']||''}">
                <label style="${labelStyle}">公司名稱</label><input type="text" id="edit-company" style="${inputStyle}" value="${p['公司名稱']||''}">
                <label style="${labelStyle}">職稱</label><input type="text" id="edit-jobtitle" style="${inputStyle}" value="${p['職稱']||''}">
                <button class="btn-primary" id="btn-save-profile" style="width: 100%; padding: 14px; font-size: 1.1rem; margin-top:10px; border-radius: 8px;" onclick="submitProfileUpdate()">儲存更新</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
};

window.submitProfileUpdate = async function() {
    const profileData = {
        realName: document.getElementById('edit-name').value.trim(), gender: document.getElementById('edit-gender').value,
        birthday: document.getElementById('edit-birthday').value, phone: document.getElementById('edit-phone').value.trim(),
        email: document.getElementById('edit-email').value.trim(), industry: document.getElementById('edit-industry').value.trim(),
        company: document.getElementById('edit-company').value.trim(), jobTitle: document.getElementById('edit-jobtitle').value.trim()
    };
    if (!profileData.birthday || !profileData.gender) return alert('生日與性別為必填項目！');
    let btn = document.getElementById('btn-save-profile'); btn.innerText = '儲存中...'; btn.disabled = true;
    try {
        const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'updateUserProfile', uid: currentLiffProfile.userId, profileData: profileData }) });
        const result = await response.json();
        if (result.success) { alert('個人資料更新成功！'); document.getElementById('edit-profile-modal').remove(); checkUserRoleAndStatus(currentLiffProfile.userId); } 
        else { alert('更新失敗'); btn.innerText = '儲存更新'; btn.disabled = false; }
    } catch (error) { alert('系統連線異常'); btn.innerText = '儲存更新'; btn.disabled = false; }
};

// ==========================================
// 🌟 活動與歷史紀錄
// ==========================================
async function fetchMemberActivitiesAndHistory(uid) {
    try {
        const [actRes, histRes] = await Promise.all([
            fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getActivities' }) }),
            fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getUserHistory', uid: uid }) })
        ]);
        globalActivities = (await actRes.json()).data || [];
        let historyData = (await histRes.json()).data || [];
        document.getElementById('member-loading').style.display = 'none';

        let actHtml = getPremiumHeader('📅', '最新活動與報名');
        let displayedActs = 0;
        let now = new Date();
        
        let isUserExpired = false;
        if (globalUserData.profile['授權到期日'] && globalUserData.profile['授權到期日'] !== '無') {
            let expDate = new Date(globalUserData.profile['授權到期日']);
            let today = new Date(); today.setHours(0,0,0,0);
            if (expDate < today) isUserExpired = true;
        }

        globalActivities.forEach(act => {
            let actNameStr = String(act.name || '').trim();
            if (actNameStr === '已刪除' || actNameStr.includes('已刪除')) return;

            let isRegistered = historyData.some(h => h.id === act.id);
            let actDate = new Date(act.date);
            let isExpiredAct = !isNaN(actDate.getTime()) && actDate < now;
            
            if (isExpiredAct && !isRegistered) return;

            displayedActs++;
            let imgUrls = act.media ? String(act.media).split(',').filter(u => u.trim() !== '') : [];
            let mainImg = (imgUrls.length > 0) ? `<img src="${getDriveImageUrl(imgUrls[0])}" style="width: 100%; height: 220px; object-fit: cover; border-radius: 12px; margin-bottom: 15px;">` : '';
            
            let canRegister = true;
            let btnText = isRegistered ? '查看詳情 / 異動申請' : '查看詳情與報名';
            let btnColor = isRegistered ? 'background-color: var(--accent-gold);' : '';
            
            let audienceText = act.targetAudience === '限她薈與創始會員' ? '限她薈與創始會員' : '';
            let badgeHtml = audienceText ? `<span style="font-size:0.75rem; background:#F8F5EF; color:var(--accent-gold); padding:4px 8px; border-radius:12px; border: 1px solid var(--accent-gold);">${audienceText}</span>` : '';
            
            if (audienceText === '限她薈與創始會員' && !['她薈會員', '創始會員'].includes(globalUserData.status) && !globalUserData.isAdmin) {
                canRegister = false;
                btnText = '🔒 僅限她薈與創始會員';
                btnColor = 'background-color: #d3d3d3; color: #777; cursor: not-allowed; border: none;';
            }
            
            if (isUserExpired && !globalUserData.isAdmin) {
                canRegister = false;
                btnText = '🚫 授權已過期，無法報名';
                btnColor = 'background-color: #d3d3d3; color: #d9534f; cursor: not-allowed; border: 1px solid #d9534f;';
            }

            actHtml += `
                <div class="data-card" style="border-radius: 16px; border-left: none; border-top: 5px solid var(--accent-gold); cursor: pointer; padding: 1.5rem;" onclick="openActivityDetailModal('${act.id}', ${isRegistered})">
                    ${mainImg}
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <h4 style="color: var(--text-inkblue); margin: 0 0 8px; font-size: 1.3rem;">${actNameStr}</h4>
                        ${badgeHtml}
                    </div>
                    <p style="font-size: 0.95rem; color: #666; margin: 0 0 15px;">📍 ${act.location || ''} <br> 🕒 ${formatDateTime(act.date)}</p>
                    <button class="btn-primary" style="width: 100%; padding: 12px; border-radius: 8px; ${btnColor}" ${!canRegister ? 'disabled' : ''}>
                        ${btnText}
                    </button>
                </div>`;
        });

        if (displayedActs === 0) {
            actHtml += `<p style="font-size:0.95rem; color:#666; text-align: center; padding: 20px;">近期尚無新活動。</p>`;
        }
        document.getElementById('activity-section').innerHTML = actHtml; document.getElementById('activity-section').style.display = 'block';

        let histHtml = getPremiumHeader('🕒', '過往歷史紀錄');
        if (historyData.length === 0) {
            histHtml += `<p style="font-size:0.95rem; color:#666; text-align: center; padding: 20px;">目前尚無紀錄。</p>`;
        } else {
            historyData.forEach(h => {
                let actExists = globalActivities.find(a => a.id === h.id);
                let clickAction = actExists ? `onclick="openActivityDetailModal('${h.id}', true, true)" style="cursor:pointer;"` : '';
                
                histHtml += `
                    <div class="data-card" ${clickAction} style="border-radius: 12px; border-left: 4px solid var(--accent-pink); padding: 1.2rem; margin-bottom: 10px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                        <p style="margin: 0 0 6px; font-size: 1.1rem;"><strong>${h.name}</strong> <span style="font-size: 0.85rem; color:#999; font-weight: normal;">(${h.type})</span></p>
                        <p style="font-size: 0.9rem; color: #666; margin: 0;">時間：${formatDateTime(h.date)} | 繳費：${h.fee} | 狀態：${h.status}</p>
                        ${actExists ? `<p style="margin: 10px 0 0; font-size: 0.85rem; color: var(--accent-gold); text-align: right; font-weight: bold;">👉 點擊檢視詳情與照片</p>` : ''}
                    </div>`;
            });
        }
        document.getElementById('history-section').innerHTML = histHtml; document.getElementById('history-section').style.display = 'block';
    } catch (error) { alert('載入資料失敗，請稍後重試。'); }
}

window.openActivityDetailModal = function(actId, isRegistered, isPastEvent = false) {
    let act = globalActivities.find(a => a.id === actId);
    if (!act) return;
    
    let imgUrls = act.media ? String(act.media).split(',').filter(u => u.trim() !== '') : [];
    
    let mainImg = (imgUrls.length > 0) ? `<img src="${getDriveImageUrl(imgUrls[0])}" onclick="viewFullscreenImage('${getDriveImageUrl(imgUrls[0])}')" title="點擊放大" style="width:100%; border-radius:16px; margin-bottom:15px; cursor:zoom-in; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">` : '';
    let subImgsHtml = '';
    if (imgUrls.length > 1) {
        subImgsHtml = `<div style="display:flex; gap:12px; overflow-x:auto; margin-bottom:20px; padding-bottom:10px;">`;
        for (let i = 1; i < imgUrls.length; i++) {
            subImgsHtml += `<img src="${getDriveImageUrl(imgUrls[i])}" onclick="viewFullscreenImage('${getDriveImageUrl(imgUrls[i])}')" title="點擊放大" style="width:85px; height:85px; object-fit:cover; border-radius:10px; flex-shrink:0; cursor:zoom-in; border: 1px solid #eee; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">`;
        }
        subImgsHtml += `</div>`;
    }

    let actDate = new Date(act.date);
    let now = new Date();
    let isExpiredAct = !isNaN(actDate.getTime()) && actDate < now;

    const inputStyle = "width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd; font-size: 1rem; margin-bottom: 15px; box-sizing:border-box;";
    let formHtml = '';

    if (isExpiredAct || isPastEvent) {
        formHtml = `
            <div style="background: #f9f9f9; padding: 15px; border-radius: 12px; margin-top: 20px; text-align:center; border: 1px dashed #ccc;">
                <h4 style="color: #999; margin: 0;">⏳ 此活動已結束或報名截止</h4>
            </div>
        `;
    } else if (isRegistered) {
        formHtml = `
            <div style="background: rgba(191,154,90,0.08); padding: 1.5rem; border-radius: 16px; margin-top: 25px; text-align:left;">
                <h4 style="color: var(--text-inkblue); margin-top:0; border-bottom:2px solid #ddd; padding-bottom:10px; font-size: 1.15rem;">📝 提出人數異動申請</h4>
                <label style="font-size:0.95rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:8px;">欲修改之新參加人數：</label>
                <input type="number" id="mod-pax" style="${inputStyle}" value="1" min="0">
                <button class="btn-primary" style="width: 100%; background-color: #d9534f; padding: 12px; border-radius: 8px; font-size: 1.05rem;" onclick="submitModRequest('${act.id}')">送出異動申請</button>
            </div>`;
    } else {
        formHtml = `
            <div style="background: #fff; padding: 1.5rem; border-radius: 16px; border: 1px solid #BF9A5A; margin-top: 25px; text-align:left; box-shadow: 0 4px 15px rgba(191,154,90,0.1);">
                <h4 style="color: var(--text-inkblue); margin-top:0; border-bottom:2px solid #BF9A5A; padding-bottom:10px; font-size: 1.15rem;">報名表單</h4>
                <p style="font-size:0.9rem; color:#666; margin-bottom:15px; background: #f9f9f9; padding: 10px; border-radius: 8px;">資料自動帶入：<strong>${globalUserData.profile['真實姓名']}</strong> / ${globalUserData.profile['手機號碼'].replace(/^'/, '')}</p>
                <label style="font-size:0.95rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:8px;">參加人數 (含本人)：</label>
                <input type="number" id="reg-pax" style="${inputStyle}" value="1" min="1">
                <label style="font-size:0.95rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:8px;">繳費方式：</label>
                <input type="text" id="reg-payment" style="${inputStyle}" placeholder="請輸入繳費方式 (如轉帳後五碼)">
                <button class="btn-primary" style="width: 100%; padding: 12px; border-radius: 8px; font-size: 1.05rem;" onclick="submitActivityRegistration('${act.id}')">確認送出報名</button>
            </div>`;
    }

    let descText = act.desc ? String(act.desc).replace(/\n/g, '<br>') : '無詳細說明';
    let actNameStr = String(act.name || '');

    document.body.insertAdjacentHTML('beforeend', `
        <div id="act-detail-modal" class="modal-overlay" style="align-items: flex-end;" onclick="if(event.target===this) this.remove()">
            <div class="modal-content" style="width:100%; max-width:100%; border-radius: 24px 24px 0 0; padding:2rem 1.5rem; max-height:85vh; overflow-y:auto; position:relative; text-align:left;">
                <button onclick="document.getElementById('act-detail-modal').remove()" style="position:absolute; top:20px; right:20px; background:none; border:none; font-size:2rem; color:#999; cursor:pointer;">&times;</button>
                ${mainImg}${subImgsHtml}
                <h3 style="color:var(--text-inkblue); margin: 10px 0 8px; font-size: 1.4rem;">${actNameStr}</h3>
                <p style="font-size:0.95rem; color:#666; margin-bottom:8px;">📍 ${act.location || '無'} <br>🕒 ${formatDateTime(act.date)}</p>
                <p style="font-size:0.95rem; color:#666; margin-bottom:20px;">💵 費用: <span style="color:var(--accent-gold); font-weight:bold;">${act.fee || '0'}</span> | 截止: ${formatDateTime(act.deadline)}</p>
                <div style="font-size:1rem; line-height:1.7; color:#444; border-top:1px dashed #ddd; padding-top:20px;">${descText}</div>
                ${formHtml}
            </div>
        </div>
    `);
};

async function submitActivityRegistration(activityId) {
    const pax = document.getElementById('reg-pax').value; const payment = document.getElementById('reg-payment').value.trim();
    if (!pax || pax < 1 || !payment) return alert('資料填寫不完整');
    if (!confirm(`確認送出報名？\n人數：${pax}\n繳費方式：${payment}`)) return;
    try {
        const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'registerActivityAdvanced', uid: currentLiffProfile.userId, activityId: activityId, participants: pax, payment: payment }) });
        const result = await response.json();
        if (result.success) { alert('報名成功！'); document.getElementById('act-detail-modal').remove(); fetchMemberActivitiesAndHistory(currentLiffProfile.userId); } else alert('報名失敗');
    } catch (error) { alert('系統連線異常'); }
}

async function submitModRequest(activityId) {
    const newPax = document.getElementById('mod-pax').value;
    if (newPax === '') return alert('請輸入人數');
    if (!confirm('確認提出異動申請？')) return;
    try {
        const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'submitModRequest', uid: currentLiffProfile.userId, activityId: activityId, newPax: newPax }) });
        const result = await response.json();
        if (result.success) { alert('申請已送出，請靜候管理員處理。'); document.getElementById('act-detail-modal').remove(); } else alert('申請失敗');
    } catch (error) { alert('系統連線異常'); }
}

// ==========================================
// 🌟 管理員後台邏輯與介面
// ==========================================
function showAdminLoginModal() {
    if (document.getElementById('admin-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `
        <div id="admin-modal" class="modal-overlay">
            <div class="modal-content" style="text-align: center; max-width: 340px; width: 90%; padding: 2.5rem 1.5rem; border-radius: 20px;">
                <h3 style="color: var(--text-inkblue); margin-bottom: 25px; font-size: 1.4rem;">管理員權限驗證</h3>
                <input type="password" id="admin-pwd" class="modal-input" placeholder="••••••••" style="width: 100%; text-align: center; letter-spacing: 5px; padding: 14px; margin-bottom: 25px; box-sizing: border-box; border: 2px solid #BF9A5A; border-radius: 10px; font-size: 1.2rem;">
                <div style="display: flex; gap: 15px; justify-content: center; align-items: center;">
                    <button class="btn-secondary" style="flex: 1; background-color: #999; padding: 14px; border: none; border-radius: 10px; color: white; font-size: 1.05rem;" onclick="document.getElementById('admin-modal').remove()">取消</button>
                    <button class="btn-primary" id="login-admin-btn" style="flex: 1; padding: 14px; border: none; border-radius: 10px; font-size: 1.05rem;" onclick="verifyAdminPassword()">確認進入</button>
                </div>
            </div>
        </div>
    `);
}

async function verifyAdminPassword() {
    const btn = document.getElementById('login-admin-btn'); btn.innerText = "驗證中...";
    try {
        const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'adminLogin', uid: currentLiffProfile.userId, password: document.getElementById('admin-pwd').value }) });
        const result = await response.json();
        if (result.success) { isAdminVerified = true; document.getElementById('admin-modal').remove(); fetchAndRenderAdminData(); } 
        else { alert('登入失敗：\n' + (result.message || '密碼或權限錯誤')); btn.innerText = "確認進入"; }
    } catch (error) { alert('系統連線異常'); btn.innerText = "確認進入"; }
}

async function fetchAndRenderAdminData() {
    const contentArea = document.getElementById('app-content'); contentArea.innerHTML = `<div class="loading-text">資料讀取中...</div>`;
    try {
        const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getAdminData' }) });
        const result = await response.json();
        if (result.success) { adminActivitiesData = result.data.activities || []; buildAdminDashboardUI(result.data); } 
        else contentArea.innerHTML = `<p style="color:red; text-align:center;">讀取失敗：<br>${result.message || '未知錯誤'}</p>`;
    } catch (error) { contentArea.innerHTML = `<p style="color:red; text-align:center;">網路連線異常</p>`; }
}

function updatePreviewId(uid) { 
    let selectEl = document.getElementById(`level-${uid}`);
    if (selectEl && adminNextIds[selectEl.value]) {
        document.getElementById(`preview-id-${uid}`).innerText = adminNextIds[selectEl.value]; 
    }
}

window.switchAdminTab = function(tabName) {
    document.getElementById('admin-member-sec').style.display = (tabName === 'members') ? 'block' : 'none';
    document.getElementById('admin-act-sec').style.display = (tabName === 'activities') ? 'block' : 'none';
    document.getElementById('tab-btn-members').style.opacity = (tabName === 'members') ? '1' : '0.5';
    document.getElementById('tab-btn-activities').style.opacity = (tabName === 'activities') ? '1' : '0.5';
};

function buildAdminDashboardUI(data) {
    let nextYear = new Date(); nextYear.setFullYear(nextYear.getFullYear() + 1); let defaultDate = nextYear.toISOString().split('T')[0];
    adminNextIds = data.nextIds; editingActivityId = null; currentImageAssets = []; 

    let html = `
        <h2 style="text-align: center; color: var(--accent-gold); margin-bottom: 1.5rem;">⚙️ 系統管理員專區</h2>
        <div style="display: flex; gap: 10px; margin-bottom: 25px;">
            <button id="tab-btn-members" class="btn-primary" style="flex: 1; border-radius: 20px; transition: 0.3s; padding: 12px; font-size: 1.1rem;" onclick="switchAdminTab('members')">👥 會員管理</button>
            <button id="tab-btn-activities" class="btn-primary" style="flex: 1; border-radius: 20px; opacity: 0.5; background-color: var(--accent-gold); transition: 0.3s; padding: 12px; font-size: 1.1rem;" onclick="switchAdminTab('activities')">📢 活動管理</button>
        </div>
    `;

    // ================== 管理員：會員管理區塊 ==================
    html += `<div id="admin-member-sec">`;
    
    if (data.abnormal && data.abnormal.length > 0) {
        html += `<div style="background-color: #fff3cd; border: 2px solid #d9534f; padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem; box-shadow: 0 4px 10px rgba(217,83,79,0.2);">`;
        html += `<h4 style="color: #d9534f; margin-top: 0; margin-bottom: 10px; font-size: 1.1rem; text-align: center;">🚨 授權期限異常，請協助調整 (${data.abnormal.length} 筆)</h4>`;
        data.abnormal.forEach(m => {
            html += `
                <div style="background: #fff; padding: 10px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid #d9534f;">
                    <p style="margin:0; font-weight: bold; color: #333;">${m.name} (${m.status})</p>
                    <p style="margin:5px 0 0; color: #d9534f; font-size: 0.9rem;">異常到期日：${m.expiryDate}</p>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    if (data.expired && data.expired.length > 0) {
        html += getPremiumHeader('🚨', `過期待處理會員 (${data.expired.length} 筆)`);
        data.expired.forEach(m => {
            let displayPhone = m.phone ? String(m.phone).replace(/^'/, '') : '-';
            html += `
                <div class="data-card data-card-danger" style="border-radius: 12px; padding: 1.2rem; margin-bottom: 15px; border-left: 5px solid #d9534f; background: #fff;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 10px;">
                        <div>
                            <h4 style="margin: 0; color: #d9534f; font-size: 1.15rem;">${m.name} <span style="font-size: 0.9rem; color: #999; font-weight: normal;">(${m.memberId})</span></h4>
                            <p style="margin: 4px 0 0; font-size: 0.9rem; color: #555;">原本等級：${m.status}</p>
                        </div>
                        <span style="font-size:0.85rem; background:#fdf2f2; padding:4px 10px; border-radius:12px; color: #d9534f; font-weight: bold;">已於 ${m.expiryDate} 到期</span>
                    </div>
                    
                    <details style="margin-top: 15px; border-top: 1px dashed #eee; padding-top: 12px; cursor: pointer;">
                        <summary style="color: #d9534f; font-weight: bold; font-size: 0.95rem; outline: none; margin-bottom: 10px;">⚙️ 執行降級與重發編號</summary>
                        <div style="background: #fdfdfd; padding: 15px; border-radius: 10px; border: 1px solid #eee; margin-top: 10px;">
                            <label style="font-size:0.9rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:6px;">單純延期：</label>
                            <div style="display:flex; gap:10px; margin-bottom:20px;"><input type="date" id="extend-date-${m.uid}" class="admin-search-bar" value="${defaultDate}" style="margin:0; flex:2; padding:12px; border-radius: 8px; box-sizing:border-box;"><button class="btn-secondary" style="flex:1; padding:12px; font-size:0.95rem; background-color: var(--accent-gold); color: white; border: none; border-radius: 8px; font-weight: bold;" onclick="extendMemberBtn('${m.uid}')">💾 更新延期</button></div>
                            <hr style="border: 0; border-top: 1px dashed #ddd; margin: 15px 0;">
                            <label style="font-size:0.9rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:6px;">選擇降級至：</label>
                            <div style="display:flex; gap:10px; margin-bottom:15px;">
                                <select id="change-level-${m.uid}" class="admin-search-bar" style="margin:0; flex:1; padding:12px; border-radius: 8px;">
                                    <option value="一般會員" selected>一般會員</option>
                                    <option value="她薈會員">她薈會員</option>
                                </select>
                                <input type="date" id="change-date-${m.uid}" class="admin-search-bar" value="2099-12-31" style="margin:0; flex:1; padding:12px; border-radius: 8px; box-sizing:border-box;">
                                <button class="btn-secondary" style="flex:1; padding:12px; font-size:0.95rem; background-color: #d9534f; color: white; border: none; border-radius: 8px; font-weight: bold;" onclick="changeMemberLevelBtn('${m.uid}')">🔄 確認轉換</button>
                            </div>
                            <button class="btn-secondary" style="background-color:#999; color: white; width:100%; padding:10px; font-size:1rem; border: none; border-radius: 8px;" onclick="terminateMemberBtn('${m.uid}', '${m.name}')">🚫 永久停止會籍</button>
                        </div>
                    </details>
                </div>
            `;
        });
    }

    html += getPremiumHeader('⚠️', `即將到期提醒 (${data.expiring.length} 筆)`);
    if (data.expiring.length === 0) {
        html += `<p style="font-size:0.95rem; color:#666; margin-bottom:1.5rem; text-align: center;">目前無即將到期的會員。</p>`;
    } else {
        data.expiring.forEach(m => { html += `<div class="data-card data-card-danger" style="border-radius: 12px;"><p style="margin:0;"><strong>${m.name}</strong> (${m.phone}) - [${m.status}] <br><span style="color:#d9534f; font-size: 0.9rem;">到期日: ${m.expiryDate}</span></p></div>`; });
    }

    html += getPremiumHeader('⏳', `準會員審核區 (${data.pending.length} 筆)`);
    if (data.pending.length === 0) {
        html += `<p style="font-size:0.95rem; color:#666; margin-bottom:1.5rem; text-align: center;">目前無待審核的會員。</p>`;
    } else {
        data.pending.forEach(m => {
            let displayBirth = cleanDateOnly(m.birthday);
            html += `
                <div class="data-card" id="pending-card-${m.uid}" style="text-align: left; border-top: 5px solid var(--text-inkblue); border-radius: 16px; padding: 1.5rem;">
                    <div style="display: flex; align-items: center; margin-bottom: 12px;">
                        <div style="width: 45px; height: 45px; border-radius: 50%; background: linear-gradient(135deg, #BF9A5A 0%, #E2C792 100%); display: flex; justify-content: center; align-items: center; color: white; font-size: 1.3rem; font-weight: bold; margin-right: 15px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">${m.name.charAt(0)}</div>
                        <div><h4 style="margin: 0; font-size: 1.2rem; color: var(--text-inkblue);">${m.name} <span style="font-size: 0.85rem; color: #666; font-weight: normal;">(${m.gender || '未知'})</span></h4><p style="margin: 4px 0 0; font-size: 0.9rem; color: #666;">📞 ${m.phone}</p></div>
                    </div>
                    <div style="background: #F8F5EF; padding: 15px; border-radius: 12px; margin-bottom: 15px; font-size: 0.95rem; color: #444; border: 1px dashed #BF9A5A;">
                        <p style="margin: 0 0 8px;"><strong>🎂 生日：</strong>${displayBirth}</p><p style="margin: 0 0 8px;"><strong>📧 Email：</strong>${m.email || '-'}</p><p style="margin: 0 0 8px;"><strong>🏢 公司：</strong>${m.company || '-'}</p><p style="margin: 0 0 8px;"><strong>💼 職稱：</strong>${m.jobTitle || '-'}</p><p style="margin: 0 0 8px;"><strong>🏭 產業：</strong>${m.industry || '-'}</p><p style="margin: 0;"><strong>🤝 介紹人：</strong>${m.referrer || '-'}</p>
                    </div>
                    <label style="font-size: 0.95rem; font-weight: bold; color: var(--text-inkblue); display: block; margin-bottom: 6px;">選擇會員等級 (預計編號: <span id="preview-id-${m.uid}" style="color:var(--accent-gold);">${adminNextIds['一般會員']}</span>)：</label>
                    <select id="level-${m.uid}" class="admin-search-bar" style="margin-bottom: 12px; padding: 10px; border-radius: 8px;" onchange="updatePreviewId('${m.uid}')">
                        <option value="一般會員">一般會員</option><option value="她薈會員">她薈會員</option><option value="創始會員">創始會員</option>
                    </select>
                    <label style="font-size: 0.95rem; font-weight: bold; color: var(--text-inkblue); display: block; margin-bottom: 6px;">設定授權到期日：</label>
                    <input type="date" id="date-${m.uid}" class="admin-search-bar" value="${defaultDate}" style="margin-bottom: 18px; padding: 10px; border-radius: 8px;">
                    <div style="display: flex; gap: 10px;"><button class="btn-secondary" style="background-color: #d9534f; flex: 1; padding: 12px; border-radius: 8px; color: white; border: none; font-size: 1rem;" onclick="rejectMemberBtn('${m.uid}')">駁回</button><button class="btn-secondary" style="background-color: var(--accent-gold); flex: 2; padding: 12px; border-radius: 8px; color: white; border: none; font-size: 1rem; font-weight: bold;" onclick="approveMemberBtn('${m.uid}')">確認核准入會</button></div>
                </div>`;
        });
    }

    html += getPremiumHeader('👥', '正式會員名單總覽');
    html += `<input type="text" id="member-search" class="admin-search-bar" placeholder="🔍 搜尋姓名、電話、公司..." onkeyup="filterMembers()" style="padding: 12px; border-radius: 10px; margin-bottom: 20px;">`;
    let founderList = '', annualList = '', generalList = '';
    
    data.active.forEach(m => {
        let displayPhone = m.phone ? String(m.phone).replace(/^'/, '') : '-';
        let compJobStr = [((m.company && m.company !== '-') ? m.company : ''), ((m.jobTitle && m.jobTitle !== '-') ? m.jobTitle : '')].filter(Boolean).join(' / ') || '無公司與職稱資訊';
        let defaultExtend = m.status === '一般會員' ? '2099-12-31' : m.expiryDate; 
        let displayBirth = cleanDateOnly(m.birthday);

        let cardHtml = `
            <div class="data-card member-item" style="text-align:left; padding: 1.2rem; margin-bottom: 15px; border-left: 5px solid var(--accent-gold); border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); background: #fff;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 10px;">
                    <div><h4 style="margin: 0; color: var(--text-inkblue); font-size: 1.15rem;">${m.name} <span style="font-size: 0.9rem; color: #999; font-weight: normal;">(${m.memberId})</span></h4><p style="margin: 4px 0 0; font-size: 0.9rem; color: #555;">🏢 ${compJobStr}</p></div>
                    <span style="font-size:0.85rem; background:#F8F5EF; border: 1px solid #BF9A5A; padding:4px 10px; border-radius:12px; color: var(--accent-gold); font-weight: bold;">📞 ${displayPhone}</span>
                </div>
                
                <details style="margin-top: 15px; border-top: 1px dashed #eee; padding-top: 12px; cursor: pointer;">
                    <summary style="color: var(--text-inkblue); font-weight: bold; font-size: 0.95rem; outline: none; margin-bottom: 10px; background: rgba(191,154,90,0.1); padding: 8px 12px; border-radius: 8px; display: inline-block;">⚙️ 展開詳細資訊與授權管理</summary>
                    <div style="background: #fdfdfd; padding: 15px; border-radius: 10px; border: 1px solid #eee; margin-top: 10px;">
                        <p style="margin: 0 0 6px; font-size: 0.9rem; color: #444;"><strong>🎂 生日：</strong> ${displayBirth}</p><p style="margin: 0 0 6px; font-size: 0.9rem; color: #444;"><strong>🚻 性別：</strong> ${m.gender || '-'}</p><p style="margin: 0 0 6px; font-size: 0.9rem; color: #444;"><strong>📧 Email：</strong> ${m.email || '-'}</p><p style="margin: 0 0 6px; font-size: 0.9rem; color: #444;"><strong>🏭 產業：</strong> ${m.industry || '-'}</p><p style="margin: 0 0 15px; font-size: 0.9rem; color: #444;"><strong>🤝 介紹人：</strong> ${m.referrer || '-'}</p>
                        
                        <label style="font-size:0.9rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:6px;">純更新到期日 (目前: ${m.expiryDate})</label>
                        <div style="display:flex; gap:10px; margin-bottom:20px;"><input type="date" id="extend-date-${m.uid}" class="admin-search-bar" value="${defaultExtend}" style="margin:0; flex:2; padding:12px; border-radius: 8px; box-sizing:border-box;"><button class="btn-secondary" style="flex:1; padding:12px; font-size:0.95rem; background-color: var(--accent-gold); color: white; border: none; border-radius: 8px; font-weight: bold;" onclick="extendMemberBtn('${m.uid}')">💾 單純延期</button></div>
                        
                        <hr style="border: 0; border-top: 1px dashed #ddd; margin: 15px 0;">
                        <label style="font-size:0.9rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:6px;">變更會員等級 (注意：將重發新編號)</label>
                        <div style="display:flex; gap:10px; margin-bottom:15px;">
                            <select id="change-level-${m.uid}" class="admin-search-bar" style="margin:0; flex:1; padding:12px; border-radius: 8px;">
                                <option value="一般會員" ${m.status==='一般會員'?'selected':''}>一般會員</option>
                                <option value="她薈會員" ${m.status==='她薈會員'?'selected':''}>她薈會員</option>
                                <option value="創始會員" ${m.status==='創始會員'?'selected':''}>創始會員</option>
                            </select>
                            <input type="date" id="change-date-${m.uid}" class="admin-search-bar" value="${defaultExtend}" style="margin:0; flex:1; padding:12px; border-radius: 8px; box-sizing:border-box;">
                            <button class="btn-secondary" style="flex:1; padding:12px; font-size:0.95rem; background-color: #d9534f; color: white; border: none; border-radius: 8px; font-weight: bold;" onclick="changeMemberLevelBtn('${m.uid}')">🔄 執行變更</button>
                        </div>
                        <button class="btn-secondary" style="background-color:#999; color: white; width:100%; padding:10px; font-size:1rem; border: none; border-radius: 8px; font-weight: bold;" onclick="terminateMemberBtn('${m.uid}', '${m.name}')">🚫 永久停止會籍 (停權)</button>
                    </div>
                </details>
            </div>`;
        if (m.status === '創始會員') founderList += cardHtml; else if (m.status === '她薈會員') annualList += cardHtml; else generalList += cardHtml;
    });
    
    html += `<h5 style="color: var(--accent-gold); font-size: 1.1rem; margin-top: 20px;">👑 創始會員</h5><div>${founderList}</div><h5 style="color: var(--accent-gold); font-size: 1.1rem; margin-top: 25px;">🌸 她薈會員</h5><div>${annualList}</div><h5 style="color: var(--accent-gold); font-size: 1.1rem; margin-top: 25px;">💎 一般會員</h5><div>${generalList}</div></div>`;

    // ================== 管理員：活動管理區塊 ==================
    html += `<div id="admin-act-sec" style="display:none;">`;
    html += getPremiumHeader('📢', '新增活動發布');
    html += `
        <div class="data-card" style="border-left-color: var(--accent-pink); text-align: left; border-radius: 16px; padding: 1.5rem;" id="act-form-container">
            <input type="text" id="act-name" class="admin-search-bar" placeholder="活動名稱" required style="padding: 12px; border-radius: 8px;">
            <div style="display:flex; gap:10px; margin-bottom:15px;">
                <select id="act-type" class="admin-search-bar" style="margin:0; flex:1; padding: 12px; border-radius: 8px;">
                    <option value="實體課程">實體課程</option><option value="線上講座">線上講座</option><option value="內部通告">內部通告</option><option value="跨產業聯誼">跨產業聯誼</option>
                </select>
                <select id="act-target" class="admin-search-bar" style="margin:0; flex:1; padding: 12px; border-radius: 8px; border-color: var(--accent-gold); color: var(--accent-gold); font-weight: bold;">
                    <option value="所有會員">所有會員</option><option value="限她薈與創始會員">限她薈與創始會員</option>
                </select>
            </div>
            <input type="datetime-local" id="act-date" class="admin-search-bar" style="padding: 12px; border-radius: 8px;">
            <div style="background: #F8F5EF; padding: 15px; border-radius: 12px; border: 1px dashed var(--accent-gold); margin-bottom: 15px;">
                <label style="font-size: 0.9rem; font-weight:bold; color:var(--accent-gold); display:block; margin-bottom:10px;">📷 上傳活動圖片 (最多5張，支援拖曳排序)</label>
                <input type="file" id="act-media" class="admin-search-bar" accept="image/*" multiple onchange="handleMultipleFileUpload(event)" style="padding: 8px;">
                <div id="upload-preview-area" style="display:flex; gap:12px; overflow-x:auto; margin-bottom:15px; min-height:80px; padding: 10px 0;"></div>
                <button id="btn-upload-images" class="btn-secondary" style="width:100%; margin-bottom:5px; padding: 12px; border-radius: 8px;" onclick="uploadImagesToServer()">確認上傳並鎖定照片</button>
            </div>
            <input type="datetime-local" id="act-deadline" class="admin-search-bar" style="padding: 12px; border-radius: 8px;">
            <input type="text" id="act-location" class="admin-search-bar" placeholder="地點" style="padding: 12px; border-radius: 8px;">
            <input type="text" id="act-fee" class="admin-search-bar" placeholder="費用 (如: 1500)" style="padding: 12px; border-radius: 8px;">
            <input type="number" id="act-capacity" class="admin-search-bar" placeholder="人數限制" style="padding: 12px; border-radius: 8px;">
            <textarea id="act-desc" class="admin-search-bar" placeholder="活動簡介與詳細說明..." rows="4" style="padding: 12px; border-radius: 8px;"></textarea>
            <div style="display:flex; gap:10px; margin-top: 10px;"><button id="btn-cancel-edit" class="btn-secondary" style="background-color:#999; flex:1; display:none; padding: 12px; border-radius: 8px;" onclick="cancelEditActivity()">取消編輯</button><button class="btn-primary" id="submit-act-btn" style="flex:2; padding: 12px; border-radius: 8px; font-size: 1.1rem;" onclick="submitActivity()">發布活動</button></div>
        </div>`;

    html += getPremiumHeader('📋', '現有活動管理');
    
    let displayedAdminActs = 0;
    if (adminActivitiesData.length > 0) {
        adminActivitiesData.forEach(act => {
            let actNameStr = String(act.name || '').trim();
            // 🌟 防呆：管理員介面也嚴格剔除包含已刪除的活動
            if (actNameStr === '已刪除' || actNameStr.includes('已刪除')) return;
            
            displayedAdminActs++;
            let audienceText = act.targetAudience || '所有會員';
            if (String(audienceText).includes('T') || String(audienceText).match(/\d{4}-\d{2}-\d{2}/)) { audienceText = '所有會員'; }
            
            html += `
                <div class="data-card" style="border-left-color: var(--accent-gold); text-align: left; border-radius: 16px; padding: 1.5rem;" id="admin-act-${act.id}">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <h5 style="margin: 0 0 8px; color: var(--text-inkblue); font-size: 1.25rem;">${actNameStr}</h5>
                        <span style="font-size:0.75rem; background:#F8F5EF; color:var(--accent-gold); padding:4px 8px; border-radius:12px; border: 1px solid var(--accent-gold);">${audienceText}</span>
                    </div>
                    <p style="font-size: 0.95rem; color: #666; margin-bottom: 15px;">📅 ${formatDateTime(act.date)} <br>📍 ${act.location}</p>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <button class="btn-primary" style="background-color: var(--text-inkblue); width:100%; padding:12px; border-radius: 8px; font-size: 1rem;" onclick="openAdminRegistrations('${act.id}', '${act.name}')">👥 查看報名名單與寄信</button>
                        <div style="display:flex; gap:10px;"><button class="btn-secondary" style="flex:1; padding:10px; font-size:0.95rem; border-radius: 8px;" onclick="loadActivityForEdit('${act.id}')">✏️ 編輯活動</button><button class="btn-primary" style="background-color:#d9534f; flex:1; padding:10px; font-size:0.95rem; border-radius: 8px;" onclick="deleteAdminActivity('${act.id}', '${act.name}')">🗑️ 刪除活動</button></div>
                    </div>
                </div>`;
        });
    }
    if (displayedAdminActs === 0) {
        html += `<p style="font-size:0.95rem; color:#666; text-align: center;">目前尚無活動資料。</p>`;
    }
    
    html += `</div>`;
    document.getElementById('app-content').innerHTML = html;
}

window.changeMemberLevelBtn = async function(targetUid) {
    const dateInput = document.getElementById(`change-date-${targetUid}`).value;
    const levelInput = document.getElementById(`change-level-${targetUid}`).value;
    if (!dateInput) return alert('請選擇到期日');
    if (!confirm(`確認將會員等級變更為「${levelInput}」嗎？\n(系統將自動停用舊編號，並核發全新的一組會員編號！)`)) return;
    try {
        const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'approveMember', uid: currentLiffProfile.userId, targetUid: targetUid, expiryDate: dateInput, memberLevel: levelInput }) });
        const result = await response.json();
        if (result.success) { alert('變更成功！新編號已核發。'); fetchAndRenderAdminData(); }
    } catch (error) { alert('系統連線異常'); }
}

// ==========================================
// 🌟 管理員：報名名單與寄信功能
// ==========================================
window.openAdminRegistrations = async function(actId, actName) {
    const btn = event.target; const originalText = btn.innerText; btn.innerText = "載入名單中..."; btn.disabled = true;
    try {
        const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'getEventRegistrations', actId: actId }) });
        const result = await response.json();
        
        if (result.success) {
            let regs = result.data; let listHtml = '';
            let totalEntries = regs.length;
            let totalPax = regs.reduce((sum, reg) => sum + parseInt(reg.pax), 0);
            
            if (regs.length === 0) listHtml = `<p style="text-align:center; color:#999; margin-top:20px; font-size: 1rem;">目前尚無人報名此活動</p>`;
            else {
                regs.forEach(reg => {
                    let statusColor = reg.status === '已繳費' ? '#4CAF50' : (reg.status === '未繳費' ? '#d9534f' : '#BF9A5A');
                    listHtml += `
                        <div style="background:#fdfdfd; border:1px solid #eee; border-left:5px solid ${statusColor}; padding:15px; border-radius:12px; margin-bottom:12px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); display: flex; align-items: flex-start; gap: 10px;">
                            <div style="padding-top: 5px;">
                                <input type="checkbox" class="email-checkbox" value="${reg.uid}" data-status="${reg.status}" checked style="transform: scale(1.3); cursor: pointer;">
                            </div>
                            <div style="flex: 1;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                                    <strong style="font-size:1.1rem; color:var(--text-inkblue);">${reg.name} <span style="font-size:0.9rem; color:#666; font-weight:normal;">(${reg.pax}人)</span></strong>
                                    <span style="font-size:0.85rem; background:#F8F5EF; padding:4px 8px; border-radius:8px; color: var(--accent-gold); font-weight: bold;">${reg.phone}</span>
                                </div>
                                <p style="font-size:0.9rem; color:#666; margin:0 0 6px;">信箱：${reg.email}</p>
                                <p style="font-size:0.9rem; color:#666; margin:0 0 12px;">繳費方式：${reg.payment}</p>
                                <div style="display:flex; align-items:center; gap:10px; background: rgba(0,0,0,0.03); padding: 10px; border-radius: 8px;">
                                    <label style="font-size:0.9rem; font-weight:bold; color: #444;">狀態：</label>
                                    <select onchange="updateRegStatus('${reg.sheetName}', ${reg.rowIdx}, this.value, this)" style="padding:8px; border-radius:6px; border:1px solid #ccc; font-size:0.9rem; flex:1; outline: none;">
                                        <option value="已報名" ${reg.status==='已報名'?'selected':''}>已報名 (預設)</option>
                                        <option value="已繳費" ${reg.status==='已繳費'?'selected':''}>✅ 已繳費確認</option>
                                        <option value="未繳費" ${reg.status==='未繳費'?'selected':''}>❌ 未繳費</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
            
            let emailSection = `
                <div style="margin: 20px 0; padding: 20px; border: 1px solid var(--accent-gold); border-radius: 12px; background: #fff; box-shadow: 0 4px 15px rgba(191,154,90,0.08);">
                    <h4 style="color:var(--text-inkblue); margin-top:0; margin-bottom:15px; font-size: 1.15rem;">📧 發送自訂通知信件</h4>
                    <div style="display:flex; gap:10px; margin-bottom:20px;">
                        <button class="btn-secondary" style="flex:1; padding:10px; font-size:0.9rem; border-radius: 8px;" onclick="loadEmailTemplate('reminder', '${actName}')">📥 載入行前公版</button>
                        <button class="btn-secondary" style="background-color:#d9534f; color: white; border: none; flex:1; padding:10px; font-size:0.9rem; border-radius: 8px;" onclick="loadEmailTemplate('payment', '${actName}')">📥 載入催繳公版</button>
                    </div>
                    <label style="font-size:0.95rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:6px;">一鍵快速勾選：</label>
                    <select id="email-target" class="admin-search-bar" style="margin-bottom:15px; padding: 10px; border-radius: 8px;" onchange="updateEmailSelection()">
                        <option value="all">勾選所有報名者 (包含已繳費)</option>
                        <option value="unpaid">僅勾選「未繳費或已報名」的會員</option>
                        <option value="none">取消所有勾選</option>
                    </select>
                    <label style="font-size:0.95rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:6px;">信件主旨：</label>
                    <input type="text" id="email-subject" class="admin-search-bar" value="【她薈 HER HUI】活動通知：${actName}" style="padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                    <label style="font-size:0.95rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:6px;">信件內文 (可自由編輯)：</label>
                    <textarea id="email-body" class="admin-search-bar" rows="6" placeholder="請點擊上方按鈕載入公版，或直接輸入內文..." style="padding: 10px; border-radius: 8px; margin-bottom: 20px;"></textarea>
                    <button class="btn-primary" style="width:100%; padding: 14px; font-size: 1.1rem; border-radius: 8px;" onclick="sendCustomEventEmail('${actId}')">寄出信件給被勾選的人</button>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', `
                <div id="reg-list-modal" class="modal-overlay" style="align-items: flex-end;" onclick="if(event.target===this) this.remove()">
                    <div class="modal-content" style="width:100%; max-width:100%; border-radius: 24px 24px 0 0; padding:2rem 1.5rem; max-height:90vh; overflow-y:auto; position:relative; text-align:left; background:#F8F5EF;">
                        <button onclick="document.getElementById('reg-list-modal').remove()" style="position:absolute; top:20px; right:20px; background:none; border:none; font-size:2.2rem; color:#999; cursor:pointer;">&times;</button>
                        <h3 style="color:var(--text-inkblue); margin-top:0; border-bottom:2px solid var(--accent-gold); padding-bottom:12px; font-size: 1.35rem;">📋 ${actName}</h3>
                        ${emailSection}
                        <h4 style="color:var(--text-inkblue); margin-bottom:15px; font-size: 1.15rem;">報名名單 (${totalEntries} 筆 / 共 ${totalPax} 人)</h4>
                        ${listHtml}
                    </div>
                </div>`);
        } else alert('無法取得名單：' + result.message);
    } catch (error) { alert('系統連線異常'); }
    btn.innerText = originalText; btn.disabled = false;
};

window.updateEmailSelection = function() {
    let target = document.getElementById('email-target').value;
    let checkboxes = document.querySelectorAll('.email-checkbox');
    checkboxes.forEach(cb => {
        if (target === 'all') cb.checked = true;
        else if (target === 'none') cb.checked = false;
        else if (target === 'unpaid') { cb.checked = (cb.dataset.status !== '已繳費'); }
    });
};

window.loadEmailTemplate = function(type, actName) {
    let subject = document.getElementById('email-subject');
    let body = document.getElementById('email-body');
    let target = document.getElementById('email-target');
    if (type === 'reminder') {
        subject.value = `【她薈 HER HUI】活動行前提醒：${actName}`;
        body.value = `溫馨提醒您，您報名的精彩活動即將開始！\n請記得保留時間並將活動加入行事曆，期待與您相見！`;
        target.value = 'all';
    } else {
        subject.value = `【她薈 HER HUI】活動繳費提醒：${actName}`;
        body.value = `系統提醒您，您報名的活動尚未完成繳費確認喔！\n若您已經完成繳費，請忽略此信，或主動聯繫管理員為您進行人工確認。\n感謝您的配合！`;
        target.value = 'unpaid';
    }
    updateEmailSelection(); 
};

window.sendCustomEventEmail = async function(actId) {
    let subject = document.getElementById('email-subject').value.trim();
    let bodyText = document.getElementById('email-body').value.trim();
    let selectedUids = Array.from(document.querySelectorAll('.email-checkbox:checked')).map(cb => cb.value);

    if (selectedUids.length === 0) return alert("請至少勾選一位收件人！");
    if (!subject || !bodyText) return alert("請填寫主旨與內文");
    if (!confirm(`確定要發送信件給勾選的 ${selectedUids.length} 人嗎？`)) return;

    let btn = event.target; let originalText = btn.innerText; btn.innerText = "發送中..."; btn.disabled = true;
    try {
        const response = await fetch(GAS_API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'sendEventEmails', uid: currentLiffProfile.userId, actId: actId, targetType: 'custom', subject: subject, customText: bodyText, selectedUids: selectedUids }) 
        });
        const result = await response.json();
        alert(result.success ? result.message : '寄信失敗：' + result.message);
    } catch (error) { alert('系統連線異常，信件可能未完整送出'); }
    btn.innerText = originalText; btn.disabled = false;
};

window.updateRegStatus = async function(sheetName, rowIdx, newStatus, selectElement) {
    selectElement.disabled = true;
    try {
        const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'updateRegStatus', uid: currentLiffProfile.userId, sheetName: sheetName, rowIdx: rowIdx, newStatus: newStatus }) });
        const result = await response.json();
        if (result.success) { 
            let card = selectElement.closest('div').parentElement;
            card.style.borderLeftColor = newStatus === '已繳費' ? '#4CAF50' : (newStatus === '未繳費' ? '#d9534f' : '#BF9A5A'); 
            let checkbox = card.querySelector('.email-checkbox');
            if (checkbox) checkbox.dataset.status = newStatus;
        } else alert('更新失敗');
    } catch (error) { alert('連線異常'); }
    selectElement.disabled = false;
};

// ==========================================
// 🌟 管理員：多圖上傳與活動編輯
// ==========================================
function renderImagePreviews() {
    let area = document.getElementById('upload-preview-area');
    if (currentImageAssets.length === 0) { area.innerHTML = ''; return; }
    let html = '';
    currentImageAssets.forEach((asset, idx) => {
        let isMain = idx === 0;
        let imgSrc = asset.type === 'url' ? getDriveImageUrl(asset.url) : asset.previewUrl;
        let borderColor = isMain ? 'var(--accent-gold)' : '#ddd';
        let borderWidth = isMain ? '3px' : '1px';
        
        html += `
            <div style="position:relative; display:inline-block; width:85px; flex-shrink:0; margin-right: 12px;">
                <img src="${imgSrc}" style="width:85px; height:85px; object-fit:cover; border-radius:10px; border:${borderWidth} solid ${borderColor}; box-sizing:border-box; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                ${isMain ? `<span style="position:absolute; top:-10px; left:-5px; background:var(--accent-gold); color:white; font-size:0.7rem; padding:3px 8px; border-radius:12px; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.2);">主圖</span>` : ''}
                <button onclick="removeImage(${idx})" style="position:absolute; top:-8px; right:-8px; background:#d9534f; color:white; border:none; border-radius:50%; width:24px; height:24px; font-size:0.75rem; font-weight:bold; cursor:pointer; line-height:1; box-shadow:0 2px 5px rgba(0,0,0,0.3);">X</button>
                <div style="display:flex; justify-content:space-between; margin-top:8px; padding:0 4px;">
                    <button onclick="moveImage(${idx}, -1)" ${idx === 0 ? 'disabled style="opacity:0.2;"' : 'style="cursor:pointer;"'} style="background:none; border:none; font-size:1.3rem; padding:0;">⬅️</button>
                    <button onclick="moveImage(${idx}, 1)" ${idx === currentImageAssets.length - 1 ? 'disabled style="opacity:0.2;"' : 'style="cursor:pointer;"'} style="background:none; border:none; font-size:1.3rem; padding:0;">➡️</button>
                </div>
            </div>`;
    });
    area.innerHTML = html;
}

window.removeImage = function(index) { currentImageAssets.splice(index, 1); renderImagePreviews(); };
window.moveImage = function(index, direction) {
    if (direction === -1 && index > 0) { [currentImageAssets[index], currentImageAssets[index - 1]] = [currentImageAssets[index - 1], currentImageAssets[index]]; } 
    else if (direction === 1 && index < currentImageAssets.length - 1) { [currentImageAssets[index], currentImageAssets[index + 1]] = [currentImageAssets[index + 1], currentImageAssets[index]]; }
    renderImagePreviews();
};

window.handleMultipleFileUpload = function(event) {
    let files = event.target.files;
    if (currentImageAssets.length + files.length > 5) {
        alert('為保持信件載入速度，最多只能上傳 5 張照片喔！');
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
};

window.uploadImagesToServer = async function() {
    let actName = document.getElementById('act-name').value.trim(); let actDate = document.getElementById('act-date').value;
    if (!actName || !actDate) return alert('請先填寫活動名稱與日期');
    let filesToUpload = currentImageAssets.filter(asset => asset.type === 'file');
    if (filesToUpload.length === 0) return alert('沒有偵測到新的照片需要上傳。');
    let btn = document.getElementById('btn-upload-images'); btn.innerText = "照片上傳中，請稍候..."; btn.disabled = true;
    try {
        const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'uploadImages', uid: currentLiffProfile.userId, imagesData: filesToUpload, activityName: actName, dateStr: actDate }) });
        const result = await response.json();
        if (result.success) {
            let urlIdx = 0;
            currentImageAssets.forEach(asset => { if (asset.type === 'file') { asset.type = 'url'; asset.url = result.urls[urlIdx++]; } });
            btn.innerText = "已鎖定上傳 ✅"; btn.style.backgroundColor = "#4CAF50"; renderImagePreviews();
        } else alert('上傳失敗');
    } catch (e) { alert('連線異常'); }
    setTimeout(() => { btn.innerText = "確認上傳並鎖定照片"; btn.style.backgroundColor = ""; btn.disabled = false; }, 2000);
};

window.submitActivity = async function() {
    const actName = document.getElementById('act-name').value.trim();
    if (!actName) return alert('活動名稱為必填項目！');
    if (currentImageAssets.some(a => a.type === 'file')) return alert('您有圖片尚未點擊「確認上傳」，請先上傳鎖定後再發布！');
    const btn = document.getElementById('submit-act-btn'); btn.innerText = "資料處理中..."; btn.disabled = true;
    
    let targetAudienceStr = document.getElementById('act-target').value;
    
    const actData = {
        name: actName, type: document.getElementById('act-type').value, targetAudience: targetAudienceStr,
        date: document.getElementById('act-date').value, deadline: document.getElementById('act-deadline').value, 
        location: document.getElementById('act-location').value.trim(), fee: document.getElementById('act-fee').value.trim(), 
        capacity: document.getElementById('act-capacity').value.trim(), description: document.getElementById('act-desc').value.trim(), 
        mediaUrls: currentImageAssets.map(a => a.url)
    };
    let reqBody = { action: editingActivityId ? 'updateActivity' : 'createActivity', uid: currentLiffProfile.userId, activityData: actData };
    if (editingActivityId) reqBody.actId = editingActivityId;
    try {
        const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify(reqBody) });
        const result = await response.json();
        if (result.success) { alert(editingActivityId ? '活動更新成功！' : '活動發布成功！'); cancelEditActivity(); fetchAndRenderAdminData(); } 
        else alert('操作失敗：' + result.message);
    } catch (error) { alert('系統連線異常'); }
    btn.disabled = false;
};

// 🌟 強制防呆轉型載入編輯功能，確保不再受錯位資料影響
window.loadActivityForEdit = function(actId) {
    try {
        let act = adminActivitiesData.find(a => a.id === actId);
        if (!act) {
            alert('找不到該筆活動資料');
            return;
        }
        editingActivityId = actId;
        
        let titleEl = document.getElementById('act-form-title');
        if(titleEl) titleEl.innerText = "✏️ 編輯現有活動"; 
        
        let btnEl = document.getElementById('submit-act-btn');
        if(btnEl) btnEl.innerText = "💾 儲存更新"; 
        
        let cancelBtn = document.getElementById('btn-cancel-edit');
        if(cancelBtn) cancelBtn.style.display = "block";
        
        const safeSet = (id, val) => {
            let el = document.getElementById(id);
            if (el) el.value = (val === null || val === undefined) ? '' : String(val);
        };

        safeSet('act-name', act.name); 
        safeSet('act-type', act.type || '實體課程'); 
        
        let audienceText = String(act.targetAudience || '所有會員');
        if (audienceText.includes('T') || audienceText.match(/\d{4}-\d{2}-\d{2}/)) { audienceText = '所有會員'; }
        safeSet('act-target', audienceText);
        
        safeSet('act-date', formatDateTime(act.date).replace(' ', 'T')); 
        safeSet('act-deadline', formatDateTime(act.deadline).replace(' ', 'T'));
        safeSet('act-location', act.location); 
        safeSet('act-fee', act.fee);
        safeSet('act-capacity', act.capacity); 
        safeSet('act-desc', act.desc);
        
        // 🌟 防呆：強制轉型 String，避免讀到錯位的數字資料時 split() 崩潰
        currentImageAssets = act.media ? String(act.media).split(',').filter(u => u.trim()).map(u => ({ type: 'url', url: u.trim() })) : [];
        
        renderImagePreviews(); 
        
        let container = document.getElementById('act-form-container');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    } catch(e) {
        console.error("編輯活動載入失敗:", e);
        alert("載入失敗，請確認資料格式是否正確！");
    }
};

window.cancelEditActivity = function() {
    editingActivityId = null;
    document.getElementById('act-form-title').innerText = "📢 新增活動發布"; document.getElementById('submit-act-btn').innerText = "發布活動"; document.getElementById('btn-cancel-edit').style.display = "none";
    ['act-name','act-date','act-deadline','act-location','act-fee','act-capacity','act-desc'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('act-target').value = '所有會員';
    currentImageAssets = []; renderImagePreviews();
};

window.deleteAdminActivity = async function(actId, actName) {
    if (!confirm(`⚠️ 確定要刪除活動「${actName}」嗎？此動作無法復原！`)) return;
    try {
        const response = await fetch(GAS_API_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteActivity', uid: currentLiffProfile.userId, actId: actId }) });
        const result = await response.json();
        if (result.success) { alert('活動已刪除！'); fetchAndRenderAdminData(); } else alert('刪除失敗');
    } catch (error) { alert('系統連線異常'); }
};
