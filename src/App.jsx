import { Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import Categories from "./pages/Categories.jsx"
import Transactions from "./pages/Transactions.jsx"
import ProtectedRoute from "./components/ProtectedRoute.jsx"
import Layout from "./components/Layout.jsx"

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/categories" element={<Categories />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;