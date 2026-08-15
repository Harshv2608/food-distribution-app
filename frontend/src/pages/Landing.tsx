import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  HeartHandshake, Leaf, ShieldCheck, MapPin, ArrowRight, 
  Globe, Clock, Mail, Phone, Map, Shield 
} from 'lucide-react';

export const Landing: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen" style={{ overflowX: 'hidden', background: 'var(--bg-dark)' }}>
      
      {/* Sticky Navbar */}
      <nav style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: '16px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: scrolled ? 'rgba(10, 12, 16, 0.85)' : 'rgba(10, 12, 16, 0.4)',
        backdropFilter: 'blur(16px)',
        borderBottom: scrolled ? '1px solid rgba(16, 185, 129, 0.1)' : '1px solid transparent',
        transition: 'all 0.3s ease',
        boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.5)' : 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--accent)', padding: '8px', borderRadius: '10px', color: 'white', boxShadow: '0 4px 16px rgba(16,185,129,0.4)' }}>
            <Leaf size={24} />
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>FoodRescue</span>
        </div>
        
        {/* Nav Links */}
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <a href="#about" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color='var(--text-primary)'} onMouseOut={e => e.currentTarget.style.color='var(--text-secondary)'}>About</a>
          <a href="#impact" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color='var(--text-primary)'} onMouseOut={e => e.currentTarget.style.color='var(--text-secondary)'}>Impact</a>
          <a href="#help" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color='var(--text-primary)'} onMouseOut={e => e.currentTarget.style.color='var(--text-secondary)'}>How it Works</a>
          <a href="#contact" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color='var(--text-primary)'} onMouseOut={e => e.currentTarget.style.color='var(--text-secondary)'}>Contact</a>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <Link to="/login" className="btn btn-secondary">Sign In</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{ 
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '120px 24px 80px',
        textAlign: 'center',
        background: 'linear-gradient(to bottom, rgba(10, 12, 16, 0.7), rgba(10, 12, 16, 1)), url("https://images.unsplash.com/photo-1488459716781-31db52582fe9?q=80&w=2070&auto=format&fit=crop")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}>
        <div style={{ display: 'inline-block', padding: '10px 20px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)', borderRadius: '30px', fontWeight: 700, marginBottom: '24px', backdropFilter: 'blur(8px)', border: '1px solid rgba(16, 185, 129, 0.3)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)' }}>
          Platform is Live 🚀
        </div>
        
        <h1 style={{ fontSize: 'clamp(3.5rem, 6vw, 6rem)', lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-1.5px', color: '#ffffff', textShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
          End Food Waste.<br />
          <span style={{ color: 'var(--accent)', textShadow: '0 0 40px rgba(16, 185, 129, 0.3)' }}>Feed Communities.</span>
        </h1>
        
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '650px', margin: '0 auto 48px auto', lineHeight: 1.6, fontWeight: 500, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
          The intelligent coordination platform connecting surplus food donors directly with verified NGOs in real-time, using geospatial routing.
        </p>

        {/* 3D Image Cards */}
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
          
          {/* Donor Card */}
          <div className="glass-panel" style={{ padding: 0, textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '200px', width: '100%', background: 'url("https://images.unsplash.com/photo-1556910103-1c02745a872f?q=80&w=2070&auto=format&fit=crop")', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), var(--bg-card))' }}></div>
              <div style={{ position: 'absolute', bottom: '20px', left: '24px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', padding: '12px', borderRadius: '12px', backdropFilter: 'blur(8px)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <HeartHandshake size={28} />
              </div>
            </div>
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.75rem', marginBottom: '12px', color: '#ffffff' }}>I am a Donor</h3>
              <p className="text-secondary" style={{ marginBottom: '24px', minHeight: '48px', fontSize: '1.1rem' }}>
                Restaurants, caterers, and grocers with surplus food to share.
              </p>
              <Link to="/register" state={{ role: 'DONOR' }} className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px' }}>
                Join as Donor <ArrowRight size={20} />
              </Link>
            </div>
          </div>

          {/* NGO Card */}
          <div className="glass-panel" style={{ padding: 0, textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '200px', width: '100%', background: 'url("https://images.unsplash.com/photo-1593113514676-59911e3b6279?q=80&w=2070&auto=format&fit=crop")', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), var(--bg-card))' }}></div>
              <div style={{ position: 'absolute', bottom: '20px', left: '24px', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--warning)', padding: '12px', borderRadius: '12px', backdropFilter: 'blur(8px)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <MapPin size={28} />
              </div>
            </div>
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.75rem', marginBottom: '12px', color: '#ffffff' }}>I am an NGO</h3>
              <p className="text-secondary" style={{ marginBottom: '24px', minHeight: '48px', fontSize: '1.1rem' }}>
                Food banks, shelters, and community kitchens distributing food.
              </p>
              <Link to="/register" state={{ role: 'NGO' }} className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 4px 16px rgba(245,158,11,0.3)' }}>
                Join as NGO <ArrowRight size={20} />
              </Link>
            </div>
          </div>

        </div>
      </main>

      {/* About Section */}
      <section id="about" style={{ padding: '120px 24px', background: 'var(--bg-dark)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{ fontSize: '3rem', color: '#ffffff' }}>Why FoodRescue?</h2>
            <p style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto', color: 'var(--text-secondary)' }}>We replace manual coordination with a highly deterministic, geospatial algorithm that ensures food gets where it needs to go, safely and efficiently.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
            <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 32px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)', padding: '24px', borderRadius: '50%', display: 'inline-block', marginBottom: '32px', border: '1px solid rgba(16, 185, 129, 0.2)', boxShadow: 'inset 0 0 20px rgba(16,185,129,0.1)' }}>
                <Globe size={48} />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#fff' }}>Geospatial Matching</h3>
              <p>Powered by PostGIS, our system filters and connects donations strictly within a safe, defined radius of the NGO.</p>
            </div>
            
            <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 32px' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '24px', borderRadius: '50%', display: 'inline-block', marginBottom: '32px', border: '1px solid rgba(245, 158, 11, 0.2)', boxShadow: 'inset 0 0 20px rgba(245,158,11,0.1)' }}>
                <Shield size={48} />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#fff' }}>Strict Food Safety</h3>
              <p>A deterministic risk engine evaluates prep times and storage conditions to prevent unsafe food from ever being listed.</p>
            </div>
            
            <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 32px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '24px', borderRadius: '50%', display: 'inline-block', marginBottom: '32px', border: '1px solid rgba(59, 130, 246, 0.2)', boxShadow: 'inset 0 0 20px rgba(59,130,246,0.1)' }}>
                <Clock size={48} />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#fff' }}>Concurrent Integrity</h3>
              <p>Database-level transactional locks ensure that no two NGOs can accidentally claim the same donation at the same time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Stats Section (Parallax) */}
      <section id="impact" style={{ 
        padding: '140px 24px', 
        background: 'linear-gradient(to right, rgba(10, 12, 16, 0.9), rgba(10, 12, 16, 0.7)), url("https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=2070&auto=format&fit=crop")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        boxShadow: 'inset 0 10px 50px rgba(0,0,0,0.8)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '3.5rem', marginBottom: '16px', color: 'white', textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>Our Impact</h2>
          <p style={{ fontSize: '1.2rem', marginBottom: '80px', color: 'var(--text-secondary)', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>Real-time statistics of our growing community.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px' }}>
            <div className="glass-panel" style={{ background: 'rgba(18, 24, 21, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <h2 style={{ fontSize: '4rem', color: 'var(--accent)', marginBottom: '8px', textShadow: '0 0 30px rgba(16,185,129,0.4)' }}>54k+</h2>
              <p style={{ fontSize: '1.1rem', color: '#fff', margin: 0, fontWeight: 600 }}>Meals Rescued</p>
            </div>
            <div className="glass-panel" style={{ background: 'rgba(24, 20, 15, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <h2 style={{ fontSize: '4rem', color: 'var(--warning)', marginBottom: '8px', textShadow: '0 0 30px rgba(245,158,11,0.4)' }}>12.5t</h2>
              <p style={{ fontSize: '1.1rem', color: '#fff', margin: 0, fontWeight: 600 }}>CO₂ Prevented</p>
            </div>
            <div className="glass-panel" style={{ background: 'rgba(15, 20, 30, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <h2 style={{ fontSize: '4rem', color: '#3b82f6', marginBottom: '8px', textShadow: '0 0 30px rgba(59,130,246,0.4)' }}>142</h2>
              <p style={{ fontSize: '1.1rem', color: '#fff', margin: 0, fontWeight: 600 }}>Active NGOs</p>
            </div>
            <div className="glass-panel" style={{ background: 'rgba(20, 15, 30, 0.4)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <h2 style={{ fontSize: '4rem', color: '#8b5cf6', marginBottom: '8px', textShadow: '0 0 30px rgba(139,92,246,0.4)' }}>430</h2>
              <p style={{ fontSize: '1.1rem', color: '#fff', margin: 0, fontWeight: 600 }}>Registered Donors</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="help" style={{ padding: '120px 24px', background: 'var(--bg-dark)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{ fontSize: '3rem', color: '#ffffff' }}>How it Works</h2>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>A seamless, four-step lifecycle from surplus to survival.</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <div className="glass-panel" style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--accent)', flexShrink: 0, boxShadow: '0 0 20px rgba(16,185,129,0.2)' }}>1</div>
              <div>
                <h3 style={{ fontSize: '1.75rem', marginBottom: '12px', color: '#fff' }}>Donor creates a listing</h3>
                <p style={{ margin: 0, fontSize: '1.1rem' }}>A restaurant or caterer logs surplus food, specifying category, quantity, and storage limits. The system automatically performs a food safety check.</p>
              </div>
            </div>
            
            <div className="glass-panel" style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--warning)', flexShrink: 0, boxShadow: '0 0 20px rgba(245,158,11,0.2)' }}>2</div>
              <div>
                <h3 style={{ fontSize: '1.75rem', marginBottom: '12px', color: '#fff' }}>Smart Matching Engine</h3>
                <p style={{ margin: 0, fontSize: '1.1rem' }}>The platform uses PostGIS to find NGOs within range, scoring matches based on a 30/30/25/15 weighting (Distance, Urgency, Category, Capacity).</p>
              </div>
            </div>

            <div className="glass-panel" style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 'bold', color: '#3b82f6', flexShrink: 0, boxShadow: '0 0 20px rgba(59,130,246,0.2)' }}>3</div>
              <div>
                <h3 style={{ fontSize: '1.75rem', marginBottom: '12px', color: '#fff' }}>NGO Claims the Food</h3>
                <p style={{ margin: 0, fontSize: '1.1rem' }}>Verified NGOs view available donations. Once claimed, our database locks the record to ensure no double-booking occurs.</p>
              </div>
            </div>

            <div className="glass-panel" style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid #8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 'bold', color: '#8b5cf6', flexShrink: 0, boxShadow: '0 0 20px rgba(139,92,246,0.2)' }}>4</div>
              <div>
                <h3 style={{ fontSize: '1.75rem', marginBottom: '12px', color: '#fff' }}>Pickup & Completion</h3>
                <p style={{ margin: 0, fontSize: '1.1rem' }}>The NGO assigns a pickup vehicle. Once successfully picked up and distributed, the lifecycle is marked as Complete.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" style={{ padding: '120px 24px', background: '#07090b', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{ fontSize: '3rem', color: '#ffffff' }}>Get in Touch</h2>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Have questions about joining our network? We'd love to hear from you.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '48px' }}>
            
            {/* Contact Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <Mail size={32} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Email Us</h4>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1.1rem' }}>hello@foodrescue.org</p>
                </div>
              </div>
              
              <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', borderRadius: '16px', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Phone size={32} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Call Us</h4>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1.1rem' }}>+1 (800) 123-4567</p>
                </div>
              </div>
              
              <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '16px', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <Map size={32} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Headquarters</h4>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1.1rem' }}>123 Impact Way, Tech District</p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <form className="glass-panel flex flex-col gap-6" onSubmit={e => { e.preventDefault(); alert('Thanks for reaching out! We will contact you soon.'); }}>
              <div className="flex gap-4">
                <div className="w-full">
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 600 }}>First Name</label>
                  <input type="text" className="glass-input" placeholder="Jane" required />
                </div>
                <div className="w-full">
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 600 }}>Last Name</label>
                  <input type="text" className="glass-input" placeholder="Doe" required />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 600 }}>Email Address</label>
                <input type="email" className="glass-input" placeholder="jane@example.com" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontWeight: 600 }}>Message</label>
                <textarea className="glass-input" rows={4} placeholder="How can we help?" required></textarea>
              </div>
              <button type="submit" className="btn btn-primary mt-2" style={{ padding: '16px', fontSize: '1.1rem', width: '100%' }}>Send Message</button>
            </form>
            
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '64px 24px', background: '#050709', color: 'white', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ padding: '8px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px' }}>
            <Leaf size={24} color="var(--accent)" />
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>FoodRescue</span>
        </div>
        <p style={{ color: '#94a3b8', marginBottom: '32px', fontSize: '1.1rem' }}>
          Building a sustainable future, one meal at a time.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '32px' }}>
          <a href="#" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }} onMouseOver={e=>e.currentTarget.style.color='var(--accent)'} onMouseOut={e=>e.currentTarget.style.color='#cbd5e1'}>Privacy Policy</a>
          <a href="#" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }} onMouseOver={e=>e.currentTarget.style.color='var(--accent)'} onMouseOut={e=>e.currentTarget.style.color='#cbd5e1'}>Terms of Service</a>
          <a href="#" style={{ color: '#cbd5e1', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }} onMouseOver={e=>e.currentTarget.style.color='var(--accent)'} onMouseOut={e=>e.currentTarget.style.color='#cbd5e1'}>Admin Login</a>
        </div>
        <p style={{ color: '#64748b', fontSize: '1rem' }}>
          &copy; {new Date().getFullYear()} FoodRescue Platform. Open Source Project.
        </p>
      </footer>
    </div>
  );
};
