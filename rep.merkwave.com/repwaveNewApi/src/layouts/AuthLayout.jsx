// src/layouts/AuthLayout.js
import React from "react";
import RepWaveLogo from "../components/common/RepWaveLogo/RepWaveLogo.jsx";

function AuthLayout({ children }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, #1A0F35 0%, #2D1B69 45%, #8B5FD6 100%)",
      }}
    >
      <div className="bg-white p-8 rounded-2xl shadow-[0_25px_60px_-10px_rgba(139,95,214,0.40)] w-full max-w-md border border-purple-100/40">
        {/* Logo at top of auth card */}
        <div className="flex justify-center mb-6">
          <RepWaveLogo size={64} showText={true} showTag={true} />
        </div>
        {children}
      </div>
    </div>
  );
}

export default AuthLayout;
