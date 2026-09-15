import React from 'react';

const ROLE_LABELS = {
  admin: 'Admin',
  team_owner: 'Team Owner',
  scorer: 'Scorer',
  tournament_organizer: 'Organizer',
  spectator: 'Spectator'
};

const RoleBadge = ({ role, solid }) => (
  <span className={`badge ${solid ? 'badge-solid' : 'badge-outline'}`}>{ROLE_LABELS[role] || role}</span>
);

export default RoleBadge;
