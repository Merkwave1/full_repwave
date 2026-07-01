// src/pages/DashboardNew.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import ComprehensiveDashboard from "../components/dashboard/ComprehensiveDashboard.jsx";

function HomeTabContent() {
  return <ComprehensiveDashboard />;
}

function DashboardPage() {
  return (
    <div className="p-4 sm:p-6" dir="rtl">
      <Outlet />
    </div>
  );
}

DashboardPage.HomeTab = HomeTabContent;
export default DashboardPage;
