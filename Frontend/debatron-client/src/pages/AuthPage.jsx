// E:\Debatron\Frontend\my-debate-arena-frontend\src\pages\AuthPage.jsx
import React, { useState } from 'react';
import AuthForm from '../components/AuthForm';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="row justify-content-center mt-5">
      <div className="col-md-6 col-lg-4">
        <AuthForm isLogin={isLogin} />
        <p className="text-center mt-3">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); }}>
            {isLogin ? 'Sign Up here' : 'Login here'}
          </a>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;