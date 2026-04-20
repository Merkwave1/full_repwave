// Mock Data Info Component
// Display mock data statistics and controls
// Add this to your dashboard or any page to see the loaded mock data

import React, { useState, useEffect } from "react";
import {
  getMockDataStats,
  resetMockData,
  clearMockData,
  isMockDataAvailable,
} from "../../mock";

function MockDataInfo() {
  const [stats, setStats] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const loadStats = () => {
    setIsAvailable(isMockDataAvailable());
    if (isMockDataAvailable()) {
      setStats(getMockDataStats());
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleReset = () => {
    if (
      window.confirm("هل أنت متأكد من إعادة تعيين جميع البيانات التجريبية؟")
    ) {
      resetMockData();
      loadStats();
      window.location.reload(); // Reload to refresh all components
    }
  };

  const handleClear = () => {
    if (window.confirm("هل أنت متأكد من حذف جميع البيانات التجريبية؟")) {
      clearMockData();
      loadStats();
      window.location.reload();
    }
  };

  if (!isAvailable) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.icon}>⚠️</span>
          <h3 style={styles.title}>البيانات التجريبية غير متوفرة</h3>
        </div>
        <p style={styles.message}>قم بتحديث الصفحة لتحميل البيانات التجريبية</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header} onClick={() => setShowDetails(!showDetails)}>
        <span style={styles.icon}>🎭</span>
        <h3 style={styles.title}>البيانات التجريبية</h3>
        <button style={styles.toggleButton}>{showDetails ? "▼" : "▶"}</button>
      </div>

      {showDetails && stats && (
        <>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{stats.users}</span>
              <span style={styles.statLabel}>مستخدمين</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{stats.clients}</span>
              <span style={styles.statLabel}>عملاء</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{stats.products}</span>
              <span style={styles.statLabel}>منتجات</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{stats.warehouses}</span>
              <span style={styles.statLabel}>مخازن</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{stats.inventory}</span>
              <span style={styles.statLabel}>عناصر المخزون</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{stats.salesOrders}</span>
              <span style={styles.statLabel}>طلبات البيع</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{stats.purchaseOrders}</span>
              <span style={styles.statLabel}>طلبات الشراء</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statValue}>{stats.suppliers}</span>
              <span style={styles.statLabel}>موردين</span>
            </div>
          </div>

          <div style={styles.controls}>
            <button style={styles.resetButton} onClick={handleReset}>
              🔄 إعادة تعيين البيانات
            </button>
            <button style={styles.clearButton} onClick={handleClear}>
              🗑️ حذف البيانات
            </button>
          </div>

          <div style={styles.info}>
            <p style={styles.infoText}>
              💡 البيانات التجريبية محملة ومتاحة للاستخدام في جميع أنحاء التطبيق
            </p>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#f8f9fa",
    border: "1px solid #dee2e6",
    borderRadius: "8px",
    padding: "16px",
    margin: "16px 0",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
    userSelect: "none",
  },
  icon: {
    fontSize: "24px",
  },
  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  toggleButton: {
    background: "none",
    border: "none",
    fontSize: "14px",
    cursor: "pointer",
    padding: "4px 8px",
  },
  message: {
    marginTop: "12px",
    color: "#666",
    fontSize: "14px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "12px",
    marginTop: "16px",
  },
  statCard: {
    backgroundColor: "white",
    border: "1px solid #e9ecef",
    borderRadius: "6px",
    padding: "12px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  statValue: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#0066cc",
  },
  statLabel: {
    fontSize: "12px",
    color: "#666",
  },
  controls: {
    display: "flex",
    gap: "12px",
    marginTop: "16px",
    flexWrap: "wrap",
  },
  resetButton: {
    backgroundColor: "#0066cc",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "8px 16px",
    fontSize: "14px",
    cursor: "pointer",
    flex: 1,
    minWidth: "150px",
  },
  clearButton: {
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "8px 16px",
    fontSize: "14px",
    cursor: "pointer",
    flex: 1,
    minWidth: "150px",
  },
  info: {
    marginTop: "12px",
    padding: "12px",
    backgroundColor: "#e7f3ff",
    borderRadius: "4px",
    border: "1px solid #b3d9ff",
  },
  infoText: {
    margin: 0,
    fontSize: "13px",
    color: "#004085",
  },
};

export default MockDataInfo;
