import { useEffect, useState, type SubmitEvent } from 'react';
import { acceptInvite, getSettings, getUser, handleAuthCallback, login, logout, onAuthChange, requestPasswordRecovery, signup, updateUser, type User } from '@netlify/identity';
import { Bookmark, MessageSquare, Check, ArrowUpRight } from 'lucide-react';
import { api } from '../../lib/api';
import { ArticleCard } from './ArticleFeed';
import type { Post } from '../../lib/types';

type Mode = 'login' | 'signup' | 'forgot' | 'reset' | 'invite';
export default function Account() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<Mode>('login');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [invite, setInvite] = useState('');
  const [signupAllowed, setSignupAllowed] = useState(true);
  const [saved, setSaved] = useState<Post[]>([]);
  const [savedError, setSavedError] = useState('');
  const [savedLoading, setSavedLoading] = useState(false);
  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const callback = await handleAuthCallback();
        if (!active) return;
        if (callback?.type === 'recovery') setMode('reset');
        if (callback?.type === 'invite' && callback.token) { setMode('invite'); setInvite(callback.token); }
        if (callback?.type === 'confirmation') setNotice('Email confirmed. Welcome to O2 Media.');
        setUser(await getUser());
        getSettings().then((settings) => { if (active) setSignupAllowed(!settings.disableSignup); }).catch(() => {});
      } catch (error) { if (active) setNotice((error as Error).message); }
      finally { if (active) setReady(true); }
    }
    init();
    const unsubscribe = onAuthChange((_event, current) => { if (active) setUser(current); });
    return () => { active = false; unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!user) { setSaved([]); return; }
    let active = true; setSavedLoading(true);
    api('bookmarks').then((data) => { if (active) { setSaved(data.posts); setSavedError(''); } }).catch((error) => { if (active) setSavedError(error.message); }).finally(() => { if (active) setSavedLoading(false); });
    return () => { active = false; };
  }, [user?.id]);
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '');
    const password = String(form.get('password') || '');
    try {
      if (mode === 'login') setUser(await login(email, password));
      if (mode === 'signup') {
        const created = await signup(email, password, { full_name: String(form.get('name')) });
        if (created.confirmedAt) setUser(created);
        else { setNotice('Check your inbox for a confirmation link before signing in.'); setMode('login'); }
      }
      if (mode === 'forgot') { await requestPasswordRecovery(email); setNotice('If an account matches that address, a recovery link is on its way.'); }
      if (mode === 'reset') { setUser(await updateUser({ password })); setMode('login'); setNotice('Your password has been updated.'); }
      if (mode === 'invite') { setUser(await acceptInvite(invite, password)); setInvite(''); setMode('login'); }
    } catch (error) { setNotice((error as Error).message); } finally { setBusy(false); }
  }
  async function profile(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = String(form.get('newPassword') || '');
    try { setUser(await updateUser({ data: { full_name: String(form.get('name')) }, ...(password ? { password } : {}) })); setNotice('Your profile has been updated.'); formElement.reset(); }
    catch (error) { setNotice((error as Error).message); } finally { setBusy(false); }
  }
  async function signOut() { setBusy(true); try { await logout(); setUser(null); setNotice('You’re signed out.'); } catch (error) { setNotice((error as Error).message); } finally { setBusy(false); } }
  async function remove(postId: string) {
    try { await api('bookmarks', { method: 'DELETE', body: JSON.stringify({ postId }) }); setSaved((current) => current.filter((post) => post.id !== postId)); }
    catch (error) { setSavedError((error as Error).message); }
  }
  if (!ready) return <div className="wrap account-page" aria-busy="true"><div className="skeleton-card"><div/><span/><span/></div><p>Opening your reader space…</p></div>;
  if (user && !['reset', 'invite'].includes(mode)) return <section className="wrap dashboard"><div className="dashboard-top"><div><span className="eyebrow">YOUR READER SPACE</span><h1>Good to see you, {user.name || 'reader'}.</h1><p>{user.email}</p></div><div className="editor-actions">{user.roles?.some((role) => ['admin', 'editor'].includes(role)) && <a className="button" href="/admin">Editorial dashboard <ArrowUpRight size={16}/></a>}<button className="button button-outline" disabled={busy} onClick={signOut}>Sign out</button></div></div><details className="form-card"><summary>Edit profile & password</summary><form onSubmit={profile} style={{ marginTop: 20 }}><div className="field"><label htmlFor="profile-name">Display name</label><input id="profile-name" name="name" defaultValue={user.name} required minLength={2} maxLength={100}/></div><div className="field"><label htmlFor="new-password">New password (optional)</label><input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={10}/></div><button className="button" disabled={busy}>Save changes</button></form></details><p role="status" className="form-message">{notice}</p><h2 className="section-title" style={{ marginTop: 45 }}>Your saved stories</h2>{savedError && <div className="notice" role="alert">{savedError}</div>}{savedLoading ? <p className="notice">Loading saved stories…</p> : saved.length ? <div className="article-grid saved-grid">{saved.map((post) => <div key={post.id}><ArticleCard post={post}/><button className="text-button" style={{ marginTop: 14 }} onClick={() => remove(post.id)}>Remove from saved stories</button></div>)}</div> : <div className="empty-state"><Bookmark size={28}/><h3>A little inspiration, saved for later.</h3><p>Open an article and tap “Save story” to keep it here.</p><a href="/blog" className="button">Find a story <ArrowUpRight size={16}/></a></div>}</section>;
  return <section className="wrap account-page"><div className="account-intro"><span className="eyebrow">WELCOME TO THE CONVERSATION</span><h1>Your ideas.<br/>Your perspective.<br/><em>Your space.</em></h1><p>A free reader account gives you a place to save your favorite stories and add your voice to the conversation.</p><ul><li><Bookmark size={17}/>Save useful reads for another day</li><li><MessageSquare size={17}/>Join thoughtful, moderated discussions</li><li><Check size={17}/>A little more connection, no noise</li></ul></div><div className="form-card">{['login', 'signup'].includes(mode) ? <div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setNotice(''); }}>Sign in</button>{signupAllowed && <button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setNotice(''); }}>Create account</button>}</div> : <h2 className="section-title" style={{ marginBottom: 25 }}>{mode === 'forgot' ? 'Forgot your password?' : mode === 'invite' ? 'Accept your invitation' : 'Choose a new password'}</h2>}<form onSubmit={submit}>{mode === 'signup' && <div className="field"><label htmlFor="account-name">Your name</label><input id="account-name" name="name" required minLength={2} maxLength={100} autoComplete="name"/></div>}{!['reset', 'invite'].includes(mode) && <div className="field"><label htmlFor="account-email">Email address</label><input id="account-email" type="email" name="email" required autoComplete="email" maxLength={254}/></div>}{mode !== 'forgot' && <div className="field"><label htmlFor="account-password">Password</label><input id="account-password" name="password" type="password" required minLength={mode === 'login' ? 1 : 10} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/>{mode !== 'login' && <small>Use at least 10 characters.</small>}</div>}{mode === 'signup' && <label className="checkbox-label" style={{ marginBottom: 22 }}><input type="checkbox" required/>I agree to the <a href="/privacy">privacy policy</a> and respectful community guidelines.</label>}<button className="button" type="submit" disabled={busy}>{busy ? 'Please wait…' : { login: 'Welcome back', signup: 'Create my account', forgot: 'Send recovery link', reset: 'Update password', invite: 'Accept invitation' }[mode]}<ArrowUpRight size={16}/></button></form><div className="auth-footer">{mode === 'login' && <button className="text-button" onClick={() => { setMode('forgot'); setNotice(''); }}>Forgot your password?</button>}{mode === 'forgot' && <button className="text-button" onClick={() => setMode('login')}>Back to sign in</button>}<a className="text-button" href="/blog">Just browsing?</a></div><p className="form-message" role="status">{notice}</p></div></section>;
}
