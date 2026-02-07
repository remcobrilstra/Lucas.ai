export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: 'linear-gradient(135deg, hsl(24 100% 97%) 0%, hsl(30 67% 97%) 100%)'
    }}>
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-6" style={{
          background: 'linear-gradient(135deg, hsl(22 60% 18%) 0%, hsl(15 70% 48%) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>Lucas.ai</h1>
        <p className="text-xl font-medium" style={{ color: 'hsl(20 50% 35%)' }}>AI Agent Platform - Coming Soon</p>
      </div>
    </div>
  );
}
