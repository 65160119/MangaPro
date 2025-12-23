import { Link } from 'react-router-dom'
import './App.css'
import AppRoute from './route/app-route'

function App() {
  return (
    <>
      <header style={{padding:12,display:'flex',gap:12,alignItems:'center',borderBottom:'1px solid #eee'}}>
        <Link to="/">หนังสือ</Link>
        <Link to="/forum">ฟอรัม</Link>
        <Link to="/random">สุ่มมังงะ</Link>
      </header>
      <AppRoute />
    </>
  )
}

export default App
