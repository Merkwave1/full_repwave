<?php

require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get optional filter parameters
    $search = isset($_GET['search']) ? trim($_GET['search']) : null;

    // Build the countries query
    $sql_countries = "
        SELECT 
            countries_id,
            countries_name_ar,
            countries_name_en,
            countries_sort_order,
            (SELECT COUNT(*) FROM governorates WHERE governorates_country_id = countries.countries_id) as governorates_count
        FROM countries
        WHERE 1=1
    ";

    $params_countries = [];
    $types_countries = '';

    // Add search filter for countries
    if ($search) {
        $sql_countries .= " AND (countries_name_ar LIKE ? OR countries_name_en LIKE ?)";
        $searchParam = "%{$search}%";
        $params_countries[] = $searchParam;
        $params_countries[] = $searchParam;
        $types_countries .= 'ss';
    }

    $sql_countries .= " ORDER BY countries_sort_order ASC, countries_name_ar ASC";

    // Execute countries query
    $stmt_countries = $conn->prepare($sql_countries);
    
    if (!$stmt_countries) {
        throw new Exception("Prepare failed for countries: " . $conn->error);
    }
    
    if ($types_countries) {
        $stmt_countries->bind_param($types_countries, ...$params_countries);
    }
    
    $stmt_countries->execute();
    $result_countries = $stmt_countries->get_result();

    $countries = [];
    while ($row = $result_countries->fetch_assoc()) {
        $countries[] = [
            'countries_id' => (int)$row['countries_id'],
            'countries_name_ar' => $row['countries_name_ar'],
            'countries_name_en' => $row['countries_name_en'],
            'countries_sort_order' => (int)$row['countries_sort_order'],
            'governorates_count' => (int)$row['governorates_count'],
            'governorates' => [] // Will be populated below
        ];
    }
    $stmt_countries->close();

    // If no countries found, return empty array
    if (empty($countries)) {
        print_success('No countries found.', [
            'countries' => [],
            'count' => 0
        ]);
    }

    // Get all country IDs
    $country_ids = array_column($countries, 'countries_id');
    $placeholders = implode(',', array_fill(0, count($country_ids), '?'));

    // Build the governorates query
    $sql_governorates = "
        SELECT 
            g.governorates_id,
            g.governorates_name_ar,
            g.governorates_name_en,
            g.governorates_country_id,
            g.governorates_sort_order
        FROM governorates g
        INNER JOIN countries c ON g.governorates_country_id = c.countries_id
        WHERE g.governorates_country_id IN ($placeholders)
        ORDER BY c.countries_sort_order ASC, g.governorates_sort_order ASC, g.governorates_name_ar ASC
    ";

    $params_governorates = $country_ids;
    $types_governorates = str_repeat('i', count($country_ids));

    // Execute governorates query
    $stmt_governorates = $conn->prepare($sql_governorates);
    
    if (!$stmt_governorates) {
        throw new Exception("Prepare failed for governorates: " . $conn->error);
    }
    
    $stmt_governorates->bind_param($types_governorates, ...$params_governorates);
    $stmt_governorates->execute();
    $result_governorates = $stmt_governorates->get_result();

    $governorates = [];
    while ($row = $result_governorates->fetch_assoc()) {
        $governorates[] = [
            'governorates_id' => (int)$row['governorates_id'],
            'governorates_name_ar' => $row['governorates_name_ar'],
            'governorates_name_en' => $row['governorates_name_en'],
            'governorates_sort_order' => (int)$row['governorates_sort_order'],
            '_country_id' => (int)$row['governorates_country_id'] // Internal use only, will be removed
        ];
    }
    $stmt_governorates->close();

    // Organize governorates under their respective countries
    foreach ($countries as &$country) {
        foreach ($governorates as $governorate) {
            if ($governorate['_country_id'] === $country['countries_id']) {
                // Remove the internal _country_id before adding to country
                $gov_clean = $governorate;
                unset($gov_clean['_country_id']);
                $country['governorates'][] = $gov_clean;
            }
        }
    }
    unset($country); // Break reference

    // Return success response
    print_success('Countries with governorates retrieved successfully.', [
        'countries' => $countries,
        'count' => count($countries)
    ]);

} catch (Exception | TypeError $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($stmt_countries) && $stmt_countries !== false) {
        $stmt_countries->close();
    }
    if (isset($stmt_governorates) && $stmt_governorates !== false) {
        $stmt_governorates->close();
    }
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}
?>
