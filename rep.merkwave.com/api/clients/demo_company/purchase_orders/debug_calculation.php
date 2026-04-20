<?php
// Debug calculation for purchase order totals

// Test data based on your screenshot
$items = [
    [
        'quantity_ordered' => 100,
        'unit_cost' => 100.00
    ]
];

$order_discount = 700.00;

echo "=== Purchase Order Calculation Debug ===\n";

$calculated_total_amount = 0.00;

foreach ($items as $index => $item) {
    $item_total_cost = (float)$item['quantity_ordered'] * (float)$item['unit_cost'];
    $calculated_total_amount += $item_total_cost;
    
    echo "Item #" . ($index + 1) . ":\n";
    echo "  Quantity: " . $item['quantity_ordered'] . "\n";
    echo "  Unit Cost: " . $item['unit_cost'] . "\n";
    echo "  Item Total: " . $item_total_cost . "\n";
}

echo "\nSubtotal (before order discount): " . $calculated_total_amount . "\n";
echo "Order Discount: " . $order_discount . "\n";

$final_total_amount = max(0.00, $calculated_total_amount - $order_discount);

echo "Final Total Amount: " . $final_total_amount . "\n";

echo "\n=== What should be stored in DB ===\n";
echo "purchase_orders_total_amount: " . $final_total_amount . "\n";
echo "purchase_orders_order_discount: " . $order_discount . "\n";
?>
