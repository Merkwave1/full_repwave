<?php
require_once '../db_connect.php';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Get users_uuid and report_type from request
    $input = json_decode(file_get_contents('php://input'), true);
    $users_uuid = $input['users_uuid'] ?? $_GET['users_uuid'] ?? null;
    $report_type = $input['report_type'] ?? $_GET['report_type'] ?? 'overview';

    if (empty($users_uuid)) {
        print_failure("Error: User UUID is required.");
    }

    // Get user_id and role from users table based on users_uuid
    $stmt_user = $conn->prepare("SELECT users_id, users_role FROM users WHERE users_uuid = ?");
    if (!$stmt_user) {
        throw new Exception("Prepare failed for user lookup: " . $conn->error);
    }
    $stmt_user->bind_param("s", $users_uuid);
    $stmt_user->execute();
    $result_user = $stmt_user->get_result();
    $user_data = $result_user->fetch_assoc();
    $stmt_user->close();

    if (!$user_data) {
        print_failure("Error: Invalid User UUID provided.");
    }

    $current_user_id = $user_data['users_id'];
    $current_user_role = $user_data['users_role'];

    // Build base clients query with role-based filtering
    $base_where = "";
    $params = [];
    $types = "";

    if ($current_user_role !== 'admin') {
        $base_where = " WHERE c.clients_rep_user_id = ?";
        $params[] = $current_user_id;
        $types .= "i";
    }

    // Get all clients data first
    $sql = "
        SELECT 
            c.clients_id,
            c.clients_company_name,
            c.clients_email,
            c.clients_contact_name,
            c.clients_contact_phone_1,
            c.clients_city,
            c.clients_credit_balance,
            c.clients_status,
            c.clients_type,
            c.clients_client_type_id,
            c.clients_last_visit,
            c.clients_area_tag_id,
            c.clients_industry_id,
            c.clients_rep_user_id,
            c.clients_created_at,
            c.clients_updated_at,
            ci.client_industries_name,
            cat.client_area_tag_name,
            ct.client_type_name
        FROM clients c
        LEFT JOIN client_industries ci ON c.clients_industry_id = ci.client_industries_id
        LEFT JOIN client_area_tags cat ON c.clients_area_tag_id = cat.client_area_tag_id
        LEFT JOIN client_types ct ON c.clients_client_type_id = ct.client_type_id
        $base_where
        ORDER BY c.clients_company_name ASC
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed for clients: " . $conn->error);
    }

    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $clients = [];
    while ($row = $result->fetch_assoc()) {
        $clients[] = $row;
    }
    $stmt->close();

    // Generate report based on type
    switch ($report_type) {
        case 'overview':
            $report_data = generateOverviewReport($clients);
            break;
        case 'details':
            $report_data = generateDetailsReport($clients);
            break;
        case 'documents':
            $report_data = generateDocumentsReport($conn, $current_user_id, $current_user_role);
            break;
        case 'areas':
            $report_data = generateAreasReport($clients, $conn);
            break;
        case 'industries':
            $report_data = generateIndustriesReport($clients, $conn);
            break;
        case 'analytics':
            $report_data = generateAnalyticsReport($clients);
            break;
        default:
            $report_data = generateOverviewReport($clients);
    }

    print_success("Report retrieved successfully.", $report_data);

} catch (Exception $e) {
    print_failure("Internal Error: " . $e->getMessage());
} finally {
    if (isset($conn) && $conn !== false) {
        $conn->close();
    }
}

// Helper Functions
function generateOverviewReport($clients) {
    $total_clients = count($clients);
    $active_clients = count(array_filter($clients, fn($c) => $c['clients_status'] === 'active'));
    $inactive_clients = count(array_filter($clients, fn($c) => $c['clients_status'] === 'inactive'));
    $prospect_clients = count(array_filter($clients, fn($c) => $c['clients_status'] === 'prospect'));

    // Calculate this month and last month new clients
    $now = new DateTime();
    $this_month = $now->format('Y-m');
    $last_month = $now->modify('-1 month')->format('Y-m');

    $new_clients_this_month = count(array_filter($clients, function($c) use ($this_month) {
        return strpos($c['clients_created_at'], $this_month) === 0;
    }));

    $new_clients_last_month = count(array_filter($clients, function($c) use ($last_month) {
        return strpos($c['clients_created_at'], $last_month) === 0;
    }));

    // Calculate growth rate
    $growth_rate = 0;
    if ($new_clients_last_month > 0) {
        $growth_rate = round((($new_clients_this_month - $new_clients_last_month) / $new_clients_last_month) * 100, 1);
    } elseif ($new_clients_this_month > 0) {
        $growth_rate = 100;
    }

    // Build dynamic type distribution that respects configurable client types
    $type_analysis = buildClientTypeDistribution($clients, $total_clients);

    // Build status analysis structure
    $status_analysis = [
        'active' => $active_clients,
        'inactive' => $inactive_clients,
        'prospect' => $prospect_clients,
        'active_percentage' => $total_clients > 0 ? round(($active_clients / $total_clients) * 100, 1) : 0,
        'inactive_percentage' => $total_clients > 0 ? round(($inactive_clients / $total_clients) * 100, 1) : 0,
        'prospect_percentage' => $total_clients > 0 ? round(($prospect_clients / $total_clients) * 100, 1) : 0
    ];

    return [
        'total_clients' => $total_clients,
        'active_clients' => $active_clients,
        'inactive_clients' => $inactive_clients,
        'active_percentage' => $total_clients > 0 ? round(($active_clients / $total_clients) * 100, 1) : 0,
        'new_this_month' => $new_clients_this_month,
        'new_clients_last_month' => $new_clients_last_month,
        'growth_rate' => $growth_rate,
        'type_analysis' => $type_analysis,
        'status_analysis' => $status_analysis
    ];
}

function generateDetailsReport($clients) {
    $total_clients = count($clients);
    $phone_count = count(array_filter($clients, fn($c) => !empty($c['clients_contact_phone_1'])));
    $email_count = count(array_filter($clients, fn($c) => !empty($c['clients_email'])));
    
    // Complete profiles are those with name, phone, and email
    $complete_profile_count = count(array_filter($clients, function($c) {
        return !empty($c['clients_contact_name']) && 
               !empty($c['clients_contact_phone_1']) && 
               !empty($c['clients_email']);
    }));

    // Registration timeline
    $now = new DateTime();
    $today = $now->format('Y-m-d');
    $week_start = $now->modify('-7 days')->format('Y-m-d');
    $month_start = $now->modify('-23 days')->format('Y-m');
    $year_start = $now->modify('-11 months')->format('Y');

    $today_registrations = count(array_filter($clients, function($c) use ($today) {
        return strpos($c['clients_created_at'], $today) === 0;
    }));

    $week_registrations = count(array_filter($clients, function($c) use ($week_start) {
        return $c['clients_created_at'] >= $week_start;
    }));

    $month_registrations = count(array_filter($clients, function($c) use ($month_start) {
        return strpos($c['clients_created_at'], $month_start) === 0;
    }));

    $year_registrations = count(array_filter($clients, function($c) use ($year_start) {
        return strpos($c['clients_created_at'], $year_start) === 0;
    }));

    // Status breakdown
    $active_clients = count(array_filter($clients, fn($c) => $c['clients_status'] === 'active'));
    $inactive_clients = count(array_filter($clients, fn($c) => $c['clients_status'] === 'inactive'));
    $pending_clients = count(array_filter($clients, fn($c) => $c['clients_status'] === 'prospect'));
    $vip_clients = count(array_filter($clients, fn($c) => $c['clients_type'] === 'vip'));

    return [
        'phone_count' => $phone_count,
        'email_count' => $email_count,
        'complete_profile_count' => $complete_profile_count,
        'today_registrations' => $today_registrations,
        'week_registrations' => $week_registrations,
        'month_registrations' => $month_registrations,
        'year_registrations' => $year_registrations,
        'active_clients' => $active_clients,
        'pending_clients' => $pending_clients,
        'inactive_clients' => $inactive_clients,
        'vip_clients' => $vip_clients,
        'total_clients' => $total_clients
    ];
}

function generateDocumentsReport($conn, $current_user_id, $current_user_role) {
    // Get real document statistics from client_documents table
    $filter_clause = '';
    if ($current_user_role === 'sales_rep') {
        $filter_clause = ' AND c.clients_rep_user_id = ?';
    }
    
    // Get total documents and their types
    $sql = "SELECT 
                COUNT(cd.client_document_id) as total_documents,
                cdt.document_type_name,
                COUNT(cd.client_document_id) as type_count
            FROM client_documents cd
            LEFT JOIN client_document_types cdt ON cd.client_document_type_id = cdt.document_type_id
            LEFT JOIN clients c ON cd.client_document_client_id = c.clients_id
            WHERE 1=1 $filter_clause
            GROUP BY cdt.document_type_id";
    
    $stmt = $conn->prepare($sql);
    if ($current_user_role === 'sales_rep') {
        $stmt->bind_param("i", $current_user_id);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    
    $total_documents = 0;
    $document_types = [];
    while ($row = $result->fetch_assoc()) {
        $total_documents += $row['type_count'];
        if (!empty($row['document_type_name'])) {
            $document_types[] = [
                'type_name' => $row['document_type_name'],
                'count' => $row['type_count']
            ];
        }
    }
    $stmt->close();
    
    // Calculate percentages for document types
    foreach ($document_types as &$type) {
        $type['percentage'] = $total_documents > 0 ? round(($type['count'] / $total_documents) * 100, 1) : 0;
    }
    
    // Get upload timeline (last 30 days for demonstration)
    $today = date('Y-m-d');
    $week_ago = date('Y-m-d', strtotime('-7 days'));
    $month_ago = date('Y-m-d', strtotime('-30 days'));
    $year_ago = date('Y-m-d', strtotime('-365 days'));
    
    $timeline_sql = "SELECT 
                        COUNT(CASE WHEN DATE(cd.client_document_created_at) = ? THEN 1 END) as today_uploads,
                        COUNT(CASE WHEN DATE(cd.client_document_created_at) >= ? THEN 1 END) as week_uploads,
                        COUNT(CASE WHEN DATE(cd.client_document_created_at) >= ? THEN 1 END) as month_uploads,
                        COUNT(CASE WHEN DATE(cd.client_document_created_at) >= ? THEN 1 END) as year_uploads
                     FROM client_documents cd
                     LEFT JOIN clients c ON cd.client_document_client_id = c.clients_id
                     WHERE 1=1 $filter_clause";
    
    $timeline_stmt = $conn->prepare($timeline_sql);
    if ($current_user_role === 'sales_rep') {
        $timeline_stmt->bind_param("ssssi", $today, $week_ago, $month_ago, $year_ago, $current_user_id);
    } else {
        $timeline_stmt->bind_param("ssss", $today, $week_ago, $month_ago, $year_ago);
    }
    $timeline_stmt->execute();
    $timeline_result = $timeline_stmt->get_result();
    $timeline_data = $timeline_result->fetch_assoc();
    $timeline_stmt->close();
    
    // Get clients without documents count
    $clients_sql = "SELECT COUNT(DISTINCT c.clients_id) as total_clients,
                           COUNT(DISTINCT cd.client_document_client_id) as clients_with_docs
                    FROM clients c
                    LEFT JOIN client_documents cd ON c.clients_id = cd.client_document_client_id
                    WHERE 1=1 $filter_clause";
    
    $clients_stmt = $conn->prepare($clients_sql);
    if ($current_user_role === 'sales_rep') {
        $clients_stmt->bind_param("i", $current_user_id);
    }
    $clients_stmt->execute();
    $clients_result = $clients_stmt->get_result();
    $clients_data = $clients_result->fetch_assoc();
    $clients_stmt->close();
    
    $clients_without_documents = $clients_data['total_clients'] - $clients_data['clients_with_docs'];

    return [
        'total_documents' => $total_documents,
        'document_types' => $document_types,
        'today_uploads' => (int)$timeline_data['today_uploads'],
        'week_uploads' => (int)$timeline_data['week_uploads'],
        'month_uploads' => (int)$timeline_data['month_uploads'],
        'year_uploads' => (int)$timeline_data['year_uploads'],
        'clients_without_documents' => $clients_without_documents,
        'total_clients' => (int)$clients_data['total_clients'],
        'clients_with_documents' => (int)$clients_data['clients_with_docs']
    ];
}

function generateAreasReport($clients, $conn) {
    $total_clients = count($clients);
    $clients_with_areas = count(array_filter($clients, fn($c) => !empty($c['clients_area_tag_id'])));
    $clients_without_areas = $total_clients - $clients_with_areas;

    // Get unique cities
    $cities = array_unique(array_filter(array_column($clients, 'clients_city')));
    $total_cities = count($cities);

    // Get area tags
    $area_tags_stmt = $conn->prepare("SELECT client_area_tag_id, client_area_tag_name FROM client_area_tags");
    $area_tags_stmt->execute();
    $area_tags_result = $area_tags_stmt->get_result();
    $area_tags = [];
    while ($tag = $area_tags_result->fetch_assoc()) {
        $tag_usage = count(array_filter($clients, fn($c) => $c['clients_area_tag_id'] == $tag['client_area_tag_id']));
        $area_tags[] = [
            'tag_name' => $tag['client_area_tag_name'],
            'usage_count' => $tag_usage,
            'percentage' => $clients_with_areas > 0 ? round(($tag_usage / $clients_with_areas) * 100, 1) : 0,
            'description' => 'منطقة ' . $tag['client_area_tag_name']
        ];
    }
    $area_tags_stmt->close();

    // Top cities analysis
    $city_counts = [];
    foreach ($clients as $client) {
        if (!empty($client['clients_city'])) {
            $city = $client['clients_city'];
            $city_counts[$city] = ($city_counts[$city] ?? 0) + 1;
        }
    }
    arsort($city_counts);
    
    $top_cities = [];
    foreach (array_slice($city_counts, 0, 6, true) as $city => $count) {
        $top_cities[] = [
            'city_name' => $city,
            'client_count' => $count,
            'percentage' => $total_clients > 0 ? round(($count / $total_clients) * 100, 1) : 0
        ];
    }

    return [
        'total_cities' => $total_cities,
        'total_areas' => count($area_tags),
        'total_tags' => count($area_tags),
        'clients_with_areas' => $clients_with_areas,
        'clients_without_areas' => $clients_without_areas,
        'avg_clients_per_area' => count($area_tags) > 0 ? round($clients_with_areas / count($area_tags), 1) : 0,
        'top_cities' => $top_cities,
        'area_tags' => $area_tags,
        'total_clients' => $total_clients
    ];
}

function generateIndustriesReport($clients, $conn) {
    $total_clients = count($clients);
    $clients_with_industries = count(array_filter($clients, fn($c) => !empty($c['clients_industry_id'])));
    $clients_without_industries = $total_clients - $clients_with_industries;

    // Get industries
    $industries_stmt = $conn->prepare("SELECT client_industries_id, client_industries_name FROM client_industries");
    $industries_stmt->execute();
    $industries_result = $industries_stmt->get_result();
    $industries = [];
    while ($industry = $industries_result->fetch_assoc()) {
        $industry_clients = array_filter($clients, fn($c) => $c['clients_industry_id'] == $industry['client_industries_id']);
        $count = count($industry_clients);
        if ($count > 0) {
            $industries[] = [
                'industry_name' => $industry['client_industries_name'],
                'client_count' => $count,
                'percentage' => $total_clients > 0 ? round(($count / $total_clients) * 100, 1) : 0
            ];
        }
    }
    $industries_stmt->close();

    // Sort by client count
    usort($industries, fn($a, $b) => $b['client_count'] - $a['client_count']);

    $most_popular_industry = !empty($industries) ? $industries[0]['industry_name'] : 'غير محدد';
    $avg_clients_per_industry = count($industries) > 0 ? round($clients_with_industries / count($industries), 1) : 0;

    return [
        'total_industries' => count($industries),
        'clients_with_industries' => $clients_with_industries,
        'clients_without_industries' => $clients_without_industries,
        'avg_clients_per_industry' => $avg_clients_per_industry,
        'most_popular_industry' => $most_popular_industry,
        'industry_distribution' => $industries,
        'total_clients' => $total_clients
    ];
}

function generateAnalyticsReport($clients) {
    $total_clients = count($clients);
    
    if ($total_clients === 0) {
        return ['total_clients' => 0];
    }
    
    // Client status analysis
    $active_clients = count(array_filter($clients, fn($c) => $c['clients_status'] === 'active'));
    $inactive_clients = count(array_filter($clients, fn($c) => $c['clients_status'] === 'inactive'));
    $prospect_clients = count(array_filter($clients, fn($c) => $c['clients_status'] === 'prospect'));
    
    // Client type analysis using dynamic types
    $type_analysis = buildClientTypeDistribution($clients, $total_clients);
    
    // Registration timeline analysis
    $now = new DateTime();
    $this_month = $now->format('Y-m');
    $last_month = $now->modify('-1 month')->format('Y-m');
    $this_year = $now->modify('+1 month')->format('Y');
    
    $this_month_registrations = count(array_filter($clients, function($c) use ($this_month) {
        return strpos($c['clients_created_at'], $this_month) === 0;
    }));
    
    $last_month_registrations = count(array_filter($clients, function($c) use ($last_month) {
        return strpos($c['clients_created_at'], $last_month) === 0;
    }));
    
    $this_year_registrations = count(array_filter($clients, function($c) use ($this_year) {
        return strpos($c['clients_created_at'], $this_year) === 0;
    }));
    
    // Growth calculation
    $growth_rate = 0;
    if ($last_month_registrations > 0) {
        $growth_rate = round((($this_month_registrations - $last_month_registrations) / $last_month_registrations) * 100, 1);
    } elseif ($this_month_registrations > 0) {
        $growth_rate = 100;
    }
    
    // Credit analysis
    $clients_with_credit = count(array_filter($clients, fn($c) => !empty($c['clients_credit_limit']) && $c['clients_credit_limit'] > 0));
    $total_credit_limit = array_sum(array_column($clients, 'clients_credit_limit'));
    $avg_credit_limit = $clients_with_credit > 0 ? round($total_credit_limit / $clients_with_credit, 2) : 0;
    
    // Contact completeness
    $clients_with_phone = count(array_filter($clients, fn($c) => !empty($c['clients_contact_phone_1'])));
    $clients_with_email = count(array_filter($clients, fn($c) => !empty($c['clients_email'])));
    $complete_profiles = count(array_filter($clients, function($c) {
        return !empty($c['clients_contact_name']) && 
               !empty($c['clients_contact_phone_1']) && 
               !empty($c['clients_email']);
    }));
    
    return [
        'total_clients' => $total_clients,
        'status_analysis' => [
            'active' => $active_clients,
            'inactive' => $inactive_clients,
            'prospect' => $prospect_clients,
            'active_percentage' => round(($active_clients / $total_clients) * 100, 1),
            'inactive_percentage' => round(($inactive_clients / $total_clients) * 100, 1),
            'prospect_percentage' => round(($prospect_clients / $total_clients) * 100, 1)
        ],
        'type_analysis' => $type_analysis,
        'growth_analysis' => [
            'this_month' => $this_month_registrations,
            'last_month' => $last_month_registrations,
            'this_year' => $this_year_registrations,
            'growth_rate' => $growth_rate
        ],
        'credit_analysis' => [
            'clients_with_credit' => $clients_with_credit,
            'total_credit_limit' => $total_credit_limit,
            'avg_credit_limit' => $avg_credit_limit,
            'credit_coverage' => round(($clients_with_credit / $total_clients) * 100, 1)
        ],
        'profile_completeness' => [
            'with_phone' => $clients_with_phone,
            'with_email' => $clients_with_email,
            'complete_profiles' => $complete_profiles,
            'phone_coverage' => round(($clients_with_phone / $total_clients) * 100, 1),
            'email_coverage' => round(($clients_with_email / $total_clients) * 100, 1),
            'completeness_rate' => round(($complete_profiles / $total_clients) * 100, 1)
        ]
    ];
}

function buildClientTypeDistribution($clients, $total_clients) {
    if ($total_clients === 0) {
        return [];
    }

    $distribution_map = [];

    foreach ($clients as $client) {
        $type_id = $client['clients_client_type_id'] ?? null;
        $legacy_slug = $client['clients_type'] ?? null;
        $type_name = null;

        if (!empty($client['client_type_name'])) {
            $type_name = $client['client_type_name'];
        } elseif (!empty($legacy_slug)) {
            $type_name = mapLegacyClientTypeLabel($legacy_slug);
        }

        if (empty($type_name)) {
            $type_name = 'غير مصنف';
            $legacy_slug = 'unassigned';
        }

        $key = $type_id ? 'id_' . $type_id : ($legacy_slug ? 'legacy_' . $legacy_slug : 'unassigned');

        if (!isset($distribution_map[$key])) {
            $distribution_map[$key] = [
                'id' => $type_id ? (int)$type_id : null,
                'slug' => sanitizeClientTypeSlug($legacy_slug ?: $type_name),
                'name' => $type_name,
                'count' => 0
            ];
        }

        $distribution_map[$key]['count']++;
    }

    $distribution = array_values($distribution_map);

    usort($distribution, function ($a, $b) {
        if ($b['count'] === $a['count']) {
            return strcmp((string)$a['name'], (string)$b['name']);
        }
        return $b['count'] <=> $a['count'];
    });

    foreach ($distribution as &$entry) {
        $entry['percentage'] = $total_clients > 0 ? round(($entry['count'] / $total_clients) * 100, 1) : 0;
    }
    unset($entry);

    return $distribution;
}

function mapLegacyClientTypeLabel($legacy_slug) {
    if (empty($legacy_slug)) {
        return null;
    }

    $slug = function_exists('mb_strtolower') ? mb_strtolower($legacy_slug, 'UTF-8') : strtolower($legacy_slug);

    switch ($slug) {
        case 'store':
            return 'متاجر';
        case 'distributor':
            return 'موزعون';
        case 'importer':
            return 'مستوردون';
        case 'factory':
            return 'مصانع';
        case 'vip':
            return 'عملاء VIP';
        default:
            return ucwords(str_replace(['_', '-'], ' ', $legacy_slug));
    }
}

function sanitizeClientTypeSlug($value) {
    $value = trim((string)$value);
    if ($value === '') {
        return 'type';
    }

    $lower = function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
    $slug = preg_replace('/[\s]+/u', '_', $lower);
    $slug = preg_replace('/[^\p{Arabic}a-z0-9_]/u', '', $slug);

    return $slug !== '' ? $slug : 'type';
}
?>
