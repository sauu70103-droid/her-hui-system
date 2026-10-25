/**
 * 檔案：JS/uploader.js
 * 說明：處理活動多圖上傳、預覽與拖曳排序邏輯
 */

function renderImagePreviews() {
    let area = document.getElementById('upload-preview-area');
    if (!area) return;
    if (currentImageAssets.length === 0) { area.innerHTML = ''; return; }
    let html = '';
    currentImageAssets.forEach((asset, idx) => {
        let isMain = idx === 0;
        let imgSrc = asset.type === 'url' ? getDriveImageUrl(asset.url) : asset.previewUrl;
        let borderColor = isMain ? 'var(--accent-gold)' : '#ddd';
        let borderWidth = isMain ? '3px' : '1px';
        
        html += `
            <div style="position:relative; display:inline-block; width:85px; flex-shrink:0; margin-right: 12px;">
                <img src="${imgSrc}" style="width:85px; height:85px; object-fit:cover; border-radius:10px; border:${borderWidth} solid ${borderColor}; box-sizing:border-box; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                ${isMain ? `<span style="position:absolute; top:-10px; left:-5px; background:var(--accent-gold); color:white; font-size:0.7rem; padding:3px 8px; border-radius:12px; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.2);">主圖</span>` : ''}
                <button onclick="removeImage(${idx})" style="position:absolute; top:-8px; right:-8px; background:#d9534f; color:white; border:none; border-radius:50%; width:24px; height:24px; font-size:0.75rem; font-weight:bold; cursor:pointer; line-height:1; box-shadow:0 2px 5px rgba(0,0,0,0.3);">X</button>
                <div style="display:flex; justify-content:space-between; margin-top:8px; padding:0 4px;">
                    <button onclick="moveImage(${idx}, -1)" ${idx === 0 ? 'disabled style="opacity:0.2;"' : 'style="cursor:pointer;"'} style="background:none; border:none; font-size:1.3rem; padding:0;">⬅️</button>
                    <button onclick="moveImage(${idx}, 1)" ${idx === currentImageAssets.length - 1 ? 'disabled style="opacity:0.2;"' : 'style="cursor:pointer;"'} style="background:none; border:none; font-size:1.3rem; padding:0;">➡️</button>
                </div>
            </div>`;
    });
    area.innerHTML = html;
}

window.removeImage = function(index) { 
    currentImageAssets.splice(index, 1); 
    renderImagePreviews(); 
};

window.moveImage = function(index, direction) {
    if (direction === -1 && index > 0) { 
        [currentImageAssets[index], currentImageAssets[index - 1]] = [currentImageAssets[index - 1], currentImageAssets[index]]; 
    } else if (direction === 1 && index < currentImageAssets.length - 1) { 
        [currentImageAssets[index], currentImageAssets[index + 1]] = [currentImageAssets[index + 1], currentImageAssets[index]]; 
    }
    renderImagePreviews();
};

window.handleMultipleFileUpload = function(event) {
    let files = event.target.files;
    if (currentImageAssets.length + files.length > 5) {
        alert('為保持信件載入速度，最多只能上傳 5 張照片喔！');
        event.target.value = ''; 
        return;
    }
    Array.from(files).forEach(file => {
        let reader = new FileReader();
        reader.onload = function(e) {
            currentImageAssets.push({ type: 'file', base64: e.target.result.split(',')[1], mimeType: file.type, previewUrl: e.target.result });
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
        const result = await callApi({ action: 'uploadImages', uid: currentLiffProfile.userId, imagesData: filesToUpload, activityName: actName, dateStr: actDate });
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
            renderImagePreviews();
        } else {
            alert('上傳失敗');
        }
    } catch (e) { 
        alert('系統連線異常'); 
    }
    
    setTimeout(() => { 
        btn.innerText = "確認上傳並鎖定照片"; 
        btn.style.backgroundColor = ""; 
        btn.disabled = false; 
    }, 2000);
};
