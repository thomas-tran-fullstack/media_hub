(async ()=>{
  const base = 'http://localhost:3000';
  const fetch = global.fetch;
  const cookieJar = [];
  function saveCookies(res){
    const raw = res.headers.get('set-cookie');
    if(raw) cookieJar.push(raw);
  }
  function cookieHeader(){
    return cookieJar.map(c=>c.split(';')[0]).join('; ');
  }
  try{
    console.log('1) Registering user...');
    let r = await fetch(base+'/auth/register', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({full_name:'E2E Test', email:'e2e_test+1@example.com', username:'e2e_test1', password:'testpass123'})});
    console.log('Register status', r.status);
    const t = await r.text(); console.log('Register body:', t.slice(0,200));

    console.log('2) Logging in...');
    r = await fetch(base+'/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'e2e_test+1@example.com', password:'testpass123'})});
    console.log('Login status', r.status);
    const loginJson = await r.json().catch(()=>null);
    console.log('Login body:', loginJson);
    // capture cookies
    const set = r.headers.get('set-cookie');
    if(set) cookieJar.push(set);
    console.log('Cookies:', cookieHeader());

    console.log('3) Add payment method...');
    r = await fetch(base+'/api/payment-methods', {method:'POST', headers:{'Content-Type':'application/json', 'Cookie': cookieHeader()}, body: JSON.stringify({type:'Card', last4:'4242', exp:'12/2030', cardholder:'E2E Tester'})});
    console.log('Add PM status', r.status);
    const addJson = await r.json().catch(()=>null);
    console.log('Add PM body:', addJson);

    console.log('4) List methods');
    r = await fetch(base+'/api/payment-methods', {method:'GET', headers:{'Cookie': cookieHeader()}});
    console.log('List status', r.status);
    const list = await r.json(); console.log('List body:', list);
    const id = list.methods && list.methods[0] && list.methods[0].id;
    if(!id){ console.log('No method found, abort'); return; }

    console.log('5) Delete method id', id);
    r = await fetch(base+`/api/payment-methods/${id}`, {method:'DELETE', headers:{'Cookie': cookieHeader()}});
    console.log('Delete status', r.status);
    const del = await r.text(); console.log('Delete body:', del);

  }catch(e){ console.error('E2E error', e); }
})();