import { useState, type SubmitEvent } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { api } from '../../lib/api';

export default function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [notice, setNotice] = useState('');
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice('');
    const form = new FormData(event.currentTarget);
    try { const data = await api('contact', { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) }); setSuccess(true); setNotice(data.message); }
    catch (error) { setNotice((error as Error).message); } finally { setBusy(false); }
  }
  if (success) return <div className="form-card success-box"><Check size={32}/><h2 className="section-title">Your message is in.</h2><p style={{ marginBlock: 15 }}>{notice}</p><button className="button button-outline" onClick={() => { setSuccess(false); setNotice(''); }}>Send another message</button></div>;
  return <form className="form-card" onSubmit={submit}><div className="field"><label htmlFor="contact-name">Your name</label><input id="contact-name" name="name" required minLength={2} maxLength={100} autoComplete="name"/></div><div className="field"><label htmlFor="contact-email">Email address</label><input id="contact-email" name="email" type="email" required maxLength={254} autoComplete="email"/></div><div className="field"><label htmlFor="contact-subject">What’s on your mind?</label><input id="contact-subject" name="subject" required minLength={3} maxLength={150} placeholder="A collaboration, a question, an idea…"/></div><div className="field"><label htmlFor="contact-body">Your message</label><textarea id="contact-body" name="body" required minLength={20} maxLength={5000} rows={5} placeholder="Tell us a little more. We’re listening."/></div><input className="honeypot" name="website" autoComplete="off" tabIndex={-1} aria-hidden="true"/><label className="checkbox-label" style={{ marginBottom: 20 }}><input type="checkbox" required/>I understand my details are used to respond to this message. <a href="/privacy">Privacy policy</a></label><button className="button" disabled={busy}>{busy ? 'Sending…' : 'Send your message'}<ArrowUpRight size={16}/></button><p role="status" className="form-message">{notice}</p></form>;
}
