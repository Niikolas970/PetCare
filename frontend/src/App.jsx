import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './auth/RouteGuards.jsx';
import AppLayout from './components/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import HomePage from './pages/HomePage.jsx';
import PetPage from './pages/pets/PetPage.jsx';
import PetsPage from './pages/pets/PetsPage.jsx';
import { HouseholdProvider } from './households/HouseholdContext.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ComingSoonPage from './pages/ComingSoonPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <HouseholdProvider>
              <AppLayout />
            </HouseholdProvider>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="mascotas" element={<PetsPage />} />
          <Route path="mascotas/:id" element={<PetPage />} />
          <Route path="calendario" element={<ComingSoonPage title="Calendario" />} />
          <Route path="hogar" element={<ComingSoonPage title="Hogar" />} />
          <Route path="perfil" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
