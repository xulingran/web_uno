import { HashRouter as Router, Routes, Route } from "react-router-dom";
import GamePage from "@/pages/GamePage";
import SettingsPage from "@/components/SettingsPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<GamePage />} />
      </Routes>
    </Router>
  );
}