/**
 * 檔案：app.js
 * 說明：前端核心邏輯 (串接真實管理員資料與核准功能)
 */

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwQKWOkyVSo7BNai0zUHgYNb9yqb9t7eu_6-qXEh9-S3bmijA0atMoeGs0M030IgMDloA/exec';
const LIFF_ID = '2012102588-g88gt5pQ'; 
let currentLiffProfile = null; 

document.addEventListener('DOMContentLoaded', () => { initializeApp(); });

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
        if (result.success && result.data.isRegistered) {
            renderMemberDashboard(result.data);
        } else {
            document.getElementById('app-content').innerHTML = renderRegistrationForm();
        }
    } catch (error) {
        document.getElementById('app-content').innerHTML = `<p style="color:red; text-align:center;">伺服器連線發生錯誤。</p>`;
    }
}

function renderRegistrationForm() {
    return `
        <div style="background-color: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(27, 39, 68, 0.05);">
            <h3 style="color: var(--accent-gold); margin-bottom: 0.5rem; text-align: center;">準會員申請表</h3>
            <form id="reg-form">
                <div style="margin-bottom: 1rem;"><input type="text" id="input-name" placeholder="真實姓名" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink);" required></div>
                <div style="margin-bottom: 1rem;"><input type="tel" id="input-phone" placeholder="手機號碼" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink);" required></div>
                <div style="margin-bottom: 1rem;"><input type="email" id="input-email" placeholder="Email" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink);" required></div>
                <div style="margin-bottom: 1rem;"><input type="text" id="input-industry" placeholder="產業" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink);" required></div>
                <div style="margin-bottom: 1rem;"><input type="text" id="input-company" placeholder="公司名稱" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink);" required></div>
                <div style="margin-bottom: 1rem;"><input type="text" id="input-jobtitle" placeholder="職稱" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink);" required></div>
                <div style="margin-bottom: 1.5rem;"><input type="text" id="input-referrer" placeholder="介紹人" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink);" required></div>
                <button type="button" id="submit-btn" class="btn-primary" style="width: 100%; padding: 12px; border-radius: 8px;" onclick="submitRegistration()">提交申請</button>
            </form>
        </div>
    `;
}

async function submitRegistration() {
    if (!currentLiffProfile) return;
    const btn = document.getElementById('submit-btn');
    btn.innerText = "資料送出中..."; btn.disabled = true;

    const userData = {
        uid: currentLiffProfile.userId,
        lineName: currentLiffProfile.displayName,
        realName: document.getElementById('input-name').value.trim(),
        phone: document.getElementById('input-phone').value.trim(),
        email: document.getElementById('input-email').value.trim(),
        industry: document.getElementById('input-industry').value.trim(),
        company: document.getElementById('input-company').value.trim(),
        jobTitle: document.getElementById('input-jobtitle').value.trim(),
        referrer: document.getElementById('input-referrer').value.trim()
    };

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'registerUser', userData: userData }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) {
            renderMemberDashboard({ isAdmin: false, status: '準會員', profile: { '真實姓名': userData.realName } });
        } else {
            alert("註冊失敗：" + result.message);
            btn.innerText = "提交申請"; btn.disabled = false;
        }
    } catch (error) {
        alert("系統連線錯誤"); btn.innerText = "提交申請"; btn.disabled = false;
    }
}

function renderMemberDashboard(userData) {
    const topNav = document.getElementById('top-nav');
    if (userData.isAdmin) {
        topNav.classList.remove('hidden');
        document.getElementById('btn-admin-area').onclick = () => showAdminLoginModal();
    } else {
        topNav.classList.add('hidden');
    }

    let html = `
        <div style="background: #fff; padding: 2rem 1.5rem; border-radius: 12px; text-align: center; margin-bottom: 1.5rem;">
            <h2 style="color: var(--text-inkblue); margin-bottom: 0.5rem;">您好，${userData.profile['真實姓名']}</h2>
            <div style="display: inline-block; padding: 4px 12px; border-radius: 20px; background: var(--accent-gold); color: #fff;">等級：${userData.status}</div>
        </div>
    `;

    if (userData.status === '正式會員' || userData.isAdmin) {
        html += `<div style="background: #fff; padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--accent-gold);"><h4 style="color: var(--text-inkblue);">📅 活動及報名專區</h4></div>`;
    } else {
        html += `<div style="text-align:center;">目前為準會員，功能鎖定中。</div>`;
    }
    document.getElementById('app-content').innerHTML = html;
}

function showAdminLoginModal() {
    if (document.getElementById('admin-modal')) return;
    const modalHtml = `
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
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeAdminModal() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.remove();
}

async function verifyAdminPassword() {
    const pwd = document.getElementById('admin-pwd').value;
    const btn = document.getElementById('login-admin-btn');
    btn.innerText = "驗證中...";
    
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'adminLogin', uid: currentLiffProfile.userId, password: pwd }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();

        if (result.success) {
            closeAdminModal();
            fetchAndRenderAdminData(); // 🌟 驗證成功後，開始抓取真實資料
        } else {
            alert('密碼錯誤或無權限！');
            btn.innerText = "確認進入";
        }
    } catch (error) {
        alert('系統連線異常');
        btn.innerText = "確認進入";
    }
}

// 🌟 抓取並渲染真實管理員資料
async function fetchAndRenderAdminData() {
    const contentArea = document.getElementById('app-content');
    contentArea.innerHTML = `<div class="loading-text">資料讀取中，請稍候...</div>`;

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getAdminData' }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();

        if (result.success) {
            buildAdminDashboardUI(result.data);
        } else {
            contentArea.innerHTML = `<p style="color:red; text-align:center;">讀取資料失敗。</p>`;
        }
    } catch (error) {
        contentArea.innerHTML = `<p style="color:red; text-align:center;">網路連線異常。</p>`;
    }
}

function buildAdminDashboardUI(data) {
    let nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    let defaultDate = nextYear.toISOString().split('T')[0];

    let html = `<h2 style="text-align: center; color: var(--accent-gold); margin-bottom: 1.5rem;">⚙️ 系統管理員專區</h2>`;

    // 區塊一：到期提醒
    html += `<h4 style="color: #d9534f; margin-bottom: 10px;">⚠️ 即將到期會員提醒 (${data.expiring.length} 筆)</h4>`;
    if (data.expiring.length === 0) {
        html += `<p style="font-size:0.9rem; color:#666; margin-bottom:1rem;">目前無即將到期的會員。</p>`;
    } else {
        data.expiring.forEach(m => {
            html += `
                <div class="data-card data-card-danger">
                    <p><strong>${m.name}</strong> (${m.phone}) - 到期日: ${m.expiryDate}</p>
                </div>
            `;
        });
    }

    // 區塊二：準會員審核
    html += `<h4 style="color: var(--text-inkblue); margin: 20px 0 10px;">⏳ 準會員審核區 (${data.pending.length} 筆)</h4>`;
    if (data.pending.length === 0) {
        html += `<p style="font-size:0.9rem; color:#666; margin-bottom:1rem;">目前無待審核的準會員。</p>`;
    } else {
        data.pending.forEach(m => {
            html += `
                <div class="data-card" id="pending-card-${m.uid}">
                    <p><strong>${m.name}</strong> (${m.phone}) - 產業: ${m.industry}</p>
                    <p style="font-size: 0.85rem; color: #666; margin-bottom: 10px;">介紹人: ${m.referrer}</p>
                    <label style="font-size: 0.9rem; font-weight: bold;">設定授權到期日：</label>
                    <input type="date" id="date-${m.uid}" class="admin-search-bar" value="${defaultDate}" style="margin-bottom: 10px;">
                    <button class="btn-secondary" style="width: 100%;" onclick="approveMemberBtn('${m.uid}')">確認核准並開通</button>
                </div>
            `;
        });
    }

    // 區塊三：正式會員名單
    html += `
        <h4 style="color: var(--text-inkblue); margin: 20px 0 10px;">👥 正式會員名單 (${data.active.length} 筆)</h4>
        <input type="text" id="member-search" class="admin-search-bar" placeholder="🔍 搜尋姓名或手機號碼..." onkeyup="filterMembers()">
        <div id="member-list-container">
    `;
    data.active.forEach(m => {
        html += `
            <div class="data-card member-item">
                <p><strong>${m.name}</strong> (${m.phone}) - 到期日: ${m.expiryDate}</p>
            </div>
        `;
    });
    html += `</div>`;

    document.getElementById('app-content').innerHTML = html;
}

// 簡易的前端搜尋過濾功能
function filterMembers() {
    const input = document.getElementById('member-search').value.toLowerCase();
    const items = document.querySelectorAll('.member-item');
    items.forEach(item => {
        item.style.display = item.innerText.toLowerCase().includes(input) ? "block" : "none";
    });
}

// 🌟 觸發核准 API
async function approveMemberBtn(targetUid) {
    const dateInput = document.getElementById(`date-${targetUid}`).value;
    if (!dateInput) return alert('請選擇到期日');
    
    if (!confirm('確認將此人升級為正式會員嗎？')) return;

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'approveMember', targetUid: targetUid, expiryDate: dateInput }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();
        if (result.success) {
            alert('已成功核准！');
            document.getElementById(`pending-card-${targetUid}`).remove(); // 成功後從畫面上移除該卡片
        } else {
            alert('核准失敗，請稍後再試。');
        }
    } catch (error) {
        alert('連線異常');
    }
}
