/**
 * 檔案：app.js
 * 說明：前端核心邏輯，負責 LINE LIFF 初始化、API 請求、表單送出與會員中心畫面渲染
 */

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwQKWOkyVSo7BNai0zUHgYNb9yqb9t7eu_6-qXEh9-S3bmijA0atMoeGs0M030IgMDloA/exec';
const LIFF_ID = '2012102588-g88gt5pQ'; 

// 全域變數，用來暫存從 LINE 抓取到的使用者基本資訊
let currentLiffProfile = null; 

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * 步驟一：系統初始化與 LINE 登入檢查
 */
async function initializeApp() {
    try {
        await liff.init({ liffId: LIFF_ID });
        
        if (!liff.isLoggedIn()) {
            liff.login();
            return;
        }
        
        // 將抓取到的資料存入全域變數，供後續註冊表單使用
        currentLiffProfile = await liff.getProfile();
        console.log("LINE Profile 取得成功:", currentLiffProfile);

        // 呼叫 API 檢查是否已經是會員
        await checkUserRoleAndStatus(currentLiffProfile.userId);

    } catch (error) {
        console.error('初始化失敗:', error);
        document.getElementById('app-content').innerHTML = `<p style="color:red; text-align:center; font-weight:bold;">系統連線異常，請確認是否在 LINE 應用程式內開啟。</p>`;
    }
}

/**
 * 步驟二：檢查使用者身分與狀態
 */
async function checkUserRoleAndStatus(uid) {
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'checkUser', uid: uid }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        const result = await response.json();

        if (result.success && result.data.isRegistered) {
            // 如果已經是會員，直接渲染會員中心
            renderMemberDashboard(result.data);
        } else {
            // 如果未註冊，渲染準會員註冊表單
            document.getElementById('app-content').innerHTML = renderRegistrationForm();
        }
    } catch (error) {
        console.error('API 請求錯誤:', error);
        document.getElementById('app-content').innerHTML = `<p style="color:red; text-align:center;">伺服器連線發生錯誤，請稍後再試。</p>`;
    }
}

/**
 * 步驟三：渲染會員註冊表單
 */
function renderRegistrationForm() {
    return `
        <div style="background-color: #fff; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(27, 39, 68, 0.05);">
            <h3 style="color: var(--accent-gold); margin-bottom: 0.5rem; text-align: center;">準會員申請表</h3>
            <p style="font-size: 0.9rem; margin-bottom: 1.5rem; text-align: center; color: #666;">請完整填寫以下資訊以完成系統綁定</p>
            <form id="reg-form">
                <div style="margin-bottom: 1rem;"><input type="text" id="input-name" placeholder="真實姓名" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink); font-size: 1rem;" required></div>
                <div style="margin-bottom: 1rem;"><input type="tel" id="input-phone" placeholder="手機號碼" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink); font-size: 1rem;" required></div>
                <div style="margin-bottom: 1rem;"><input type="email" id="input-email" placeholder="Email" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink); font-size: 1rem;" required></div>
                <div style="margin-bottom: 1rem;"><input type="text" id="input-industry" placeholder="產業" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink); font-size: 1rem;" required></div>
                <div style="margin-bottom: 1rem;"><input type="text" id="input-company" placeholder="公司名稱" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink); font-size: 1rem;" required></div>
                <div style="margin-bottom: 1rem;"><input type="text" id="input-jobtitle" placeholder="職稱" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink); font-size: 1rem;" required></div>
                <div style="margin-bottom: 1.5rem;"><input type="text" id="input-referrer" placeholder="介紹人" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--accent-pink); font-size: 1rem;" required></div>
                
                <button type="button" id="submit-btn" class="btn-primary" style="width: 100%; padding: 12px; font-size: 1.1rem; border-radius: 8px;" onclick="submitRegistration()">提交申請</button>
            </form>
        </div>
    `;
}

/**
 * 步驟四：處理表單資料並發送至 GAS
 */
async function submitRegistration() {
    // 防呆：確認是否已取得 LINE 資料
    if (!currentLiffProfile) {
        alert("無法取得 LINE 授權資料，請重新載入頁面。");
        return;
    }

    // 取得表單內的值
    const realName = document.getElementById('input-name').value.trim();
    const phone = document.getElementById('input-phone').value.trim();
    const email = document.getElementById('input-email').value.trim();
    const industry = document.getElementById('input-industry').value.trim();
    const company = document.getElementById('input-company').value.trim();
    const jobTitle = document.getElementById('input-jobtitle').value.trim();
    const referrer = document.getElementById('input-referrer').value.trim();

    // 簡單的必填驗證
    if (!realName || !phone || !email || !industry || !company || !jobTitle || !referrer) {
        alert("請確認所有欄位皆已填寫完畢！");
        return;
    }

    // 變更按鈕狀態為處理中，防止重複點擊
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.innerText = "資料送出中...";
    submitBtn.disabled = true;
    submitBtn.style.backgroundColor = "#ccc";

    // 打包要傳給後端的資料物件
    const userData = {
        uid: currentLiffProfile.userId,
        lineName: currentLiffProfile.displayName,
        realName: realName,
        phone: phone,
        email: email,
        industry: industry,
        company: company,
        jobTitle: jobTitle,
        referrer: referrer
    };

    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'registerUser', userData: userData }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        const result = await response.json();

        if (result.success) {
            // 註冊成功後，建構一組基礎的資料物件，並直接將畫面切換至會員中心
            const newMemberData = {
                isAdmin: false, // 剛註冊絕對不會是管理員
                status: '準會員', // 剛註冊預設為準會員
                profile: {
                    '真實姓名': realName
                }
            };
            renderMemberDashboard(newMemberData);
        } else {
            alert("註冊失敗：" + result.message);
            // 恢復按鈕狀態
            submitBtn.innerText = "提交申請";
            submitBtn.disabled = false;
            submitBtn.style.backgroundColor = "var(--text-inkblue)";
        }
    } catch (error) {
        console.error('送出表單錯誤:', error);
        alert("系統連線錯誤，請檢查網路狀態後再試。");
        submitBtn.innerText = "提交申請";
        submitBtn.disabled = false;
        submitBtn.style.backgroundColor = "var(--text-inkblue)";
    }
}

/**
 * 步驟五：依據權限動態渲染「會員中心」專屬頁面
 */
function renderMemberDashboard(userData) {
    const topNav = document.getElementById('top-nav');
    const contentArea = document.getElementById('app-content');

    // 判斷是否顯示頂部管理員與會員按鈕
    if (userData.isAdmin) {
        topNav.classList.remove('hidden');
    } else {
        topNav.classList.add('hidden');
    }

    // 基礎的 HTML 結構（無論何種身分都會看到頂部的問候語）
    let htmlContent = `
        <div style="background-color: #fff; padding: 2rem 1.5rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(27, 39, 68, 0.05); text-align: center; margin-bottom: 1.5rem;">
            <h2 style="color: var(--text-inkblue); margin-bottom: 0.5rem;">您好，${userData.profile['真實姓名']}</h2>
            <div style="display: inline-block; padding: 4px 12px; border-radius: 20px; background-color: var(--accent-gold); color: #fff; font-size: 0.9rem; font-weight: bold;">
                目前的會員等級：${userData.status}
            </div>
        </div>
    `;

    // 依據身分開放或限制功能區塊
    if (userData.status === '正式會員' || userData.isAdmin) {
        // 【正式會員 / 管理員】看得到的功能區塊
        htmlContent += `
            <div style="display: grid; gap: 1rem;">
                <div style="background-color: #fff; padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--accent-gold); box-shadow: 0 2px 10px rgba(0,0,0,0.03);">
                    <h4 style="color: var(--text-inkblue); margin-bottom: 0.5rem;">📅 活動及報名專區</h4>
                    <p style="font-size: 0.9rem; color: #666;">探索最新活動與專屬課程，立即報名參加。</p>
                    <button class="btn-primary" style="margin-top: 1rem; width: 100%;">前往活動列表</button>
                </div>
                
                <div style="background-color: #fff; padding: 1.5rem; border-radius: 12px; border-left: 4px solid var(--accent-pink); box-shadow: 0 2px 10px rgba(0,0,0,0.03);">
                    <h4 style="color: var(--text-inkblue); margin-bottom: 0.5rem;">🕒 過往歷史紀錄</h4>
                    <p style="font-size: 0.9rem; color: #666;">查詢您過去參與的活動紀錄與報名細節。</p>
                    <button class="btn-secondary" style="margin-top: 1rem; width: 100%; color: var(--text-inkblue); background-color: var(--accent-pink);">查看歷史紀錄</button>
                </div>
            </div>
        `;
    } else {
        // 【準會員】看得到的功能區塊 (限制功能提示)
        htmlContent += `
            <div style="background-color: #fff; padding: 2rem; border-radius: 12px; text-align: center; border: 1px dashed var(--accent-gold);">
                <h4 style="color: var(--text-inkblue); margin-bottom: 1rem;">鎖定中的專屬功能</h4>
                <p style="font-size: 0.95rem; color: #666; line-height: 1.6;">
                    您的申請已經送出！目前狀態為「準會員」。<br>
                    請等待管理員確認授權並開通正式會員資格後，即可解鎖「活動報名」與「歷史紀錄」等專屬功能區塊。
                </p>
            </div>
        `;
    }

    // 將組裝好的 HTML 塞入主內容區
    contentArea.innerHTML = htmlContent;
}
