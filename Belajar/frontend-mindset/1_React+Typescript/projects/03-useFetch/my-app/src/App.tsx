import { useState } from 'react'
import './App.css'
import PostList from './components/PostList'
import UserSearch from './components/UserSearch'
import CreatePost from './components/CreatePost'

type ActiveTab = 'posts' | 'users' | 'create';

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('posts')

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🚀 Mini Project: useFetch Hook</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Custom hook untuk fetching data dengan TypeScript
      </p>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('posts')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: activeTab === 'posts' ? '#646cff' : 'transparent',
            color: activeTab === 'posts' ? 'white' : '#646cff',
            cursor: 'pointer',
            fontWeight: 'bold',
            borderRadius: '4px 4px 0 0',
          }}
        >
          📝 Post List
        </button>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: activeTab === 'users' ? '#646cff' : 'transparent',
            color: activeTab === 'users' ? 'white' : '#646cff',
            cursor: 'pointer',
            fontWeight: 'bold',
            borderRadius: '4px 4px 0 0',
          }}
        >
          👤 User Search
        </button>
        <button
          onClick={() => setActiveTab('create')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: activeTab === 'create' ? '#646cff' : 'transparent',
            color: activeTab === 'create' ? 'white' : '#646cff',
            cursor: 'pointer',
            fontWeight: 'bold',
            borderRadius: '4px 4px 0 0',
          }}
        >
          ✍️ Create Post
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ 
        padding: '2rem', 
        border: '1px solid #ddd', 
        borderRadius: '8px',
        background: '#f9f9f9' 
      }}>
        {activeTab === 'posts' && <PostList />}
        {activeTab === 'users' && <UserSearch />}
        {activeTab === 'create' && <CreatePost />}
      </div>

      {/* Info Section */}
      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        background: '#f0f0f0', 
        borderRadius: '8px',
        fontSize: '0.9rem'
      }}>
        <p><strong>💡 Yang dipelajari:</strong></p>
        <ul style={{ marginTop: '0.5rem' }}>
          <li>✅ Custom hook dengan TypeScript generics</li>
          <li>✅ Fetch data dengan AbortController untuk cleanup</li>
          <li>✅ State management untuk loading, success, error</li>
          <li>✅ Manual trigger dengan <code>immediate: false</code></li>
        </ul>
      </div>
    </div>
  )
}

export default App
