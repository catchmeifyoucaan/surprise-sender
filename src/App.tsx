import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import PhishletsPage from './pages/Phishlets';
import SessionsPage from './pages/Sessions';
import LandingPageBuilderPage from './pages/LandingPageBuilder';
import PrivateRoute from './components/PrivateRoute';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/',
    element: <PrivateRoute><DashboardPage /></PrivateRoute>
  },
  {
    path: '/settings',
    element: <PrivateRoute><SettingsPage /></PrivateRoute>
  },
  {
    path: '/phishlets',
    element: <PrivateRoute><PhishletsPage /></PrivateRoute>
  },
  {
    path: '/sessions',
    element: <PrivateRoute><SessionsPage /></PrivateRoute>
  },
  {
    path: '/landing-page-builder',
    element: <PrivateRoute><LandingPageBuilderPage /></PrivateRoute>
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
});

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App; 