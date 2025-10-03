(function(){
  const sendBtn = document.getElementById('sendBtn');
  const resultBox = document.getElementById('result');
  const LS_KEY = 'ff_like_sender_data';

  // 🔹 Local Storage থেকে Data লোড
  function loadData() {
    try {
      let data = localStorage.getItem(LS_KEY);
      return data ? JSON.parse(data) : { dailyUsage: 0, uidTimestamps: {} };
    } catch(e){
      return { dailyUsage: 0, uidTimestamps: {} };
    }
  }

  // 🔹 Local Storage-এ Data Save
  function saveData(data) {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }

  // 🔹 Result Box Reset
  function resetResult() {
    resultBox.style.display = 'none';
    resultBox.className = 'result';
    resultBox.innerHTML = '';
  }

  // 🔹 Result দেখানো
  function showResult(text, isError=false) {
    resultBox.style.display = 'block';
    resultBox.className = 'result' + (isError ? ' error' : '');
    resultBox.innerHTML = text.replace(/\n/g,"<br>");
  }

  // 🔹 ২৪ ঘণ্টায় একই UID-তে আবার না পাঠানো
  function canSendUID(uid) {
    const data = loadData();
    const last = data.uidTimestamps[uid];
    if (!last) return true;
    return (Date.now() - last) > 24*60*60*1000;
  }

  // 🔹 Button Click Event
  sendBtn.addEventListener('click', async function(){
    resetResult();
    const uid = document.getElementById('uid').value.trim();
    const region = document.getElementById('region').value;

    // ✅ UID Validation (8–13 digit)
    if (!/^\d{8,13}$/.test(uid)){
      showResult('❌ Invalid UID. Must be 8–13 digits.', true);
      return;
    }

    let data = loadData();

    // ✅ দৈনিক লিমিট (7 বার)
    if (data.dailyUsage >= 7){
      showResult('🚫 Daily limit reached (7 Likes only).', true);
      return;
    }

    // ✅ ২৪ ঘণ্টায় এক UID-এ একবারই
    if (!canSendUID(uid)){
      showResult('⚠️ This UID already received a like in last 24h.', true);
      return;
    }

    // Sending Start
    sendBtn.disabled = true;
    showResult('⏳ Sending like...');

    const apiURL = `https://apiblogproxy.vercel.app/api/like?uid=${encodeURIComponent(uid)}&server_name=${encodeURIComponent(region)}`;

    try {
      const res = await fetch(apiURL);
      if (!res.ok) {
        const txt = await res.text().catch(()=>'');
        throw new Error('Failed (status '+res.status+', '+txt+')');
      }

      const result = await res.json().catch(()=>null);

      if (!result || typeof result.LikesGivenByAPI === "undefined") {
        showResult('🚨 API Error: Invalid UID or no like data received.', true);
      } else if (Number(result.LikesGivenByAPI) === 0) {
        showResult('⚠️ This Player Already Got Maximum Likes For Today.', true);
      } else {
        // ✅ Data Update
        data.dailyUsage++;
        data.uidTimestamps[uid] = Date.now();
        saveData(data);

        // ✅ Success Result দেখানো
        showResult(
          '✅ Like Sent Successfully!<br><br>'+
          '👤 Player: ' + (result.PlayerNickname || "N/A") + '<br>'+
          '🪪 UID: ' + (result.UID || uid) + '<br>'+
          '👍 Likes Before: ' + (result.LikesbeforeCommand || "N/A") + '<br>'+
          '📈 Likes Given: ' + (result.LikesGivenByAPI || "N/A") + '<br>'+
          '🔋 Total Likes: ' + (result.LikesafterCommand || "N/A") + '<br>'+
          '📊 Daily Usage: ' + data.dailyUsage + '/7<br><br>'+
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
