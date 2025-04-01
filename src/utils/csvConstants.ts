
// Columns to remove in output CSV
export const COLUMNS_TO_REMOVE = [
  // DO NOT INCLUDE these fields here as we want to keep them:
  // 'email', 'full_name', 'first_name', 'last_name', 'title', 'phone',
  // 'email_1', 'email_1_full_name', 'email_1_first_name', 'email_1_last_name', 'email_1_title', 'email_1_phone', etc.
  // 'other_dm_name', 'mx_provider', 'cleaned_website', 'cleaned_company_name'
  
  // Internal processing columns
  'to_be_deleted', 'domain_occurrence_count', 'email_occurrence',
  
  // Location and geospatial columns
  'query', 'latitude', 'longitude', 'h3', 'plus_code', 'area_service',
  
  // Review and business-related columns
  'reviews_link', 'reviews_tags', 'reviews_per_score', 'reviews_per_score_1', 
  'reviews_per_score_2', 'reviews_per_score_3', 'reviews_per_score_4', 
  'reviews_per_score_5', 'photos_count', 'photo', 'street_view', 'located_in', 
  'working_hours', 'working_hours_old_format', 'other_hours', 'popular_times', 
  'business_status', 'about', 'range', 'posts', 'logo', 'description', 
  'typical_time_spent', 'verified', 'owner_id', 'owner_title', 'owner_link', 
  'reservation_links', 'booking_appointment_link', 'menu_link', 'order_links', 
  'location_link', 'location_reviews_link', 'place_id', 'google_id', 'cid', 
  'kgmid', 'reviews_id', 'located_google_id',
  
  // Social media and website-related columns
  'facebook', 'instagram', 'tiktok', 'medium', 'reddit', 'skype', 
  'snapchat', 'telegram', 'whatsapp', 'twitter', 'vimeo', 'youtube', 'github', 
  'crunchbase', 'website_title', 'website_generator', 'website_description', 
  'website_keywords', 'website_has_fb_pixel', 'website_has_google_tag',
  
  // Company-related columns
  'Key', 'ID', 'Company Founded Year', 'Seniority', 'Function', 
  'Company Twitter', 'Company Facebook', 'Alexa Ranking', 'Keywords'
];

// Explicitly define columns that must be preserved regardless of other filtering
export const CRITICAL_COLUMNS = [
  'email', 
  'full_name', 
  'first_name', 
  'last_name', 
  'title', 
  'phone',
  'other_dm_name',
  'mx_provider',
  'cleaned_website',
  'cleaned_company_name'
];

// Add all email_X prefixed columns to critical columns
for (let i = 1; i <= 5; i++) {
  CRITICAL_COLUMNS.push(`email_${i}`);
  CRITICAL_COLUMNS.push(`email_${i}_full_name`);
  CRITICAL_COLUMNS.push(`email_${i}_first_name`);
  CRITICAL_COLUMNS.push(`email_${i}_last_name`);
  CRITICAL_COLUMNS.push(`email_${i}_title`);
  CRITICAL_COLUMNS.push(`email_${i}_phone`);
}
