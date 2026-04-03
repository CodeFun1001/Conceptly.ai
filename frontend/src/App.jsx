import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/Authcontext";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Session from "./pages/Session";
import Quiz from "./pages/Quiz";
import Feynman from "./pages/Feynman";
import Completion from "./pages/Completion";
import History from "./pages/History";
import Analytics from "./pages/Analytics";
import "./styles/main.css";

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) { return <div className="loading">Loading...</div>;}
  return user ? children : <Navigate to="/login" />;
};

const Layout = ({ children }) => {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: (
        <Layout>
          <Landing />
        </Layout>
      ),
    },
    {
      path: "/login",
      element: (
        <Layout>
          <Login />
        </Layout>
      ),
    },
    {
      path: "/register",
      element: (
        <Layout>
          <Register />
        </Layout>
      ),
    },
    {
      path: "/dashboard",
      element: (
        <PrivateRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </PrivateRoute>
      ),
    },
    {
      path: "/session/:id",
      element: (
        <PrivateRoute>
          <Layout>
            <Session />
          </Layout>
        </PrivateRoute>
      ),
    },
    {
      path: "/quiz/:sessionId/:checkpointId",
      element: (
        <PrivateRoute>
          <Layout>
            <Quiz />
          </Layout>
        </PrivateRoute>
      ),
    },
    {
      path: "/feynman/:sessionId/:checkpointId",
      element: (
        <PrivateRoute>
          <Layout>
            <Feynman />
          </Layout>
        </PrivateRoute>
      ),
    },
    {
      path: "/completion/:sessionId",
      element: (
        <PrivateRoute>
          <Layout>
            <Completion />
          </Layout>
        </PrivateRoute>
      ),
    },
    {
      path: "/history",
      element: (
        <PrivateRoute>
          <Layout>
            <History />
          </Layout>
        </PrivateRoute>
      ),
    },
    {
      path: "/analytics",
      element: (
        <PrivateRoute>
          <Layout>
            <Analytics />
          </Layout>
        </PrivateRoute>
      ),
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;