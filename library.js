// frontend for library management

async function api(path, opts={}){
    const res = await fetch(path, opts);
    if(!res.ok){
        const err = await res.json().catch(()=>({error:'unknown'}));
        throw err;
    }
    return res.json();
}

async function fetchBooks(q){
    const url = '/api/books' + (q ? '?q='+encodeURIComponent(q) : '');
    return api(url);
}

function checkOverdue(books){
    const today = new Date();
    const overdueRecords = [];
    books.forEach(b=>{
        (b.borrowHistory||[]).forEach(r=>{
            if(r.dueDate && !r.returnedDate){
                const due = new Date(r.dueDate + 'T23:59:59');
                if(due < today){
                    overdueRecords.push({book:b,record:r});
                }
            }
        });
    });
    const alertDiv = document.getElementById('overdueAlert');
    if(overdueRecords.length){
        alertDiv.textContent = `⚠ ${overdueRecords.length} overdue item(s) detected.`;
    } else {
        alertDiv.textContent = '';
    }
    return overdueRecords;
}

function renderInventoryStats(stats){
    const container = document.getElementById('inventoryStats');
    container.innerHTML = `<strong>Total:</strong> ${stats.totalBooks} books &nbsp; <strong>Copies:</strong> ${stats.availableCopies}/${stats.totalCopies}`;
}

function renderBooks(list){
    const ul = document.getElementById('bookList');
    ul.innerHTML='';
    if(!list.length){ ul.innerHTML='<li style="padding:20px;color:#999;text-align:center;">No books found.</li>'; return; }
    list.forEach(b=>{
        const li = document.createElement('li');
        li.innerHTML = `<div><strong>${b.title||'<em>No title</em>'}</strong> &nbsp; <span class="meta">ISBN: ${b.isbn}</span></div>
            <div class="meta">Author: ${b.author||'–'} &nbsp; Genre: ${b.genre||'–'}</div>
            <div class="meta">Pub: ${b.pubDate||'–'} &nbsp; Copies: ${b.availableCopies||0}/${b.totalCopies||0}</div>`;
        const actions = document.createElement('div'); actions.className='actions';
        const editBtn = document.createElement('button'); editBtn.textContent='Edit';
        editBtn.onclick = ()=>{
            document.getElementById('bookIsbn').value = b.isbn;
            document.getElementById('bookTitle').value = b.title;
            document.getElementById('bookAuthor').value = b.author;
            document.getElementById('bookGenre').value = b.genre;
            if(b.pubDate) document.getElementById('bookPubDate').value = b.pubDate;
            document.getElementById('bookTotal').value = b.totalCopies;
        };
        actions.appendChild(editBtn);
        // history toggle
        const histBtn = document.createElement('button'); histBtn.textContent='History';
        const histDiv = document.createElement('div'); histDiv.style.display='none'; histDiv.style.marginTop='8px'; histDiv.style.fontSize='13px';
        histBtn.onclick = ()=>{
            if(histDiv.style.display==='none'){
                const recs = (b.borrowHistory||[]).slice(-5).reverse();
                histDiv.innerHTML = recs.length ? recs.map(r=>{
                    const due = r.dueDate?` due ${r.dueDate}`:' ';
                    const ret = r.returnedDate?` returned ${r.returnedDate}`:' not returned';
                    return `<div>• ${r.user} borrowed ${r.dateBorrowed}${due}${ret}</div>`;
                }).join('') : '<div style="color:#666">(no history)</div>';
                histDiv.style.display='block';
            } else {
                histDiv.style.display='none';
            }
        };
        actions.appendChild(histBtn);
        li.appendChild(actions);
        li.appendChild(histDiv);
        ul.appendChild(li);
    });
}

async function loadAllBooks(){
    const books = await fetchBooks();
    renderBooks(books);
    checkOverdue(books);
}

async function loadReport(){
    const summary = await api('/api/reports/summary');
    document.getElementById('reportArea').innerHTML =
        `<div><strong>Total books:</strong> ${summary.totalBooks}</div>`+
        `<div><strong>Total copies:</strong> ${summary.totalCopies}</div>`+
        `<div><strong>Available copies:</strong> ${summary.availableCopies}</div>`;
}

// event wiring
window.addEventListener('DOMContentLoaded', ()=>{
    document.getElementById('saveBook').addEventListener('click', async ()=>{
        const isbn = document.getElementById('bookIsbn').value.trim();
        const title = document.getElementById('bookTitle').value.trim();
        if(!isbn || !title){ alert('ISBN and title required'); return; }
        const body = {
            isbn, title,
            author: document.getElementById('bookAuthor').value.trim(),
            genre: document.getElementById('bookGenre').value.trim(),
            pubDate: document.getElementById('bookPubDate').value,
            totalCopies: parseInt(document.getElementById('bookTotal').value,10) || 1
        };
        try{
            // try create first, if conflict then update
            await api('/api/books', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
            alert('book added');
        }catch(e){
            if(e.error === 'isbn exists'){
                // update
                await api('/api/books/'+encodeURIComponent(isbn), {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
                alert('book updated');
            } else {
                alert('error: '+(e.error||JSON.stringify(e)));
            }
        }
        // clear form
        ['bookIsbn','bookTitle','bookAuthor','bookGenre','bookPubDate','bookTotal'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
        loadAllBooks();
    });

    document.getElementById('searchBtn').addEventListener('click', async ()=>{
        const q = document.getElementById('searchQuery').value.trim();
        const list = await fetchBooks(q);
        renderBooks(list);
        checkOverdue(list);
        const summary = await api('/api/reports/summary');
        renderInventoryStats(summary);
    });
    document.getElementById('refreshBtn').addEventListener('click', async ()=>{ document.getElementById('searchQuery').value=''; loadAllBooks(); const summary=await api('/api/reports/summary'); renderInventoryStats(summary); });

    document.getElementById('borrowBtn').addEventListener('click', async ()=>{
        const isbn = document.getElementById('borrowIsbn').value.trim();
        const user = document.getElementById('borrowUser').value.trim();
        const due = document.getElementById('borrowDue').value;
        const msg = document.getElementById('borrowMessage');
        try{
            await api('/api/borrow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({isbn,user,dueDate:due})});
            msg.style.color = '#28a745';
            msg.textContent = 'Borrow recorded';
            loadAllBooks();
        }catch(e){ msg.style.color = '#d9534f'; msg.textContent = 'Error: '+(e.error||e); }
    });

    document.getElementById('returnBtn').addEventListener('click', async ()=>{
        const isbn = document.getElementById('returnIsbn').value.trim();
        const user = document.getElementById('returnUser').value.trim();
        const msg = document.getElementById('borrowMessage');
        try{
            await api('/api/return',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({isbn,user})});
            msg.style.color = '#28a745';
            msg.textContent = 'Return recorded';
            loadAllBooks();
        }catch(e){ msg.style.color = '#d9534f'; msg.textContent = 'Error: '+(e.error||e); }
    });

    document.getElementById('loadReport').addEventListener('click', loadReport);

    // initial load
    loadAllBooks();
    loadReport();
});
