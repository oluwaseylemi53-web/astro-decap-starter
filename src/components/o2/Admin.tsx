import { useEffect, useState, type SubmitEvent } from 'react';
import { getUser, type User } from '@netlify/identity';
import { ArrowUpRight, Download, Plus, X } from 'lucide-react';
import { api } from '../../lib/api';
import { categories, formatDate, type Post } from '../../lib/types';

type Tab = 'posts' | 'comments' | 'subscribers' | 'messages';
type Comment = { id: string; author: string; body: string; title: string; status: string; createdAt: string };
type Subscriber = { id: string; email: string; consentAt: string };
type Message = { id: string; name: string; email: string; subject: string; body: string; createdAt: string };
const blankPost = { title: '', slug: '', excerpt: '', content: '', category: 'Strategy', author: 'O2 Editorial', cover: '/media/brand.svg', status: 'draft', featured: false, sample: false };

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [editing, setEditing] = useState<(typeof blankPost & { id?: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string; endpoint: string } | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const admin = Boolean(user?.roles?.includes('admin'));
  const editor = Boolean(user?.roles?.some((role) => ['admin', 'editor'].includes(role)));
  useEffect(() => { getUser().then((current) => { setUser(current); setReady(true); }); }, []);
  async function load(currentTab: Tab, append = false) {
    setLoading(true);
    try {
      const endpoint = currentTab === 'posts' ? `posts?admin=true&offset=${append ? posts.length : 0}` : currentTab === 'comments' ? 'comments?admin=true' : currentTab;
      const data = await api(endpoint);
      if (currentTab === 'posts') { setPosts((current) => append ? [...current, ...data.posts] : data.posts); setHasMore(data.posts.length === 100); }
      if (currentTab === 'comments') setComments(data.comments);
      if (currentTab === 'subscribers') setSubscribers(data.subscribers);
      if (currentTab === 'messages') setMessages(data.messages);
    } catch (error) { setNotice((error as Error).message); } finally { setLoading(false); }
  }
  useEffect(() => { if (editor) { setNotice(''); setDeleteTarget(null); load(tab); } }, [tab, editor]);
  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return; setBusy(true); setNotice('');
    try { await api('posts', { method: editing.id ? 'PUT' : 'POST', body: JSON.stringify(editing) }); setEditing(null); setNotice('Article saved. Published changes are live immediately.'); await load('posts'); }
    catch (error) { setNotice((error as Error).message); } finally { setBusy(false); }
  }
  async function edit(id: string) {
    setBusy(true); setNotice('');
    try { const data = await api(`posts?admin=true&id=${encodeURIComponent(id)}`); setEditing(data.post); }
    catch (error) { setNotice((error as Error).message); } finally { setBusy(false); }
  }
  async function remove() {
    if (!deleteTarget) return; setBusy(true);
    try { await api(deleteTarget.endpoint, { method: 'DELETE', body: JSON.stringify({ id: deleteTarget.id }) }); setDeleteTarget(null); setNotice('Record deleted.'); await load(tab); }
    catch (error) { setNotice((error as Error).message); } finally { setBusy(false); }
  }
  async function moderate(id: string, status: string) {
    setBusy(true); setNotice('');
    try { await api('comments', { method: 'PUT', body: JSON.stringify({ id, status }) }); await load('comments'); setNotice('Comment moderation updated.'); }
    catch (error) { setNotice((error as Error).message); } finally { setBusy(false); }
  }
  function exportSubscribers() {
    const safe = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`;
    const content = ['Email,Consent date', ...subscribers.map((item) => `${safe(item.email)},${safe(item.consentAt)}`)].join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'o2-media-subscribers.csv'; link.click(); URL.revokeObjectURL(url);
  }
  if (!ready) return <div className="wrap empty-state" aria-busy="true"><p>Checking editorial access…</p></div>;
  if (!editor) return <section className="wrap error-page"><span className="eyebrow" style={{ justifyContent: 'center' }}>EDITORIAL ACCESS</span><h1>A space for the publishing team.</h1><p>{user ? 'Your account does not have an editor or administrator role.' : 'Sign in with an editor or administrator account to manage O2 Media.'}</p><a className="button" href="/account">Go to your account <ArrowUpRight size={16}/></a><p className="microcopy" style={{ marginTop: 20 }}>Site owners assign roles in Netlify → Identity → Users.</p></section>;
  return <section className="wrap dashboard"><div className="dashboard-top"><div><span className="eyebrow">O2 MEDIA / EDITORIAL</span><h1>Ideas start here.</h1><p>Publish stories, welcome perspectives, and grow your reader community.</p></div><div className="editor-actions"><a className="button button-outline" href="/blog">View the journal <ArrowUpRight size={16}/></a>{tab === 'posts' && <button className="button" onClick={() => { setEditing({ ...blankPost }); setNotice(''); }}><Plus size={16}/>New story</button>}</div></div><div className="dashboard-tabs">{(['posts', 'comments', ...(admin ? ['subscribers', 'messages'] : [])] as Tab[]).map((item) => <button key={item} onClick={() => { setTab(item); setEditing(null); }} className={tab === item ? 'active' : ''}>{({ posts: 'Stories', comments: 'Comments', subscribers: 'Newsletter list', messages: 'Inbox' })[item]}</button>)}</div>{notice && <div className="notice" role="status">{notice}</div>}{deleteTarget && <div className="delete-confirm"><span>Delete “{deleteTarget.label}”? This cannot be undone.</span><button className="button button-danger" onClick={remove} disabled={busy}>Delete permanently</button><button className="text-button" onClick={() => setDeleteTarget(null)}>Cancel</button></div>}{editing && <form className="editor" onSubmit={save}><div className="dashboard-top"><h2>{editing.id ? 'Edit your story' : 'A new perspective'}</h2><button type="button" className="text-button" onClick={() => setEditing(null)} aria-label="Close editor"><X size={22}/></button></div><div className="field"><label htmlFor="post-title">Headline</label><input id="post-title" required minLength={5} maxLength={180} value={editing.title} onChange={(event) => { const title = event.target.value; setEditing({ ...editing, title, ...(!editing.id && (!editing.slug || editing.slug === editing.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) ? { slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') } : {}) }); }}/></div><div className="form-grid"><div className="field"><label htmlFor="post-slug">URL slug</label><input id="post-slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={180} value={editing.slug} onChange={(event) => setEditing({ ...editing, slug: event.target.value })}/><small>Changing this changes the article’s public URL.</small></div><div className="field"><label htmlFor="post-category">Topic</label><select id="post-category" value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })}>{categories.map((item) => <option key={item}>{item}</option>)}</select></div><div className="field"><label htmlFor="post-author">Author</label><input id="post-author" required minLength={2} maxLength={100} value={editing.author} onChange={(event) => setEditing({ ...editing, author: event.target.value })}/></div><div className="field"><label htmlFor="post-cover">Cover image</label><input id="post-cover" required value={editing.cover} onChange={(event) => setEditing({ ...editing, cover: event.target.value })}/><small>HTTPS image URL, or /media/brand.svg, social.svg, content.svg, strategy.svg, inbox.svg, ai.svg.</small></div></div><div className="field"><label htmlFor="post-excerpt">Short description</label><textarea id="post-excerpt" required minLength={20} maxLength={500} rows={3} style={{ minHeight: 90 }} value={editing.excerpt} onChange={(event) => setEditing({ ...editing, excerpt: event.target.value })}/></div><div className="field"><label htmlFor="post-content">Story content (Markdown)</label><textarea id="post-content" required minLength={50} maxLength={100000} value={editing.content} onChange={(event) => setEditing({ ...editing, content: event.target.value })}/><small>Use ## for section headings, **bold** for emphasis, and - for lists. HTML is sanitized for reader safety.</small></div><div className="form-grid"><div className="field"><label htmlFor="post-status">Publication status</label><select id="post-status" value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value })}><option value="draft">Draft — only editors can see it</option><option value="published">Published — visible to everyone</option></select></div><div><label className="checkbox-label"><input type="checkbox" checked={editing.featured} onChange={(event) => setEditing({ ...editing, featured: event.target.checked })}/>Feature on the homepage</label><label className="checkbox-label"><input type="checkbox" checked={editing.sample} onChange={(event) => setEditing({ ...editing, sample: event.target.checked })}/>Clearly label as a sample article</label></div></div><div className="editor-actions"><button type="submit" className="button" disabled={busy}>{busy ? 'Saving…' : 'Save story'}</button><button type="button" className="button button-outline" onClick={() => setEditing(null)}>Cancel</button></div></form>}{loading ? <p className="notice" aria-busy="true">Loading your {tab}…</p> : <>{tab === 'posts' && <><div className="dashboard-table"><table><thead><tr><th>STORY</th><th>TOPIC</th><th>STATUS</th><th>DATE</th><th>ACTIONS</th></tr></thead><tbody>{posts.map((post) => <tr key={post.id}><td><strong>{post.title}</strong>{post.featured && <small style={{ display: 'block', marginTop: 5 }}>Homepage spotlight</small>}</td><td>{post.category}</td><td><span className={`status-pill ${post.status}`}>{post.status}</span></td><td>{formatDate(post.publishedAt)}</td><td><div className="row-actions"><button className="text-button" onClick={() => edit(post.id)}>Edit</button>{post.status === 'published' && <a className="text-button" href={`/blog/${post.slug}`} target="_blank" rel="noopener">View ↗</a>}<button className="text-button" onClick={() => setDeleteTarget({ id: post.id, label: post.title, endpoint: 'posts' })}>Delete</button></div></td></tr>)}</tbody></table></div>{!posts.length && <div className="empty-state"><h3>Your first story starts here.</h3><p>Use “New story” to write a draft or publish an article.</p></div>}{hasMore && <button className="button button-outline" style={{ marginTop: 20 }} onClick={() => load('posts', true)}>Load more stories</button>}</>}{tab === 'comments' && <>{!comments.length && <div className="empty-state"><h3>Room for a new conversation.</h3><p>Reader comments appear here for review before publication.</p></div>}{comments.map((comment) => <article className="moderation-card" key={comment.id}><h3>{comment.author} on “{comment.title}”</h3><small>{formatDate(comment.createdAt)}</small><p>{comment.body}</p><div className="moderation-actions"><span className={`status-pill ${comment.status}`}>{comment.status}</span><button className="button" disabled={busy} onClick={() => moderate(comment.id, 'approved')}>Approve</button><button className="button button-outline" disabled={busy} onClick={() => moderate(comment.id, 'rejected')}>Reject</button><button className="text-button" onClick={() => setDeleteTarget({ id: comment.id, label: 'reader comment', endpoint: 'comments' })}>Delete</button></div></article>)}</>}{tab === 'subscribers' && <><div className="dashboard-top"><p>{subscribers.length} newsletter signup{subscribers.length === 1 ? '' : 's'} · Consent recorded with each subscription</p><button className="button button-outline" onClick={exportSubscribers} disabled={!subscribers.length}><Download size={15}/>Export CSV</button></div><div className="notice">Signups are stored securely. Export this list to your email platform to send newsletters; this website does not send marketing campaigns.</div><div className="dashboard-table"><table><thead><tr><th>EMAIL</th><th>OPTED IN</th><th>ACTIONS</th></tr></thead><tbody>{subscribers.map((item) => <tr key={item.id}><td>{item.email}</td><td>{formatDate(item.consentAt)}</td><td><button className="text-button" onClick={() => setDeleteTarget({ id: item.id, label: item.email, endpoint: 'subscribers' })}>Remove subscription</button></td></tr>)}</tbody></table></div></>}{tab === 'messages' && <>{!messages.length && <div className="empty-state"><h3>Your inbox is all caught up.</h3><p>Contact form submissions arrive here.</p></div>}{messages.map((message) => <article key={message.id} className="message-card"><h3>{message.subject}</h3><small>{message.name} · {message.email} · {formatDate(message.createdAt)}</small><p>{message.body}</p><div className="editor-actions"><a className="button button-outline" href={`mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}>Reply by email <ArrowUpRight size={14}/></a><button className="text-button" onClick={() => setDeleteTarget({ id: message.id, label: message.subject, endpoint: 'messages' })}>Delete message</button></div></article>)}</>}</>}</section>;
}
