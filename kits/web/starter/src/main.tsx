import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { multiply } from './value';
import './styles.css';

function App() {
  const [input, setInput] = useState('3');
  const [value, setValue] = useState(3);
  const [error, setError] = useState('');
  return <main>
    <h1>Webアプリのスターター</h1>
    <p>数値を変更して、画面とテストの動作を確認できます。</p>
    <form onSubmit={event => {
      event.preventDefault();
      const next = Number(input);
      if (!input.trim() || !Number.isFinite(next)) { setError('有限の数値を入力してください。'); return; }
      setError(''); setValue(next);
    }}>
      <label htmlFor="value">数値</label>
      <input id="value" type="number" step="any" required value={input} onChange={event => setInput(event.target.value)} aria-describedby={error ? 'error' : undefined} aria-invalid={!!error}/>
      {error && <p id="error" role="alert">{error}</p>}
      <div className="actions">
        <button type="submit">更新</button>
        <button type="button" onClick={() => { setInput('3'); setValue(3); setError(''); }}>リセット</button>
      </div>
    </form>
    <p role="status">2倍の値：{multiply(value, 2)}</p>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App/>);
