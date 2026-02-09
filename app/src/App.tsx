import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css'
import type { Session } from '@supabase/supabase-js'

type Todo = {
  id: string
  user_id: string
  title: string
  description: string | null
  completed: boolean
  due_date: string | null
  created_at: string
  updated_at: string
}

type Filter = 'all' | 'active' | 'completed'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [todos, setTodos] = useState<Todo[]>([])
  const [error, setError] = useState<string | null>(null)

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (session) {
      fetchTodos()
    } else {
      setTodos([])
    }
  }, [session])

  const filteredTodos = useMemo(() => {
    if (filter === 'active') return todos.filter((t) => !t.completed)
    if (filter === 'completed') return todos.filter((t) => t.completed)
    return todos
  }, [todos, filter])

  const fetchTodos = async () => {
    setError(null)
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      return
    }

    setTodos(data || [])
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setError(null)

    if (authMode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
    }

    setAuthLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setDueDate('')
    setEditingId(null)
  }

  const handleSubmitTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return

    setError(null)

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      user_id: session.user.id,
    }

    if (!payload.title) {
      setError('Title is required')
      return
    }

    if (editingId) {
      const { error } = await supabase.from('todos').update(payload).eq('id', editingId)
      if (error) {
        setError(error.message)
        return
      }
    } else {
      const { error } = await supabase.from('todos').insert(payload)
      if (error) {
        setError(error.message)
        return
      }
    }

    resetForm()
    fetchTodos()
  }

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id)
    setTitle(todo.title)
    setDescription(todo.description || '')
    setDueDate(todo.due_date ? todo.due_date.slice(0, 10) : '')
  }

  const toggleComplete = async (todo: Todo) => {
    const { error } = await supabase
      .from('todos')
      .update({ completed: !todo.completed })
      .eq('id', todo.id)

    if (error) {
      setError(error.message)
      return
    }

    fetchTodos()
  }

  const deleteTodo = async (id: string) => {
    const { error } = await supabase.from('todos').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    fetchTodos()
  }

  if (loading) {
    return <div className="container">Loading...</div>
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Mike's Todo App</h1>
        {session && (
          <button className="ghost" onClick={handleLogout}>
            Logout
          </button>
        )}
      </header>

      {!session ? (
        <div className="card">
          <h2>{authMode === 'login' ? 'Login' : 'Create account'}</h2>
          <form onSubmit={handleAuth} className="form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button disabled={authLoading}>
              {authLoading ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Sign up'}
            </button>
          </form>
          <button
            className="link"
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
          >
            {authMode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Login'}
          </button>
        </div>
      ) : (
        <>
          <div className="card">
            <h2>{editingId ? 'Edit todo' : 'Add a new todo'}</h2>
            <form onSubmit={handleSubmitTodo} className="form">
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
              <div className="row">
                <label>
                  Due date
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </label>
              </div>
              <div className="row gap">
                <button type="submit">{editingId ? 'Save changes' : 'Add todo'}</button>
                {editingId && (
                  <button type="button" className="ghost" onClick={resetForm}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="filters">
            <span>Filter:</span>
            {(['all', 'active', 'completed'] as Filter[]).map((f) => (
              <button
                key={f}
                className={filter === f ? 'active' : ''}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="list">
            {filteredTodos.length === 0 ? (
              <p className="muted">No todos yet.</p>
            ) : (
              filteredTodos.map((todo) => (
                <div key={todo.id} className={`todo ${todo.completed ? 'done' : ''}`}>
                  <div className="todo-main">
                    <div className="todo-title">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleComplete(todo)}
                      />
                      <span>{todo.title}</span>
                    </div>
                    {todo.description && <p className="todo-desc">{todo.description}</p>}
                    {todo.due_date && (
                      <p className="todo-meta">
                        Due {new Date(todo.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="todo-actions">
                    <button className="ghost" onClick={() => startEdit(todo)}>
                      Edit
                    </button>
                    <button className="danger" onClick={() => deleteTodo(todo.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  )
}

export default App
