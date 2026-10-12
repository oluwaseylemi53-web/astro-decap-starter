import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDown, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { categories, formatDate, type Post } from '../../lib/types';

export function ArticleCard({ post }: { post: Post }) {
  return <article className="article-card"><a className="card-image" href={`/blog/${post.slug}`}><img src={post.cover} alt={`Editorial illustration for ${post.title}`} loading="lazy" width="720" height="500" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/media/brand.svg'; }}/><span className="image-arrow"><ArrowUpRight size={22}/></span></a><div className="card-meta"><span className="category-label">{post.category}</span><span>{post.readMinutes} MIN READ</span></div><h3><a href={`/blog/${post.slug}`}>{post.title}</a></h3><p>{post.excerpt}</p><div className="card-byline"><span className="avatar">O<span>2</span></span><span>{post.author}<small>{formatDate(post.publishedAt)}{post.sample && ' · Sample article'}</small></span></div></article>;
}
export default function ArticleFeed({ initialPosts = [], full = false, unavailable = false }: { initialPosts?: Post[]; full?: boolean; unavailable?: boolean }) {
  const [posts, setPosts] = useState(initialPosts);
  const [category, setCategory] = useState('All stories');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(full ? 12 : 6);
  const [busy, setBusy] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === 100);
  const [error, setError] = useState(unavailable ? 'The live feed is temporarily unavailable. Please try again shortly.' : '');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('category')) setCategory(params.get('category')!);
    if (params.get('q')) setQuery(params.get('q')!);
    if (params.has('search')) document.getElementById('article-search')?.focus();
  }, []);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setBusy(true);
      const params = new URLSearchParams({ q: query, ...(category === 'All stories' ? {} : { category }) });
      api(`posts?${params}`).then((data) => { if (active) { setPosts(data.posts); setHasMore(data.hasMore); setError(''); } }).catch((error) => { if (active) setError(error.message); }).finally(() => { if (active) setBusy(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [category, query]);
  async function more() {
    if (limit < posts.length) { setLimit(limit + 6); return; }
    setBusy(true);
    try {
      const params = new URLSearchParams({ q: query, offset: String(posts.length), ...(category === 'All stories' ? {} : { category }) });
      const data = await api(`posts?${params}`);
      setPosts((current) => [...current, ...data.posts]); setHasMore(data.hasMore); setLimit(limit + 6);
    } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  const filtered = posts.filter((post) => (category === 'All stories' || post.category === category) && `${post.title} ${post.excerpt} ${post.author}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="stories wrap" id="stories"><div className="section-heading"><div><span className="eyebrow">THE O2 JOURNAL</span><h2>{full ? 'Find your next good idea.' : 'Fresh off the press.'}</h2></div><p>New perspectives. Practical takeaways.<br/>A little inspiration for what’s next.</p></div><div className="feed-toolbar"><div className="category-tabs" aria-label="Filter by topic">{['All stories', ...categories].map((item) => <button key={item} onClick={() => { setCategory(item); setLimit(full ? 12 : 6); }} className={category === item ? 'active' : ''} aria-pressed={category === item}>{item}</button>)}</div><label className="article-search"><Search size={17}/><input id="article-search" type="search" aria-label="Search articles" placeholder="Find a story…" value={query} onChange={(event) => setQuery(event.target.value)}/></label></div>{error && <div className="notice" role="status">{error}</div>}{busy && !posts.length ? <div className="article-grid" aria-label="Loading articles">{[1, 2, 3].map((item) => <div className="skeleton-card" key={item}><div/><span/><span/></div>)}</div> : <><div className="article-grid">{filtered.slice(0, limit).map((post) => <ArticleCard key={post.id} post={post}/>)}</div>{!filtered.length && <div className="empty-state"><Search size={30}/><h3>No stories found. Yet.</h3><p>Try another search or explore a different topic.</p><button className="button" onClick={() => { setQuery(''); setCategory('All stories'); }}>See all stories</button></div>}{(filtered.length > limit || hasMore) && <div className="load-more"><button className="button button-outline" disabled={busy} onClick={more}>A little more inspiration <ArrowDown size={17}/></button></div>}</>}</section>;
}
