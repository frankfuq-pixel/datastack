const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const DATA_FILE = path.join(__dirname, 'data.json');
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

function readData(){
  try{ const txt = fs.readFileSync(DATA_FILE, 'utf8'); return JSON.parse(txt||'[]'); }catch(e){ return []; }
}
function writeData(d){ fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2), 'utf8'); }

// book storage lives in a separate file so we can manage both student and book collections
const BOOK_FILE = path.join(__dirname, 'books.json');
function readBooks(){
  try{ const txt = fs.readFileSync(BOOK_FILE, 'utf8'); return JSON.parse(txt||'[]'); }catch(e){ return []; }
}
function writeBooks(d){ fs.writeFileSync(BOOK_FILE, JSON.stringify(d, null, 2), 'utf8'); }

app.get('/api/ping', (req,res)=> res.json({ok:true}));

app.get('/api/students', (req,res)=>{
  const data = readData(); res.json(data);
});

app.post('/api/students', (req,res)=>{
  const data = readData();
  const student = req.body;
  if(!student || !student.id) return res.status(400).json({error:'invalid student'});
  if(data.some(s=>s.id===student.id)) return res.status(409).json({error:'id exists'});
  data.push(student);
  writeData(data);
  res.status(201).json(student);
});

app.put('/api/students', (req,res)=>{
  const body = req.body;
  if(!Array.isArray(body)) return res.status(400).json({error:'expected array'});
  writeData(body);
  res.json({ok:true});
});

app.put('/api/students/:id', (req,res)=>{
  const id = req.params.id; const updates = req.body || {};
  const data = readData();
  const idx = data.findIndex(s=>s.id===id);
  if(idx === -1) return res.status(404).json({error:'not found'});
  data[idx] = Object.assign({}, data[idx], updates);
  writeData(data);
  res.json(data[idx]);
});

app.post('/api/reissue/:id', (req,res)=>{
  const id = req.params.id; const data = readData();
  const s = data.find(x=>x.id===id);
  if(!s) return res.status(404).json({error:'not found'});
  s.needsReissue = false;
  s.issuedCount = (s.issuedCount||0) + 1;
  s.lastIssued = new Date().toLocaleString();
  writeData(data);
  res.json(s);
});

// ---- library/book endpoints ----

app.get('/api/books', (req,res)=>{
  const books = readBooks();
  // optional search query
  const {q} = req.query;
  if(q){
    const lower = q.toLowerCase();
    return res.json(books.filter(b=>
      (b.title||'').toLowerCase().includes(lower) ||
      (b.author||'').toLowerCase().includes(lower) ||
      (b.isbn||'').toLowerCase().includes(lower) ||
      (b.genre||'').toLowerCase().includes(lower)
    ));
  }
  res.json(books);
});

app.post('/api/books', (req,res)=>{
  const book = req.body;
  if(!book || !book.isbn) return res.status(400).json({error:'invalid book'});
  const books = readBooks();
  if(books.some(b=>b.isbn===book.isbn)) return res.status(409).json({error:'isbn exists'});
  book.totalCopies = book.totalCopies||1;
  book.availableCopies = book.totalCopies;
  book.borrowHistory = [];
  books.push(book);
  writeBooks(books);
  res.status(201).json(book);
});

app.put('/api/books/:isbn', (req,res)=>{
  const isbn = req.params.isbn;
  const updates = req.body || {};
  const books = readBooks();
  const idx = books.findIndex(b=>b.isbn===isbn);
  if(idx === -1) return res.status(404).json({error:'not found'});
  const book = Object.assign({}, books[idx], updates);
  // keep inventory counts consistent
  if(updates.totalCopies !== undefined){
    const diff = updates.totalCopies - books[idx].totalCopies;
    book.availableCopies = (books[idx].availableCopies||0) + diff;
  }
  books[idx] = book;
  writeBooks(books);
  res.json(book);
});

app.post('/api/borrow', (req,res)=>{
  const {isbn,user,dueDate} = req.body;
  if(!isbn || !user) return res.status(400).json({error:'missing fields'});
  const books = readBooks();
  const book = books.find(b=>b.isbn===isbn);
  if(!book) return res.status(404).json({error:'book not found'});
  if(book.availableCopies <= 0) return res.status(409).json({error:'no copies available'});
  book.availableCopies--; 
  const record = {user, dateBorrowed: new Date().toISOString(), dueDate: dueDate||null, returnedDate: null};
  book.borrowHistory = book.borrowHistory || [];
  book.borrowHistory.push(record);
  writeBooks(books);
  res.json({ok:true,record,available:book.availableCopies});
});

app.post('/api/return', (req,res)=>{
  const {isbn,user} = req.body;
  if(!isbn || !user) return res.status(400).json({error:'missing fields'});
  const books = readBooks();
  const book = books.find(b=>b.isbn===isbn);
  if(!book) return res.status(404).json({error:'book not found'});
  // find last borrow record for this user without returnedDate
  const rec = (book.borrowHistory||[]).slice().reverse().find(r=>r.user===user && !r.returnedDate);
  if(!rec) return res.status(404).json({error:'borrow record not found'});
  rec.returnedDate = new Date().toISOString();
  book.availableCopies++;
  writeBooks(books);
  res.json({ok:true,record:rec,available:book.availableCopies});
});

// simple report endpoint
app.get('/api/reports/summary', (req,res)=>{
  const books = readBooks();
  const total = books.length;
  const totalCopies = books.reduce((p,b)=>p+(b.totalCopies||0),0);
  const available = books.reduce((p,b)=>p+(b.availableCopies||0),0);
  res.json({totalBooks: total, totalCopies, availableCopies: available});
});

// Server-side expiry checker (runs every minute)
setInterval(()=>{
  try{
    const data = readData();
    const today = new Date();
    let changed = false;
    data.forEach(s=>{
      if(s.expiry){
        const ex = new Date(s.expiry + 'T23:59:59');
        if(ex < today && !s.needsReissue){ s.needsReissue = true; changed = true; }
      }
    });
    if(changed) writeData(data);
  }catch(e){ console.error('expiry-check failed', e); }
}, 60 * 1000);

app.listen(PORT, ()=> console.log(`Reissue server running on http://localhost:${PORT}`));