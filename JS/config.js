/**
 * 檔案：JS/config.js
 * 說明：系統全域設定與狀態變數 (防彈全域版)
 */
var GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwQKWOkyVSo7BNai0zUHgYNb9yqb9t7eu_6-qXEh9-S3bmijA0atMoeGs0M030IgMDloA/exec';
var LIFF_ID = '2012102588-g88gt5pQ'; 
var APPROVED_ROLES = ['一般會員', '她薈會員', '創始會員'];
var currentLiffProfile = null; 
var adminNextIds = {}; 
var globalUserData = null; 
var isAdminVerified = false; 
var globalActivities = []; 
var adminActivitiesData = []; 
var currentImageAssets = []; 
var editingActivityId = null; 
var appStartTime = Date.now();
var isFirstLoad = true;
