import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MemoryFeed from './pages/MemoryFeed';
import SynestheticFinder from './pages/SynestheticFinder';
import TheProfile from './pages/TheProfile';
import StealthInput from './pages/StealthInput';
import VaultEvents from './pages/VaultEvents';
import SettingsPage from './pages/SettingsPage';
import { NexusProvider } from './context/NexusContext';
import Layout from './components/Layout';

function App() {
  return (
    <NexusProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<MemoryFeed />} />
            <Route path="/search" element={<SynestheticFinder />} />
            <Route path="/profile/:id" element={<TheProfile />} />
            <Route path="/stealth" element={<StealthInput />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/vault" element={<VaultEvents />} />
          </Routes>
        </Layout>
      </Router>
    </NexusProvider>
  );
}

export default App;
