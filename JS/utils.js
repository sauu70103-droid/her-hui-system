/**
 * 檔案：JS/utils.js
 * 說明：共用輔助函數、API 封裝與日期格式化工具
 */

// 🌟 統一 API 呼叫引擎 (有效減少程式碼重複與 Token 消耗)
async function callApi(payload) {
    const response = await fetch(GAS_API_URL, { 
        method: 'POST', 
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    return await response.json();
}

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

function getChineseDateTime(dateVal) {
    if (!dateVal) return '';
    try {
        let d = new Date(dateVal);
        if (isNaN(d.getTime())) return String(dateVal).substring(0, 16);
        let year = d.getFullYear();
        let month = String(d.getMonth() + 1).padStart(2, '0');
        let day = String(d.getDate()).padStart(2, '0');
        let hours = String(d.getHours()).padStart(2, '0');
        let mins = String(d.getMinutes()).padStart(2, '0');
        return `${year}年${month}月${day}日 ${hours}:${mins}`;
    } catch (e) { return String(dateVal).substring(0, 16); }
}

function getChineseDate(dateVal) {
    if (!dateVal || dateVal === '無') return '尚未填寫';
    try {
        let d = new Date(dateVal);
        if (isNaN(d.getTime())) {
            let parts = String(dateVal).split('T')[0].split('-');
            if (parts.length === 3) return `${parts[0]}年${parts[1]}月${parts[2]}日`;
            return String(dateVal);
        }
        let year = d.getFullYear();
        let month = String(d.getMonth() + 1).padStart(2, '0');
        let day = String(d.getDate()).padStart(2, '0');
        return `${year}年${month}月${day}日`;
    } catch (e) { return '尚未填寫'; }
}

function getStandardDate(dateVal) {
    if (!dateVal || dateVal === '無') return '';
    try {
        let d = new Date(dateVal);
        if (isNaN(d.getTime())) return String(dateVal).split('T')[0];
        let year = d.getFullYear();
        let month = String(d.getMonth() + 1).padStart(2, '0');
        let day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) { return ''; }
}

function getStandardDateTime(dateVal) {
    if (!dateVal) return '';
    try {
        let d = new Date(dateVal);
        if (isNaN(d.getTime())) return String(dateVal).replace(' ', 'T').substring(0, 16);
        let year = d.getFullYear();
        let month = String(d.getMonth() + 1).padStart(2, '0');
        let day = String(d.getDate()).padStart(2, '0');
        let hours = String(d.getHours()).padStart(2, '0');
        let mins = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${mins}`;
    } catch (e) { return ''; }
}

function cleanDateOnly(dateVal) {
    if (!dateVal || dateVal === '無') return '尚未填寫';
    let str = String(dateVal);
    return str.split('T')[0]; 
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
