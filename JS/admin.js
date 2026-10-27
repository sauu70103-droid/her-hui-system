/**
 * 檔案：JS/admin.js
 * 說明：管理員後台業務邏輯 (優化：正式會員名單分類預設收合、新增人數統計與智能搜尋展開)
 */

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
    const btn = document.getElementById('login-admin-btn'); 
    if(btn) btn.innerText = "驗證中...";
    try {
        let pwdInput = document.getElementById('admin-pwd');
        const result = await callApi({ action: 'adminLogin', uid: currentLiffProfile.userId, userId: currentLiffProfile.userId, lineId: currentLiffProfile.userId, password: pwdInput ? pwdInput.value : '' });
        
        if (result.success) { 
            isAdminVerified = true; 
            let modal = document.getElementById('admin-modal');
            if(modal) modal.remove(); 
            fetchAndRenderAdminData(); 
        } else { 
            alert('登入失敗：\n' + (result.message || '密碼或權限錯誤')); 
            if(btn) btn.innerText = "確認進入"; 
        }
    } catch (error) { sysDebugLog('管理員驗證失敗', error); if(btn) btn.innerText = "確認進入"; }
}

async function fetchAndRenderAdminData() {
    getAppContent().innerHTML = `<div class="loading-text">資料讀取中...</div>`;
    try {
        const result = await callApi({ action: 'getAdminData', uid: currentLiffProfile.userId, userId: currentLiffProfile.userId, lineId: currentLiffProfile.userId });
        if (result.success) { 
            adminActivitiesData = result.data.activities || []; 
            buildAdminDashboardUI(result.data); 
        } else {
            getAppContent().innerHTML = `<p style="color:red; text-align:center;">讀取失敗：<br>${result.message || '未知錯誤'}</p>`;
        }
    } catch (error) { sysDebugLog('抓取後台資料失敗', error); }
}

function updatePreviewId(uid) { 
    let selectEl = document.getElementById(`level-${uid}`);
    let previewEl = document.getElementById(`preview-id-${uid}`);
    if (selectEl && previewEl && adminNextIds[selectEl.value]) {
        previewEl.innerText = adminNextIds[selectEl.value]; 
    }
}

window.switchAdminTab = function(tabName) {
    let memberSec = document.getElementById('admin-member-sec');
    let actSec = document.getElementById('admin-act-sec');
    let btnMembers = document.getElementById('tab-btn-members');
    let btnActs = document.getElementById('tab-btn-activities');

    if(memberSec) memberSec.style.display = (tabName === 'members') ? 'block' : 'none';
    if(actSec) actSec.style.display = (tabName === 'activities') ? 'block' : 'none';
    if(btnMembers) btnMembers.style.opacity = (tabName === 'members') ? '1' : '0.5';
    if(btnActs) btnActs.style.opacity = (tabName === 'activities') ? '1' : '0.5';
};

function buildAdminDashboardUI(data) {
    try {
        let nextYear = new Date(); nextYear.setFullYear(nextYear.getFullYear() + 1); let defaultDate = getStandardDate(nextYear);
        adminNextIds = data.nextIds || {}; 
        editingActivityId = null; currentImageAssets = []; 

        let html = `
            <h2 style="text-align: center; color: var(--accent-gold); margin-bottom: 1.5rem;">⚙️ 系統管理員專區</h2>
            <div style="display: flex; gap: 10px; margin-bottom: 25px;">
                <button id="tab-btn-members" class="btn-primary" style="flex: 1; border-radius: 20px; transition: 0.3s; padding: 12px; font-size: 1.1rem;" onclick="switchAdminTab('members')">👥 會員管理</button>
                <button id="tab-btn-activities" class="btn-primary" style="flex: 1; border-radius: 20px; opacity: 0.5; background-color: var(--accent-gold); transition: 0.3s; padding: 12px; font-size: 1.1rem;" onclick="switchAdminTab('activities')">📢 活動管理</button>
            </div>
        `;

        html += `<div id="admin-member-sec">`;
        if (data.abnormal && data.abnormal.length > 0) {
            html += `<div style="background-color: #fff3cd; border: 2px solid #d9534f; padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem; box-shadow: 0 4px 10px rgba(217,83,79,0.2);">`;
            html += `<h4 style="color: #d9534f; margin-top: 0; margin-bottom: 10px; font-size: 1.1rem; text-align: center;">🚨 授權期限異常，請協助調整 (${data.abnormal.length} 筆)</h4>`;
            data.abnormal.forEach(m => {
                html += `
                    <div style="background: #fff; padding: 10px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid #d9534f;">
                        <p style="margin:0; font-weight: bold; color: #333;">${m.name} (${m.status})</p>
                        <p style="margin:5px 0 0; color: #d9534f; font-size: 0.9rem;">異常到期日：${getChineseDate(m.expiryDate)}</p>
                    </div>`;
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
                            <span style="font-size:0.85rem; background:#fdf2f2; padding:4px 10px; border-radius:12px; color: #d9534f; font-weight: bold;">已於 ${getChineseDate(m.expiryDate)} 到期</span>
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
                    </div>`;
            });
        }

        html += getPremiumHeader('⚠️', `即將到期提醒 (${data.expiring.length} 筆)`);
        if (data.expiring.length === 0) html += `<p style="font-size:0.95rem; color:#666; margin-bottom:1.5rem; text-align: center;">目前無即將到期的會員。</p>`;
        else data.expiring.forEach(m => { html += `<div class="data-card data-card-danger" style="border-radius: 12px;"><p style="margin:0;"><strong>${m.name}</strong> (${m.phone}) - [${m.status}] <br><span style="color:#d9534f; font-size: 0.9rem;">到期日: ${getChineseDate(m.expiryDate)}</span></p></div>`; });

        html += getPremiumHeader('⏳', `準會員審核區 (${data.pending.length} 筆)`);
        if (data.pending.length === 0) html += `<p style="font-size:0.95rem; color:#666; margin-bottom:1.5rem; text-align: center;">目前無待審核的會員。</p>`;
        else {
            data.pending.forEach(m => {
                html += `
                    <div class="data-card" id="pending-card-${m.uid}" style="text-align: left; border-top: 5px solid var(--text-inkblue); border-radius: 16px; padding: 1.5rem;">
                        <div style="display: flex; align-items: center; margin-bottom: 12px;">
                            <div style="width: 45px; height: 45px; border-radius: 50%; background: linear-gradient(135deg, #BF9A5A 0%, #E2C792 100%); display: flex; justify-content: center; align-items: center; color: white; font-size: 1.3rem; font-weight: bold; margin-right: 15px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">${m.name.charAt(0)}</div>
                            <div><h4 style="margin: 0; font-size: 1.2rem; color: var(--text-inkblue);">${m.name} <span style="font-size: 0.85rem; color: #666; font-weight: normal;">(${m.gender || '未知'})</span></h4><p style="margin: 4px 0 0; font-size: 0.9rem; color: #666;">📞 ${m.phone}</p></div>
                        </div>
                        <div style="background: #F8F5EF; padding: 15px; border-radius: 12px; margin-bottom: 15px; font-size: 0.95rem; color: #444; border: 1px dashed #BF9A5A;">
                            <p style="margin: 0 0 8px;"><strong>🎂 生日：</strong>${getChineseDate(m.birthday)}</p><p style="margin: 0 0 8px;"><strong>📧 Email：</strong>${m.email || '-'}</p><p style="margin: 0 0 8px;"><strong>🏢 公司：</strong>${m.company || '-'}</p><p style="margin: 0 0 8px;"><strong>💼 職稱：</strong>${m.jobTitle || '-'}</p><p style="margin: 0 0 8px;"><strong>🏭 產業：</strong>${m.industry || '-'}</p><p style="margin: 0;"><strong>🤝 介紹人：</strong>${m.referrer || '-'}</p>
                        </div>
                        <label style="font-size: 0.95rem; font-weight: bold; color: var(--text-inkblue); display: block; margin-bottom: 6px;">選擇會員等級 (預計編號: <span id="preview-id-${m.uid}" style="color:var(--accent-gold);">${adminNextIds['一般會員'] || 'P00001'}</span>)：</label>
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
        let founderCount = 0, annualCount = 0, generalCount = 0;
        
        data.active.forEach(m => {
            let displayPhone = m.phone ? String(m.phone).replace(/^'/, '') : '-';
            let compJobStr = [((m.company && m.company !== '-') ? m.company : ''), ((m.jobTitle && m.jobTitle !== '-') ? m.jobTitle : '')].filter(Boolean).join(' / ') || '無公司與職稱資訊';
            let defaultExtend = m.status === '一般會員' ? '2099-12-31' : getStandardDate(m.expiryDate); 

            let cardHtml = `
                <div class="data-card member-item" style="text-align:left; padding: 1.2rem; margin-bottom: 15px; border-left: 5px solid var(--accent-gold); border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); background: #fff;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 10px;">
                        <div><h4 style="margin: 0; color: var(--text-inkblue); font-size: 1.15rem;">${m.name} <span style="font-size: 0.9rem; color: #999; font-weight: normal;">(${m.memberId})</span></h4><p style="margin: 4px 0 0; font-size: 0.9rem; color: #555;">🏢 ${compJobStr}</p></div>
                        <span style="font-size:0.85rem; background:#F8F5EF; border: 1px solid #BF9A5A; padding:4px 10px; border-radius:12px; color: var(--accent-gold); font-weight: bold;">📞 ${displayPhone}</span>
                    </div>
                    
                    <details style="margin-top: 15px; border-top: 1px dashed #eee; padding-top: 12px; cursor: pointer;">
                        <summary style="color: var(--text-inkblue); font-weight: bold; font-size: 0.95rem; outline: none; margin-bottom: 10px; background: rgba(191,154,90,0.1); padding: 8px 12px; border-radius: 8px; display: inline-block;">⚙️ 展開詳細資訊與授權管理</summary>
                        <div style="background: #fdfdfd; padding: 15px; border-radius: 10px; border: 1px solid #eee; margin-top: 10px;">
                            <p style="margin: 0 0 6px; font-size: 0.9rem; color: #444;"><strong>🎂 生日：</strong> ${getChineseDate(m.birthday)}</p><p style="margin: 0 0 6px; font-size: 0.9rem; color: #444;"><strong>🚻 性別：</strong> ${m.gender || '-'}</p><p style="margin: 0 0 6px; font-size: 0.9rem; color: #444;"><strong>📧 Email：</strong> ${m.email || '-'}</p><p style="margin: 0 0 6px; font-size: 0.9rem; color: #444;"><strong>🏭 產業：</strong> ${m.industry || '-'}</p><p style="margin: 0 0 15px; font-size: 0.9rem; color: #444;"><strong>🤝 介紹人：</strong> ${m.referrer || '-'}</p>
                            <label style="font-size:0.9rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:6px;">純更新到期日 (目前: ${getChineseDate(m.expiryDate)})</label>
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
                
            if (m.status === '創始會員') { founderList += cardHtml; founderCount++; } 
            else if (m.status === '她薈會員') { annualList += cardHtml; annualCount++; } 
            else { generalList += cardHtml; generalCount++; }
        });
        
        // 🌟 統一把會員分類改為折疊式面板，並動態帶入人數統計
        const getCategoryHtml = (icon, title, count, listHtml) => `
            <details class="member-category-details" style="margin-top: 15px; cursor: pointer; background: #fff; padding: 15px; border-radius: 12px; border: 1px solid #eee; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                <summary style="color: var(--accent-gold); font-size: 1.1rem; font-weight: bold; outline: none; list-style: none; display: flex; justify-content: space-between; align-items: center;">
                    <span>${icon} ${title} <span style="font-size: 0.9rem; color: #666; font-weight: normal;">(共 ${count} 位)</span></span>
                    <span style="font-size: 0.85rem; color: #999;">▼ 點擊展開</span>
                </summary>
                <div style="margin-top: 15px; border-top: 1px dashed #eee; padding-top: 15px;">
                    ${listHtml || '<p style="font-size:0.9rem; color:#999; text-align:center; margin:0;">目前無此類會員</p>'}
                </div>
            </details>
        `;

        html += getCategoryHtml('👑', '創始會員', founderCount, founderList);
        html += getCategoryHtml('🌸', '她薈會員', annualCount, annualList);
        html += getCategoryHtml('💎', '一般會員', generalCount, generalList);
        html += `</div>`;

        html += `<div id="admin-act-sec" style="display:none;">`;
        html += getPremiumHeader('📢', '新增活動發布');
        html += `
            <div class="data-card" style="border-left-color: var(--accent-pink); text-align: left; border-radius: 16px; padding: 1.5rem;" id="act-form-container">
                <input type="text" id="act-name" class="admin-search-bar" placeholder="活動名稱" required style="padding: 12px; border-radius: 8px;">
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <select id="act-type" class="admin-search-bar" style="margin:0; flex:1; padding: 12px; border-radius: 8px;"><option value="實體課程">實體課程</option><option value="線上講座">線上講座</option><option value="內部通告">內部通告</option><option value="跨產業聯誼">跨產業聯誼</option></select>
                    <select id="act-target" class="admin-search-bar" style="margin:0; flex:1; padding: 12px; border-radius: 8px; border-color: var(--accent-gold); color: var(--accent-gold); font-weight: bold;"><option value="所有會員">所有會員</option><option value="限她薈與創始會員">限她薈與創始會員</option></select>
                </div>
                <input type="datetime-local" id="act-date" class="admin-search-bar" style="padding: 12px; border-radius: 8px;">
                <div style="background: #F8F5EF; padding: 15px; border-radius: 12px; border: 1px dashed var(--accent-gold); margin-bottom: 15px;">
                    <label style="font-size: 0.9rem; font-weight:bold; color:var(--accent-gold); display:block; margin-bottom:10px;">📷 上傳活動圖片 (最多5張，支援拖曳排序)</label>
                    <input type="file" id="act-media" class="admin-search-bar" accept="image/*" multiple onchange="if(typeof handleMultipleFileUpload === 'function') handleMultipleFileUpload(event);" style="padding: 8px;">
                    <div id="upload-preview-area" style="display:flex; gap:12px; overflow-x:auto; margin-bottom:15px; min-height:80px; padding: 10px 0;"></div>
                    <button id="btn-upload-images" class="btn-secondary" style="width:100%; margin-bottom:5px; padding: 12px; border-radius: 8px;" onclick="if(typeof uploadImagesToServer === 'function') uploadImagesToServer();">確認上傳並鎖定照片</button>
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
                        <p style="font-size: 0.95rem; color: #666; margin-bottom: 15px;">📅 ${getChineseDateTime(act.date)} <br>📍 ${act.location || '無地點'}</p>
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            <button class="btn-primary" style="background-color: var(--text-inkblue); width:100%; padding:12px; border-radius: 8px; font-size: 1rem;" onclick="openAdminRegistrations('${act.id}', '${act.name}')">👥 查看報名名單與寄信</button>
                            <div style="display:flex; gap:10px;"><button class="btn-secondary" style="flex:1; padding:10px; font-size:0.95rem; border-radius: 8px;" onclick="loadActivityForEdit('${act.id}')">✏️ 編輯活動</button><button class="btn-primary" style="background-color:#d9534f; flex:1; padding:10px; font-size:0.95rem; border-radius: 8px;" onclick="deleteAdminActivity('${act.id}', '${act.name}')">🗑️ 刪除活動</button></div>
                        </div>
                    </div>`;
            });
        }
        if (displayedAdminActs === 0) html += `<p style="font-size:0.95rem; color:#666; text-align: center;">目前尚無活動資料。</p>`;
        
        html += `</div>`;
        getAppContent().innerHTML = html;
    } catch(err) { sysDebugLog('管理員後台渲染失敗', err); }
}

window.changeMemberLevelBtn = async function(targetUid) {
    let dateEl = document.getElementById(`change-date-${targetUid}`);
    let levelEl = document.getElementById(`change-level-${targetUid}`);
    const dateInput = dateEl ? dateEl.value : '';
    const levelInput = levelEl ? levelEl.value : '一般會員';
    
    if (!dateInput) return alert('請選擇到期日');
    if (!confirm(`確認將會員等級變更為「${levelInput}」嗎？\n(系統將自動停用舊編號，並核發全新的一組會員編號！)`)) return;
    try {
        const result = await callApi({ action: 'approveMember', uid: currentLiffProfile.userId, userId: currentLiffProfile.userId, lineId: currentLiffProfile.userId, targetUid: targetUid, expiryDate: dateInput, memberLevel: levelInput });
        if (result.success) { alert('變更成功！新編號已核發。'); fetchAndRenderAdminData(); }
    } catch (error) { sysDebugLog('變更等級失敗', error); }
}

window.openAdminRegistrations = async function(actId, actName) {
    const btn = event.target; const originalText = btn.innerText; btn.innerText = "載入名單中..."; btn.disabled = true;
    try {
        const result = await callApi({ action: 'getEventRegistrations', actId: actId, uid: currentLiffProfile.userId, userId: currentLiffProfile.userId, lineId: currentLiffProfile.userId });
        if (result.success) {
            let regs = result.data; let listHtml = '';
            let totalEntries = regs.length; let totalPax = regs.reduce((sum, reg) => sum + parseInt(reg.pax), 0);
            if (regs.length === 0) listHtml = `<p style="text-align:center; color:#999; margin-top:20px; font-size: 1rem;">目前尚無人報名此活動</p>`;
            else {
                regs.forEach(reg => {
                    let statusColor = reg.status === '已繳費' ? '#4CAF50' : (reg.status === '未繳費' ? '#d9534f' : '#BF9A5A');
                    listHtml += `
                        <div style="background:#fdfdfd; border:1px solid #eee; border-left:5px solid ${statusColor}; padding:15px; border-radius:12px; margin-bottom:12px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); display: flex; align-items: flex-start; gap: 10px;">
                            <div style="padding-top: 5px;"><input type="checkbox" class="email-checkbox" value="${reg.uid}" data-status="${reg.status}" checked style="transform: scale(1.3); cursor: pointer;"></div>
                            <div style="flex: 1;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><strong style="font-size:1.1rem; color:var(--text-inkblue);">${reg.name} <span style="font-size:0.9rem; color:#666; font-weight:normal;">(${reg.pax}人)</span></strong><span style="font-size:0.85rem; background:#F8F5EF; padding:4px 8px; border-radius:8px; color: var(--accent-gold); font-weight: bold;">${reg.phone}</span></div>
                                <p style="font-size:0.9rem; color:#666; margin:0 0 6px;">信箱：${reg.email}</p><p style="font-size:0.9rem; color:#666; margin:0 0 12px;">繳費方式：${reg.payment}</p>
                                <div style="display:flex; align-items:center; gap:10px; background: rgba(0,0,0,0.03); padding: 10px; border-radius: 8px;">
                                    <label style="font-size:0.9rem; font-weight:bold; color: #444;">狀態：</label>
                                    <select onchange="updateRegStatus('${reg.sheetName}', ${reg.rowIdx}, this.value, this)" style="padding:8px; border-radius:6px; border:1px solid #ccc; font-size:0.9rem; flex:1; outline: none;"><option value="已報名" ${reg.status==='已報名'?'selected':''}>已報名 (預設)</option><option value="已繳費" ${reg.status==='已繳費'?'selected':''}>✅ 已繳費確認</option><option value="未繳費" ${reg.status==='未繳費'?'selected':''}>❌ 未繳費</option></select>
                                </div>
                            </div>
                        </div>`;
                });
            }
            let emailSection = `
                <div style="margin: 20px 0; padding: 20px; border: 1px solid var(--accent-gold); border-radius: 12px; background: #fff; box-shadow: 0 4px 15px rgba(191,154,90,0.08);">
                    <h4 style="color:var(--text-inkblue); margin-top:0; margin-bottom:15px; font-size: 1.15rem;">📧 發送自訂通知信件</h4>
                    <div style="display:flex; gap:10px; margin-bottom:20px;"><button class="btn-secondary" style="flex:1; padding:10px; font-size:0.9rem; border-radius: 8px;" onclick="loadEmailTemplate('reminder', '${actName}')">📥 載入行前公版</button><button class="btn-secondary" style="background-color:#d9534f; color: white; border: none; flex:1; padding:10px; font-size:0.9rem; border-radius: 8px;" onclick="loadEmailTemplate('payment', '${actName}')">📥 載入催繳公版</button></div>
                    <label style="font-size:0.95rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:6px;">一鍵快速勾選：</label><select id="email-target" class="admin-search-bar" style="margin-bottom:15px; padding: 10px; border-radius: 8px;" onchange="updateEmailSelection()"><option value="all">勾選所有報名者 (包含已繳費)</option><option value="unpaid">僅勾選「未繳費或已報名」的會員</option><option value="none">取消所有勾選</option></select>
                    <label style="font-size:0.95rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:6px;">信件主旨：</label><input type="text" id="email-subject" class="admin-search-bar" value="【她薈 HER HUI】活動通知：${actName}" style="padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                    <label style="font-size:0.95rem; font-weight:bold; color:var(--text-inkblue); display:block; margin-bottom:6px;">信件內文 (可自由編輯)：</label><textarea id="email-body" class="admin-search-bar" rows="6" placeholder="請點擊上方按鈕載入公版，或直接輸入內文..." style="padding: 10px; border-radius: 8px; margin-bottom: 20px;"></textarea>
                    <button class="btn-primary" style="width:100%; padding: 14px; font-size: 1.1rem; border-radius: 8px;" onclick="sendCustomEventEmail('${actId}')">寄出信件給被勾選的人</button>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', `
                <div id="reg-list-modal" class="modal-overlay" style="align-items: flex-end;" onclick="if(event.target===this) this.remove()">
                    <div class="modal-content" style="width:100%; max-width:100%; border-radius: 24px 24px 0 0; padding:2rem 1.5rem; max-height:90vh; overflow-y:auto; position:relative; text-align:left; background:#F8F5EF;"><button onclick="document.getElementById('reg-list-modal').remove()" style="position:absolute; top:20px; right:20px; background:none; border:none; font-size:2.2rem; color:#999; cursor:pointer;">&times;</button><h3 style="color:var(--text-inkblue); margin-top:0; border-bottom:2px solid var(--accent-gold); padding-bottom:12px; font-size: 1.35rem;">📋 ${actName}</h3>${emailSection}<h4 style="color:var(--text-inkblue); margin-bottom:15px; font-size: 1.15rem;">報名名單 (${totalEntries} 筆 / 共 ${totalPax} 人)</h4>${listHtml}</div>
                </div>`);
        } else alert('無法取得名單：' + result.message);
    } catch (error) { sysDebugLog('開啟名單失敗', error); }
    if(btn) { btn.innerText = originalText; btn.disabled = false; }
};

window.updateEmailSelection = function() {
    let targetEl = document.getElementById('email-target'); let target = targetEl ? targetEl.value : 'all';
    document.querySelectorAll('.email-checkbox').forEach(cb => {
        if (target === 'all') cb.checked = true;
        else if (target === 'none') cb.checked = false;
        else if (target === 'unpaid') { cb.checked = (cb.dataset.status !== '已繳費'); }
    });
};

window.loadEmailTemplate = function(type, actName) {
    let subject = document.getElementById('email-subject'); let body = document.getElementById('email-body'); let target = document.getElementById('email-target');
    if(subject && body && target) {
        if (type === 'reminder') { subject.value = `【她薈 HER HUI】活動行前提醒：${actName}`; body.value = `溫馨提醒您，您報名的精彩活動即將開始！\n請記得保留時間並將活動加入行事曆，期待與您相見！`; target.value = 'all'; }
        else { subject.value = `【她薈 HER HUI】活動繳費提醒：${actName}`; body.value = `系統提醒您，您報名的活動尚未完成繳費確認喔！\n若您已經完成繳費，請忽略此信，或主動聯繫管理員為您進行人工確認。\n感謝您的配合！`; target.value = 'unpaid'; }
        updateEmailSelection(); 
    }
};

window.sendCustomEventEmail = async function(actId) {
    let subjectEl = document.getElementById('email-subject'); let bodyEl = document.getElementById('email-body');
    let subject = subjectEl ? subjectEl.value.trim() : ''; let bodyText = bodyEl ? bodyEl.value.trim() : '';
    let selectedUids = Array.from(document.querySelectorAll('.email-checkbox:checked')).map(cb => cb.value);
    if (selectedUids.length === 0) return alert("請至少勾選一位收件人！");
    if (!subject || !bodyText) return alert("請填寫主旨與內文");
    if (!confirm(`確定要發送信件給勾選的 ${selectedUids.length} 人嗎？`)) return;
    let btn = event.target; let originalText = btn.innerText; btn.innerText = "發送中..."; btn.disabled = true;
    try {
        const result = await callApi({ action: 'sendEventEmails', uid: currentLiffProfile.userId, userId: currentLiffProfile.userId, lineId: currentLiffProfile.userId, actId: actId, targetType: 'custom', subject: subject, customText: bodyText, selectedUids: selectedUids });
        alert(result.success ? result.message : '寄信失敗：' + result.message);
    } catch (error) { sysDebugLog('寄信失敗', error); }
    if(btn) { btn.innerText = originalText; btn.disabled = false; }
};

window.updateRegStatus = async function(sheetName, rowIdx, newStatus, selectElement) {
    selectElement.disabled = true;
    try {
        const result = await callApi({ action: 'updateRegStatus', uid: currentLiffProfile.userId, userId: currentLiffProfile.userId, lineId: currentLiffProfile.userId, sheetName: sheetName, rowIdx: rowIdx, newStatus: newStatus });
        if (result.success) { 
            let card = selectElement.closest('div').parentElement;
            card.style.borderLeftColor = newStatus === '已繳費' ? '#4CAF50' : (newStatus === '未繳費' ? '#d9534f' : '#BF9A5A'); 
            let checkbox = card.querySelector('.email-checkbox'); if (checkbox) checkbox.dataset.status = newStatus;
        } else alert('更新失敗');
    } catch (error) { sysDebugLog('更新狀態失敗', error); }
    selectElement.disabled = false;
};

window.submitActivity = async function() {
    let actNameEl = document.getElementById('act-name'); const actName = actNameEl ? actNameEl.value.trim() : '';
    if (!actName) return alert('活動名稱為必填項目！');
    if (currentImageAssets.some(a => a.type === 'file')) return alert('您有圖片尚未點擊「確認上傳」，請先上傳鎖定後再發布！');
    let btn = document.getElementById('submit-act-btn'); if(btn) { btn.innerText = "資料處理中..."; btn.disabled = true; }
    let targetEl = document.getElementById('act-target'); let targetAudienceStr = targetEl ? targetEl.value : '所有會員';
    const actData = {
        name: actName, type: document.getElementById('act-type') ? document.getElementById('act-type').value : '實體課程', targetAudience: targetAudienceStr,
        date: document.getElementById('act-date') ? document.getElementById('act-date').value : '', deadline: document.getElementById('act-deadline') ? document.getElementById('act-deadline').value : '', 
        location: document.getElementById('act-location') ? document.getElementById('act-location').value.trim() : '', fee: document.getElementById('act-fee') ? document.getElementById('act-fee').value.trim() : '', 
        capacity: document.getElementById('act-capacity') ? document.getElementById('act-capacity').value.trim() : '', description: document.getElementById('act-desc') ? document.getElementById('act-desc').value.trim() : '', 
        mediaUrls: currentImageAssets.map(a => a.url)
    };
    let reqBody = { action: editingActivityId ? 'updateActivity' : 'createActivity', uid: currentLiffProfile.userId, userId: currentLiffProfile.userId, lineId: currentLiffProfile.userId, activityData: actData };
    if (editingActivityId) reqBody.actId = editingActivityId;
    try {
        const result = await callApi(reqBody);
        if (result.success) { alert(editingActivityId ? '活動更新成功！' : '活動發布成功！'); cancelEditActivity(); fetchAndRenderAdminData(); } 
        else alert('操作失敗：' + result.message);
    } catch (error) { sysDebugLog('發布活動失敗', error); }
    if(btn) btn.disabled = false;
};

window.loadActivityForEdit = function(actId) {
    try {
        let act = adminActivitiesData.find(a => a.id === actId);
        if (!act) { alert('找不到該筆活動資料'); return; }
        editingActivityId = actId;
        let titleEl = document.getElementById('act-form-title'); if(titleEl) titleEl.innerText = "✏️ 編輯現有活動"; 
        let btnEl = document.getElementById('submit-act-btn'); if(btnEl) btnEl.innerText = "💾 儲存更新"; 
        let cancelBtn = document.getElementById('btn-cancel-edit'); if(cancelBtn) cancelBtn.style.display = "block";
        const safeSet = (id, val) => { let el = document.getElementById(id); if (el) el.value = (val === null || val === undefined) ? '' : String(val); };
        safeSet('act-name', act.name); safeSet('act-type', act.type || '實體課程'); 
        let audienceText = String(act.targetAudience || '所有會員');
        if (audienceText.includes('T') || audienceText.match(/\d{4}-\d{2}-\d{2}/)) { audienceText = '所有會員'; }
        safeSet('act-target', audienceText);
        safeSet('act-date', getStandardDateTime(act.date)); safeSet('act-deadline', getStandardDateTime(act.deadline));
        safeSet('act-location', act.location); safeSet('act-fee', act.fee); safeSet('act-capacity', act.capacity); safeSet('act-desc', act.desc);
        let rawMedia = String(act.media || ''); if (rawMedia === 'undefined' || rawMedia === 'null') rawMedia = '';
        currentImageAssets = rawMedia.split(',').filter(u => u.trim()).map(u => ({ type: 'url', url: u.trim() }));
        if (typeof renderImagePreviews === 'function') { renderImagePreviews(); }
        let container = document.getElementById('act-form-container');
        if (container) { container.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    } catch(e) { sysDebugLog("編輯活動載入失敗", e); }
};

window.cancelEditActivity = function() {
    editingActivityId = null;
    let titleEl = document.getElementById('act-form-title'); let btnEl = document.getElementById('submit-act-btn'); let cancelBtn = document.getElementById('btn-cancel-edit');
    if(titleEl) titleEl.innerText = "📢 新增活動發布"; if(btnEl) btnEl.innerText = "發布活動"; if(cancelBtn) cancelBtn.style.display = "none";
    ['act-name','act-date','act-deadline','act-location','act-fee','act-capacity','act-desc'].forEach(id => { let el = document.getElementById(id); if(el) el.value = ''; });
    let targetEl = document.getElementById('act-target'); if(targetEl) targetEl.value = '所有會員';
    currentImageAssets = []; 
    if (typeof renderImagePreviews === 'function') renderImagePreviews();
};

window.deleteAdminActivity = async function(actId, actName) {
    if (!confirm(`⚠️ 確定要刪除活動「${actName}」嗎？此動作無法復原！`)) return;
    try {
        const result = await callApi({ action: 'deleteActivity', uid: currentLiffProfile.userId, userId: currentLiffProfile.userId, lineId: currentLiffProfile.userId, actId: actId });
        if (result.success) { alert('活動已刪除！'); fetchAndRenderAdminData(); } else alert('刪除失敗');
    } catch (error) { sysDebugLog('刪除活動失敗', error); }
};

// 🌟 優化：搜尋時自動展開所有分類
function filterMembers() {
    const searchInput = document.getElementById('member-search');
    const input = searchInput ? searchInput.value.toLowerCase() : '';
    const isSearching = input.length > 0;
    
    document.querySelectorAll('.member-item').forEach(item => { 
        item.style.display = item.innerText.toLowerCase().includes(input) ? "block" : "none"; 
    });
    
    // 如果有輸入搜尋文字，自動展開下方的分類；若清空則保留使用者操作的狀態
    document.querySelectorAll('.member-category-details').forEach(details => {
        if (isSearching) {
            details.open = true;
        }
    });
}

async function approveMemberBtn(targetUid) {
    let dateEl = document.getElementById(`date-${targetUid}`); let levelEl = document.getElementById(`level-${targetUid}`);
    const dateInput = dateEl ? dateEl.value : ''; const levelInput = levelEl ? levelEl.value : '一般會員';
    if (!dateInput) return alert('請選擇到期日'); if (!confirm(`確認升級為「${levelInput}」嗎？`)) return;
    try {
        const result = await callApi({ action: 'approveMember', uid: currentLiffProfile.userId, userId: currentLiffProfile.userId, lineId: currentLiffProfile.userId, targetUid: targetUid, expiryDate: dateInput, memberLevel: levelInput });
        if (result.success) { alert('核准成功！'); fetchAndRenderAdminData(); }
    } catch (error) { sysDebugLog('核准會員失敗', error); }
}
async function rejectMemberBtn(targetUid) {
    if (!confirm('確定要駁回嗎？')) return;
    try {
        const result = await callApi({ action: 'rejectMember', uid: currentLiffProfile.userId, userId: currentLiffProfile.userId, lineId: currentLiffProfile.userId, targetUid: targetUid });
        if (result.success) { alert('已駁回！'); fetchAndRenderAdminData(); }
    } catch (error) { sysDebugLog('駁回會員失敗', error); }
}
async function extendMemberBtn(targetUid) {
    let dateEl = document.getElementById(`extend-date-${targetUid}`);
    const newDate = dateEl ? dateEl.value : '';
    if (!newDate) return alert('請選擇到期日');
    try {
        const result = await callApi({ action: 'extendMemberExpiry', uid: currentLiffProfile.userId, userId: currentLiffProfile.userId, lineId: currentLiffProfile.userId, targetUid: targetUid, newDate: newDate });
        if (result.success) { alert('更新延期成功！'); fetchAndRenderAdminData(); }
    } catch (error) { sysDebugLog('延期失敗', error); }
}
async function terminateMemberBtn(targetUid, memberName) {
    if (!confirm(`警告：確定停止「${memberName}」會籍嗎？`)) return;
    try {
        const result = await callApi({ action: 'terminateMember', uid: currentLiffProfile.userId, userId: currentLiffProfile.userId, lineId: currentLiffProfile.userId, targetUid: targetUid });
        if (result.success) { alert('已停權。'); fetchAndRenderAdminData(); }
    } catch (error) { sysDebugLog('停權失敗', error); }
}
