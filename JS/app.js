// 您提供的 GAS 網址
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwQKWOkyVSo7BNai0zUHgYNb9yqb9t7eu_6-qXEh9-S3bmijA0atMoeGs0M030IgMDloA/exec';

// TODO: 未來需要在 LINE Developers 申請 LIFF ID 並填入此處
const LIFF_ID = 'YOUR_LIFF_ID_HERE'; 

document.addEventListener('DOMContentLoaded', () => {
    // 系統初始化入口
    initializeApp();
});

async function initializeApp() {
    try {
        // 1. 初始化 LINE LIFF
        // await liff.init({ liffId: LIFF_ID });
        // if (!liff.isLoggedIn()) {
        //     liff.login();
        //     return;
        // }
        
        // 取得使用者資訊 (測試階段先給一組假資料)
        // const profile = await liff.getProfile();
        const mockProfile = { userId: 'U1234567890', displayName: '測試用戶' };

        // 2. 呼叫 GAS API 檢查使用者權限與狀態
        await checkUserRoleAndStatus(mockProfile.userId);

    } catch (error) {
        console.error('初始化失敗:', error);
        document.getElementById('app-content').innerHTML = `<p style="color:red; text-align:center;">系統連線異常，請稍後再試。</p>`;
    }
}

async function checkUserRoleAndStatus(uid) {
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'checkUser', uid: uid }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' } // 避免 CORS 預檢請求
        });

        const result = await response.json();

        // 畫面渲染邏輯
        const contentArea = document.getElementById('app-content');
        const topNav = document.getElementById('top-nav');

        if (result.success && result.data.isRegistered) {
            // 如果已註冊且有管理員權限，顯示頂部雙按鈕
            if (result.data.isAdmin) {
                topNav.classList.remove('hidden');
            }
            contentArea.innerHTML = `<h3>歡迎回來，${result.data.profile['真實姓名']}</h3><p>您的狀態：${result.data.status}</p>`;
        } else {
            // 未註冊，渲染準會員填寫表單
            contentArea.innerHTML = renderRegistrationForm();
        }

    } catch (error) {
        console.error('API 請求錯誤:', error);
    }
}

function renderRegistrationForm() {
    return `
        <h3 style="color: var(--accent-gold); margin-bottom: 1rem;">準會員申請表</h3>
        <p style="font-size: 0.9rem; margin-bottom: 1.5rem;">請完整填寫以下資訊以完成系統綁定。</p>
        <form id="reg-form">
            <div style="margin-bottom: 1rem;"><input type="text" placeholder="真實姓名" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid var(--accent-pink);"></div>
            <div style="margin-bottom: 1rem;"><input type="tel" placeholder="手機號碼" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid var(--accent-pink);"></div>
            <div style="margin-bottom: 1rem;"><input type="email" placeholder="Email" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid var(--accent-pink);"></div>
            <button type="button" class="btn-primary" style="width: 100%;">提交申請</button>
        </form>
    `;
}
