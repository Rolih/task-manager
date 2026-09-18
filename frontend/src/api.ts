export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'

export interface Task {
  id: number
  title: string
  description: string
  status: TaskStatus
  createdAt: string
  updatedAt: string
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081/api'

function getToken() {
  return localStorage.getItem('task_manager_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')

  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let message = `Erreur HTTP ${response.status}`
    try {
      const body = await response.json()
      if (body.message) message = body.message
    } catch {
      // réponse non JSON
    }
    throw new Error(message)
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

export async function register(email: string, password: string) {
  return request<{ token: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function login(email: string, password: string) {
  return request<{ token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function getTasks() {
  return request<Task[]>('/tasks')
}

export async function createTask(data: {
  title: string
  description: string
  status: TaskStatus
}) {
  return request<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateTask(
  id: number,
  data: { title: string; description: string; status: TaskStatus },
) {
  return request<Task>(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteTask(id: number) {
  return request<void>(`/tasks/${id}`, { method: 'DELETE' })
}
