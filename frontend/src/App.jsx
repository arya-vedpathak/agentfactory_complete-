import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bot, BriefcaseBusiness,
  Check, CheckCircle2, ChevronDown, ChevronRight, CircleDot, Clock3, Code2,
  Command, Download, FileCode2, FolderKanban, Gauge, LayoutDashboard, LoaderCircle,
  Menu, MessageSquareText, BrainCircuit, Plus, Rocket, Search, Mic, ShieldCheck, Sparkles, Terminal,
  WandSparkles, X, Zap, Pencil, Trash2, Save, FileText
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const samplePrompts = [
  { label: 'Operations', title: 'Inventory & order operations', prompt: 'Build an inventory and order management platform for a growing retail business. Include SKU tracking, low-stock alerts, purchase orders, order fulfilment, supplier records and an operations dashboard.' },
  { label: 'Customer experience', title: 'Customer support portal', prompt: 'Build a customer support portal for a SaaS company. Include customer accounts, ticket intake, priority and status workflows, agent assignment, knowledge base and service performance reporting.' },
  { label: 'Finance', title: 'Expense approval workflow', prompt: 'Build an expense management and approval system for a 100-person company. Include employee submissions, receipt records, manager approvals, budget categories, audit history and finance reporting.' },
]
const stages = [
  { id: 'requirements', label: 'Discover', detail: 'Translate the business brief', icon: MessageSquareText },
  { id: 'plan', label: 'Design', detail: 'Map scope and delivery plan', icon: FolderKanban },
  { id: 'build', label: 'Build', detail: 'Assemble project artifacts', icon: Code2 },
  { id: 'test', label: 'Validate', detail: 'Run structural quality checks', icon: ShieldCheck },
]

function App() {
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [apiMode, setApiMode] = useState('checking')
  const [mobileNav, setMobileNav] = useState(false)
  const [memories, setMemories] = useState([])
const [memoryLoading, setMemoryLoading] = useState(false)
const [memoryError, setMemoryError] = useState('')
  const [memorySearch, setMemorySearch] = useState('')

  const [editingProject, setEditingProject] = useState(null)
  const [editorFiles, setEditorFiles] = useState([])
  const [selectedFile, setSelectedFile] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [editorMode, setEditorMode] = useState('choose')
  const [aiInstruction, setAiInstruction] = useState('')
  const [aiProposal, setAiProposal] = useState(null)
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSaved, setEditSaved] = useState(false)

  const [activeView, setActiveView] = useState('overview')

  useEffect(() => {
    fetch(`${API}/api/health`).then(r => r.json()).then(d => setApiMode(d.ai_mode || 'fallback')).catch(() => setApiMode('offline'))
  }, [])

  useEffect(() => {
    refreshMemories()
  }, [])

  async function refreshMemories() {
    setMemoryLoading(true)
    setMemoryError('')
    try {
      const response = await fetch(`${API}/api/memory`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Could not load memories')
      setMemories(data.memories || [])
    } catch (e) {
      setMemoryError(e.message || 'Could not connect to memory API')
    } finally {
      setMemoryLoading(false)
    }
  }

  async function loadMemory() {
    setActiveView('memory')
    setMobileNav(false)
    await refreshMemories()
    document.getElementById('memory-context')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function generate() {
    if (prompt.trim().length < 8 || busy) return
    setBusy(true); setError(''); setResult(null); setActiveView('overview')
    try {
      const response = await fetch(`${API}/api/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Generation failed. Check that the backend is running.')
      setResult(data)
      await refreshMemories()
      setTimeout(() => document.getElementById('delivery')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } catch (e) { setError(e.message || 'Could not connect to the API.') }
    finally { setBusy(false) }
  }

  function selectMemory(memory) {
    const outcome = memory.outcome || {}
    const events = [
      ...(memory.requirements ? [{ stage: 'requirements', status: 'completed' }] : []),
      ...(memory.plan ? [{ stage: 'plan', status: 'completed' }] : []),
      ...(outcome.build?.status ? [{ stage: 'build', status: outcome.build.status === 'success' ? 'completed' : outcome.build.status }] : []),
      ...(outcome.tests?.status ? [{ stage: 'test', status: outcome.tests.status === 'passed' ? 'completed' : outcome.tests.status }] : [])
    ]

    setPrompt(memory.prompt || '')
    setResult({
      requirements: memory.requirements || { project_name: memory.project_name, summary: memory.prompt },
      plan: memory.plan || {},
      build: outcome.build || {},
      tests: outcome.tests || {},
      events
    })
    setError('')
    setActiveView('overview')
    setTimeout(() => document.getElementById('delivery')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }
  function downloadZip() {
    if (result?.build?.project_id) window.open(`${API}/api/download/${encodeURIComponent(result.build.project_id)}`, '_blank', 'noopener,noreferrer')
  }


  async function openProjectEditor(memory) {
    if (!memory?.id || !memory?.outcome?.build?.project_id) {
      window.alert('This history record has no editable generated project.')
      return
    }

    setEditingProject(memory)
    setEditorFiles([])
    setSelectedFile('')
    setFileContent('')
    setEditorMode('choose')
    setAiInstruction('')
    setAiProposal(null)
    setEditError('')
    setEditSaved(false)
    setEditBusy(true)

    try {
      const response = await fetch(`${API}/api/projects/${encodeURIComponent(memory.id)}/files`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Could not load project files.')

      setEditorFiles(data.files || [])
      if (data.files?.length) {
        setSelectedFile(data.files[0].path)
        setFileContent(data.files[0].content)
      }
    } catch (e) {
      setEditError(e.message || 'Could not load project files.')
    } finally {
      setEditBusy(false)
    }
  }

  function chooseEditorFile(path) {
    const file = editorFiles.find(item => item.path === path)
    if (!file) return
    setSelectedFile(file.path)
    setFileContent(file.content)
    setEditSaved(false)
    setEditError('')
  }

  async function saveEditorFile() {
    if (!editingProject || !selectedFile || editBusy) return
    setEditBusy(true)
    setEditError('')
    setEditSaved(false)

    try {
      const response = await fetch(`${API}/api/projects/${encodeURIComponent(editingProject.id)}/file`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedFile, content: fileContent })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Could not save this file.')

      setEditorFiles(files => files.map(file =>
        file.path === selectedFile ? { ...file, content: fileContent } : file
      ))
      setEditSaved(true)
    } catch (e) {
      setEditError(e.message || 'Could not save this file.')
    } finally {
      setEditBusy(false)
    }
  }

  async function requestAIEdit() {
    if (!editingProject || aiInstruction.trim().length < 5 || editBusy) return
    setEditBusy(true)
    setEditError('')
    setEditSaved(false)
    setAiProposal(null)

    try {
      const response = await fetch(`${API}/api/projects/${encodeURIComponent(editingProject.id)}/ai-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: aiInstruction.trim() })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'AI could not prepare an edit.')

      setAiProposal(data)
      if (!data.changes?.length) {
        setEditError(data.summary || 'AI did not propose any file changes.')
      }
    } catch (e) {
      setEditError(e.message || 'AI editing failed. Check the backend and Groq configuration.')
    } finally {
      setEditBusy(false)
    }
  }

  async function applyAIEdit() {
    if (!editingProject || !aiProposal?.changes?.length || editBusy) return
    if (!window.confirm('Apply the reviewed AI changes to this project? Original files will be backed up.')) return

    setEditBusy(true)
    setEditError('')
    setEditSaved(false)

    try {
      const response = await fetch(`${API}/api/projects/${encodeURIComponent(editingProject.id)}/apply-ai-edits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes: aiProposal.changes })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Could not apply AI changes.')

      const filesResponse = await fetch(`${API}/api/projects/${encodeURIComponent(editingProject.id)}/files`)
      const filesData = await filesResponse.json()
      if (!filesResponse.ok) throw new Error(filesData.detail || 'Changes were applied, but the file list could not refresh.')

      setEditorFiles(filesData.files || [])
      const refreshed = (filesData.files || []).find(file => file.path === selectedFile)
      if (refreshed) setFileContent(refreshed.content)
      setAiProposal(null)
      setEditSaved(true)
      await refreshMemories()
    } catch (e) {
      setEditError(e.message || 'Could not apply AI changes.')
    } finally {
      setEditBusy(false)
    }
  }

  async function deleteProjectHistory(memory) {
    if (!memory?.id) return
    const confirmed = window.confirm(
      `Delete "${memory.project_name || 'Untitled Project'}" from project history? The generated project files will not be deleted.`
    )
    if (!confirmed) return

    try {
      const response = await fetch(`${API}/api/memory/${encodeURIComponent(memory.id)}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Could not delete this history record.')

      if (editingProject?.id === memory.id) setEditingProject(null)
      await refreshMemories()
    } catch (e) {
      window.alert(e.message || 'Could not delete this history record.')
    }
  }

  function finishProjectEditing() {
    if (editingProject) selectMemory(editingProject)
    setEditingProject(null)
    setAiProposal(null)
    setEditError('')
    setEditSaved(false)
  }

  const completed = useMemo(() => new Set((result?.events || []).filter(e => ['completed', 'success', 'passed'].includes(e.status)).map(e => e.stage)), [result])
  const failedStage = result?.events?.find(e => e.status === 'failed')?.stage
  const taskCount = result?.plan?.tasks?.length || 0
  const fileCount = result?.build?.files?.length || 0
  const passed = result?.tests?.passed || 0
  const failed = result?.tests?.failed || 0
  const testRate = Math.round((passed / Math.max(1, passed + failed)) * 100)

  function startFresh() { setPrompt(''); setResult(null); setError(''); setActiveView('overview'); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return <div className="app-shell min-h-screen">
    <aside className={`sidebar ${mobileNav ? 'sidebar--open' : ''}`}>
      <div className="brand-lockup">
        <div className="brand-symbol"><img src="/parivestra-logo.png" alt="" /></div><div className="brand-copy"><strong>PARIVESTRA</strong><small>AGENT FACTORY</small></div>
        <button className="icon-button sidebar-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18}/></button>
      </div>

      <div className="workspace-switcher">
        <div className="workspace-avatar">N</div>
        <div className="workspace-meta"><span>WORKSPACE</span><strong>Northstar Studio</strong></div>
        <ChevronDown size={15}/>
      </div>

      <div className="nav-caption">WORKSPACE</div>
      <nav className="side-nav">
        <button className={`side-link ${activeView === 'overview' ? 'is-active' : ''}`} onClick={() => { setActiveView('overview'); setMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><LayoutDashboard size={17}/> <span>Overview</span><span className="active-rail"/></button>
        <button className={`side-link ${activeView === 'initiatives' ? 'is-active' : ''}`} onClick={() => { setActiveView('initiatives'); setMobileNav(false); document.querySelector('.intake-layout')?.previousElementSibling?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}><Plus size={17}/> <span>Initiatives</span><span className="active-rail"/></button>
        <button className={`side-link ${activeView === 'memory' ? 'is-active' : ''}`} onClick={loadMemory}><BrainCircuit size={17}/> <span>Memory Context</span><span className="active-rail"/></button>
        <button className={`side-link ${activeView === 'deliverables' ? 'is-active' : ''}`} onClick={() => { setActiveView('deliverables'); setMobileNav(false); document.getElementById('delivery')?.scrollIntoView({ behavior: 'smooth' }) }}><FolderKanban size={17}/> <span>Deliverables</span>{result && <b className="nav-count">1</b>}<span className="active-rail"/></button>
      </nav>

      <div className="nav-caption nav-caption--agents">FACTORY TEAM</div>
      <div className="agent-roster">
        <div className="agent-row"><span className="agent-avatar agent-avatar--violet">01</span><span><b>Discovery agent</b><small>Business requirements</small></span><i className="agent-state"/></div>
        <div className="agent-row"><span className="agent-avatar agent-avatar--blue">02</span><span><b>Solution architect</b><small>Scope & work plan</small></span><i className="agent-state"/></div>
        <div className="agent-row"><span className="agent-avatar agent-avatar--orange">03</span><span><b>Build engineer</b><small>Project scaffolding</small></span><i className="agent-state"/></div>
        <div className="agent-row"><span className="agent-avatar agent-avatar--green">04</span><span><b>Quality analyst</b><small>Output validation</small></span><i className="agent-state"/></div>
      </div>

      <div className="sidebar-spacer"/>
      <div className="sidebar-status">
        <div className="status-orb"><Activity size={16}/></div>
        <div><b>Factory status</b><small>{apiMode === 'groq' ? 'AI engine connected' : apiMode === 'fallback' ? 'Fallback engine active' : apiMode === 'offline' ? 'Backend unavailable' : 'Checking connection'}</small></div>
        <span className={`status-indicator status-indicator--${apiMode}`}/>
      </div>
      <div className="profile-row"><div className="profile-avatar">AF</div><div><b>Admin workspace</b><small>Local environment</small></div><button className="icon-button" aria-label="Workspace options"><Command size={16}/></button></div>
    </aside>

    {mobileNav && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)}/>}

    <main className="main-area">
      <header className="topbar">
        <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20}/></button>
        <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14}/><strong>Business outcomes</strong></div>
        <div className="topbar-right">
          <div className={`connection-chip connection-chip--${apiMode}`}><span/>{apiMode === 'groq' ? 'Groq AI connected' : apiMode === 'fallback' ? 'Fallback mode' : apiMode === 'offline' ? 'API offline' : 'Connecting'}</div>
          <button className="icon-button search-button" aria-label="Search"><Search size={17}/></button>
          <div className="top-profile">AF</div>
        </div>
      </header>

      <div className="page-content">
        <section className="welcome-row">
          <div>
            <div className="overline"><span className="overline-mark"/> BUSINESS-LED SOFTWARE DELIVERY</div>
            <h1>Turn business needs into <em>working software.</em></h1>
            <p className="welcome-copy">One brief. A coordinated AI delivery team. A tangible project your business can build on.</p>
          </div>
          <div className="welcome-actions"><span className="date-label"><span className="pulse-dot"/> FACTORY READY</span><button className="quiet-button" onClick={startFresh}><Plus size={16}/> New initiative</button></div>
        </section>

        <section className="value-strip" aria-label="Factory value proposition">
          <div className="value-item"><div className="value-icon value-icon--violet"><Zap size={17}/></div><div><b>From ambiguity to scope</b><span>Business brief â†’ clear requirements</span></div></div>
          <div className="value-divider"/>
          <div className="value-item"><div className="value-icon value-icon--blue"><BriefcaseBusiness size={17}/></div><div><b>From scope to delivery</b><span>Prioritized plan â†’ project scaffold</span></div></div>
          <div className="value-divider"/>
          <div className="value-item"><div className="value-icon value-icon--green"><ShieldCheck size={17}/></div><div><b>From output to confidence</b><span>Files â†’ structural quality checks</span></div></div>
        </section>

        <div className="section-heading"><div><span className="section-index">01</span><div><h2>Start with the business outcome</h2><p>Tell the factory what needs to change for your team or customers.</p></div></div><span className="section-aside">PROJECT INTAKE <ArrowDownRight size={14}/></span></div>

        <section className="intake-layout">
          <div className="intake-card surface-card">
            <div className="intake-card-head"><div className="intake-icon"><WandSparkles size={19}/></div><div><span className="mini-label">NEW INITIATIVE</span><h3>What outcome are we solving for?</h3></div><span className="step-tag">STEP 01 <span>/ 01</span></span></div>
            <label className="field-label" htmlFor="business-brief">BUSINESS CHALLENGE / OPPORTUNITY</label>
            <textarea id="business-brief" value={prompt} maxLength={4000} onChange={e => setPrompt(e.target.value)} placeholder="Example: Our operations team loses hours every week reconciling inventory across spreadsheets. We need one place to track stock, flag shortages and coordinate replenishment..." />
            <div className="intake-foot"><span className="character-count">{prompt.length.toLocaleString()}/4,000 characters</span><button className="text-action" onClick={() => setPrompt(samplePrompts[0].prompt)}><Sparkles size={14}/> Use a business example</button></div>
            {error && <div className="error-banner"><X size={16}/><span>{error}</span></div>}
            {apiMode === 'fallback' && <div className="notice-line"><Activity size={14}/> AI key not detected. The factory will use its deterministic fallback mode.</div>}
            {apiMode === 'offline' && <div className="notice-line notice-line--error"><Activity size={14}/> Backend is offline. Start the API at localhost:8000.</div>}
            <div className="intake-submit-row"><div className="privacy-note"><ShieldCheck size={14}/><span>Your brief stays in this local workspace.</span></div><button className="launch-button" disabled={busy || prompt.trim().length < 8} onClick={generate}>{busy ? <><LoaderCircle className="spin" size={17}/> Factory working</> : <>Launch delivery <ArrowUpRight size={16}/></>}</button></div>
          </div>
          <aside className="examples-card">
            <div className="examples-head"><span className="mini-label">GET STARTED FASTER</span><span className="examples-spark"><Sparkles size={16}/></span></div>
            <h3>Choose a starting point</h3><p>Use a business scenario as a base, then tailor it to your needs.</p>
            <div className="example-list">{samplePrompts.map((item, index) => <button className="example-item" key={item.label} onClick={() => setPrompt(item.prompt)}><span className={`example-number example-number--${index}`}>0{index + 1}</span><span><small>{item.label}</small><b>{item.title}</b></span><ArrowUpRight size={15}/></button>)}</div>
            <div className="examples-foot"><span className="tiny-stars">âœ³ âœ³ âœ³</span> START WITH THE PROBLEM. NOT THE TECH STACK.</div>
          </aside>
        </section>

                <section className="initiatives-section" id="memory-context" style={{ marginBottom: 40 }}>
          <div className="section-heading">
            <div>
              <div>
                <h2>Memory Context</h2>
                <p>Created projects with Agent Factory.</p>
              </div>
            </div>
            <button className="quiet-button" onClick={refreshMemories}>Refresh</button>
          </div>

          <div className="intake-card surface-card" style={{ marginTop: 22, marginBottom: 25 }}>
            <div className="intake-card-head">
              <div className="intake-icon"><Search size={19}/></div>
              <div>
                <span className="mini-label">PROJECT DISCOVERY</span>
                <h3>Find your saved projects</h3>
              </div>
            </div>

            <label className="field-label" htmlFor="memory-search">SEARCH PROJECT NAME</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 9px', border: '1px solid #e5e6ed', borderRadius: 8, background: '#fbfbfd' }}>
              <Search size={18} style={{ color: '#9296a8', flexShrink: 0 }}/>
              <input
                id="memory-search"
                type="text"
                value={memorySearch}
                onChange={(e) => setMemorySearch(e.target.value)}
                placeholder="Search by project name..."
                aria-label="Search saved projects"
                style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', color: '#34394e', fontSize: 13, padding: '8px 0' }}
              />
              {memorySearch && <button className="text-action" onClick={() => setMemorySearch('')}>Clear</button>}
              <button
                type="button"
                title="Voice search"
                aria-label="Voice search"
                onClick={() => {
                  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
                  if (!SpeechRecognition) {
                    window.alert('Voice search is not supported in this browser. Please use Chrome.')
                    return
                  }
                  const recognition = new SpeechRecognition()
                  recognition.lang = 'en-IN'
                  recognition.interimResults = false
                  recognition.maxAlternatives = 1
                  recognition.onresult = (event) => setMemorySearch(event.results[0][0].transcript.trim())
                  recognition.onerror = () => window.alert('Voice search failed. Please try again.')
                  recognition.start()
                }}
                style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, flexShrink: 0, border: '1px solid #e8e5ff', borderRadius: 8, color: '#7568df', background: '#f2f0ff', cursor: 'pointer' }}
              >
                <Mic size={17}/>
              </button>
            </div>

            <div className="intake-foot">
              <span className="character-count">Search project names or use voice search</span>
              <span className="character-count">{memorySearch.length} characters</span>
            </div>

            <div style={{ marginTop: 14 }}>
              <span className="field-label">SUGGESTIONS</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {memories
                  .filter((memory, index, arr) => arr.findIndex(item => item.project_name === memory.project_name) === index)
                  .filter(memory => memory.project_name)
                  .filter(memory => !memorySearch.trim() || memory.project_name.toLowerCase().startsWith(memorySearch.trim().toLowerCase()))
                  .slice(0, 3)
                  .map((memory, index) => (
                    <button key={memory.id || index} className="text-action" onClick={() => setMemorySearch(memory.project_name)} style={{ padding: '6px 10px', border: '1px solid #ececf2', borderRadius: 20, background: '#fbfbfd' }}>
                      {memory.project_name}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <span className="field-label">PROJECT NAME HISTORY</span>
            <p style={{ margin: '3px 0 15px', color: '#9296a8', fontSize: 11 }}>
              {memorySearch.trim() ? 'Matching saved project names' : 'Your five most recently created projects'}
            </p>
          </div>

          {memoryLoading && <p>Loading saved projects...</p>}
          {memoryError && <div className="error-banner"><X size={16}/><span>{memoryError}</span></div>}

          {!memoryLoading && !memoryError && memories
            .filter((memory, index) => memorySearch.trim()
              ? (memory.project_name || '').toLowerCase().startsWith(memorySearch.trim().toLowerCase())
              : index < 5
            )
            .map((memory, index) => {
              const hasProject = Boolean(memory.outcome?.build?.project_id)
              return (
                <div className="history-row" key={memory.id || index}>
                  <button
                    type="button"
                    className="history-row-main"
                    onClick={() => selectMemory(memory)}
                    title="Open saved project"
                  >
                    <span className="history-row-number">{String(index + 1).padStart(2, '0')}</span>
                    <FolderKanban size={16} />
                    <span className="history-row-name">{memory.project_name || 'Untitled Project'}</span>
                  </button>

                  <div className="history-actions">
                    <button
                      type="button"
                      className="history-action"
                      title={hasProject ? 'Download project ZIP' : 'No generated project available'}
                      aria-label="Download project ZIP"
                      disabled={!hasProject}
                      onClick={() => window.open(
                        `${API}/api/download/${encodeURIComponent(memory.outcome.build.project_id)}`,
                        '_blank',
                        'noopener,noreferrer'
                      )}
                    >
                      <Download size={15} />
                    </button>

                    <button
                      type="button"
                      className="history-action"
                      title={hasProject ? 'Edit project' : 'No generated project available'}
                      aria-label="Edit project"
                      disabled={!hasProject}
                      onClick={() => openProjectEditor(memory)}
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      type="button"
                      className="history-action history-action-delete"
                      title="Delete history record"
                      aria-label="Delete history record"
                      onClick={() => deleteProjectHistory(memory)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}

          {!memoryLoading && !memoryError && memories
            .filter(memory => memorySearch.trim() && (memory.project_name || '').toLowerCase().startsWith(memorySearch.trim().toLowerCase()))
            .length === 0 && memorySearch.trim() && (
              <p style={{ padding: '16px 4px', color: '#9296a8', fontSize: 13 }}>
                {memorySearch.trim() ? 'No matching projects found.' : 'No saved projects yet.'}
              </p>
            )}
        </section>

        <section className="delivery-section" id="delivery">
          <div className="section-heading"><div><span className="section-index">02</span><div><h2>Delivery command center</h2><p>Follow the work from discovery through validation and handoff.</p></div></div><span className={`run-state ${busy ? 'run-state--busy' : result ? 'run-state--done' : ''}`}><i/>{busy ? 'IN PROGRESS' : result ? 'LATEST RUN COMPLETE' : 'AWAITING BRIEF'}</span></div>

          <div className="pipeline-card surface-card">
            <div className="pipeline-topline"><div><span className="mini-label">FOUR-STAGE DELIVERY PIPELINE</span><h3>{busy ? 'Your delivery team is at work' : result ? 'Delivery run summary' : 'A repeatable path from idea to implementation'}</h3></div><span className="pipeline-meta"><CircleDot size={13}/> {result ? `${completed.size}/4 stages complete` : 'READY WHEN YOU ARE'}</span></div>
            <div className="pipeline-track">{stages.map((stage, index) => {
              const done = completed.has(stage.id)
              const failed = failedStage === stage.id
              const Icon = stage.icon
              const active = busy && index === 0
              return <div className={`pipeline-stage ${done ? 'pipeline-stage--done' : ''} ${failed ? 'pipeline-stage--failed' : ''} ${active ? 'pipeline-stage--active' : ''}`} key={stage.id}>
                <div className="stage-node">{done ? <Check size={18}/> : failed ? <X size={18}/> : active ? <LoaderCircle className="spin" size={18}/> : <Icon size={18}/>}</div>
                <div className="stage-info"><b>{stage.label}</b><span>{stage.detail}</span></div>
                {index < stages.length - 1 && <div className={`stage-line ${done ? 'stage-line--done' : ''}`}/>} 
              </div>
            })}</div>
            <div className="pipeline-foot"><span><span className="legend-dot legend-dot--done"/> Completed</span><span><span className="legend-dot legend-dot--active"/> In progress</span><span><span className="legend-dot legend-dot--pending"/> Pending</span><span className="pipeline-foot-note">Human review remains part of production delivery.</span></div>
          </div>

          {!result && !busy && <div className="empty-delivery surface-card"><div className="empty-illustration"><div className="empty-grid"/><div className="empty-cube"><Bot size={27}/></div><span className="empty-spark empty-spark--one">âœ³</span><span className="empty-spark empty-spark--two">âœ¦</span></div><div><span className="mini-label">YOUR DELIVERY WILL APPEAR HERE</span><h3>Make the first move.</h3><p>Submit a business challenge above. The factory will return a requirement summary, delivery plan, generated starter files and a quality report.</p></div><button className="outline-button" onClick={() => document.getElementById('business-brief')?.focus()}>Write your brief <ArrowRight size={15}/></button></div>}
          {busy && <div className="working-card surface-card"><div className="working-orb"><LoaderCircle className="spin" size={27}/></div><div><b>Coordinating the delivery team</b><p>Interpreting the brief, shaping the work plan and assembling a project scaffold.</p></div><span className="working-tag">LIVE RUN</span></div>}

          {result && <div className="results-wrap">
            <div className="outcome-banner"><div className="outcome-symbol"><CheckCircle2 size={21}/></div><div><span className="mini-label">DELIVERY PACKAGE CREATED</span><h3>{result.requirements?.project_name || 'Your project'}</h3><p>{result.requirements?.summary || result.requirements?.requirements || 'Your business brief has been processed into a starter project.'}</p></div><button className="download-cta" onClick={downloadZip}><Download size={16}/> Download package</button></div>
            <div className="metrics-grid">
              <div className="metric-card"><span>PLANNED WORK ITEMS</span><strong>{taskCount}</strong><small><FolderKanban size={13}/> Delivery plan</small></div>
              <div className="metric-card"><span>PROJECT ARTIFACTS</span><strong>{fileCount}</strong><small><FileCode2 size={13}/> Generated files</small></div>
              <div className="metric-card"><span>QUALITY CHECKS</span><strong>{passed}<i>/{passed + failed}</i></strong><small><ShieldCheck size={13}/> {testRate}% checks passed</small></div>
              <div className="metric-card"><span>DELIVERY STATUS</span><strong className="metric-status">{result.tests?.status === 'passed' ? 'Validated' : 'Review'}</strong><small><CheckCircle2 size={13}/> Structural validation</small></div>
            </div>
            <div className="deliverable-grid">
              <article className="deliverable-card surface-card"><div className="deliverable-head"><div><span className="mini-label">01 / BUSINESS DISCOVERY</span><h3>What we understood</h3></div><span className="deliverable-icon deliverable-icon--violet"><BriefcaseBusiness size={17}/></span></div><p className="deliverable-copy">{result.requirements?.summary || result.requirements?.requirements || 'Requirement summary not returned.'}</p><div className="deliverable-subhead">CAPABILITIES IN SCOPE</div><div className="capability-list">{(result.requirements?.features || []).map((feature, i) => <span key={`${feature}-${i}`}><Check size={13}/>{feature}</span>)}</div></article>
              <article className="deliverable-card surface-card"><div className="deliverable-head"><div><span className="mini-label">02 / DELIVERY PLAN</span><h3>Work breakdown</h3></div><span className="deliverable-icon deliverable-icon--blue"><FolderKanban size={17}/></span></div><ol className="work-list">{(result.plan?.tasks || []).map((task, i) => <li key={`${task}-${i}`}><span>{String(i + 1).padStart(2, '0')}</span>{task}</li>)}</ol>{result.plan?.architecture_notes?.length > 0 && <div className="architecture-note"><b>Architecture considerations</b>{result.plan.architecture_notes.map((note, i) => <p key={i}>â€¢ {note}</p>)}</div>}</article>
              <article className="deliverable-card surface-card"><div className="deliverable-head"><div><span className="mini-label">03 / BUILD OUTPUT</span><h3>Project artifacts</h3></div><span className="deliverable-icon deliverable-icon--orange"><Code2 size={17}/></span></div><div className="artifact-root"><FolderKanban size={15}/><b>{result.build?.project_id || 'project'}</b><span>{fileCount} files</span></div><div className="artifact-files">{(result.build?.files || []).map((file, i) => <div key={`${file}-${i}`}><FileCode2 size={14}/><span>{file}</span></div>)}</div><p className="artifact-note"><CheckCircle2 size={14}/>{result.build?.message || 'Starter project scaffold generated.'}</p><p className="scope-note">MVP SCOPE: template-based starter generation. Generated code is not production-certified.</p></article>
              <article className="deliverable-card surface-card"><div className="deliverable-head"><div><span className="mini-label">04 / QUALITY ASSURANCE</span><h3>Validation report</h3></div><span className="deliverable-icon deliverable-icon--green"><ShieldCheck size={17}/></span></div><div className="qa-score"><strong>{testRate}<small>%</small></strong><div><b>{result.tests?.status === 'passed' ? 'Checks passed' : 'Review required'}</b><span>{passed} passed Â· {failed} failed</span></div><div className="qa-ring" style={{ '--score': `${testRate}%` }}/></div><div className="qa-checks">{(result.tests?.checks || []).map((check, i) => <div key={`${check.name}-${i}`}><span className={check.status === 'passed' ? 'qa-check--pass' : 'qa-check--fail'}>{check.status === 'passed' ? <CheckCircle2 size={15}/> : <X size={15}/>}</span><b>{check.name}</b><small>{check.status}</small></div>)}</div><p className="qa-message">{result.tests?.message || 'Review the validation checks before production use.'}</p></article>
            </div>
          </div>}
        </section>

        {editingProject && (
          <div
            className="editor-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !editBusy) setEditingProject(null)
            }}
          >
            <section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
              <header className="editor-header">
                <div>
                  <span className="mini-label">PROJECT EDITOR</span>
                  <h2 id="editor-title">{editingProject.project_name || 'Saved project'}</h2>
                  <p>Make changes to this generated project. Your original files are backed up when saved.</p>
                </div>
                <button
                  type="button"
                  className="history-action"
                  aria-label="Close editor"
                  title="Close editor"
                  disabled={editBusy}
                  onClick={() => setEditingProject(null)}
                >
                  <X size={18} />
                </button>
              </header>

              <div className="editor-body">
                {editError && <div className="error-banner"><X size={16}/><span>{editError}</span></div>}
                {editSaved && <div className="editor-status"><CheckCircle2 size={16}/> Changes saved successfully.</div>}

                {editBusy && editorFiles.length === 0 && (
                  <div className="editor-loading"><LoaderCircle className="spin" size={20}/> Loading project files...</div>
                )}

                {editorMode === 'choose' && (
                  <div className="editor-choice-wrap">
                    <p className="editor-intro">Choose how you want to edit this project.</p>
                    <div className="editor-choice-grid">
                      <button type="button" className="editor-choice" disabled={editBusy} onClick={() => { setEditorMode('manual'); setEditError(''); setEditSaved(false) }}>
                        <span className="editor-choice-icon"><Code2 size={22}/></span>
                        <b>Edit code yourself</b>
                        <small>Open project files, make your own code changes and save them.</small>
                        <span className="editor-choice-link">Open code editor <ArrowRight size={14}/></span>
                      </button>
                      <button type="button" className="editor-choice" disabled={editBusy} onClick={() => { setEditorMode('ai'); setEditError(''); setEditSaved(false) }}>
                        <span className="editor-choice-icon"><WandSparkles size={22}/></span>
                        <b>AI code editing</b>
                        <small>Describe the change. AI prepares a proposal for your review before applying it.</small>
                        <span className="editor-choice-link">Use AI editing <ArrowRight size={14}/></span>
                      </button>
                    </div>
                  </div>
                )}

                {editorMode === 'manual' && (
                  <div className="editor-workspace">
                    <aside className="editor-file-panel">
                      <span className="mini-label">PROJECT FILES ({editorFiles.length})</span>
                      {editorFiles.map(file => (
                        <button
                          type="button"
                          key={file.path}
                          className={`editor-file-button ${selectedFile === file.path ? 'is-active' : ''}`}
                          onClick={() => chooseEditorFile(file.path)}
                          disabled={editBusy}
                        >
                          <FileText size={14}/><span>{file.path}</span>
                        </button>
                      ))}
                    </aside>
                    <div className="editor-code-panel">
                      <div className="editor-file-toolbar">
                        <b>{selectedFile || 'Select a file'}</b>
                        <span>Plain text editor</span>
                      </div>
                      <textarea
                        className="editor-code-area"
                        value={fileContent}
                        onChange={(event) => { setFileContent(event.target.value); setEditSaved(false) }}
                        spellCheck={false}
                        placeholder="Select a project file to edit..."
                        disabled={!selectedFile || editBusy}
                      />
                      <div className="editor-action-line">
                        <span>Save creates a backup of the previous file.</span>
                        <div className="editor-save-controls">
                          {editSaved && (
                            <span className="editor-save-confirmation">
                              <CheckCircle2 size={15}/> File saved successfully!
                            </span>
                          )}
                          <button type="button" className="download-cta" onClick={saveEditorFile} disabled={!selectedFile || editBusy}>
                            {editBusy ? <LoaderCircle className="spin" size={15}/> : <Save size={15}/>}
                            Save file
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {editorMode === 'ai' && (
                  <div className="editor-ai-form">
                    <label htmlFor="ai-edit-instruction">DESCRIBE THE CODE CHANGES</label>
                    <textarea
                      id="ai-edit-instruction"
                      value={aiInstruction}
                      onChange={(event) => setAiInstruction(event.target.value)}
                      placeholder="Example: Add input validation to the student registration form and show clear error messages."
                      rows={5}
                      disabled={editBusy}
                    />
                    <div className="editor-action-line">
                      <span>AI will prepare a proposal. No files change until you approve it.</span>
                      <button type="button" className="download-cta" onClick={requestAIEdit} disabled={editBusy || aiInstruction.trim().length < 5}>
                        {editBusy ? <LoaderCircle className="spin" size={15}/> : <WandSparkles size={15}/>}
                        Generate proposal
                      </button>
                    </div>

                    {aiProposal && (
                      <div className="editor-proposal">
                        <div className="editor-proposal-heading">
                          <div><span className="mini-label">AI PROPOSAL</span><h3>Review before applying</h3></div>
                          <span>{aiProposal.changes?.length || 0} file(s)</span>
                        </div>
                        <p>{aiProposal.summary}</p>
                        {(aiProposal.changes || []).map((change, index) => (
                          <details className="editor-proposal-file" key={`${change.path}-${index}`} open={index === 0}>
                            <summary><FileCode2 size={14}/>{change.path}</summary>
                            <pre>{change.content}</pre>
                          </details>
                        ))}
                        <button type="button" className="download-cta" onClick={applyAIEdit} disabled={editBusy || !aiProposal.changes?.length}>
                          {editBusy ? <LoaderCircle className="spin" size={15}/> : <Check size={15}/>}
                          Apply reviewed changes
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <footer className="editor-modal-footer">
                <button type="button" className="outline-button" onClick={() => { setEditorMode('choose'); setEditError(''); setAiProposal(null) }} disabled={editBusy}>
                  {editorMode === 'choose' ? 'Close' : 'Back to choices'}
                </button>
                <button type="button" className="download-cta" onClick={finishProjectEditing} disabled={editBusy}>
                  Edit Final <ArrowRight size={15}/>
                </button>
              </footer>
            </section>
          </div>
        )}

        <footer className="page-footer"><span><b>AGENT FACTORY OS</b> Â· AI SOFTWARE FACTORY</span><span>Built to move business outcomes forward <span className="footer-star">âœ³</span></span><span>LOCAL MVP Â· V1.0</span></footer>
      </div>
    </main>
  </div>
}

export default App













