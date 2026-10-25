/**
 * 檔案：JS/app.js
 * 說明：前端核心邏輯 (完整展開版，確保架構清晰與高維護性)
 */

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwQKWOkyVSo7BNai0zUHgYNb9yqb9t7eu_6-qXEh9-S3bmijA0atMoeGs0M030IgMDloA/exec';
const LIFF_ID = '2012102588-g88gt5pQ'; 
let currentLiffProfile = null; 
const APPROVED_ROLES = ['一般會員', '她薈會員', '創始會員'];

// 全域狀態變數
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
    if (!rawUrl) return '';
    let url = rawUrl.trim();
    if (url.includes('drive.google.com')) {
        let match = url.match(/id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
        if (match && match[1]) {
            return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
        }
    }
    return url;
}

function formatDateTime(dateString) {
    if (!dateString) return '';
    try {
        let d = new Date(dateString);
        if (isNaN(d.getTime())) {
            return dateString.replace('T', ' ').substring(0, 16);
        }
        let year = d.getFullYear();
        let month = String(d.getMonth() + 1).padStart(2, '0');
        let day = String(d.getDate()).padStart(2, '0');
        let hours = String(d.getHours()).padStart(2, '0');
        let mins = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${mins}`;
    } catch (e) {
        return dateString.replace('T', ' ').substring(0, 16);
    }
}

window.viewFullscreenImage = function(url) {
    let overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.9); z-index:99999; display:flex; justify-content:center; align-items:center; cursor:zoom-out;";
    overlay.onclick = () => overlay.remove();
    
    let img = document.createElement('img');
    img.src = url;
    img.style.cssText = "max-width:95%; max-height:95%; object-fit:contain; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.5);";
    
    overlay.appendChild(img);
    document.body.appendChild(overlay);
};

async function applyMinimumDelay() {
    if (!isFirstLoad) return;
    const elapsed = Date.now() - appStartTime;
    const remaining = 5000 - elapsed;
    if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
    }
    isFirstLoad = false;
}

// ==========================================
// 🌟 系統初始化與登入邏輯
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
            liff.login();
            return;
        }
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
            method: 'POST',
            body: JSON.stringify({ action: 'checkUser', uid: uid }),
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

// ==========================================
// 🌟 會員前台與註冊邏輯
// ==========================================

function renderRegistrationForm() {
    const labelStyle = "font-size: 0.85rem; font-weight: bold; color: var(--text-inkblue); display: block; margin-bottom: 5px; text-align: left;";
    const inputStyle = "width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink); font-size: 1rem; margin-bottom: 1rem;";
    
    return `
        <div style="background-color: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(27, 39, 68, 0.05);">
            <h3 style="color: var(--accent-gold); margin-bottom: 0.5rem; text-align: center;">準會員申請表</h3>
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
    if (!currentLiffProfile) {
        alert("無法取得 LINE 授權資料，請重新載入頁面。");
        return;
    }
    
    const actData = {
        realName: document.getElementById('input-name').value.trim(),
        phone: document.getElementById('input-phone').value.trim(),
        email: document.getElementById('input-email').value.trim(),
        industry: document.getElementById('input-industry').value.trim(),
        company: document.getElementById('input-company').value.trim(),
        jobTitle: document.getElementById('input-jobtitle').value.trim(),
        referrer: document.getElementById('input-referrer').value.trim()
    };
    
    if (!actData.realName || !actData.phone || !actData.email || !actData.industry || !actData.company || !actData.jobTitle || !actData.referrer) {
        alert("請確認所有欄位皆已填寫完畢！");
        return;
    }
    
    const btn = document.getElementById('submit-btn');
    btn.innerText = "資料送出中..."; 
    btn.disabled = true;
    
    const userData = { ...actData, uid: currentLiffProfile.userId, lineName: currentLiffProfile.displayName };

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'registerUser', userData: userData }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        
        if (result.success) {
            let newData = { 
                isAdmin: result.data.isAdmin, 
                status: '準會員', 
                profile: { ...actData, '手機號碼': "'" + actData.phone, '授權到期日': '無', '會員編號': '核發中' } 
            };
            globalUserData = newData;
            renderMemberDashboard(newData);
        } else { 
            alert("註冊失敗：" + result.message); 
            btn.innerText = "提交申請"; 
            btn.disabled = false; 
        }
    } catch (error) { 
        alert("系統連線錯誤"); 
        btn.innerText = "提交申請"; 
        btn.disabled = false; 
    }
}

function renderMemberDashboard(userData) {
    const topNav = document.getElementById('top-nav');
    
    if (userData.isAdmin) {
        topNav.classList.remove('hidden');
        document.getElementById('btn-admin-area').onclick = () => { 
            if (isAdminVerified) fetchAndRenderAdminData(); 
            else showAdminLoginModal(); 
        };
        document.getElementById('btn-member-area').onclick = () => { 
            if (globalUserData) renderMemberDashboard(globalUserData); 
        };
    } else { 
        topNav.classList.add('hidden'); 
    }

    let expiryWarningHtml = '';
    let formattedExpDate = '無';
    let isApprovedMember = APPROVED_ROLES.includes(userData.status);
    
    if (isApprovedMember && userData.profile['授權到期日'] && userData.profile['授權到期日'] !== '無') {
        let expDate = new Date(userData.profile['授權到期日']);
        formattedExpDate = expDate.toISOString().split('T')[0];
        let twoMonthsLater = new Date(); 
        twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);
        
        if (expDate <= twoMonthsLater) {
            expiryWarningHtml = `
                <div style="background-color: #fdf2f2; border-left: 4px solid #d9534f; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <p style="color: #d9534f; font-weight: bold; font-size: 0.95rem; margin: 0;">⚠️ 您的${userData.status}資格即將於 ${formattedExpDate} 到期。</p>
                </div>
            `;
        }
    }

    let profileHtml = '';
    if (typeof window.CardManager !== 'undefined') {
        profileHtml += window.CardManager.getDashboardCardHtml(
            userData.status, 
            userData.profile['真實姓名'] || '-', 
            userData.profile['會員編號'] || '核發中'
        );
    }

    profileHtml += `
        <div style="background: #fff; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 15px rgba(27, 39, 68, 0.05); text-align: left; margin-bottom: 2rem; border-top: 4px solid var(--accent-gold);">
            <h4 style="color: var(--text-inkblue); margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 8px;">👤 會員基本資料</h4>
            <p style="border-bottom: 1px dashed #eee; padding-bottom: 8px; font-size: 0.9rem;"><strong>會員身分：</strong> <span style="float: right; color: var(--accent-gold); font-weight: bold;">${userData.status}</span></p>
            <p style="border-bottom: 1px dashed #eee; padding-bottom: 8px; font-size: 0.9rem;"><strong>姓名：</strong> <span style="float: right;">${userData.profile['真實姓名'] || '-'}</span></p>
            <div style="background: rgba(191,154,90,0.05); padding: 10px; border-radius: 8px; text-align: center; margin-top: 15px;">
                <span style="font-size: 0.85rem; color: #666;">授權到期日</span><br><span style="font-weight:bold; font-size: 1.1rem; color: var(--accent-gold);">${formattedExpDate}</span>
            </div>
        </div>
    `;

    let html = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <h2 style="color: var(--text-inkblue); margin-bottom: 0.5rem;">您好，${userData.profile['真實姓名'] || '-'}</h2>
        </div>
        ${expiryWarningHtml}
        ${profileHtml}
    `;

    if (isApprovedMember || userData.isAdmin) {
        html += `
            <div id="member-loading" class="loading-text">正在載入最新活動...</div>
            <div id="activity-section" style="display:none; text-align: left;"></div>
            <div id="history-section" style="display:none; margin-top: 2rem; text-align: left;"></div>
        `;
        document.getElementById('app-content').innerHTML = html;
        fetchMemberActivitiesAndHistory(currentLiffProfile.userId);
    } else {
        html += `
            <div style="background-color: #fff; padding: 2rem; border-radius: 12px; text-align: center; border: 1px dashed var(--accent-gold);">
                <h4 style="color: var(--text-inkblue); margin-bottom: 1rem;">功能鎖定中</h4>
                <p style="font-size: 0.95rem; color: #666; line-height: 1.6;">狀態為「準會員」。<br>請等待審核解鎖功能。</p>
            </div>
        `;
        document.getElementById('app-content').innerHTML = html;
    }
}

async function fetchMemberActivitiesAndHistory(uid) {
    try {
        const [actRes, histRes] = await Promise.all([
            fetch(GAS_API_URL, { 
                method: 'POST', 
                body: JSON.stringify({ action: 'getActivities' }) 
            }),
            fetch(GAS_API_URL, { 
                method: 'POST', 
                body: JSON.stringify({ action: 'getUserHistory', uid: uid }) 
            })
        ]);
        
        globalActivities = (await actRes.json()).data || [];
        let historyData = (await histRes.json()).data || [];
        document.getElementById('member-loading').style.display = 'none';

        let actHtml = `<h4 style="color: var(--text-inkblue); margin-bottom: 15px;">📅 最新活動與報名</h4>`;
        
        if (globalActivities.length === 0) {
            actHtml += `<p style="font-size:0.9rem; color:#666;">近期尚無活動發布。</p>`;
        } else {
            globalActivities.forEach(act => {
                let imgUrls = act.media ? act.media.split(',') : [];
                let mainImg = '';
                if (imgUrls.length > 0 && imgUrls[0].trim() !== '') {
                    mainImg = `<img src="${getDriveImageUrl(imgUrls[0])}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">`;
                }
                
                let isRegistered = historyData.some(h => h.id === act.id);
                
                actHtml += `
                    <div class="data-card" style="border-left-color: var(--accent-gold); cursor: pointer;" onclick="openActivityDetailModal('${act.id}', ${isRegistered})">
                        ${mainImg}
                        <h4 style="color: var(--text-inkblue); margin-bottom: 5px;">${act.name}</h4>
                        <p style="font-size: 0.85rem; color: #666;">📍 ${act.location} | 🕒 ${formatDateTime(act.date)}</p>
                        <button class="btn-primary" style="width: 100%; margin-top: 10px; ${isRegistered ? 'background-color: var(--accent-gold);' : ''}">
                            ${isRegistered ? '查看詳情 / 異動申請' : '查看詳情與報名'}
                        </button>
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
                        <p style="font-size: 0.85rem; color: #666;">時間：${formatDateTime(h.date)} | 繳費方式：${h.fee}</p>
                    </div>
                `;
            });
        }
        
        document.getElementById('history-section').innerHTML = histHtml; 
        document.getElementById('history-section').style.display = 'block';
    } catch (error) { 
        alert('載入資料失敗，請稍後重試。'); 
    }
}

window.openActivityDetailModal = function(actId, isRegistered) {
    let act = globalActivities.find(a => a.id === actId);
    if (!act) return;
    
    let imgUrls = act.media ? act.media.split(',') : [];
    let mainImg = '';
    
    if (imgUrls.length > 0 && imgUrls[0].trim() !== '') {
        mainImg = `<img src="${getDriveImageUrl(imgUrls[0])}" onclick="viewFullscreenImage('${getDriveImageUrl(imgUrls[0])}')" title="點擊放大" style="width:100%; border-radius:12px; margin-bottom:10px; cursor:zoom-in;">`;
    }
    
    let subImgsHtml = '';
    if (imgUrls.length > 1) {
        subImgsHtml = `<div style="display:flex; gap:10px; overflow-x:auto; margin-bottom:15px; padding-bottom:10px;">`;
        for (let i = 1; i < imgUrls.length; i++) {
            if (imgUrls[i].trim() !== '') {
                subImgsHtml += `<img src="${getDriveImageUrl(imgUrls[i])}" onclick="viewFullscreenImage('${getDriveImageUrl(imgUrls[i])}')" title="點擊放大" style="width:80px; height:80px; object-fit:cover; border-radius:8px; flex-shrink:0; cursor:zoom-in; border: 1px solid #eee;">`;
            }
        }
        subImgsHtml += `</div>`;
    }

    const inputStyle = "width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ddd; font-size: 1rem; margin-bottom: 15px; box-sizing:border-box;";
    let formHtml = '';

    if (isRegistered) {
        formHtml = `
            <div style="background: rgba(191,154,90,0.1); padding: 15px; border-radius: 12px; margin-top: 20px; text-align:left;">
                <h4 style="color: var(--text-inkblue); margin-top:0; border-bottom:1px solid #ddd; padding-bottom:8px;">📝 提出人數異動申請</h4>
                <label style="font-size:0.85rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:5px;">欲修改之新參加人數：</label>
                <input type="number" id="mod-pax" style="${inputStyle}" value="1" min="0">
                <button class="btn-primary" style="width: 100%; background-color: #d9534f;" onclick="submitModRequest('${act.id}')">送出異動申請</button>
            </div>
        `;
    } else {
        formHtml = `
            <div style="background: #fdfdfd; padding: 15px; border-radius: 12px; border: 1px solid #eee; margin-top: 20px; text-align:left;">
                <h4 style="color: var(--text-inkblue); margin-top:0; border-bottom:1px solid #ddd; padding-bottom:8px;">報名表單</h4>
                <label style="font-size:0.85rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:5px;">參加人數 (含本人)：</label>
                <input type="number" id="reg-pax" style="${inputStyle}" value="1" min="1">
                <label style="font-size:0.85rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:5px;">繳費方式：</label>
                <input type="text" id="reg-payment" style="${inputStyle}" placeholder="請輸入繳費方式">
                <button class="btn-primary" style="width: 100%;" onclick="submitActivityRegistration('${act.id}')">確認送出報名</button>
            </div>
        `;
    }

    document.body.insertAdjacentHTML('beforeend', `
        <div id="act-detail-modal" class="modal-overlay" style="align-items: flex-end;" onclick="if(event.target===this) this.remove()">
            <div class="modal-content" style="width:100%; max-width:100%; border-radius: 24px 24px 0 0; padding:2rem 1.5rem; max-height:85vh; overflow-y:auto; position:relative; text-align:left;">
                <button onclick="document.getElementById('act-detail-modal').remove()" style="position:absolute; top:15px; right:20px; background:none; border:none; font-size:1.8rem; color:#999; cursor:pointer;">&times;</button>
                ${mainImg}
                ${subImgsHtml}
                <h3 style="color:var(--text-inkblue); margin: 10px 0 5px;">${act.name}</h3>
                <p style="font-size:0.9rem; color:#666; margin-bottom:5px;">📍 ${act.location} | 🕒 ${formatDateTime(act.date)}</p>
                <p style="font-size:0.9rem; color:#666; margin-bottom:15px;">💵 費用: <span style="color:var(--accent-gold); font-weight:bold;">${act.fee}</span> | 截止: ${formatDateTime(act.deadline)}</p>
                <div style="font-size:0.95rem; line-height:1.6; color:#444; border-top:1px dashed #ddd; padding-top:15px;">
                    ${act.desc.replace(/\n/g, '<br>')}
                </div>
                ${formHtml}
            </div>
        </div>
    `);
};

async function submitActivityRegistration(activityId) {
    const pax = document.getElementById('reg-pax').value; 
    const payment = document.getElementById('reg-payment').value.trim();
    
    if (!pax || pax < 1 || !payment) {
        return alert('資料填寫不完整');
    }
    if (!confirm(`確認送出報名？\n人數：${pax}\n繳費方式：${payment}`)) {
        return;
    }
    
    try {
        const response = await fetch(GAS_API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'registerActivityAdvanced', 
                uid: currentLiffProfile.userId, 
                activityId: activityId, 
                participants: pax, 
                payment: payment 
            }) 
        });
        const result = await response.json();
        
        if (result.success) { 
            alert('報名成功！'); 
            document.getElementById('act-detail-modal').remove(); 
            fetchMemberActivitiesAndHistory(currentLiffProfile.userId); 
        } else {
            alert('報名失敗');
        }
    } catch (error) { 
        alert('系統連線異常'); 
    }
}

async function submitModRequest(activityId) {
    const newPax = document.getElementById('mod-pax').value;
    if (newPax === '') {
        return alert('請輸入人數');
    }
    if (!confirm('確認提出異動申請？')) {
        return;
    }
    
    try {
        const response = await fetch(GAS_API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'submitModRequest', 
                uid: currentLiffProfile.userId, 
                activityId: activityId, 
                newPax: newPax 
            }) 
        });
        const result = await response.json();
        
        if (result.success) {
            alert('申請已送出，請靜候管理員處理。'); 
            document.getElementById('act-detail-modal').remove(); 
        } else {
            alert('申請失敗');
        }
    } catch (error) { 
        alert('系統連線異常'); 
    }
}

// ==========================================
// 🌟 管理員後台邏輯與介面
// ==========================================

function showAdminLoginModal() {
    if (document.getElementById('admin-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `
        <div id="admin-modal" class="modal-overlay">
            <div class="modal-content">
                <h3 style="color: var(--text-inkblue); margin-bottom: 10px;">管理員權限驗證</h3>
                <input type="password" id="admin-pwd" class="modal-input" placeholder="••••••••">
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn-secondary" style="background-color: #999;" onclick="document.getElementById('admin-modal').remove()">取消</button>
                    <button class="btn-primary" id="login-admin-btn" onclick="verifyAdminPassword()">確認進入</button>
                </div>
            </div>
        </div>
    `);
}

async function verifyAdminPassword() {
    const btn = document.getElementById('login-admin-btn'); 
    btn.innerText = "驗證中...";
    
    try {
        const response = await fetch(GAS_API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'adminLogin', 
                uid: currentLiffProfile.userId, 
                password: document.getElementById('admin-pwd').value 
            }) 
        });
        const result = await response.json();
        
        if (result.success) { 
            isAdminVerified = true; 
            document.getElementById('admin-modal').remove(); 
            fetchAndRenderAdminData(); 
        } else { 
            alert('登入失敗：\n' + (result.message || '密碼或權限錯誤')); 
            btn.innerText = "確認進入"; 
        }
    } catch (error) { 
        alert('系統連線異常'); 
        btn.innerText = "確認進入"; 
    }
}

async function fetchAndRenderAdminData() {
    const contentArea = document.getElementById('app-content'); 
    contentArea.innerHTML = `<div class="loading-text">資料讀取中...</div>`;
    
    try {
        const response = await fetch(GAS_API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'getAdminData' }) 
        });
        const result = await response.json();
        
        if (result.success) { 
            adminActivitiesData = result.data.activities || []; 
            buildAdminDashboardUI(result.data); 
        } else {
            contentArea.innerHTML = `<p style="color:red; text-align:center;">讀取失敗：<br>${result.message || '未知錯誤'}</p>`;
        }
    } catch (error) { 
        contentArea.innerHTML = `<p style="color:red; text-align:center;">網路連線異常</p>`; 
    }
}

function updatePreviewId(uid) { 
    document.getElementById(`preview-id-${uid}`).innerText = adminNextIds[document.getElementById(`level-${uid}`).value]; 
}

window.switchAdminTab = function(tabName) {
    document.getElementById('admin-member-sec').style.display = (tabName === 'members') ? 'block' : 'none';
    document.getElementById('admin-act-sec').style.display = (tabName === 'activities') ? 'block' : 'none';
    document.getElementById('tab-btn-members').style.opacity = (tabName === 'members') ? '1' : '0.5';
    document.getElementById('tab-btn-activities').style.opacity = (tabName === 'activities') ? '1' : '0.5';
};

function buildAdminDashboardUI(data) {
    let nextYear = new Date(); 
    nextYear.setFullYear(nextYear.getFullYear() + 1); 
    let defaultDate = nextYear.toISOString().split('T')[0];
    
    adminNextIds = data.nextIds; 
    editingActivityId = null; 
    currentImageAssets = []; 

    let html = `
        <h2 style="text-align: center; color: var(--accent-gold); margin-bottom: 1.5rem;">⚙️ 系統管理員專區</h2>
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <button id="tab-btn-members" class="btn-primary" style="flex: 1; border-radius: 20px; transition: 0.3s;" onclick="switchAdminTab('members')">👥 會員管理</button>
            <button id="tab-btn-activities" class="btn-primary" style="flex: 1; border-radius: 20px; opacity: 0.5; background-color: var(--accent-gold); transition: 0.3s;" onclick="switchAdminTab('activities')">📢 活動管理</button>
        </div>
    `;

    // ================== 管理員：會員管理區塊 ==================
    html += `<div id="admin-member-sec">`;
    html += `<h4 style="color: #d9534f; margin-bottom: 10px;">⚠️ 即將到期會員提醒 (${data.expiring.length} 筆)</h4>`;
    
    if (data.expiring.length === 0) {
        html += `<p style="font-size:0.9rem; color:#666; margin-bottom:1rem;">目前無即將到期的會員。</p>`;
    } else {
        data.expiring.forEach(m => {
            html += `<div class="data-card data-card-danger"><p><strong>${m.name}</strong> (${m.phone}) - [${m.status}] 到期日: ${m.expiryDate}</p></div>`;
        });
    }

    html += `<h4 style="color: var(--text-inkblue); margin: 20px 0 10px;">⏳ 準會員審核區 (${data.pending.length} 筆)</h4>`;
    
    if (data.pending.length === 0) {
        html += `<p style="font-size:0.9rem; color:#666; margin-bottom:1rem;">目前無待審核的會員。</p>`;
    } else {
        data.pending.forEach(m => {
            html += `
                <div class="data-card" id="pending-card-${m.uid}" style="text-align: left;">
                    <p style="margin-bottom: 4px; font-size: 1.05rem;"><strong>${m.name}</strong> (${m.phone})</p>
                    <p style="font-size: 0.85rem; color: #666; margin-bottom: 4px;">Email: ${m.email} | 產業: ${m.industry}</p>
                    <label style="font-size: 0.9rem; font-weight: bold; display: block; margin-bottom: 5px;">選擇會員等級：</label>
                    <select id="level-${m.uid}" class="admin-search-bar" style="margin-bottom: 15px;" onchange="updatePreviewId('${m.uid}')">
                        <option value="一般會員">一般會員</option>
                        <option value="她薈會員">她薈會員</option>
                        <option value="創始會員">創始會員</option>
                    </select>
                    <input type="date" id="date-${m.uid}" class="admin-search-bar" value="${defaultDate}" style="margin-bottom: 15px;">
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-secondary" style="background-color: #d9534f; flex: 1; padding: 10px 5px;" onclick="rejectMemberBtn('${m.uid}')">駁回</button>
                        <button class="btn-secondary" style="flex: 2; padding: 10px 5px;" onclick="approveMemberBtn('${m.uid}')">確認核准</button>
                    </div>
                </div>
            `;
        });
    }

    html += `
        <h4 style="color: var(--text-inkblue); margin: 30px 0 10px;">👥 正式會員名單總覽</h4>
        <input type="text" id="member-search" class="admin-search-bar" placeholder="🔍 搜尋姓名、電話..." onkeyup="filterMembers()">
    `;
    
    let founderList = '', annualList = '', generalList = '';
    
    data.active.forEach(m => {
        let cardHtml = `
            <div class="data-card member-item" style="text-align:left;">
                <div style="display:flex; justify-content:space-between;">
                    <p><strong>${m.name}</strong> - ${m.memberId}</p>
                    <span style="font-size:0.8rem; background:#eee; padding:2px 6px; border-radius:4px;">${m.phone}</span>
                </div>
                <p style="font-size:0.85rem; color:#666;">到期日: ${m.expiryDate}</p>
                <div style="display:flex; gap:5px; margin-top:10px;">
                    <input type="date" id="extend-date-${m.uid}" class="admin-search-bar" value="${m.expiryDate}" style="margin:0; flex:2; padding:8px;">
                    <button class="btn-secondary" style="flex:1; padding:8px; font-size:0.85rem;" onclick="extendMemberBtn('${m.uid}')">更新延期</button>
                </div>
                <button class="btn-secondary" style="background-color:#d9534f; width:100%; margin-top:5px; padding:8px; font-size:0.85rem;" onclick="terminateMemberBtn('${m.uid}', '${m.name}')">停止會籍 (停權)</button>
            </div>
        `;
        if (m.status === '創始會員') {
            founderList += cardHtml; 
        } else if (m.status === '她薈會員') {
            annualList += cardHtml; 
        } else {
            generalList += cardHtml;
        }
    });
    
    html += `
        <h5 style="color: var(--accent-gold);">👑 創始會員</h5><div>${founderList}</div>
        <h5 style="color: var(--accent-gold);">🌸 她薈會員</h5><div>${annualList}</div>
        <h5 style="color: var(--accent-gold);">💎 一般會員</h5><div>${generalList}</div>
        </div>
    `;

    // ================== 管理員：活動管理區塊 ==================
    html += `<div id="admin-act-sec" style="display:none;">`;
    
    html += `
        <h4 id="act-form-title" style="color: var(--text-inkblue); margin: 20px 0 10px;">📢 新增活動發布</h4>
        <div class="data-card" style="border-left-color: var(--accent-pink); text-align: left;" id="act-form-container">
            <input type="text" id="act-name" class="admin-search-bar" placeholder="活動名稱" required>
            <select id="act-type" class="admin-search-bar">
                <option value="實體課程">實體課程</option>
                <option value="線上講座">線上講座</option>
                <option value="內部通告">內部通告</option>
                <option value="跨產業聯誼">跨產業聯誼</option>
            </select>
            <input type="datetime-local" id="act-date" class="admin-search-bar">
            <input type="file" id="act-media" class="admin-search-bar" accept="image/*" multiple onchange="handleMultipleFileUpload(event)">
            <div id="upload-preview-area" style="display:flex; gap:12px; overflow-x:auto; margin-bottom:15px; min-height:80px;"></div>
            <button id="btn-upload-images" class="btn-secondary" style="width:100%; margin-bottom:15px;" onclick="uploadImagesToServer()">確認上傳並鎖定照片</button>
            <input type="datetime-local" id="act-deadline" class="admin-search-bar">
            <input type="text" id="act-location" class="admin-search-bar" placeholder="地點">
            <input type="text" id="act-fee" class="admin-search-bar" placeholder="費用">
            <input type="number" id="act-capacity" class="admin-search-bar" placeholder="人數限制">
            <textarea id="act-desc" class="admin-search-bar" placeholder="簡介" rows="3"></textarea>
            <div style="display:flex; gap:10px;">
                <button id="btn-cancel-edit" class="btn-secondary" style="background-color:#999; flex:1; display:none;" onclick="cancelEditActivity()">取消編輯</button>
                <button class="btn-primary" id="submit-act-btn" style="flex:2;" onclick="submitActivity()">發布活動</button>
            </div>
        </div>
    `;

    html += `<h4 style="color: var(--text-inkblue); margin: 30px 0 10px;">📋 現有活動管理 (名單與寄信)</h4>`;
    
    if (adminActivitiesData.length === 0) {
        html += `<p style="font-size:0.9rem; color:#666;">目前尚無活動資料。</p>`;
    } else {
        adminActivitiesData.forEach(act => {
            html += `
                <div class="data-card" style="border-left-color: var(--accent-gold); text-align: left;" id="admin-act-${act.id}">
                    <h5 style="margin: 0 0 5px; color: var(--text-inkblue); font-size:1.1rem;">${act.name}</h5>
                    <p style="font-size: 0.85rem; color: #666; margin-bottom: 12px;">📅 ${formatDateTime(act.date)} | 📍 ${act.location}</p>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <button class="btn-primary" style="background-color: var(--text-inkblue); width:100%; padding:10px;" onclick="openAdminRegistrations('${act.id}', '${act.name}')">👥 查看報名名單與寄信</button>
                        <div style="display:flex; gap:10px;">
                            <button class="btn-secondary" style="flex:1; padding:8px; font-size:0.85rem;" onclick="loadActivityForEdit('${act.id}')">✏️ 編輯活動</button>
                            <button class="btn-primary" style="background-color:#d9534f; flex:1; padding:8px; font-size:0.85rem;" onclick="deleteAdminActivity('${act.id}', '${act.name}')">🗑️ 刪除活動</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    html += `</div>`;
    document.getElementById('app-content').innerHTML = html;
}

// ==========================================
// 🌟 管理員：報名名單與寄信功能
// ==========================================

window.openAdminRegistrations = async function(actId, actName) {
    const btn = event.target; 
    const originalText = btn.innerText; 
    btn.innerText = "載入名單中..."; 
    btn.disabled = true;
    
    try {
        const response = await fetch(GAS_API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'getEventRegistrations', actId: actId }) 
        });
        const result = await response.json();
        
        if (result.success) {
            let regs = result.data; 
            let listHtml = '';
            
            if (regs.length === 0) {
                listHtml = `<p style="text-align:center; color:#999; margin-top:20px;">目前尚無人報名此活動</p>`;
            } else {
                regs.forEach(reg => {
                    let statusColor = reg.status === '已繳費' ? '#4CAF50' : (reg.status === '未繳費' ? '#d9534f' : '#BF9A5A');
                    listHtml += `
                        <div style="background:#fdfdfd; border:1px solid #eee; border-left:4px solid ${statusColor}; padding:12px; border-radius:8px; margin-bottom:10px;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                <strong style="font-size:1.05rem; color:var(--text-inkblue);">${reg.name} <span style="font-size:0.85rem; color:#666; font-weight:normal;">(${reg.pax}人)</span></strong>
                                <span style="font-size:0.8rem; background:#eee; padding:2px 6px; border-radius:4px;">${reg.phone}</span>
                            </div>
                            <p style="font-size:0.85rem; color:#666; margin:0 0 5px;">信箱：${reg.email}</p>
                            <p style="font-size:0.85rem; color:#666; margin:0 0 10px;">繳費方式：${reg.payment}</p>
                            
                            <div style="display:flex; align-items:center; gap:10px;">
                                <label style="font-size:0.8rem; font-weight:bold;">狀態：</label>
                                <select onchange="updateRegStatus(${reg.rowIdx}, this.value, this)" style="padding:6px; border-radius:4px; border:1px solid #ccc; font-size:0.85rem; flex:1;">
                                    <option value="已報名" ${reg.status==='已報名'?'selected':''}>已報名 (預設)</option>
                                    <option value="已繳費" ${reg.status==='已繳費'?'selected':''}>✅ 已繳費確認</option>
                                    <option value="未繳費" ${reg.status==='未繳費'?'selected':''}>❌ 未繳費</option>
                                </select>
                            </div>
                        </div>
                    `;
                });
            }
            
            let modalHtml = `
                <div id="reg-list-modal" class="modal-overlay" style="align-items: flex-end;" onclick="if(event.target===this) this.remove()">
                    <div class="modal-content" style="width:100%; max-width:100%; border-radius: 24px 24px 0 0; padding:1.5rem; max-height:85vh; overflow-y:auto; position:relative; text-align:left; background:#F8F5EF;">
                        <button onclick="document.getElementById('reg-list-modal').remove()" style="position:absolute; top:15px; right:20px; background:none; border:none; font-size:1.8rem; color:#999; cursor:pointer;">&times;</button>
                        <h3 style="color:var(--text-inkblue); margin-top:0; border-bottom:2px solid var(--accent-gold); padding-bottom:10px;">📋 ${actName}</h3>
                        
                        <div style="display:flex; gap:10px; margin: 15px 0; padding-bottom: 15px; border-bottom: 1px dashed #ccc;">
                            <button class="btn-primary" style="flex:1; padding:10px; font-size:0.85rem;" onclick="sendEventEmails('${actId}', 'reminder', this)">📢 發送行前提醒</button>
                            <button class="btn-primary" style="background-color:#d9534f; flex:1; padding:10px; font-size:0.85rem;" onclick="sendEventEmails('${actId}', 'payment', this)">💰 催繳未繳費</button>
                        </div>
                        
                        <h4 style="color:var(--text-inkblue); margin-bottom:10px;">報名名單 (${regs.length}筆)</h4>
                        ${listHtml}
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
        } else {
            alert('無法取得名單：' + result.message);
        }
    } catch (error) { 
        alert('系統連線異常'); 
    }
    
    btn.innerText = originalText; 
    btn.disabled = false;
};

window.updateRegStatus = async function(rowIdx, newStatus, selectElement) {
    selectElement.disabled = true;
    try {
        const response = await fetch(GAS_API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'updateRegStatus', 
                uid: currentLiffProfile.userId, 
                rowIdx: rowIdx, 
                newStatus: newStatus 
            }) 
        });
        const result = await response.json();
        if (result.success) { 
            let card = selectElement.closest('div').parentElement;
            card.style.borderLeftColor = newStatus === '已繳費' ? '#4CAF50' : (newStatus === '未繳費' ? '#d9534f' : '#BF9A5A'); 
        } else {
            alert('更新失敗');
        }
    } catch (error) { 
        alert('連線異常'); 
    }
    selectElement.disabled = false;
};

window.sendEventEmails = async function(actId, emailType, btn) {
    let confirmMsg = emailType === 'reminder' ? '確定要發送「行前提醒信」給所有報名者嗎？' : '確定要發送「繳費提醒信」給所有尚未繳費的報名者嗎？';
    if (!confirm(confirmMsg)) return;
    
    let originalText = btn.innerText; 
    btn.innerText = "信件發送中..."; 
    btn.disabled = true;
    
    try {
        const response = await fetch(GAS_API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'sendEventEmails', 
                uid: currentLiffProfile.userId, 
                actId: actId, 
                emailType: emailType 
            }) 
        });
        const result = await response.json();
        if (result.success) {
            alert(result.message);
        } else {
            alert('寄信失敗：' + result.message);
        }
    } catch (error) { 
        alert('系統連線異常，信件可能未完整送出'); 
    }
    
    btn.innerText = originalText; 
    btn.disabled = false;
};

// ==========================================
// 🌟 管理員：多圖上傳與活動建置邏輯
// ==========================================

function renderImagePreviews() {
    let area = document.getElementById('upload-preview-area');
    if (currentImageAssets.length === 0) { 
        area.innerHTML = ''; 
        return; 
    }
    let html = '';
    currentImageAssets.forEach((asset, idx) => {
        let imgSrc = asset.type === 'url' ? asset.url : asset.previewUrl;
        html += `
            <div style="position:relative; width:75px; flex-shrink:0;">
                <img src="${imgSrc}" style="width:75px; height:75px; object-fit:cover; border-radius:8px;">
                <button onclick="removeImage(${idx})" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border-radius:50%; width:20px; height:20px; border:none; cursor:pointer;">X</button>
            </div>
        `;
    });
    area.innerHTML = html;
}

window.removeImage = function(index) { 
    currentImageAssets.splice(index, 1); 
    renderImagePreviews(); 
};

window.handleMultipleFileUpload = function(event) {
    Array.from(event.target.files).forEach(file => {
        let reader = new FileReader();
        reader.onload = function(e) {
            currentImageAssets.push({ 
                type: 'file', 
                base64: e.target.result.split(',')[1], 
                mimeType: file.type, 
                previewUrl: e.target.result 
            });
            renderImagePreviews();
        };
        reader.readAsDataURL(file);
    });
    event.target.value = ''; 
};

window.uploadImagesToServer = async function() {
    let actName = document.getElementById('act-name').value.trim(); 
    let actDate = document.getElementById('act-date').value;
    
    if (!actName || !actDate) return alert('請先填寫活動名稱與日期');
    
    let filesToUpload = currentImageAssets.filter(asset => asset.type === 'file');
    if (filesToUpload.length === 0) return alert('沒有偵測到新的照片需要上傳。');
    
    let btn = document.getElementById('btn-upload-images'); 
    btn.innerText = "照片上傳中，請稍候..."; 
    btn.disabled = true;
    
    try {
        const response = await fetch(GAS_API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'uploadImages', 
                uid: currentLiffProfile.userId, 
                imagesData: filesToUpload, 
                activityName: actName, 
                dateStr: actDate 
            }) 
        });
        const result = await response.json();
        
        if (result.success) {
            let urlIdx = 0;
            currentImageAssets.forEach(asset => { 
                if (asset.type === 'file') { 
                    asset.type = 'url'; 
                    asset.url = result.urls[urlIdx++]; 
                } 
            });
            btn.innerText = "已鎖定上傳 ✅"; 
            btn.style.backgroundColor = "#4CAF50";
        } else {
            alert('上傳失敗');
        }
    } catch (e) { 
        alert('連線異常'); 
    }
    
    setTimeout(() => { 
        btn.innerText = "確認上傳並鎖定照片"; 
        btn.style.backgroundColor = ""; 
        btn.disabled = false; 
    }, 2000);
};

window.submitActivity = async function() {
    const actName = document.getElementById('act-name').value.trim();
    if (!actName) return alert('活動名稱為必填項目！');
    
    if (currentImageAssets.some(a => a.type === 'file')) {
        return alert('您有圖片尚未點擊「確認上傳」，請先上傳鎖定後再發布！');
    }

    const btn = document.getElementById('submit-act-btn');
    btn.innerText = "資料處理中..."; 
    btn.disabled = true;

    const actData = {
        name: actName, 
        type: document.getElementById('act-type').value, 
        date: document.getElementById('act-date').value,
        deadline: document.getElementById('act-deadline').value, 
        location: document.getElementById('act-location').value.trim(),
        fee: document.getElementById('act-fee').value.trim(), 
        capacity: document.getElementById('act-capacity').value.trim(),
        description: document.getElementById('act-desc').value.trim(), 
        mediaUrls: currentImageAssets.map(a => a.url)
    };
    
    let reqBody = { 
        action: editingActivityId ? 'updateActivity' : 'createActivity', 
        uid: currentLiffProfile.userId, 
        activityData: actData 
    };
    
    if (editingActivityId) reqBody.actId = editingActivityId;
    
    try {
        const response = await fetch(GAS_API_URL, { 
            method: 'POST', 
            body: JSON.stringify(reqBody) 
        });
        const result = await response.json();
        
        if (result.success) { 
            alert(editingActivityId ? '活動更新成功！' : '活動發布成功！');
            cancelEditActivity();
            fetchAndRenderAdminData(); 
        } else {
            alert('操作失敗：' + result.message);
        }
    } catch (error) { 
        alert('系統連線異常'); 
    }
    
    btn.disabled = false;
};

window.loadActivityForEdit = function(actId) {
    let act = adminActivitiesData.find(a => a.id === actId);
    if (!act) return;
    
    editingActivityId = actId;
    document.getElementById('act-form-title').innerText = "✏️ 編輯現有活動";
    document.getElementById('submit-act-btn').innerText = "💾 儲存更新";
    document.getElementById('btn-cancel-edit').style.display = "block";

    document.getElementById('act-name').value = act.name; 
    document.getElementById('act-type').value = act.type;
    document.getElementById('act-date').value = formatDateTime(act.date).replace(' ', 'T');
    document.getElementById('act-deadline').value = formatDateTime(act.deadline).replace(' ', 'T');
    document.getElementById('act-location').value = act.location; 
    document.getElementById('act-fee').value = act.fee;
    document.getElementById('act-capacity').value = act.capacity; 
    document.getElementById('act-desc').value = act.desc;
    
    currentImageAssets = act.media ? act.media.split(',').filter(u => u).map(u => ({ type: 'url', url: u })) : [];
    renderImagePreviews();
    document.getElementById('act-form-container').scrollIntoView({ behavior: 'smooth' });
};

window.cancelEditActivity = function() {
    editingActivityId = null;
    document.getElementById('act-form-title').innerText = "📢 新增活動發布";
    document.getElementById('submit-act-btn').innerText = "發布活動";
    document.getElementById('btn-cancel-edit').style.display = "none";
    ['act-name','act-date','act-deadline','act-location','act-fee','act-capacity','act-desc'].forEach(id => document.getElementById(id).value = '');
    currentImageAssets = []; 
    renderImagePreviews();
};

window.deleteAdminActivity = async function(actId, actName) {
    if (!confirm(`⚠️ 確定要刪除活動「${actName}」嗎？此動作無法復原！`)) return;
    
    try {
        const response = await fetch(GAS_API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'deleteActivity', uid: currentLiffProfile.userId, actId: actId }) 
        });
        const result = await response.json();
        
        if (result.success) { 
            alert('活動已刪除！'); 
            fetchAndRenderAdminData(); 
        } else {
            alert('刪除失敗');
        }
    } catch (error) { 
        alert('系統連線異常'); 
    }
};

// ==========================================
// 🌟 管理員：會員資格審核與操作邏輯
// ==========================================

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
    if (!confirm(`確認升級為「${levelInput}」嗎？`)) return;
    
    try {
        const response = await fetch(GAS_API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'approveMember', 
                uid: currentLiffProfile.userId, 
                targetUid: targetUid, 
                expiryDate: dateInput, 
                memberLevel: levelInput 
            }) 
        });
        if ((await response.json()).success) { 
            alert('核准成功！'); 
            fetchAndRenderAdminData(); 
        }
    } catch (error) { 
        alert('系統連線異常'); 
    }
}

async function rejectMemberBtn(targetUid) {
    if (!confirm('確定要駁回嗎？')) return;
    
    try {
        const response = await fetch(GAS_API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'rejectMember', 
                uid: currentLiffProfile.userId, 
                targetUid: targetUid 
            }) 
        });
        if ((await response.json()).success) { 
            alert('已駁回！'); 
            fetchAndRenderAdminData(); 
        }
    } catch (error) { 
        alert('系統連線異常'); 
    }
}

async function extendMemberBtn(targetUid) {
    const newDate = document.getElementById(`extend-date-${targetUid}`).value;
    if (!newDate) return alert('請選擇到期日');
    
    try {
        const response = await fetch(GAS_API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'extendMemberExpiry', 
                uid: currentLiffProfile.userId, 
                targetUid: targetUid, 
                newDate: newDate 
            }) 
        });
        if ((await response.json()).success) { 
            alert('更新成功！'); 
            fetchAndRenderAdminData(); 
        }
    } catch (error) { 
        alert('系統連線異常'); 
    }
}

async function terminateMemberBtn(targetUid, memberName) {
    if (!confirm(`警告：確定停止「${memberName}」會籍嗎？`)) return;
    
    try {
        const response = await fetch(GAS_API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'terminateMember', 
                uid: currentLiffProfile.userId, 
                targetUid: targetUid 
            }) 
        });
        if ((await response.json()).success) { 
            alert('已停權。'); 
            fetchAndRenderAdminData(); 
        }
    } catch (error) { 
        alert('系統連線異常'); 
    }
}
