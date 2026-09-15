import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => (
  <div className="empty-state">
    <h2>403 — Access Restricted</h2>
    <p>Your account role doesn&apos;t have permission to view this page.</p>
    <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
  </div>
);

export default Unauthorized;
