import { useEffect, useState } from 'react';
import { getUser, onAuthChange } from '@netlify/identity';
import { ArrowUpRight, Menu, Search, X } from 'lucide-react';

export function Logo() {
  return <a className="logo" href="/" aria-label="O2 Media home"><span className="logo-symbol">O<span>2</span><i /></span><span className="logo-word">media<span>IDEAS WORTH SHARING</span></span></a>;
}
export default function Header() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (window.location.pathname.replace(/\/$/, '') !== '/account' && /(?:confirmation|recovery|invite|access)_token=/.test(window.location.hash)) { window.location.replace(`/account${window.location.hash}`); return; }
    getUser().then((user) => setSignedIn(Boolean(user)));
    return onAuthChange((_event, user) => setSignedIn(Boolean(user)));
  }, []);
  return <><div className="masthead"><div className="wrap"><span>INDEPENDENT IDEAS. REAL-WORLD IMPACT.</span><span>A little more signal. A little less noise.</span></div></div><header className="site-header wrap"><Logo/><nav className={open ? 'navigation is-open' : 'navigation'} aria-label="Main navigation"><a className="nav-blog" href="/blog">The blog</a><a href="/blog?category=Strategy">Topics</a><a href="/about">About us</a><a href="/contact">Let’s talk</a></nav><div className="header-actions"><a className="search-link" href="/blog?search=1" aria-label="Search articles"><Search size={20}/></a><a className="account-link" href="/account">{signedIn ? 'My account' : 'Sign in'}</a><a className="button button-small" href="/#newsletter">Stay in the loop <ArrowUpRight size={16}/></a><button className="menu-button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button></div></header></>;
}
