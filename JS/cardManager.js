/**
 * 檔案：JS/cardManager.js
 * 說明：會員卡片專屬保護模組 (管理圖片路徑、排版座標與渲染邏輯)
 */

const CardManager = {
    // 獨立保護的座標數據庫 (依據微調數據寫入)
    CONFIG: {
        '一般會員': {
            src: 'card_general.jpg',
            portrait: {
                name: { top: '45.3%', left: '68%', color: '#3A526A', size: 'clamp(1rem, 3.5vw, 1.2rem)' },
                id:   { top: '53.5%', left: '68%', color: '#3A526A', size: 'clamp(1rem, 3.5vw, 1.2rem)' }
            },
            landscape: {
                name: { top: '45.3%', left: '68%', color: '#3A526A', size: 'clamp(1.5rem, 5vh, 2rem)' },
                id:   { top: '53.5%', left: '68%', color: '#3A526A', size: 'clamp(1.5rem, 5vh, 2rem)' }
            }
        },
        '她薈會員': {
            src: 'card_annual.jpg',
            portrait: {
                name: { top: '44.5%', left: '68%', color: '#6A4B45', size: 'clamp(1rem, 3.5vw, 1.2rem)' },
                id:   { top: '53.2%', left: '68%', color: '#6A4B45', size: 'clamp(1rem, 3.5vw, 1.2rem)' }
            },
            landscape: {
                name: { top: '44.5%', left: '68%', color: '#6A4B45', size: 'clamp(1.5rem, 5vh, 2rem)' },
                id:   { top: '53.2%', left: '68%', color: '#6A4B45', size: 'clamp(1.5rem, 5vh, 2rem)' }
            }
        },
        '創始會員': {
            src: 'card_founder.jpg',
            portrait: {
                name: { top: '42%', left: '68%', color: '#664C28', size: 'clamp(1rem, 3.5vw, 1.2rem)' },
                id:   { top: '51%', left: '68%', color: '#664C28', size: 'clamp(1rem, 3.5vw, 1.2rem)' }
            },
            landscape: {
                name: { top: '42%', left: '68%', color: '#664C28', size: 'clamp(1.5rem, 5vh, 2rem)' },
                id:   { top: '51%', left: '68%', color: '#664C28', size: 'clamp(1.5rem, 5vh, 2rem)' }
            }
        }
    },

    // 產生會員中心畫面上方的主卡片
    getDashboardCardHtml: function(status, realName, memberId) {
        let cfg = this.CONFIG[status];
        if (!cfg) return '';
        
        const baseStyle = "position: absolute; transform: translate(-50%, -50%); font-weight: bold; font-family: 'Times New Roman', 'Noto Serif TC', serif; letter-spacing: 2px; white-space: nowrap;";
        
        return `
            <div onclick="CardManager.showFullscreen('${status}', '${realName}', '${memberId}')" style="position: relative; width: 100%; max-width: 600px; margin: 0 auto 1.5rem auto; border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.15); overflow: hidden; cursor: pointer;">
                <img src="${cfg.src}" alt="${status}憑證" style="width: 100%; height: auto; display: block;">
                
                <div style="${baseStyle} top: ${cfg.portrait.name.top}; left: ${cfg.portrait.name.left}; color: ${cfg.portrait.name.color}; font-size: ${cfg.portrait.name.size};">
                    ${realName}
                </div>
                
                <div style="${baseStyle} top: ${cfg.portrait.id.top}; left: ${cfg.portrait.id.left}; color: ${cfg.portrait.id.color}; font-size: ${cfg.portrait.id.size};">
                    ${memberId}
                </div>
                
                <div style="position: absolute; bottom: 8px; right: 12px; background: rgba(255,255,255,0.7); padding: 4px 8px; border-radius: 12px; font-size: 0.7rem; color: #333; font-weight: bold; pointer-events: none;">
                    🔍 點擊放大
                </div>
            </div>
        `;
    },

    // 點擊後的全螢幕橫向放大邏輯
    showFullscreen: function(status, name, memberId) {
        let cfg = this.CONFIG[status];
        if (!cfg) return;

        const baseStyle = "position: absolute; transform: translate(-50%, -50%); font-weight: bold; font-family: 'Times New Roman', 'Noto Serif TC', serif; letter-spacing: 2px; white-space: nowrap;";

        let overlayHtml = `
            <div id="fullscreen-card-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); z-index: 10000; display: flex; justify-content: center; align-items: center; flex-direction: column;" onclick="this.remove()">
                <div style="position: relative; width: 95vh; max-width: 1000px; transform: rotate(90deg); transform-origin: center;">
                    <img src="${cfg.src}" style="width: 100%; display: block; border-radius: 16px; box-shadow: 0 0 30px rgba(255,255,255,0.2);">
                    <div style="${baseStyle} top: ${cfg.landscape.name.top}; left: ${cfg.landscape.name.left}; color: ${cfg.landscape.name.color}; font-size: ${cfg.landscape.name.size};">
                        ${name}
                    </div>
                    <div style="${baseStyle} top: ${cfg.landscape.id.top}; left: ${cfg.landscape.id.left}; color: ${cfg.landscape.id.color}; font-size: ${cfg.landscape.id.size};">
                        ${memberId}
                    </div>
                </div>
                <div style="position: absolute; bottom: 30px; color: rgba(255,255,255,0.6); font-size: 0.9rem; letter-spacing: 2px;">點擊任意處關閉返回</div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', overlayHtml);
    }
};

window.CardManager = CardManager;
