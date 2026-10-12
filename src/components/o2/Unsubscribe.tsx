import { useState } from 'react';
import { api } from '../../lib/api';

export default function Unsubscribe() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState('');
  async function remove() {
    setBusy(true); setNotice('');
    try { const token = new URLSearchParams(window.location.search).get('token'); const data = await api('unsubscribe', { method: 'POST', body: JSON.stringify({ token }) }); setDone(true); setNotice(data.message); window.history.replaceState({}, '', '/unsubscribe'); }
    catch (error) { setNotice((error as Error).message); } finally { setBusy(false); }
  }
  return <section className="error-page wrap"><span className="eyebrow" style={{ justifyContent: 'center' }}>YOUR INBOX, YOUR CHOICE</span><h1>{done ? 'A little less in your inbox.' : 'Ready to unsubscribe?'}</h1><p>{done ? notice : 'Use the private link from your subscription confirmation to remove your email from the O2 Media list.'}</p>{!done && <button className="button" disabled={busy} onClick={remove}>{busy ? 'Removing…' : 'Confirm unsubscribe'}</button>}{done && <a className="button button-outline" href="/blog">Keep exploring the journal ↗</a>}{!done && <p className="form-message" role="status">{notice}</p>}<p style={{ marginTop: 20 }}><a className="text-button" href="/contact">Need help? Contact the team</a></p></section>;
}
