// like-sender.js (GitHub-ready) 
(function(){
  const sendBtn = document.getElementById('sendBtn');
  const resultBox = document.getElementById('result');
  const LS_KEY = 'ff_like_sender_data';
  const MAX_DAILY = 7; // <-- use this everywhere

  function loadData() {
    try {
      let data = localStorage.getItem(LS_KEY);
      return data ? JSON.parse(data) : { dailyUsage: 0, uidTimestamps: {} };
    } catch(e){
      return { dailyUsage: 0, uidTimestamps: {} };
    }
  }

  function saveData(data) {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }

  function resetResult() {
    resultBox.style.display = 'none';
    resultBox.className = 'result';
    resultBox.innerHTML = '';
  }

  function showResult(html, isError=false) {
    resultBox.style.display = 'block';
    resultBox.className = 'result' + (isError ? ' error' : '');
    // we expect html (with <br>) so set innerHTML directly
    resultBox.innerHTML = String(html);
  }

  function canSendUID(uid) {
    const data = loadData();
    const last = data.uidTimestamps[uid];
    if (!last) return true;
    return (Date.now() - last) > 24*60*60*1000;
  }

  sendBtn.addEventListener('click', async function(){
    resetResult();
    const uid = document.getElementById('uid').value.trim();
    const region = document.getElementById('region').value;

    if (!/^\d{8,13}$/.test(uid)){
      showResult('❌ Invalid UID. Must be 8–13 digits.', true);
      return;
    }

    let data = loadData();
    // ensure dailyUsage is a number
    data.dailyUsage = Number(data.dailyUsage) || 0;

    if (data.dailyUsage >= MAX_DAILY){
      showResult(`🚫 Daily limit reached (${MAX_DAILY} Likes only).`, true);
      return;
    }

    if (!canSendUID(uid)){
      showResult('⚠️ This UID already received a like in last 24h.', true);
      return;
    }

    sendBtn.disabled = true;
    showResult('⏳ Sending like...');

    const apiURL = `https://apiblogproxy.vercel.app/api/like?uid=${encodeURIComponent(uid)}&server_name=${encodeURIComponent(region)}`;

    try {
      const res = await fetch(apiURL);
      if (!res.ok) {
        const txt = await res.text().catch(()=> '');
        throw new Error('Failed (status '+res.status+', '+txt+')');
      }

      const result = await res.json().catch(()=> null);

      if (!result || typeof result.LikesGivenByAPI === "undefined") {
        showResult('🚨 API Error: Invalid UID or no like data received.', true);
      } else if (Number(result.LikesGivenByAPI) === 0) {
        showResult('⚠️ This Player Already Got Maximum Likes For Today.', true);
      } else {
        // increment as number
        data.dailyUsage = Number(data.dailyUsage || 0) + 1;
        data.uidTimestamps[uid] = Date.now();
        saveData(data);

        // show with MAX_DAILY constant to guarantee "/7"
        showResult(
          '✅ Like Sent Successfully!<br><br>'+
          '👤 Player: ' + (result.PlayerNickname || "N/A") + '<br>'+
          '🪪 UID: ' + (result.UID || uid) + '<br>'+
          '👍 Likes Before: ' + (result.LikesbeforeCommand || "N/A") + '<br>'+
          '📈 Likes Given: ' + (result.LikesGivenByAPI || "N/A") + '<br>'+
          '🔋 Total Likes: ' + (result.LikesafterCommand || "N/A") + '<br>'+
          '📊 Daily Usage: ' + data.dailyUsage + '/' + MAX_DAILY + '<br><br>'+
          '🖥️ Powered By: V122'
        , false);
      }
    } catch(err){
      showResult('🚨 API Error: '+err.message, true);
    } finally {
      sendBtn.disabled = false;
    }
  });
})();
