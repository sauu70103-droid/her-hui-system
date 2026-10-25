/**
 * 檔案：JS/config.js
 * 說明：系統全域設定與狀態變數
 */

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwQKWOkyVSo7BNai0zUHgYNb9yqb9t7eu_6-qXEh9-S3bmijA0atMoeGs0M030IgMDloA/exec';
const LIFF_ID = '2012102588-g88gt5pQ'; 
const APPROVED_ROLES = ['一般會員', '她薈會員', '創始會員'];

let currentLiffProfile = null; 
let adminNextIds = {}; 
let globalUserData = null; 
let isAdminVerified = false; 
let globalActivities = []; 
let adminActivitiesData = []; 
let currentImageAssets = []; 
let editingActivityId = null; 
let appStartTime = Date.now();
let isFirstLoad = true;
