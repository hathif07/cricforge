import React from 'react';

const PrivacyPolicy = () => (
  <div className="card">
    <h1>Privacy Policy</h1>
    <p>CricForge stores account details (name, email, hashed password), team/player data you create, and match records
      you generate through scoring or simulation. This data is used solely to operate the platform's features -
      dashboards, statistics, and analytics - and is not sold or shared with third parties.</p>
    <p>Password reset tokens, JWT access/refresh tokens, and role assignments are stored to support secure
      authentication. You may request account deactivation from an administrator at any time.</p>
    <p className="muted">This is a project/demo document, not a legally binding policy.</p>
  </div>
);

export default PrivacyPolicy;
