import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Wallet, TrendingUp, TrendingDown, LayoutDashboard, ArrowLeftRight, Target, LogOut, Plus, Trash2, Download, Search, X, Menu, Sparkles, Eye, EyeOff } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const CATEGORIES = ["Salary","Freelance","Food","Transport","Shopping","Bills","Rent","Health","Education","Entertainment","Other"];
const COLORS = ["#8b7cff","#36c99a","#ffb86b","#f27891","#63b3ed","#d69bf5","#9bcf79","#f5d76e"];
const money = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n || 0);
const monthNow = () => new Date().toISOString().slice(0,7);
const dateNow = () => new Date().toISOString().slice(0,10);

function App() {
  const [token,setToken] = useState(localStorage.getItem("finora_token") || "");
  const [user,setUser] = useState(JSON.parse(localStorage.getItem("finora_user") || "null"));
  const [authMode,setAuthMode] = useState("login");
  const [authForm,setAuthForm] = useState({name:"",email:"",password:""});
  const [showPassword,setShowPassword] = useState(false);
  const [transactions,setTransactions] = useState([]);
  const [budgets,setBudgets] = useState([]);
  const [page,setPage] = useState("overview");
  const [modal,setModal] = useState(false);
  const [budgetModal,setBudgetModal] = useState(false);
  const [form,setForm] = useState({title:"",amount:"",type:"expense",category:"Food",date:dateNow(),note:""});
  const [budgetAmount,setBudgetAmount] = useState("");
  const [filter,setFilter] = useState({search:"",type:"all",category:"all",month:"all"});
  const [toast,setToast] = useState("");
  const [loading,setLoading] = useState(false);
  const [sidebar,setSidebar] = useState(false);

  const headers = { headers: { Authorization: `Bearer ${token}` } };
  const notify = msg => { setToast(msg); setTimeout(()=>setToast(""),2600); };
  const logout = () => { localStorage.removeItem("finora_token"); localStorage.removeItem("finora_user"); setToken(""); setUser(null); setTransactions([]); setBudgets([]); };

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [t,b] = await Promise.all([axios.get(`${API}/transactions`,headers),axios.get(`${API}/budgets`,headers)]);
      setTransactions(t.data); setBudgets(b.data);
    } catch(e) { if(e.response?.status===401) logout(); else notify(e.response?.data?.message || "Could not load your data."); }
    finally { setLoading(false); }
  };
  useEffect(()=>{loadData();},[token]);

  const filtered = useMemo(()=>transactions.filter(t=>{
    const q=filter.search.toLowerCase();
    return (!q || t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)) &&
      (filter.type==="all" || t.type===filter.type) &&
      (filter.category==="all" || t.category===filter.category) &&
      (filter.month==="all" || t.date.slice(0,7)===filter.month);
  }),[transactions,filter]);

  const totalIncome = transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const totalExpense = transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const balance = totalIncome-totalExpense;
  const month = monthNow();
  const monthExpense = transactions.filter(t=>t.type==="expense" && t.date.slice(0,7)===month).reduce((s,t)=>s+t.amount,0);
  const currentBudget = budgets.find(b=>b.month===month);
  const pieData = CATEGORIES.map(category=>({name:category,value:transactions.filter(t=>t.type==="expense"&&t.category===category).reduce((s,t)=>s+t.amount,0)})).filter(x=>x.value>0);
  const barData = Array.from({length:6},(_,i)=>{
    const d=new Date(); d.setMonth(d.getMonth()-5+i);
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    return {month:d.toLocaleString("en-IN",{month:"short"}),income:transactions.filter(t=>t.type==="income"&&t.date.slice(0,7)===key).reduce((s,t)=>s+t.amount,0),expense:transactions.filter(t=>t.type==="expense"&&t.date.slice(0,7)===key).reduce((s,t)=>s+t.amount,0)};
  });

  const submitAuth = async e => {
    e.preventDefault();
    try {
      const endpoint=authMode==="login"?"login":"register";
      const {data}=await axios.post(`${API}/auth/${endpoint}`,authForm);
      localStorage.setItem("finora_token",data.token); localStorage.setItem("finora_user",JSON.stringify(data.user));
      setToken(data.token); setUser(data.user); notify("Welcome to Finora!");
    } catch(e) { notify(e.response?.data?.message || "Authentication failed."); }
  };
  const addTransaction = async e => {
    e.preventDefault();
    try {
      const {data}=await axios.post(`${API}/transactions`,form,headers);
      setTransactions(prev=>[data,...prev]); setModal(false);
      setForm({title:"",amount:"",type:"expense",category:"Food",date:dateNow(),note:""});
      notify("Transaction added successfully.");
    } catch(e) { notify(e.response?.data?.message || "Could not add transaction."); }
  };
  const deleteTransaction = async id => {
    try { await axios.delete(`${API}/transactions/${id}`,headers); setTransactions(prev=>prev.filter(t=>t._id!==id)); notify("Transaction deleted."); }
    catch { notify("Could not delete transaction."); }
  };
  const saveBudget = async e => {
    e.preventDefault();
    try { const {data}=await axios.put(`${API}/budgets/${month}`,{amount:budgetAmount},headers); setBudgets(prev=>[...prev.filter(b=>b.month!==month),data]); setBudgetModal(false); notify("Monthly budget saved."); }
    catch(e) { notify(e.response?.data?.message || "Could not save budget."); }
  };
  const exportCSV = () => {
    const rows=[["Title","Type","Category","Amount","Date","Note"],...filtered.map(t=>[t.title,t.type,t.category,t.amount,t.date,t.note||""])];
    const csv=rows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); const a=document.createElement("a"); a.href=url; a.download="finora-transactions.csv"; a.click(); URL.revokeObjectURL(url);
  };

  if(!token) return <div className="auth-screen"><motion.div className="auth-card" initial={{opacity:0,y:24}} animate={{opacity:1,y:0}}><div className="brand-mark"><Wallet size={23}/></div><div className="eyebrow">YOUR MONEY, IN FOCUS</div><h1>Welcome to <span>Finora</span></h1><p className="muted">A clearer view of every rupee.</p><form onSubmit={submitAuth} className="form-stack">{authMode==="register"&&<label>Full name<input required value={authForm.name} onChange={e=>setAuthForm({...authForm,name:e.target.value})} placeholder="Your name"/></label>}<label>Email address<input required type="email" value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="you@example.com"/></label><label>Password<div className="password-wrap"><input required minLength="6" type={showPassword?"text":"password"} value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} placeholder="At least 6 characters"/><button type="button" className="eye-btn" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label><button className="primary-btn full-btn">{authMode==="login"?"Sign in":"Create account"}</button></form><p className="switch-auth">{authMode==="login"?"New to Finora?":"Already have an account?"} <button onClick={()=>setAuthMode(authMode==="login"?"register":"login")}>{authMode==="login"?"Create account":"Sign in"}</button></p><div className="secure-note"><Sparkles size={14}/> Private workspace · Secure JWT sign-in</div></motion.div><Toast toast={toast}/></div>;

  return <div className="app-shell">
    <aside className={`sidebar ${sidebar?"sidebar-open":""}`}><div className="brand"><div className="brand-mark small"><Wallet size={19}/></div><span>finora</span><button className="mobile-close" onClick={()=>setSidebar(false)}><X size={18}/></button></div><div className="side-label">WORKSPACE</div><nav>{[{id:"overview",label:"Overview",icon:LayoutDashboard},{id:"transactions",label:"Transactions",icon:ArrowLeftRight},{id:"budgets",label:"Budgets",icon:Target}].map(item=><button key={item.id} className={`nav-item ${page===item.id?"active":""}`} onClick={()=>{setPage(item.id);setSidebar(false)}}><item.icon size={18}/>{item.label}</button>)}</nav><div className="sidebar-bottom"><div className="profile"><div className="avatar">{user?.name?.[0]?.toUpperCase()||"U"}</div><div className="profile-info"><b>{user?.name}</b><span>Personal account</span></div><button className="icon-btn" title="Log out" onClick={logout}><LogOut size={17}/></button></div></div></aside>
    {sidebar&&<div className="scrim" onClick={()=>setSidebar(false)}/>}
    <main className="main-area"><header className="topbar"><button className="mobile-menu icon-btn" onClick={()=>setSidebar(true)}><Menu size={20}/></button><div><div className="eyebrow">PERSONAL FINANCE</div><div className="top-title">{page==="overview"?"Overview":page==="transactions"?"Transactions":"Your budgets"}</div></div><div className="top-actions"><span className="date-chip">{new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</span><button className="primary-btn add-top" onClick={()=>setModal(true)}><Plus size={17}/> Add transaction</button></div></header>
      <div className="content"><AnimatePresence mode="wait"><motion.div key={page} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.22}}>
      {page==="overview"&&<><div className="welcome-row"><div><h1>Good {new Date().getHours()<12?"morning":new Date().getHours()<18?"afternoon":"evening"}, {user?.name?.split(" ")[0]} <span className="wave">✦</span></h1><p className="muted">Here's what's happening with your money.</p></div><button className="outline-btn" onClick={exportCSV}><Download size={16}/> Export CSV</button></div>
        <div className="stats-grid"><StatCard title="Total balance" value={money(balance)} icon={Wallet} tone="violet" hint="Income minus expenses"/><StatCard title="Total income" value={money(totalIncome)} icon={TrendingUp} tone="green" hint="All recorded income"/><StatCard title="Total expenses" value={money(totalExpense)} icon={TrendingDown} tone="rose" hint="All recorded spending"/></div>
        <div className="dashboard-grid"><section className="panel chart-panel"><div className="panel-head"><div><h3>Cash flow</h3><p>Income vs expenses · Last 6 months</p></div><span className="live-dot">LIVE</span></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={barData} barGap={7}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#29334a"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:"#8d98ae",fontSize:12}}/><YAxis axisLine={false} tickLine={false} tick={{fill:"#8d98ae",fontSize:11}} tickFormatter={v=>v>=1000?`${v/1000}k`:v}/><Tooltip formatter={v=>money(v)} contentStyle={{background:"#151d30",border:"1px solid #263149",borderRadius:"10px",color:"#edf0fa"}} labelStyle={{color:"#edf0fa"}} itemStyle={{color:"#cbd2e3"}}/><Bar dataKey="income" fill="#36c99a" radius={[5,5,0,0]} maxBarSize={23}/><Bar dataKey="expense" fill="#8b7cff" radius={[5,5,0,0]} maxBarSize={23}/></BarChart></ResponsiveContainer></div><div className="legend"><span><i className="green-dot"/> Income</span><span><i className="purple-dot"/> Expenses</span></div></section>
        <section className="panel chart-panel"><div className="panel-head"><div><h3>Spending breakdown</h3><p>Expenses by category</p></div></div>{pieData.length?<><div className="pie-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>{pieData.map((x,i)=><Cell key={x.name} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={v=>money(v)} contentStyle={{background:"#151d30",border:"1px solid #263149",borderRadius:"10px",color:"#edf0fa"}} labelStyle={{color:"#edf0fa"}} itemStyle={{color:"#cbd2e3"}}/></PieChart></ResponsiveContainer></div><div className="category-legend">{pieData.slice(0,5).map((x,i)=><span key={x.name}><i style={{background:COLORS[i%COLORS.length]}}/>{x.name}<b>{money(x.value)}</b></span>)}</div></>:<EmptySmall text="Add expenses to see your spending breakdown."/>}</section></div>
        <section className="panel recent-panel"><div className="panel-head"><div><h3>Recent transactions</h3><p>Your latest money activity</p></div><button className="text-btn" onClick={()=>setPage("transactions")}>View all <span>→</span></button></div><TransactionTable rows={transactions.slice(0,5)} onDelete={deleteTransaction}/></section>
      </>}
      {page==="transactions"&&<><div className="page-heading"><div><h1>All transactions</h1><p className="muted">Track and manage every movement.</p></div><button className="outline-btn" onClick={exportCSV}><Download size={16}/> Export CSV</button></div><section className="panel"><div className="filters"><div className="search-box"><Search size={17}/><input placeholder="Search transactions..." value={filter.search} onChange={e=>setFilter({...filter,search:e.target.value})}/></div><select value={filter.type} onChange={e=>setFilter({...filter,type:e.target.value})}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option></select><select value={filter.category} onChange={e=>setFilter({...filter,category:e.target.value})}><option value="all">All categories</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select><input aria-label="Filter month" type="month" value={filter.month==="all"?"":filter.month} onChange={e=>setFilter({...filter,month:e.target.value||"all"})}/></div><TransactionTable rows={filtered} onDelete={deleteTransaction}/></section></>}
      {page==="budgets"&&<><div className="page-heading"><div><h1>Budget planner</h1><p className="muted">Set a monthly limit and keep spending on track.</p></div><button className="primary-btn" onClick={()=>{setBudgetAmount(currentBudget?.amount||"");setBudgetModal(true)}}><Plus size={17}/> Set monthly budget</button></div><section className="budget-hero panel"><div><div className="eyebrow">CURRENT MONTH · {new Date().toLocaleString("en-IN",{month:"long",year:"numeric"}).toUpperCase()}</div><h2>{money(currentBudget?.amount||0)}</h2><p className="muted">Your monthly spending limit</p></div><div className="budget-ring"><strong>{currentBudget?Math.min(100,Math.round(monthExpense/currentBudget.amount*100)):0}%</strong><span>used</span></div></section><section className="panel budget-detail"><div className="panel-head"><div><h3>Monthly progress</h3><p>Expenses recorded this month</p></div></div><div className="progress-meta"><span>Spent <b>{money(monthExpense)}</b></span><span>Remaining <b>{money(Math.max(0,(currentBudget?.amount||0)-monthExpense))}</b></span></div><div className="progress-track"><div style={{width:`${currentBudget?Math.min(100,monthExpense/currentBudget.amount*100):0}%`}}/></div>{!currentBudget&&<EmptySmall text="Set your first monthly budget to start tracking progress."/>}</section><h3 className="section-title">Budget history</h3><div className="budget-list">{budgets.map(b=><div className="budget-row panel" key={b._id}><div><b>{new Date(`${b.month}-02`).toLocaleString("en-IN",{month:"long",year:"numeric"})}</b><span>Monthly limit</span></div><strong>{money(b.amount)}</strong></div>)}{!budgets.length&&<div className="panel"><EmptySmall text="Your saved budgets will appear here."/></div>}</div></>}
      </motion.div></AnimatePresence>{loading&&<div className="loading-line">Syncing your data…</div>}</div>
    </main>
    <AnimatePresence>{modal&&<Modal title="Add transaction" onClose={()=>setModal(false)}><form onSubmit={addTransaction} className="form-stack"><div className="type-switch"><button type="button" className={form.type==="expense"?"selected expense":"expense"} onClick={()=>setForm({...form,type:"expense",category:"Food"})}>Expense</button><button type="button" className={form.type==="income"?"selected income":"income"} onClick={()=>setForm({...form,type:"income",category:"Salary"})}>Income</button></div><label>Title<input required maxLength="70" placeholder="e.g. Grocery shopping" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><div className="two-fields"><label>Amount (₹)<input required type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.filter(c=>form.type==="income"?["Salary","Freelance","Other"].includes(c):!["Salary","Freelance"].includes(c)).map(c=><option key={c}>{c}</option>)}</select></label></div><label>Date<input required type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>Note (optional)<input maxLength="160" placeholder="Add a short note" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/></label><button className="primary-btn full-btn">Save transaction</button></form></Modal>}</AnimatePresence>
    <AnimatePresence>{budgetModal&&<Modal title="Set monthly budget" onClose={()=>setBudgetModal(false)}><form onSubmit={saveBudget} className="form-stack"><p className="muted">Set your spending limit for {new Date().toLocaleString("en-IN",{month:"long",year:"numeric"})}.</p><label>Budget amount (₹)<input required type="number" min="1" step="1" placeholder="e.g. 25000" value={budgetAmount} onChange={e=>setBudgetAmount(e.target.value)}/></label><button className="primary-btn full-btn">Save budget</button></form></Modal>}</AnimatePresence>
    <Toast toast={toast}/>
  </div>;
}

function StatCard({title,value,icon:Icon,tone,hint}) { return <motion.div className="stat-card" whileHover={{y:-4}} transition={{duration:.18}}><div className={`stat-icon ${tone}`}><Icon size={19}/></div><div className="stat-title">{title}</div><div className="stat-value">{value}</div><div className="stat-hint">{hint}</div></motion.div>; }
function TransactionTable({rows,onDelete}) { return <div className="table-wrap">{rows.length?<table><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>AMOUNT</th><th></th></tr></thead><tbody>{rows.map(t=><tr key={t._id}><td><div className="transaction-name"><div className={`transaction-icon ${t.type}`}>{t.type==="income"?<TrendingUp size={16}/>:<TrendingDown size={16}/>}</div><div><b>{t.title}</b><span>{t.note||t.type}</span></div></div></td><td><span className="category-pill">{t.category}</span></td><td className="date-cell">{new Date(t.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</td><td className={`amount-cell ${t.type}`}>{t.type==="income"?"+":"−"}{money(t.amount)}</td><td><button className="delete-btn" title="Delete transaction" onClick={()=>onDelete(t._id)}><Trash2 size={16}/></button></td></tr>)}</tbody></table>:<EmptySmall text="No transactions found. Add your first transaction to get started."/>}</div>; }
function EmptySmall({text}) { return <div className="empty-state"><div className="empty-icon"><Wallet size={20}/></div><p>{text}</p></div>; }
function Modal({title,onClose,children}) { return <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e=>e.target===e.currentTarget&&onClose()}><motion.div className="modal-card" initial={{opacity:0,y:18,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:12}}><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X size={19}/></button></div>{children}</motion.div></motion.div>; }
function Toast({toast}) { return <AnimatePresence>{toast&&<motion.div className="toast" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}>{toast}</motion.div>}</AnimatePresence>; }

export default App;
