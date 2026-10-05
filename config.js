/* Party API (Netlify, api/ folder). On happybirthdayrishi.com it is same-site; elsewhere it calls the live site.
   Automated test browsers never touch the live data. */
window.API = navigator.webdriver ? ''
  : /(^|\.)happybirthdayrishi\.com$|netlify\.app$/.test(location.hostname) ? '/api'
  : 'https://happybirthdayrishi.com/api';
