/**
 * 檔案：app.js
 * 說明：前端核心邏輯 (加入管理員密碼驗證與審核區塊佈局)
 */

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwQKWOkyVSo7BNai0zUHgYNb9yqb9t7eu_6-qXEh9-S3bmijA0atMoeGs0M030IgMDloA/exec';
const LIFF_ID = '2012102588-g88gt5pQ'; 
let currentLiffProfile = null; 

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
    // ... (保持原有的註冊表單邏輯，這裡省略以節省空間，請貼上你原本的 renderRegistrationForm 與 submitRegistration 函數)
    return `<div style="text-align:center; padding: 2rem;">註冊表單載入中... (請保留原本的註冊代碼)</div>`;
}

/* ====== 以下為本次新增：管理員專區功能 ====== */

// 渲染一般會員中心時，加入按鈕的點擊事件監聽
function renderMemberDashboard(userData) {
    const topNav = document.getElementById('top-nav');
    const contentArea = document.getElementById('app-content');

    if (userData.isAdmin) {
        topNav.classList.remove('hidden');
        // 綁定管理員按鈕事件
        document.getElementById('btn-admin-area').onclick = () => showAdminLoginModal();
    } else {
        topNav.classList.add('hidden');
    }

    let htmlContent = `
        <div style="background-color: #fff; padding: 2rem 1.5rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(27, 39, 68, 0.05); text-align: center; margin-bottom: 1.5rem;">
            <h2 style="color: var(--text-inkblue); margin-bottom: 0.5rem;">您好，${userData.profile['真實姓名']}</h2>
            <div style="display: inline-block; padding: 4px 12px; border-radius: 20px; background-color: var(--accent-gold); color: #fff; font-size: 0.9rem; font-weight: bold;">
                目前的會員等級：${userData.status}
            </div>
        </div>
    `;

    if (userData.status === '正式會員' || userData.isAdmin) {
        htmlContent += `
            <div style="display: grid; gap: 1rem;">
                <div style="background-color: #fff; padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--accent-gold);">
                    <h4 style="color: var(--text-inkblue);">📅 活動及報名專區</h4>
                </div>
            </div>
        `;
    } else {
        htmlContent += `<div style="text-align:center;">目前為準會員，功能鎖定中。</div>`;
    }
    contentArea.innerHTML = htmlContent;
}

// 顯示密碼輸入彈出視窗
function showAdminLoginModal() {
    // 檢查是否已存在，避免重複建立
    if (document.getElementById('admin-modal')) return;

    const modalHtml = `
        <div id="admin-modal" class="modal-overlay">
            <div class="modal-content">
                <h3 style="color: var(--text-inkblue); margin-bottom: 10px;">管理員權限驗證</h3>
                <p style="font-size: 0.9rem; color: #666;">請輸入專屬頁面密碼</p>
                <input type="password" id="admin-pwd" class="modal-input" placeholder="••••••••">
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
                    <button class="btn-secondary" style="background-color: #999;" onclick="closeAdminModal()">取消</button>
                    <button class="btn-primary" onclick="verifyAdminPassword()">確認進入</button>
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

// 驗證密碼並渲染管理員專區
async function verifyAdminPassword() {
    const pwd = document.getElementById('admin-pwd').value;
    
    // 呼叫 GAS API 進行驗證 (假設我們之前已經寫好了 adminLogin)
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'adminLogin', uid: currentLiffProfile.userId, password: pwd }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await response.json();

        if (result.success) {
            closeAdminModal();
            renderAdminDashboard(); // 驗證成功，繪製管理員介面
        } else {
            alert('密碼錯誤或無權限！');
        }
    } catch (error) {
        alert('系統連線異常');
    }
}

// 繪製管理員專區介面
function renderAdminDashboard() {
    const contentArea = document.getElementById('app-content');
    
    // 計算一年後的今天 (預設給準會員授權用)
    let nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    let defaultDate = nextYear.toISOString().split('T')[0]; // 格式：YYYY-MM-DD

    contentArea.innerHTML = `
        <h2 style="text-align: center; color: var(--accent-gold); margin-bottom: 1.5rem;">⚙️ 系統管理員專區</h2>
        
        <!-- 區塊一：到期提醒 -->
        <h4 style="color: #d9534f; margin-bottom: 10px;">⚠️ 即將到期會員提醒</h4>
        <div class="data-card data-card-danger">
            <p><strong>陳大明</strong> (0912345678) - 到期日: 2026-11-15</p>
            <button class="btn-primary" style="padding: 5px 10px; font-size: 0.8rem; margin-top: 5px;">聯絡續約</button>
        </div>

        <!-- 區塊二：準會員審核 -->
        <h4 style="color: var(--text-inkblue); margin: 20px 0 10px;">⏳ 準會員審核區</h4>
        <div class="data-card">
            <p><strong>林小美</strong> - 產業: 美容業</p>
            <p style="font-size: 0.85rem; color: #666; margin-bottom: 10px;">介紹人: 家蓁</p>
            
            <label style="font-size: 0.9rem; font-weight: bold;">設定授權到期日：</label>
            <input type="date" class="admin-search-bar" value="${defaultDate}" style="margin-bottom: 10px;">
            <button class="btn-secondary" style="width: 100%;">確認核准並開通</button>
        </div>

        <!-- 區塊三：正式會員名單與搜尋 -->
        <h4 style="color: var(--text-inkblue); margin: 20px 0 10px;">👥 正式會員名單</h4>
        <input type="text" id="member-search" class="admin-search-bar" placeholder="🔍 搜尋姓名或手機號碼..." onkeyup="filterMembers()">
        
        <div id="member-list-container">
            <div class="data-card member-item">
                <p><strong>王小華</strong> (0987654321) - 到期日: 2027-10-18</p>
            </div>
            <div class="data-card member-item">
                <p><strong>李大仁</strong> (0933222111) - 到期日: 2027-05-20</p>
            </div>
        </div>
    `;
}

// 簡易的前端搜尋過濾功能
function filterMembers() {
    const input = document.getElementById('member-search').value.toLowerCase();
    const items = document.querySelectorAll('.member-item');
    
    items.forEach(item => {
        const text = item.innerText.toLowerCase();
        if (text.includes(input)) {
            item.style.display = "block";
        } else {
            item.style.display = "none";
        }
    });
}
