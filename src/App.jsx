import { Link } from 'react-router-dom'
import './App.css'
import AppRoute from './route/app-route'

function App() {
  return (
    <>
      <header style={{padding:12,display:'flex',gap:12,alignItems:'center',borderBottom:'1px solid #eee'}}>
        <Link to="/">Home</Link>
        <Link to="/catalog">Catalog</Link>
        <Link to="/hello">Hello</Link>
      </header>
      <AppRoute />
    </>
  )
}

export default App
