// src/components/common/ProtectedRoute.js (frontend - React Router v6)
import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
