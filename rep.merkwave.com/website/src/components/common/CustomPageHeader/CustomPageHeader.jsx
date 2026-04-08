import React from 'react';

// Custom reusable page header component for inventory management tabs
// Props:
// - title: string
// - subtitle: string
// - icon: React element
// - statValue: number or string
// - statLabel: string
// - actionButton: React element or array of React elements (optional buttons to display on the right)
export default function CustomPageHeader({ title, subtitle, icon, statValue, statLabel, actionButton, statSecondaryValue, statSecondaryLabel }) {
  const actionButtons = Array.isArray(actionButton) ? actionButton : actionButton ? [actionButton] : [];
  
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-3 mb-8 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-white bg-opacity-20 rounded-full p-3 ml-4">
            {icon}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-blue-50 mt-1">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 space-x-reverse">
          {actionButtons.map((button, index) => (
            <div key={index}>{button}</div>
          ))}
          { (statSecondaryValue !== undefined && statSecondaryLabel) && (
            <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center">
              <div className="text-lg font-bold">{statSecondaryValue}</div>
              <div className="text-xs text-blue-50">{statSecondaryLabel}</div>
            </div>
          ) }
          <div className="bg-white bg-opacity-20 rounded-lg p-2 text-center">
            <div className="text-2xl font-bold">{statValue}</div>
            <div className="text-sm text-blue-50">{statLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}