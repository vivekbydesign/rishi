/* Party API (Netlify, api/ folder). On happybirthdayrishi.com it is same-site; elsewhere it calls the live site. */
window.API = /(^|\.)happybirthdayrishi\.com$|netlify\.app$/.test(location.hostname)
  ? '/api'
  : 'https://happybirthdayrishi.com/api';
