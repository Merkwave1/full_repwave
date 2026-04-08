// src/components/common/AuthTestButton.jsx
import React from 'react';
import Button from './Button/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';

const AuthTestButton = () => {
  const { showReloginModal } = useAuth();

  const testAuthError = () => {
    // Simulate an authorization error
    showReloginModal();
  };

  return (
    <Button 
      onClick={testAuthError}
      variant="secondary"
      className="m-2"
    >
      Test Auth Error
    </Button>
  );
};

export default AuthTestButton;
