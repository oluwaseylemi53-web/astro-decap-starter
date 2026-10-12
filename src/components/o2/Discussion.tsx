import { useEffect, useState, type SubmitEvent } from 'react';
import { getUser, type User } from '@netlify/identity';
import { Bookmark, Check, Link, Share2 } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/types';

type Comment = { id: string; author: string; body: string; createdAt: string };
export default function Discussion({ postId, title }: { postId: string; title: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [body, setBody] = useState('');
  useEffect(() => {
    let active = true;
    api(`comments?postId=${encodeURIComponent(postId)}`).then((data) => { if (active) setComments(data.comments); }).catch((error) => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    getUser().then(async (current) => { if (!active) return; setUser(current); if (current) { try { const data = await api('bookmarks'); if (active) setSaved(data.posts.some((post: { id: string }) => post.id === postId)); } catch {} } });
    return () => { active = false; };
  }, [postId]);
  async function save() {
    if (!user) { window.location.href = '/account'; return; }
    setBusy(true); setNotice('');
    try { await api('bookmarks', { method: saved ? 'DELETE' : 'POST', body: JSON.stringify({ postId }) }); setSaved(!saved); setNotice(saved ? 'Removed from your reading list.' : 'Saved to your reader account.'); }
    catch (error) { setNotice((error as Error).message); } finally { setBusy(false); }
  }
  async function share() {
    try { if (navigator.share) await navigator.share({ title, url: window.location.href }); else { await navigator.clipboard.writeText(window.location.href); setNotice('Article link copied.'); } }
    catch (error) { if ((error as Error).name !== 'AbortError') setNotice('Copy the URL from your address bar to share this article.'); }
  }
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice('');
    try { const data = await api('comments', { method: 'POST', body: JSON.stringify({ postId, body }) }); setBody(''); setNotice(data.message); }
    catch (error) { setNotice((error as Error).message); } finally { setBusy(false); }
  }
  return <section className="comments-section"><div className="reader-actions"><button onClick={save} disabled={busy}>{saved ? <Check size={16}/> : <Bookmark size={16}/>} {saved ? 'Story saved' : 'Save story'}</button><button onClick={share}><Share2 size={16}/>Share the idea</button><a className="text-button" href="/account">Your reader space ↗</a></div><p className="form-message" role="status">{notice}</p><h2>Let’s keep the conversation going.</h2><p>Thoughtful perspectives welcome. Comments are reviewed before appearing.</p>{error && <div className="notice" role="alert">{error}</div>}{loading ? <p className="notice">Loading the conversation…</p> : comments.length ? comments.map((comment) => <article key={comment.id} className="comment"><header><strong>{comment.author}</strong><time>{formatDate(comment.createdAt)}</time></header><p>{comment.body}</p></article>) : <p className="notice">A fresh conversation starts here. Be the first to share a thought.</p>}{user ? <form onSubmit={submit} style={{ marginTop: 25 }}><div className="field"><label htmlFor="comment-body">Add your perspective</label><textarea id="comment-body" value={body} onChange={(event) => setBody(event.target.value)} required minLength={3} maxLength={2000} rows={4} placeholder="What’s your take?"/></div><button className="button" disabled={busy}>{busy ? 'Sending…' : 'Submit for review'}</button></form> : <a className="button button-outline" href="/account" style={{ marginTop: 20 }}>Sign in to join the conversation <Link size={16}/></a>}</section>;
}
