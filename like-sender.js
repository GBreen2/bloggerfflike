(function(){
  const sendBtn = document.getElementById('sendBtn');
  const resultBox = document.getElementById('result');
  const LS_KEY = 'ff_like_sender_data';

  function loadData() {
    let data = localStorage.getItem(LS_KEY);
    if (!data) return { dailyUsage: 0, uidTimestamps: {} };
    try { return JSON.parse(data); } catch(e){ return { dailyUsage: 0, uidTimestamps: {} }; }
  }
  function saveData(data) { localStorage.setItem(LS_KEY, JSON.stringify(data)); }
  function resetResult() { resultBox.style.display='none'; resultBox.className='result'; resultBox.innerHTML=''; }
  function showResult(text,isError){ resultBox.style.display='block'; resultBox.className='result'+(isError?' error':''); resultBox.innerHTML=text; }
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

    if(!/^\d{8,13}$/.test(uid)){
      showResult('❌ Invalid UID. Must be 8–13 digits.',true);
      return;
    }

    let data = loadData();
    if(data.dailyUsage >= 3){
      showResult('🚫 Daily limit reached (3 Likes only).',true);
      return;
    }

    if(!canSendUID(uid)){
      showResult('⚠️ This UID already received a like in last 24h.',true);
      return;
    }

    sendBtn.disabled = true;
    showResult('⏳ Sending like...');

    const apiURL = 'https://apiblogproxy.vercel.app/api/like?uid='+encodeURIComponent(uid)+'&server_name='+encodeURIComponent(region);

    try{
      const res = await fetch(apiURL);
      if(!res.ok){
        const txt = await res.text().catch(()=>'');
        throw new Error('Failed to fetch player info (status '+res.status+', '+txt+')');
      }
      const result = await res.json().catch(()=>null);

      if(!result || typeof result.LikesGivenByAPI === "undefined"){
        showResult('🚨 API Error: Invalid UID or no like data received.',true);
      } else if(Number(result.LikesGivenByAPI) === 0){
        showResult('⚠️ This Player Already Got Maximum Likes For Today.',true);
      } else {
        data.dailyUsage++;
        data.uidTimestamps[uid] = Date.now();
        saveData(data);

        showResult(
          '✅ Like Sent Successfully!\n\n'+
          '👤 Player: '+(result.PlayerNickname||"N/A")+'\n'+
          '🪪 UID: '+(result.UID||uid)+'\n'+
          '👍 Likes Before: '+(result.LikesbeforeCommand||"N/A")+'\n'+
          '📈 Likes Given: '+(result.LikesGivenByAPI||"N/A")+'\n'+
          '🔋 Total Likes: '+(result.LikesafterCommand||"N/A")+'\n'+
          '📊 Daily Usage: '+data.dailyUsage+'/3\n\n'+
          '🖥️ Powered By: V122'
        , false);
      }
    } catch(err){
      showResult('🚨 API Error: '+err.message,true);
    } finally{
      sendBtn.disabled = false;
    }
  });
})();
