// Password-protected exercise-book reissue system
(function (){
    const STORAGE_KEY = 'reissue_students_v1';
    const PASSWORD_KEY = 'reissue_password';
    const SESSION_KEY = 'reissue_session';

    // ===== LOGIN SYSTEM =====
    function initLoginSystem() {
        const setupScreen = document.getElementById('setupScreen');
        const loginScreen = document.getElementById('loginScreen');
        const mainContent = document.getElementById('mainContent');
        const passwordInput = document.getElementById('passwordInput');
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const loginError = document.getElementById('loginError');

        const setupPassword = document.getElementById('setupPassword');
        const setupPasswordConfirm = document.getElementById('setupPasswordConfirm');
        const setupBtn = document.getElementById('setupBtn');
        const setupError = document.getElementById('setupError');
        const resetPasswordBtn = document.getElementById('resetPasswordBtn');

        // Check if password is already set
        const hasPassword = localStorage.getItem(PASSWORD_KEY) !== null;
        const isLoggedIn = sessionStorage.getItem(SESSION_KEY) === 'true';

        // Determine initial screen
        if (isLoggedIn) {
            setupScreen.style.display = 'none';
            loginScreen.style.display = 'none';
            mainContent.style.display = 'block';
            initReissueSystem();
        } else if (!hasPassword) {
            setupScreen.style.display = 'flex';
            loginScreen.style.display = 'none';
            mainContent.style.display = 'none';
            setupPassword.focus();
        } else {
            setupScreen.style.display = 'none';
            loginScreen.style.display = 'flex';
            mainContent.style.display = 'none';
            passwordInput.focus();
        }

        // ===== SETUP HANDLERS =====
        setupBtn.addEventListener('click', () => {
            const pass1 = setupPassword.value.trim();
            const pass2 = setupPasswordConfirm.value.trim();

            if (!pass1 || !pass2) {
                setupError.textContent = '❌ Both fields are required';
                setupError.style.display = 'block';
                return;
            }

            if (pass1.length < 4) {
                setupError.textContent = '❌ Password must be at least 4 characters';
                setupError.style.display = 'block';
                return;
            }

            if (pass1 !== pass2) {
                setupError.textContent = '❌ Passwords do not match';
                setupError.style.display = 'block';
                return;
            }

            // Save the password
            localStorage.setItem(PASSWORD_KEY, pass1);
            sessionStorage.setItem(SESSION_KEY, 'true');

            // Transition to main content
            setupScreen.style.display = 'none';
            mainContent.style.display = 'block';
            initReissueSystem();
        });

        setupPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') setupPasswordConfirm.focus();
        });

        setupPasswordConfirm.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') setupBtn.click();
        });

        // ===== LOGIN HANDLERS =====
        loginBtn.addEventListener('click', () => {
            const password = localStorage.getItem(PASSWORD_KEY);
            if (passwordInput.value === password) {
                sessionStorage.setItem(SESSION_KEY, 'true');
                loginScreen.style.display = 'none';
                mainContent.style.display = 'block';
                loginError.style.display = 'none';
                initReissueSystem();
            } else {
                loginError.textContent = '❌ Incorrect password';
                loginError.style.display = 'block';
                passwordInput.value = '';
                passwordInput.focus();
            }
        });

        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loginBtn.click();
        });

        // Reset password (go back to setup)
        resetPasswordBtn.addEventListener('click', () => {
            if (confirm('Create a new password?')) {
                setupScreen.style.display = 'flex';
                loginScreen.style.display = 'none';
                setupPassword.value = '';
                setupPasswordConfirm.value = '';
                setupError.style.display = 'none';
                setupPassword.focus();
            }
        });

        // Handle logout
        logoutBtn.addEventListener('click', () => {
            if (confirm('Logout and return to login screen?')) {
                sessionStorage.removeItem(SESSION_KEY);
                loginScreen.style.display = 'flex';
                mainContent.style.display = 'none';
                passwordInput.value = '';
                passwordInput.focus();
            }
        });
    }

    // ===== REISSUE SYSTEM =====
    function initReissueSystem() {
        function load(){
            try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] }catch(e){return []}
        }
        function save(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) }

        function byId(id){ return list.find(s=>s.id === id) }

        // normalize/migrate old student entries to new shape (subjects array)
        function normalizeList(raw){
            return raw.map(s => {
                // already migrated
                if (Array.isArray(s.subjects)) return s;

                // old single-subject format -> convert
                const subjName = s.subject || 'General';
                const subj = {
                    name: subjName,
                    expiry: s.expiry || null,
                    issuedCount: s.issuedCount || 0,
                    lastIssued: s.lastIssued || null,
                    needsReissue: !!s.needsReissue
                };
                return Object.assign({}, s, { subjects: [subj] });
            });
        }

        // format expiry for UI
        function formatExpiry(d){ if(!d) return '—'; try{ return new Date(d).toLocaleDateString() }catch(e){return d} }

        // mark expired subject entries for reissue (client-side auto-mark)
        function checkExpiryAndMark(){
            const auto = document.getElementById('autoMarkExpired') ? document.getElementById('autoMarkExpired').checked : true;
            if(!auto) return;
            const today = new Date();
            let changed = false;
            list.forEach(student=>{
                student.subjects.forEach(sub=>{
                    if(sub.expiry){
                        const ex = new Date(sub.expiry + 'T23:59:59');
                        if(ex < today && !sub.needsReissue){ sub.needsReissue = true; changed = true; }
                    }
                });
            });
            if(changed){ save(list); renderAll(); }
        }

        function getUniqueSubjects(){
            const set = new Set();
            list.forEach(s=> s.subjects.forEach(sub=> set.add(sub.name || 'General')));
            return Array.from(set).sort();
        }
        function populateSubjectFilter(){
            const sel = document.getElementById('subjectFilter');
            if(!sel) return;
            const current = sel.value || '__all__';
            sel.innerHTML = '<option value="__all__">All</option>' + getUniqueSubjects().map(sub=>`<option value="${sub}">${sub}</option>`).join('');
            sel.value = current;
        }

        // render helpers (show subjects list per student)
        function renderStudents(){
            const ul = document.getElementById('studentsList'); ul.innerHTML='';

            // sort students: those with pending subjects first (desc), then by name
            const students = list.slice().sort((a,b)=>{
                const pa = a.subjects.filter(s=>s.needsReissue).length;
                const pb = b.subjects.filter(s=>s.needsReissue).length;
                if(pb !== pa) return pb - pa; // more pending first
                return a.name.localeCompare(b.name);
            });

            students.forEach(s=>{
                const li = document.createElement('li');
                const pendingCount = s.subjects.filter(sub=>sub.needsReissue).length;
                const subjectsHtml = s.subjects.map(sub=>`<div class="meta">Subject: ${sub.name} • Issued: ${sub.issuedCount||0} — Last: ${sub.lastIssued||'—'} • Expiry: ${formatExpiry(sub.expiry)} ${sub.needsReissue?'<strong style="color:#d9534f;"> (Pending)</strong>':''}</div>`).join('');
                li.innerHTML = `<div>
                    <div><strong>${s.name}</strong> ${pendingCount?`<span class="badge">${pendingCount}</span>`:''} <span class="meta">(ID: ${s.id})</span></div>
                    ${subjectsHtml}
                </div>`;

                const actions = document.createElement('div'); actions.className='actions';

                // create a multi-select so staff can pick one or more subjects from the student's list
                const sel = document.createElement('select');
                sel.multiple = true;
                sel.style.minWidth = '180px';
                sel.style.maxWidth = '260px';
                sel.style.padding = '6px';
                s.subjects.forEach((sub, idx) => {
                    const opt = document.createElement('option');
                    opt.value = String(idx); // use index to map back to subject object
                    opt.textContent = `${sub.name} ${sub.needsReissue ? ' (Pending)' : ''}`;
                    sel.appendChild(opt);
                });

                actions.appendChild(sel);

                // allow quick reissue of all pending subjects for this student
                const reissueAllBtn = document.createElement('button');
                reissueAllBtn.classList.add('primary');
                reissueAllBtn.textContent = 'Reissue All Pending';
                reissueAllBtn.onclick = () => {
                    const pending = s.subjects.filter(x => x.needsReissue);
                    if (!pending.length) {
                        reissueAllBtn.textContent = 'No pending';
                        setTimeout(() => reissueAllBtn.textContent = 'Reissue All Pending', 900);
                        return;
                    }
                    reissueAllBtn.disabled = true;
                    reissueAllBtn.textContent = 'Processing...';
                    pending.forEach(sub => {
                        sub.needsReissue = false;
                        sub.issuedCount = (sub.issuedCount || 0) + 1;
                        sub.lastIssued = new Date().toLocaleString();
                    });
                    save(list); renderAll();
                    reissueAllBtn.textContent = `Reissued ${pending.length}`;
                    setTimeout(() => { reissueAllBtn.textContent = 'Reissue All Pending'; reissueAllBtn.disabled = false; }, 900);
                };
                actions.appendChild(reissueAllBtn);

                // allow adding a new subject to this student quickly (keep as small action)
                const addSubBtn = document.createElement('button');
                addSubBtn.textContent = 'Add subject';
                addSubBtn.onclick = () => {
                    const newName = prompt('New subject name (e.g. Math)');
                    if(!newName) return;
                    s.subjects.push({ name: newName.trim(), expiry: null, issuedCount: 0, lastIssued: null, needsReissue: false });
                    save(list); renderAll();
                };
                actions.appendChild(addSubBtn);

                li.appendChild(actions);
                ul.appendChild(li);
            })
        }

        function renderPending(){
            const ul = document.getElementById('pendingList'); ul.innerHTML='';
            const filter = document.getElementById('subjectFilter') ? document.getElementById('subjectFilter').value : '__all__';

            // Group pending subjects by student for clearer multi-subject reissue
            list.forEach(student => {
                const pending = student.subjects.filter(sub => sub.needsReissue && (filter==='__all__' || sub.name === filter));
                if (!pending.length) return;

                const li = document.createElement('li');
                li.innerHTML = `<div>
                    <div><strong>${student.name}</strong> <span class="meta">(ID: ${student.id})</span></div>
                    <div class="meta">Pending subjects: ${pending.map(p=>p.name).join(', ')}</div>
                </div>`;

                const actions = document.createElement('div'); actions.className='actions';

                // create checklist for pending subjects
                const checklist = document.createElement('div');
                checklist.style.display = 'flex';
                checklist.style.flexWrap = 'wrap';
                checklist.style.gap = '8px';
                pending.forEach((sub, idx) => {
                    const label = document.createElement('label');
                    label.style.display = 'flex';
                    label.style.alignItems = 'center';
                    label.style.gap = '6px';
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.dataset.subIndex = String(student.subjects.indexOf(sub));
                    const txt = document.createTextNode(`${sub.name}`);
                    label.appendChild(cb); label.appendChild(txt);
                    checklist.appendChild(label);
                });

                // input + verify-all button (student-level)
                const input = document.createElement('input'); input.className='verifyInput'; input.placeholder='Enter school ID';
                const verifyAllBtn = document.createElement('button'); verifyAllBtn.classList.add('primary'); verifyAllBtn.textContent = 'Verify & Reissue (all pending)';
                verifyAllBtn.onclick = () => {
                    const entered = input.value.trim();
                    if (entered !== student.id) { verifyAllBtn.textContent = 'ID mismatch'; setTimeout(()=> verifyAllBtn.textContent = 'Verify & Reissue (all pending)', 900); return; }
                    const pendingNow = student.subjects.filter(x=>x.needsReissue);
                    if (!pendingNow.length) { verifyAllBtn.textContent = 'Nothing pending'; setTimeout(()=> verifyAllBtn.textContent = 'Verify & Reissue (all pending)', 900); return; }
                    verifyAllBtn.disabled = true; verifyAllBtn.textContent = 'Reissuing...';
                    pendingNow.forEach(sub => { sub.needsReissue = false; sub.issuedCount = (sub.issuedCount||0)+1; sub.lastIssued = new Date().toLocaleString(); });
                    save(list); renderAll();
                    verifyAllBtn.textContent = `Reissued ${pendingNow.length}`; setTimeout(()=>{ verifyAllBtn.textContent = 'Verify & Reissue (all pending)'; verifyAllBtn.disabled = false; },900);
                };

                // Verify selected subjects only
                const verifySelectedBtn = document.createElement('button'); verifySelectedBtn.classList.add('primary'); verifySelectedBtn.textContent = 'Verify & Reissue Selected';
                verifySelectedBtn.onclick = () => {
                    const entered = input.value.trim();
                    if (entered !== student.id) { verifySelectedBtn.textContent = 'ID mismatch'; setTimeout(()=> verifySelectedBtn.textContent = 'Verify & Reissue Selected', 900); return; }
                    const checkedBoxes = Array.from(checklist.querySelectorAll('input[type=checkbox]:checked'));
                    if (!checkedBoxes.length) { verifySelectedBtn.textContent = 'Select subjects'; setTimeout(()=> verifySelectedBtn.textContent = 'Verify & Reissue Selected', 900); return; }
                    verifySelectedBtn.disabled = true; verifySelectedBtn.textContent = 'Reissuing...';
                    let count = 0;
                    checkedBoxes.forEach(cb => {
                        const idx = parseInt(cb.dataset.subIndex,10);
                        const sub = student.subjects[idx];
                        if (sub && sub.needsReissue){ sub.needsReissue = false; sub.issuedCount = (sub.issuedCount||0)+1; sub.lastIssued = new Date().toLocaleString(); count++; }
                    });
                    if (count) save(list);
                    renderAll();
                    verifySelectedBtn.textContent = count ? `Reissued ${count}` : 'Nothing to reissue';
                    setTimeout(()=>{ verifySelectedBtn.textContent = 'Verify & Reissue Selected'; verifySelectedBtn.disabled = false; },900);
                };

                // quick reissue-all button (student card already has one; keep here too)
                const reissueAllBtn = document.createElement('button'); reissueAllBtn.classList.add('primary'); reissueAllBtn.textContent = 'Reissue All Pending';
                reissueAllBtn.onclick = () => {
                    const pendingNow = student.subjects.filter(x=>x.needsReissue);
                    if (!pendingNow.length) { reissueAllBtn.textContent = 'No pending'; setTimeout(()=> reissueAllBtn.textContent = 'Reissue All Pending', 900); return; }
                    reissueAllBtn.disabled = true; reissueAllBtn.textContent = 'Processing...';
                    pendingNow.forEach(sub=>{ sub.needsReissue = false; sub.issuedCount = (sub.issuedCount||0)+1; sub.lastIssued = new Date().toLocaleString(); });
                    save(list); renderAll(); reissueAllBtn.textContent = `Reissued ${pendingNow.length}`; setTimeout(()=>{ reissueAllBtn.textContent = 'Reissue All Pending'; reissueAllBtn.disabled = false; },900);
                };

                actions.appendChild(checklist);
                actions.appendChild(input);
                actions.appendChild(verifySelectedBtn);
                actions.appendChild(verifyAllBtn);
                actions.appendChild(reissueAllBtn);

                li.appendChild(actions);
                ul.appendChild(li);
            });
        }

        function renderAll(){ populateSubjectFilter(); renderStudents(); renderPending(); }

        // initial
        let list = normalizeList(load());

        const addBtn = document.getElementById('addStudent');
        const idInput = document.getElementById('stuId');
        const nameInput = document.getElementById('stuName');
        const subjectsInput = document.getElementById('stuSubjects');
        const expiryInput = document.getElementById('stuExpiry');

        addBtn.addEventListener('click', ()=>{
            const id = idInput.value.trim(); const name = nameInput.value.trim();
            const subjectsRaw = (subjectsInput && subjectsInput.value.trim()) || '';
            const expiry = (expiryInput && expiryInput.value) || null; // applied to all entered subjects

            if(!id || !name){ alert('Provide ID, name (subjects optional)'); return }
            if(list.some(s=>s.id===id)){ alert('Student ID already exists'); return }

            const subjects = subjectsRaw ? subjectsRaw.split(',').map(x=>x.trim()).filter(Boolean).map(n=>({ name: n, expiry: expiry, issuedCount: 0, lastIssued: null, needsReissue: false })) : [{ name: 'General', expiry: expiry, issuedCount: 0, lastIssued: null, needsReissue: false }];

            const s = { id, name, subjects };
            list.push(s); save(list);

            idInput.value=''; nameInput.value=''; if(subjectsInput) subjectsInput.value=''; if(expiryInput) expiryInput.value=''; renderAll();
        });

        // subject filter change
        const subjectFilter = document.getElementById('subjectFilter');
        if(subjectFilter) subjectFilter.addEventListener('change', ()=>{ renderPending(); });

        // bulk reissue by selected subject (idempotent)
        const reissueSubjectBtn = document.getElementById('reissueSubjectBtn');
        if(reissueSubjectBtn){
            reissueSubjectBtn.classList.add('primary');
            reissueSubjectBtn.addEventListener('click', ()=>{
                const filter = subjectFilter ? subjectFilter.value : '__all__';
                if(filter === '__all__'){
                    if(!confirm('Reissue all pending subjects for EVERY subject?')) return;
                } else {
                    if(!confirm(`Reissue all pending books for subject: ${filter}?`)) return;
                }

                reissueSubjectBtn.disabled = true;
                reissueSubjectBtn.textContent = 'Processing...';

                // perform idempotent updates only for subject entries that still need reissue
                let count = 0;
                list.forEach(student=>{
                    student.subjects.forEach(sub=>{
                        const match = (filter === '__all__') || (sub.name === filter);
                        if(match && sub.needsReissue){
                            sub.needsReissue = false;
                            sub.issuedCount = (sub.issuedCount||0) + 1;
                            sub.lastIssued = new Date().toLocaleString();
                            count++;
                        }
                    });
                });

                if(count > 0) save(list);
                renderAll();

                reissueSubjectBtn.textContent = count ? `Reissued ${count}` : 'Nothing to reissue';
                setTimeout(()=>{ reissueSubjectBtn.textContent = 'Reissue subject'; reissueSubjectBtn.disabled = false; }, 1200);
            });
        }

        // auto-check expiry on load and periodically
        checkExpiryAndMark();
        setInterval(checkExpiryAndMark, 60 * 1000);

        renderAll();
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', initLoginSystem);
})();


