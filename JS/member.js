/**
 * 檔案：JS/member.js
 * 說明：會員前台業務邏輯 (註冊、儀表板、個人資料、活動報名與歷史紀錄)
 */

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
    let displayBirth = getStandardDate(p['生日']);
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
                    <p style="font-size: 0.95rem; color: #666; margin: 0 0 15px;">📍 ${act.location || ''} <br> 🕒 ${getChineseDateTime(act.date)}</p>
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
                        <p style="font-size: 0.9rem; color: #666; margin: 0;">時間：${getChineseDateTime(h.date)} | 繳費：${h.fee} | 狀態：${h.status}</p>
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
                <p style="font-size:0.95rem; color:#666; margin-bottom:8px;">📍 ${act.location || '無'} <br>🕒 ${getChineseDateTime(act.date)}</p>
                <p style="font-size:0.95rem; color:#666; margin-bottom:20px;">💵 費用: <span style="color:var(--accent-gold); font-weight:bold;">${act.fee || '0'}</span> | 截止: ${getChineseDateTime(act.deadline)}</p>
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
