SELECT "SalesOrdersStatus", COUNT(*) AS cnt FROM "SalesOrders" GROUP BY "SalesOrdersStatus" ORDER BY cnt DESC;
