import { Link, useLocation, useNavigate } from 'react-router-dom'

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isHome = pathname === '/'

  return (
    <div className="app">
      <header className="app-header">
        {isHome ? (
          <span className="header-spacer" />
        ) : (
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <Link to="/" className="brand">
          <img src="favicon.svg" alt="" width="26" height="26" />
          <span>DevQuiz</span>
        </Link>
        <span className="header-spacer" />
      </header>
      <main className="app-main">{children}</main>
    </div>
  )
}
