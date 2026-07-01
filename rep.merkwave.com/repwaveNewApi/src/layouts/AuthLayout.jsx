// src/layouts/AuthLayout.js
import React from "react";
import RepWaveLogo from "../components/common/RepWaveLogo/RepWaveLogo.jsx";

function AuthLayout({ children }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{
        background:
          "linear-gradient(145deg, #1A0F35 0%, #2D1B69 42%, #7A52C2 78%, #8B5FD6 100%)",
      }}
    >
      <div className="relative w-full max-w-[420px]">
        <div
          className="absolute -inset-px rounded-[1.35rem] opacity-60 blur-sm"
          style={{
            background:
              "linear-gradient(135deg, rgba(196,168,240,0.5), rgba(139,95,214,0.2))",
          }}
          aria-hidden
        />
        <div className="relative bg-white/95 backdrop-blur-sm p-8 sm:p-9 rounded-[1.25rem] shadow-[0_28px_70px_-12px_rgba(26,15,53,0.45)] border border-white/60">
          <div className="flex justify-center mb-7 px-1">
            <RepWaveLogo
              variant="full"
              size={52}
              showTag
              className="w-full max-w-[260px]"
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
