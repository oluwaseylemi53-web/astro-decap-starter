import { useState, type SubmitEvent } from 'react';
import { ArrowUpRight, Check, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';

export default function Newsletter() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState(false);
  const [manageUrl, setManageUrl] = useState<string | null>(null);
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice('');
    const form = new FormData(event.currentTarget);
    try { const data = await api('subscribe', { method: 'POST', body: JSON.stringify({ email: form.get('email'), consent: form.get('consent') === 'on', website: form.get('website') }) }); setNotice(data.message); setManageUrl(data.manageUrl); setSuccess(true); }
    catch (error) { setNotice((error as Error).message); } finally { setBusy(false); }
  }
  return <section id="newsletter" className="newsletter wrap"><div className="newsletter-art" aria-hidden="true"><Sparkles size={28}/><span>o<span>2</span></span><div className="orbit orbit-one"/><div className="orbit orbit-two"/></div><div className="newsletter-copy"><span className="eyebrow">A BREATH OF FRESH THINKING</span><h2>Good ideas deserve<br/>a place in your inbox.</h2><p>Join our list for thoughtful perspectives on marketing, media, and making your next move.</p></div><div className="newsletter-form">{success ? <div className="success-box"><Check size={24}/><p>{notice}</p>{manageUrl && <a href={manageUrl}>Save this link to unsubscribe at any time ↗</a>}</div> : <form onSubmit={submit}><label htmlFor="newsletter-email">Your email address</label><div className="email-field"><input id="newsletter-email" type="email" name="email" placeholder="you@example.com" required maxLength={254}/><button type="submit" aria-label="Join the newsletter" disabled={busy}>{busy ? '…' : <ArrowUpRight size={23}/>}</button></div><label className="checkbox-label"><input type="checkbox" name="consent" required/>I agree to receive O2 Media updates. <a href="/privacy">Privacy policy</a></label><input className="honeypot" tabIndex={-1} aria-hidden="true" autoComplete="off" name="website"/><p className="microcopy">Just the good stuff. You can unsubscribe anytime.</p><p className="form-message" role="status">{notice}</p></form>}</div></section>;
}
