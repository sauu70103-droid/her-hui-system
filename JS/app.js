/**
 * 檔案：app.js
 * 說明：前端核心邏輯，負責 LINE LIFF 初始化、API 請求與畫面渲染
 */

// 系統後端 GAS API 網址
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwQKWOkyVSo7BNai0zUHgYNb9yqb9t7eu_6-qXEh9-S3bmijA0atMoeGs0M030IgMDloA/exec';

// 您申請的 LINE LIFF ID
const LIFF_ID = '2012102588-g88gt5pQ'; 

document.addEventListener('DOMContentLoaded', () => {
    // 網頁載入完成後，開始初始化系統
    initializeApp();
});

/**
 * 系統初始化：串接 LINE LIFF 與後端 API
 */
async function initializeApp() {
    try {
        // 1. 初始化 LINE LIFF SDK
        await liff.init({ liffId: LIFF_ID });
        
        // 2. 檢查使用者是否透過 LINE 登入
        if (!liff.isLoggedIn()) {
            // 若未登入，引導至 LINE 登入畫面
            liff.login();
            return;
        }
        
        // 3. 取得使用者真實資訊 (包含 UID 與 LINE 顯示名稱)
        const profile = await liff.getProfile();
        console.log("LINE Profile 取得成功:", profile);

        // 4. 呼叫 GAS API 檢查使用者在系統中的註冊狀態與權限
        await checkUserRoleAndStatus(profile.userId);

    } catch (error) {
        console.error('初始化失敗:', error);
        const contentArea = document.getElementById('app-content');
        if (contentArea) {
            contentArea.innerHTML = `<p style="color:red; text-align:center; font-weight:bold;">系統連線異常，請確認是否在 LINE 應用程式內開啟。</p>`;
        }
    }
}

/**
 * 檢查使用者身分與狀態
 * @param {string} uid - LINE 使用者的唯一識別碼
 */
async function checkUserRoleAndStatus(uid) {
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'checkUser', uid: uid }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' } // 使用 text/plain 避免觸發 CORS 預檢請求
        });

        const result = await response.json();

        // 取得畫面上的主要容器與導覽列
        const contentArea = document.getElementById('app-content');
        const topNav = document.getElementById('top-nav');

        if (result.success && result.data.isRegistered) {
            // 情境 A：使用者已註冊
            // 如果是管理員，顯示上方的「會員專區」與「管理員專區」按鈕
            if (result.data.isAdmin) {
                topNav.classList.remove('hidden');
            }
            
            // 渲染會員狀態畫面
            contentArea.innerHTML = `
                <div style="text-align: center; padding: 2rem 0;">
                    <h3 style="color: var(--text-inkblue); margin-bottom: 1rem;">歡迎回來，${result.data.profile['真實姓名']}</h3>
                    <p style="font-size: 1.1rem; color: var(--accent-gold); font-weight: bold;">
                        目前狀態：${result.data.status}
                    </p>
                </div>
            `;
        } else {
            // 情境 B：使用者未註冊，渲染準會員註冊表單
            contentArea.innerHTML = renderRegistrationForm();
        }

    } catch (error) {
        console.error('API 請求錯誤:', error);
        const contentArea = document.getElementById('app-content');
        if (contentArea) {
            contentArea.innerHTML = `<p style="color:red; text-align:center;">伺服器連線發生錯誤，請稍後再試。</p>`;
        }
    }
}

/**
 * 渲染準會員註冊表單的 HTML 結構
 */
function renderRegistrationForm() {
    return `
        <div style="background-color: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(27, 39, 68, 0.05);">
            <h3 style="color: var(--accent-gold); margin-bottom: 0.5rem; text-align: center;">準會員申請表</h3>
            <p style="font-size: 0.9rem; margin-bottom: 1.5rem; text-align: center; color: #666;">請完整填寫以下資訊以完成系統綁定</p>
            <form id="reg-form">
                <div style="margin-bottom: 1rem;">
                    <input type="text" id="input-name" placeholder="真實姓名" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink); font-size: 1rem;" required>
                </div>
                <div style="margin-bottom: 1rem;">
                    <input type="tel" id="input-phone" placeholder="手機號碼" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink); font-size: 1rem;" required>
                </div>
                <div style="margin-bottom: 1rem;">
                    <input type="email" id="input-email" placeholder="Email" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink); font-size: 1rem;" required>
                </div>
                <div style="margin-bottom: 1rem;">
                    <input type="text" id="input-industry" placeholder="產業" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink); font-size: 1rem;" required>
                </div>
                <div style="margin-bottom: 1rem;">
                    <input type="text" id="input-company" placeholder="公司名稱" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink); font-size: 1rem;" required>
                </div>
                <div style="margin-bottom: 1rem;">
                    <input type="text" id="input-jobtitle" placeholder="職稱" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink); font-size: 1rem;" required>
                </div>
                <div style="margin-bottom: 1.5rem;">
                    <input type="text" id="input-referrer" placeholder="介紹人" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink); font-size: 1rem;" required>
                </div>
                <button type="button" class="btn-primary" style="width: 100%; padding: 12px; font-size: 1.1rem; border-radius: 8px;" onclick="submitRegistration()">提交申請</button>
            </form>
        </div>
    `;
}

/**
 * 處理註冊表單送出 (預留函式，下一步將實作收集資料與回傳 GAS 的功能)
 */
function submitRegistration() {
    alert('註冊介面已就緒！我們下一步會實作資料傳遞至資料庫的邏輯。');
}
