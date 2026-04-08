# Odoo Contact Sync - Complete Field Mapping

## Overview
Updated the sync system to synchronize ALL fields from the PHP clients table to Odoo's res.partner model, including all fields visible in the Odoo contact form.

## Complete Field Mapping

### Basic Information
| PHP Field | Odoo Field | Description |
|-----------|-----------|-------------|
| `clients_company_name` | `name` | Company name (required) |
| `clients_id` | `ref` | Internal reference |
| - | `is_company` | Always set to `true` |

### Contact Information
| PHP Field | Odoo Field | Description |
|-----------|-----------|-------------|
| `clients_email` | `email` | Email address |
| `clients_website` | `website` | Website URL |
| `clients_contact_phone_1` | `mobile` | Primary mobile number |
| `clients_contact_phone_2` | `mobile2` | Secondary mobile number |

### Address & Location
| PHP Field | Odoo Field | Description |
|-----------|-----------|-------------|
| `clients_address` | `street` | Street address |
| `clients_city` | `city` | City |
| `clients_country` | `country_id` | Country (mapped to Odoo country) |
| `clients_latitude` | `partner_latitude` | GPS latitude |
| `clients_longitude` | `partner_longitude` | GPS longitude |

### Financial & Tax
| PHP Field | Odoo Field | Description |
|-----------|-----------|-------------|
| `clients_vat_number` | `vat` | VAT/Tax ID number |
| `clients_payment_terms` | - | Not synced (handled differently in Odoo) |
| `clients_credit_limit` | - | Not synced (handled differently in Odoo) |

### Contact Person Details
| PHP Field | Odoo Field | Description |
|-----------|-----------|-------------|
| `clients_contact_name` | `contact_person_name` | Contact person name |
| `clients_contact_job_title` | `contact_job_title` | Contact person job title |

### Business Classification
| PHP Field | Odoo Field | Odoo Model | Description |
|-----------|-----------|------------|-------------|
| `clients_area_tag_id` | `area_tag` | `contact.area.tag` | Geographic area tag |
| `clients_industry_id` | `contact_industry` | `res.partner.industry` | Industry sector |
| `clients_client_type_id` | `contact_type` | `contact.type` | Type of contact |
| `clients_source` | `contact_source` | - | Lead/contact source |

### Sales & Products
| PHP Field | Odoo Field | Odoo Model | Description |
|-----------|-----------|------------|-------------|
| `clients_rep_user_id` | `sales_representative_id` | `hr.employee` | Assigned sales rep |
| `client_interested_products` | `interested_product_ids` | `product.product` | Many2many products |

### Internal Notes
| PHP Field | Odoo Field | Description |
|-----------|-----------|-------------|
| `clients_description` | `comment` | Internal notes/description |

## Helper Functions Added

### 1. `getOrCreateOdooAreaTag($php_area_tag_id)`
- Maps PHP `client_area_tags` to Odoo `contact.area.tag`
- Searches by name, creates if not found
- Returns Odoo area tag ID

### 2. `getOrCreateOdooIndustry($php_industry_id)`
- Maps PHP `client_industries` to Odoo `res.partner.industry`
- Searches by name, creates if not found
- Returns Odoo industry ID

### 3. `getOrCreateOdooContactType($php_client_type_id)`
- Maps PHP `client_types` to Odoo `contact.type`
- Searches by name, creates if not found
- Returns Odoo contact type ID

### 4. `getOrCreateOdooCountry($country_name)`
- Maps country name to Odoo `res.country`
- Searches by name or code
- Returns Odoo country ID (does not create - uses existing)

### 5. `getInterestedProductsForOdoo($php_client_id)`
- Queries `client_interested_products` junction table
- Maps PHP products to Odoo product IDs
- Returns array of Odoo product IDs for Many2many relation

### 6. `getOrCreateOdooEmployee($php_user_id)` (Already existed, enhanced)
- Maps PHP users to Odoo `hr.employee`
- Uses barcode field for PHP user reference
- Creates employee if not found

## Many2many Relationship Format

For the `interested_product_ids` field, Odoo uses the special Many2many format:
```php
'interested_product_ids' => [[6, 0, [product_id1, product_id2, ...]]]
```
Where:
- `6` = Replace all (clear existing and set new)
- `0` = No specific record ID
- Third element = Array of IDs to link

## Sync Flow

1. **Client added** via `add.php`
2. **Data collected** from POST and inserted into `clients` table
3. **Sync triggered** - `syncContactToOdoo()` called with client data
4. **Lookup mapping** - PHP IDs converted to Odoo IDs:
   - Area tags
   - Industries
   - Contact types
   - Countries
   - Sales representatives
   - Interested products
5. **Contact created** in Odoo with all mapped fields
6. **Database updated** - `clients_odoo_partner_id` stored in clients table
7. **Sync logged** in `odoo_contact_sync_logs` table

## Error Handling

All helper functions include:
- Try-catch blocks for exceptions
- Error logging with descriptive messages
- Graceful failure (returns false if mapping fails)
- Non-blocking - sync continues even if optional fields fail

## Database Tables Involved

### PHP Database
- `clients` - Main client data
- `client_area_tags` - Area tag lookup
- `client_industries` - Industry lookup
- `client_types` - Contact type lookup
- `client_interested_products` - Many2many junction table
- `products` - Product master data
- `users` - System users (sales reps)
- `odoo_contact_sync_logs` - Sync history

### Odoo Models
- `res.partner` - Main contact/company model
- `contact.area.tag` - Custom area tags
- `res.partner.industry` - Industry sectors
- `contact.type` - Custom contact types
- `res.country` - Countries (standard Odoo)
- `hr.employee` - Employees (sales reps)
- `product.product` - Products

## Testing Checklist

When adding a new client, verify these fields sync to Odoo:
- ✅ Company name
- ✅ Email
- ✅ Website
- ✅ VAT number
- ✅ Address & City
- ✅ Country (if exists in Odoo)
- ✅ Contact person name & job title
- ✅ Two mobile numbers
- ✅ GPS coordinates
- ✅ Area tag (created if new)
- ✅ Industry (created if new)
- ✅ Contact type (created if new)
- ✅ Contact source
- ✅ Sales representative
- ✅ Interested products
- ✅ Internal notes

## Migration Applied

The `clients` table now includes:
```sql
ALTER TABLE clients 
ADD COLUMN clients_odoo_partner_id INT(11) NULL 
AFTER clients_image;
```

This stores the Odoo partner ID for bi-directional sync capabilities.
