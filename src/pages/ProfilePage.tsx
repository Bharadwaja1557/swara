import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-full bg-swara-bg max-w-2xl mx-auto">
      <div className="sticky top-0 z-10 bg-swara-bg/95 backdrop-blur-sm flex items-center gap-3 px-4 pt-5 pb-3">
        <button type="button" onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-swara-muted hover:text-swara-text active:scale-90 transition-all"
          aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-[1rem] font-semibold text-swara-text tracking-tight">Profile</h1>
      </div>

      <div className="flex flex-col items-center pt-10 px-6 gap-5">
        <div className="w-24 h-24 rounded-full bg-swara-elevated border-2 border-swara-border flex items-center justify-center text-swara-dim">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM20.59 22c0-3.63-3.85-6.57-8.59-6.57S3.41 18.37 3.41 22"/>
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-[1.3rem] font-bold text-swara-text font-display">Neo</h2>
          <p className="text-[0.82rem] text-swara-muted mt-0.5">Swara User</p>
        </div>

        <div className="w-full mt-4 bg-swara-card border border-swara-border rounded-2xl overflow-hidden">
          {[
            { label: 'Liked Songs', icon: '♥' },
            { label: 'My Library', icon: '📚' },
            { label: 'Account Settings', icon: '⚙️' },
          ].map(({ label, icon }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-4 border-b border-swara-border last:border-b-0">
              <span className="text-lg">{icon}</span>
              <span className="text-[0.9rem] text-swara-text font-medium">{label}</span>
              <span className="ml-auto text-[0.7rem] font-semibold text-swara-dim uppercase tracking-widest">
                Coming Soon
              </span>
            </div>
          ))}
        </div>

        <p className="text-[0.72rem] text-swara-dim text-center mt-4">
          swara · Music for <span className="text-swara-accent">Soul</span>
        </p>
      </div>
    </div>
  );
};

export default ProfilePage;
