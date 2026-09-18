
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Edit3,
  LogOut,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  createTask,
  deleteTask,
  getTasks,
  login,
  register,
  updateTask,
} from './api'
import type { Task, TaskStatus } from './api'

type Mode = 'login' | 'register'

const labels: Record<TaskStatus, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminée',
}

const badgeClasses: Record<TaskStatus, string> = {
  TODO: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  DONE: 'bg-emerald-100 text-emerald-800',
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('task_manager_token'))
  const [mode, setMode] = useState<Mode>('login')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onAuthenticated = (newToken: string) => {
    localStorage.setItem('task_manager_token', newToken)
    setToken(newToken)
  }

  const logout = () => {
    localStorage.removeItem('task_manager_token')
    setToken(null)
    setTasks([])
  }

  useEffect(() => {
    if (!token) return
    setLoading(true)
    getTasks()
      .then(setTasks)
      .catch((e) => {
        setError(e.message)
        if (String(e.message).includes('401')) logout()
      })
      .finally(() => setLoading(false))
  }, [token])

  if (!token) {
    return (
      <AuthScreen
        mode={mode}
        setMode={setMode}
        onAuthenticated={onAuthenticated}
        error={error}
        setError={setError}
      />
    )
  }

  return (
    <Dashboard
      tasks={tasks}
      setTasks={setTasks}
      loading={loading}
      error={error}
      setError={setError}
      logout={logout}
    />
  )
}

function AuthScreen({
  mode,
  setMode,
  onAuthenticated,
  error,
  setError,
}: {
  mode: Mode
  setMode: (m: Mode) => void
  onAuthenticated: (token: string) => void
  error: string
  setError: (e: string) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      const response =
        mode === 'login'
          ? await login(email, password)
          : await register(email, password)
      onAuthenticated(response.token)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-100 flex items-center justify-center px-4">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60 border border-slate-100">
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-2xl bg-indigo-600 p-3 text-white">
            <ClipboardList size={25} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Task Manager</h1>
            <p className="text-sm text-slate-500">Organisez votre travail simplement</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 mb-6">
          <button
            className={`rounded-lg py-2 text-sm font-medium ${mode === 'login' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            onClick={() => setMode('login')}
          >
            Connexion
          </button>
          <button
            className={`rounded-lg py-2 text-sm font-medium ${mode === 'register' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            onClick={() => setMode('register')}
          >
            Inscription
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
              placeholder="vous@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Mot de passe</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
              placeholder="8 caractères minimum"
            />
          </label>

          <button
            disabled={busy}
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Chargement…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>
      </section>
    </main>
  )
}

function Dashboard({
  tasks,
  setTasks,
  loading,
  error,
  setError,
  logout,
}: {
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  loading: boolean
  error: string
  setError: (e: string) => void
  logout: () => void
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ALL' | TaskStatus>('ALL')
  const [editing, setEditing] = useState<Task | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks.filter((task) => {
      const statusMatch = filter === 'ALL' || task.status === filter
      const searchMatch =
        !q ||
        task.title.toLowerCase().includes(q) ||
        task.description.toLowerCase().includes(q)
      return statusMatch && searchMatch
    })
  }, [tasks, search, filter])

  const saveTask = async (data: {
    title: string
    description: string
    status: TaskStatus
  }) => {
    try {
      setError('')
      if (editing) {
        const updated = await updateTask(editing.id, data)
        setTasks(tasks.map((task) => (task.id === updated.id ? updated : task)))
        setEditing(null)
      } else {
        const created = await createTask(data)
        setTasks([created, ...tasks])
        setShowCreate(false)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    }
  }

  const removeTask = async (id: number) => {
    if (!window.confirm('Supprimer cette tâche ?')) return
    try {
      await deleteTask(id)
      setTasks(tasks.filter((task) => task.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    }
  }

  const counts = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'TODO').length,
    progress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    done: tasks.filter((t) => t.status === 'DONE').length,
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-2 text-white">
              <ClipboardList size={21} />
            </div>
            <span className="font-bold text-slate-900">Task Manager</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            <LogOut size={17} />
            Déconnexion
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-indigo-600">Mon espace</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Mes tâches</h1>
            <p className="mt-1 text-slate-500">Suivez ce qui reste à faire.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            <Plus size={19} />
            Nouvelle tâche
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Total" value={counts.total} />
          <Stat label="À faire" value={counts.todo} />
          <Stat label="En cours" value={counts.progress} />
          <Stat label="Terminées" value={counts.done} />
        </div>

        {error && (
          <div className="mb-5 flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button onClick={() => setError('')}><X size={17} /></button>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une tâche…"
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-indigo-500"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'ALL' | TaskStatus)}
            className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="TODO">À faire</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="DONE">Terminées</option>
          </select>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            Chargement des tâches…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <CheckCircle2 className="mx-auto mb-3 text-slate-300" size={42} />
            <h2 className="font-semibold text-slate-800">Aucune tâche</h2>
            <p className="mt-1 text-sm text-slate-500">Créez votre première tâche pour commencer.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((task) => (
              <article key={task.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{task.title}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClasses[task.status]}`}>
                        {labels[task.status]}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {task.description || 'Aucune description.'}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">
                      Créée le {new Date(task.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setEditing(task)}
                      className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
                      title="Modifier"
                    >
                      <Edit3 size={17} />
                    </button>
                    <button
                      onClick={() => removeTask(task.id)}
                      className="rounded-xl border border-red-100 p-2.5 text-red-600 hover:bg-red-50"
                      title="Supprimer"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {(showCreate || editing) && (
        <TaskModal
          task={editing}
          onClose={() => {
            setShowCreate(false)
            setEditing(null)
          }}
          onSave={saveTask}
        />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function TaskModal({
  task,
  onClose,
  onSave,
}: {
  task: Task | null
  onClose: () => void
  onSave: (data: { title: string; description: string; status: TaskStatus }) => Promise<void>
}) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'TODO')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      await onSave({ title, description, status })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {task ? 'Modifier la tâche' : 'Nouvelle tâche'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Renseignez les informations ci-dessous.</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
            <X size={19} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Titre</span>
            <input
              required
              maxLength={255}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
              placeholder="Ex. Finaliser la présentation"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Description</span>
            <textarea
              rows={5}
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
              placeholder="Ajoutez quelques détails…"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Statut</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500"
            >
              <option value="TODO">À faire</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="DONE">Terminée</option>
            </select>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-3 font-medium text-slate-600 hover:bg-slate-100">
              Annuler
            </button>
            <button
              disabled={busy}
              className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default App
