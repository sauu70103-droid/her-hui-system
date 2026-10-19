/**
 * 檔案：app.js
 * 說明：前端核心邏輯 (加入活動及通告發布功能)
 */

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwQKWOkyVSo7BNai0zUHgYNb9yqb9t7eu_6-qXEh9-S3bmijA0atMoeGs0M030IgMDloA/exec';
const LIFF_ID = '2012102588-g88gt5pQ'; 
let currentLiffProfile = null; 

document.addEventListener('DOMContentLoaded', () => { initializeApp(); });

async function initializeApp() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) { liff.login(); return; }
        currentLiffProfile = await liff.getProfile();
        await checkUserRoleAndStatus(currentLiffProfile.userId);
    } catch (error) {
        document.getElementById('app-content').innerHTML = `<p style="color:red; text-align:center;">系統連線異常，請確認是否在 LINE 內開啟。</p>`;
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
        if (result.success && result.data.isRegistered) renderMemberDashboard(result.data);
        else document.getElementById('app-content').innerHTML = renderRegistrationForm();
    } catch (error) {
        document.getElementById('app-content').innerHTML = `<p style="color:red; text-align:center;">伺服器連線發生錯誤。</p>`;
    }
}

function renderRegistrationForm() {
    return `
        <div style="background: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(27,39,68,0.05);">
            <h3 style="color: var(--accent-gold); margin-bottom: 0.5rem; text-align: center;">準會員申請表</h3>
            <form id="reg-form">
                <div style="margin-bottom:1rem;"><input type="text" id="input-name" placeholder="真實姓名" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--accent-pink);" required></div>
                <div style="margin-bottom:1rem;"><input type="tel" id="input-phone" placeholder="手機號碼" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--accent-pink);" required></div>
                <div style="margin-bottom:1rem;"><input type="email" id="input-email" placeholder="Email" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--accent-pink);" required></div>
                <div style="margin-bottom:1rem;"><input type="text" id="input-industry" placeholder="產業" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--accent-pink);" required></div>
                <div style="margin-bottom:1rem;"><input type="text" id="input-company" placeholder="公司名稱" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--accent-pink);" required></div>
                <div style="margin-bottom:1rem;"><input type="text" id="input-jobtitle" placeholder="職稱" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--accent-pink);" required></div>
                <div style="margin-bottom:1.5rem;"><input type="text" id="input-referrer" placeholder="介紹人" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--accent-pink);" required></div>
                <button type="button" id="submit-btn" class="btn-primary" style="width:100%; padding:12px; border-radius:8px;" onclick="submitRegistration()">提交申請</button>
            </form>
        </div>
    `;
}

async function submitRegistration() {
    if (!currentLiffProfile) return;
    const btn = document.getElementById('submit-btn');
    btn.innerText = "資料送出中..."; btn.disabled = true;

    const userData = {
        uid: currentLiffProfile.userId, lineName: currentLiffProfile.displayName,
        realName: document.getElementById('input-name').value.trim(), phone: document.getElementById('input-phone').value.trim(),
        email: document.getElementById('input-email').value.trim(), industry: document.getElementById('input-industry').value.trim(),
        company: document.getElementById('input-company').value.trim(), jobTitle: document.getElementById('input-jobtitle').value.trim(),
        referrer: document.getElementById('input-referrer').value.trim()
    };

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'registerUser', userData: userData }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) renderMemberDashboard({ isAdmin: false, status: '準會員', profile: { '真實姓名': userData.realName } });
        else { alert("註冊失敗：" + result.message); btn.innerText = "提交申請"; btn.disabled = false; }
    } catch (error) { alert("系統連線錯誤"); btn.innerText = "提交申請"; btn.disabled = false; }
}

function renderMemberDashboard(userData) {
    const topNav = document.getElementById('top-nav');
    if (userData.isAdmin) {
        topNav.classList.remove('hidden');
        document.getElementById('btn-admin-area').onclick = () => showAdminLoginModal();
    } else topNav.classList.add('hidden');

    let html = `
        <div style="background: #fff; padding: 2rem 1.5rem; border-radius: 12px; text-align: center; margin-bottom: 1.5rem;">
            <h2 style="color: var(--text-inkblue); margin-bottom: 0.5rem;">您好，${userData.profile['真實姓名']}</h2>
            <div style="display: inline-block; padding: 4px 12px; border-radius: 20px; background: var(--accent-gold); color: #fff;">等級：${userData.status}</div>
        </div>
    `;

    if (userData.status === '正式會員' || userData.isAdmin) html += `<div style="background: #fff; padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--accent-gold);"><h4 style="color: var(--text-inkblue);">📅 活動及報名專區</h4></div>`;
    else html += `<div style="text-align:center;">目前為準會員，功能鎖定中。</div>`;
    
    document.getElementById('app-content').innerHTML = html;
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
function closeAdminModal() { const m = document.getElementById('admin-modal'); if(m) m.remove(); }

async function verifyAdminPassword() {
    const pwd = document.getElementById('admin-pwd').value, btn = document.getElementById('login-admin-btn');
    btn.innerText = "驗證中...";
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'adminLogin', uid: currentLiffProfile.userId, password: pwd }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) { closeAdminModal(); fetchAndRenderAdminData(); }
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

function buildAdminDashboardUI(data) {
    let nextYear = new Date(); nextYear.setFullYear(nextYear.getFullYear() + 1);
    let defaultDate = nextYear.toISOString().split('T')[0];
    let html = `<h2 style="text-align: center; color: var(--accent-gold); margin-bottom: 1.5rem;">⚙️ 系統管理員專區</h2>`;

    html += `<h4 style="color: #d9534f; margin-bottom: 10px;">⚠️ 即將到期會員提醒 (${data.expiring.length} 筆)</h4>`;
    if (data.expiring.length === 0) html += `<p style="font-size:0.9rem; color:#666; margin-bottom:1rem;">無即將到期會員。</p>`;
    else data.expiring.forEach(m => html += `<div class="data-card data-card-danger"><p><strong>${m.name}</strong> (${m.phone}) - 到期日: ${m.expiryDate}</p></div>`);

    html += `<h4 style="color: var(--text-inkblue); margin: 20px 0 10px;">⏳ 準會員審核區 (${data.pending.length} 筆)</h4>`;
    if (data.pending.length === 0) html += `<p style="font-size:0.9rem; color:#666; margin-bottom:1rem;">無待審核會員。</p>`;
    else data.pending.forEach(m => {
        html += `
            <div class="data-card" id="pending-card-${m.uid}">
                <p><strong>${m.name}</strong> (${m.phone}) - 產業: ${m.industry}</p>
                <input type="date" id="date-${m.uid}" class="admin-search-bar" value="${defaultDate}" style="margin-bottom: 10px;">
                <button class="btn-secondary" style="width: 100%;" onclick="approveMemberBtn('${m.uid}')">確認核准</button>
            </div>
        `;
    });

    // 🌟 新增：活動與通告發布專區
    html += `
        <h4 style="color: var(--text-inkblue); margin: 20px 0 10px;">📢 活動及通告發布設定</h4>
        <div class="data-card" style="border-left-color: var(--accent-pink);">
            <input type="text" id="act-name" class="admin-search-bar" placeholder="活動/通告名稱" required>
            <select id="act-type" class="admin-search-bar">
                <option value="實體課程">實體課程</option><option value="線上講座">線上講座</option>
                <option value="內部通告">內部通告</option><option value="跨產業聯誼">跨產業聯誼</option>
            </select>
            <div style="display:flex; gap:10px;">
                <div style="flex:1;"><label style="font-size:0.8rem;">活動日期</label><input type="date" id="act-date" class="admin-search-bar"></div>
                <div style="flex:1;"><label style="font-size:0.8rem;">報名截止</label><input type="date" id="act-deadline" class="admin-search-bar"></div>
            </div>
            <input type="text" id="act-location" class="admin-search-bar" placeholder="活動地點 (或線上連結)">
            <div style="display:flex; gap:10px;">
                <div style="flex:1;"><input type="text" id="act-fee" class="admin-search-bar" placeholder="費用 (如: 500或免費)"></div>
                <div style="flex:1;"><input type="number" id="act-capacity" class="admin-search-bar" placeholder="人數限制"></div>
            </div>
            <textarea id="act-desc" class="admin-search-bar" placeholder="活動簡介與大綱..." rows="3"></textarea>
            <button class="btn-primary" id="submit-act-btn" style="width: 100%; margin-top: 10px;" onclick="submitActivity()">發布活動</button>
        </div>
    `;

    html += `<h4 style="color: var(--text-inkblue); margin: 20px 0 10px;">👥 正式會員名單 (${data.active.length} 筆)</h4>
             <input type="text" id="member-search" class="admin-search-bar" placeholder="🔍 搜尋..." onkeyup="filterMembers()">
             <div id="member-list-container">`;
    data.active.forEach(m => html += `<div class="data-card member-item"><p><strong>${m.name}</strong> (${m.phone})</p></div>`);
    html += `</div>`;

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
    if (!dateInput) return alert('請選擇到期日');
    if (!confirm('確認升級為正式會員？')) return;
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'approveMember', targetUid: targetUid, expiryDate: dateInput }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) { alert('已成功核准！'); document.getElementById(`pending-card-${targetUid}`).remove(); }
        else alert('核准失敗。');
    } catch (error) { alert('連線異常'); }
}

// 🌟 發送新活動資料至後端
async function submitActivity() {
    const btn = document.getElementById('submit-act-btn');
    const actData = {
        name: document.getElementById('act-name').value.trim(),
        type: document.getElementById('act-type').value,
        date: document.getElementById('act-date').value,
        deadline: document.getElementById('act-deadline').value,
        location: document.getElementById('act-location').value.trim(),
        fee: document.getElementById('act-fee').value.trim(),
        capacity: document.getElementById('act-capacity').value.trim(),
        description: document.getElementById('act-desc').value.trim()
    };

    if (!actData.name) return alert('活動名稱為必填項目！');

    btn.innerText = "發布中..."; btn.disabled = true;

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'createActivity', activityData: actData }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) {
            alert('活動發布成功！');
            // 清空表單
            ['act-name','act-date','act-deadline','act-location','act-fee','act-capacity','act-desc'].forEach(id => document.getElementById(id).value = '');
        } else alert('發布失敗：' + result.message);
    } catch (error) { alert('連線異常'); }
    
    btn.innerText = "發布活動"; btn.disabled = false;
}
