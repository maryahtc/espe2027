/**
 * Tipos do banco — gerados a partir do projeto Supabase (esquema public).
 * Regenerar após cada migração: `npm run types -w @portal/db` (Supabase CLI) ou a API de gerenciamento.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "announcement_dismissals": {
                  Row: {
                    "announcement_id": string,"dismissed_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "announcement_id": string,"dismissed_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "announcement_id"?: string,"dismissed_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "announcement_dismissals_announcement_id_fkey"
      columns: ["announcement_id"]
isOneToOne: false
      referencedRelation: "announcements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcement_dismissals_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"announcements": {
                  Row: {
                    "archived_at": string | null,"body": string,"cohort_id": string | null,"created_at": string,"created_by": string | null,"id": string,"important": boolean,"link_label": string | null,"link_url": string | null,"published_at": string | null,"signature": string | null,"status": Database["public"]['Enums']["content_status"],"title": string,"updated_at": string,"visible_from": string,"visible_until": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"body": string,"cohort_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"important"?: boolean,"link_label"?: string | null,"link_url"?: string | null,"published_at"?: string | null,"signature"?: string | null,"status"?: Database["public"]['Enums']["content_status"],"title": string,"updated_at"?: string,"visible_from": string,"visible_until": string
                  }
                  Update: {
                    "archived_at"?: string | null,"body"?: string,"cohort_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"important"?: boolean,"link_label"?: string | null,"link_url"?: string | null,"published_at"?: string | null,"signature"?: string | null,"status"?: Database["public"]['Enums']["content_status"],"title"?: string,"updated_at"?: string,"visible_from"?: string,"visible_until"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "announcements_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor": string | null,"at": string,"cohort_id": string | null,"details": NonNullable<Json>,"entity": string,"entity_id": string | null,"id": number,"owner_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor"?: string | null,"at"?: string,"cohort_id"?: string | null,"details"?: NonNullable<Json>,"entity": string,"entity_id"?: string | null,"id"?: never,"owner_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor"?: string | null,"at"?: string,"cohort_id"?: string | null,"details"?: NonNullable<Json>,"entity"?: string,"entity_id"?: string | null,"id"?: never,"owner_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"case_access_grants": {
                  Row: {
                    "case_id": string,"created_at": string,"expires_at": string | null,"granted_by": string,"grantee_id": string,"id": string,"reason": string
                  }
                  ComputedFields: never
                  Insert: {
                    "case_id": string,"created_at"?: string,"expires_at"?: string | null,"granted_by"?: string,"grantee_id": string,"id"?: string,"reason": string
                  }
                  Update: {
                    "case_id"?: string,"created_at"?: string,"expires_at"?: string | null,"granted_by"?: string,"grantee_id"?: string,"id"?: string,"reason"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "case_access_grants_case_id_fkey"
      columns: ["case_id"]
isOneToOne: false
      referencedRelation: "clinical_cases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "case_access_grants_granted_by_fkey"
      columns: ["granted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "case_access_grants_grantee_id_fkey"
      columns: ["grantee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"case_difficulty_topics": {
                  Row: {
                    "case_id": string,"created_at": string,"owner_id": string,"source": string,"topic_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "case_id": string,"created_at"?: string,"owner_id": string,"source"?: string,"topic_id": string
                  }
                  Update: {
                    "case_id"?: string,"created_at"?: string,"owner_id"?: string,"source"?: string,"topic_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "case_difficulty_topics_case_id_fkey"
      columns: ["case_id"]
isOneToOne: false
      referencedRelation: "clinical_cases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "case_difficulty_topics_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"case_plan_items": {
                  Row: {
                    "arch": Database["public"]['Enums']["dental_arch"] | null,"case_id": string,"created_at": string,"id": string,"other_description": string | null,"owner_id": string,"position": number,"procedure_id": string,"quantity": number,"step_id": string,"teeth": (number)[],"updated_at": string,"visit_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "arch"?: Database["public"]['Enums']["dental_arch"] | null,"case_id": string,"created_at"?: string,"id"?: string,"other_description"?: string | null,"owner_id": string,"position"?: number,"procedure_id": string,"quantity"?: number,"step_id": string,"teeth"?: (number)[],"updated_at"?: string,"visit_id": string
                  }
                  Update: {
                    "arch"?: Database["public"]['Enums']["dental_arch"] | null,"case_id"?: string,"created_at"?: string,"id"?: string,"other_description"?: string | null,"owner_id"?: string,"position"?: number,"procedure_id"?: string,"quantity"?: number,"step_id"?: string,"teeth"?: (number)[],"updated_at"?: string,"visit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "case_plan_items_procedure_id_fkey"
      columns: ["procedure_id"]
isOneToOne: false
      referencedRelation: "procedures"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "case_plan_items_step_id_fkey"
      columns: ["step_id"]
isOneToOne: false
      referencedRelation: "procedure_steps"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "case_plan_items_visit_id_fkey"
      columns: ["visit_id"]
isOneToOne: false
      referencedRelation: "case_plan_visits"
      referencedColumns: ["id"]
    }
                  ]
                },"case_plan_visits": {
                  Row: {
                    "case_id": string,"created_at": string,"id": string,"note": string | null,"owner_id": string,"position": number,"realized_on": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "case_id": string,"created_at"?: string,"id"?: string,"note"?: string | null,"owner_id": string,"position"?: number,"realized_on"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "case_id"?: string,"created_at"?: string,"id"?: string,"note"?: string | null,"owner_id"?: string,"position"?: number,"realized_on"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "case_plan_visits_case_id_fkey"
      columns: ["case_id"]
isOneToOne: false
      referencedRelation: "clinical_cases"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "archived_at": string | null,"created_at": string,"id": string,"name": string,"position": number,"slug": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"created_at"?: string,"id"?: string,"name": string,"position"?: number,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"position"?: number,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"change_log": {
                  Row: {
                    "action": string,"actor": string | null,"at": string,"changes": NonNullable<Json>,"cohort_id": string | null,"content_id": string | null,"id": number,"module_id": string | null,"row_id": string,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor"?: string | null,"at"?: string,"changes": NonNullable<Json>,"cohort_id"?: string | null,"content_id"?: string | null,"id"?: never,"module_id"?: string | null,"row_id": string,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor"?: string | null,"at"?: string,"changes"?: NonNullable<Json>,"cohort_id"?: string | null,"content_id"?: string | null,"id"?: never,"module_id"?: string | null,"row_id"?: string,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"clinical_cases": {
                  Row: {
                    "cohort_id": string,"concluded_on": string | null,"cover_path": string | null,"cover_updated_at": string | null,"created_at": string,"difficulty_text": string | null,"do_differently_text": string | null,"ease_text": string | null,"id": string,"last_activity_on": string | null,"owner_id": string,"patient_label": string,"removed_at": string | null,"smile_cloud_url": string | null,"started_on": string | null,"status": Database["public"]['Enums']["case_status"],"supervisor_faculty_id": string | null,"title": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cohort_id": string,"concluded_on"?: string | null,"cover_path"?: string | null,"cover_updated_at"?: string | null,"created_at"?: string,"difficulty_text"?: string | null,"do_differently_text"?: string | null,"ease_text"?: string | null,"id"?: string,"last_activity_on"?: string | null,"owner_id"?: string,"patient_label": string,"removed_at"?: string | null,"smile_cloud_url"?: string | null,"started_on"?: string | null,"status"?: Database["public"]['Enums']["case_status"],"supervisor_faculty_id"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "cohort_id"?: string,"concluded_on"?: string | null,"cover_path"?: string | null,"cover_updated_at"?: string | null,"created_at"?: string,"difficulty_text"?: string | null,"do_differently_text"?: string | null,"ease_text"?: string | null,"id"?: string,"last_activity_on"?: string | null,"owner_id"?: string,"patient_label"?: string,"removed_at"?: string | null,"smile_cloud_url"?: string | null,"started_on"?: string | null,"status"?: Database["public"]['Enums']["case_status"],"supervisor_faculty_id"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clinical_cases_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clinical_cases_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clinical_cases_supervisor_faculty_id_fkey"
      columns: ["supervisor_faculty_id"]
isOneToOne: false
      referencedRelation: "faculty"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clinical_cases_supervisor_faculty_id_fkey"
      columns: ["supervisor_faculty_id"]
isOneToOne: false
      referencedRelation: "public_teachers"
      referencedColumns: ["id"]
    }
                  ]
                },"cohort_events": {
                  Row: {
                    "cohort_id": string,"created_at": string,"date": string,"description": string | null,"id": string,"kind": Database["public"]['Enums']["event_kind"],"starts_at": string | null,"status": Database["public"]['Enums']["content_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cohort_id": string,"created_at"?: string,"date": string,"description"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["event_kind"],"starts_at"?: string | null,"status"?: Database["public"]['Enums']["content_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "cohort_id"?: string,"created_at"?: string,"date"?: string,"description"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["event_kind"],"starts_at"?: string | null,"status"?: Database["public"]['Enums']["content_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cohort_events_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    }
                  ]
                },"cohorts": {
                  Row: {
                    "closed_at": string | null,"created_at": string,"description": string | null,"ends_on": string,"id": string,"name": string,"show_on_public": boolean,"slug": string,"starts_on": string,"status": Database["public"]['Enums']["cohort_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"created_at"?: string,"description"?: string | null,"ends_on": string,"id"?: string,"name": string,"show_on_public"?: boolean,"slug": string,"starts_on": string,"status"?: Database["public"]['Enums']["cohort_status"],"updated_at"?: string
                  }
                  Update: {
                    "closed_at"?: string | null,"created_at"?: string,"description"?: string | null,"ends_on"?: string,"id"?: string,"name"?: string,"show_on_public"?: boolean,"slug"?: string,"starts_on"?: string,"status"?: Database["public"]['Enums']["cohort_status"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"content_attachments": {
                  Row: {
                    "content_id": string,"created_at": string,"file_name": string | null,"file_path": string | null,"id": string,"position": number,"title": string,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "content_id": string,"created_at"?: string,"file_name"?: string | null,"file_path"?: string | null,"id"?: string,"position"?: number,"title": string,"url"?: string | null
                  }
                  Update: {
                    "content_id"?: string,"created_at"?: string,"file_name"?: string | null,"file_path"?: string | null,"id"?: string,"position"?: number,"title"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_attachments_content_id_fkey"
      columns: ["content_id"]
isOneToOne: false
      referencedRelation: "contents"
      referencedColumns: ["id"]
    }
                  ]
                },"content_cohorts": {
                  Row: {
                    "cohort_id": string,"content_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cohort_id": string,"content_id": string
                  }
                  Update: {
                    "cohort_id"?: string,"content_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_cohorts_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_cohorts_content_id_fkey"
      columns: ["content_id"]
isOneToOne: false
      referencedRelation: "contents"
      referencedColumns: ["id"]
    }
                  ]
                },"content_faculty": {
                  Row: {
                    "content_id": string,"faculty_id": string,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "content_id": string,"faculty_id": string,"position"?: number
                  }
                  Update: {
                    "content_id"?: string,"faculty_id"?: string,"position"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_faculty_content_id_fkey"
      columns: ["content_id"]
isOneToOne: false
      referencedRelation: "contents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_faculty_faculty_id_fkey"
      columns: ["faculty_id"]
isOneToOne: false
      referencedRelation: "faculty"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_faculty_faculty_id_fkey"
      columns: ["faculty_id"]
isOneToOne: false
      referencedRelation: "public_teachers"
      referencedColumns: ["id"]
    }
                  ]
                },"content_progress": {
                  Row: {
                    "completed_at": string | null,"content_id": string,"percent": number,"position_seconds": number,"started_at": string,"status": Database["public"]['Enums']["progress_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"content_id": string,"percent"?: number,"position_seconds"?: number,"started_at"?: string,"status"?: Database["public"]['Enums']["progress_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"content_id"?: string,"percent"?: number,"position_seconds"?: number,"started_at"?: string,"status"?: Database["public"]['Enums']["progress_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_progress_content_id_fkey"
      columns: ["content_id"]
isOneToOne: false
      referencedRelation: "contents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_progress_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"content_search": {
                  Row: {
                    "content_id": string,"vector": unknown
                  }
                  ComputedFields: never
                  Insert: {
                    "content_id": string,"vector": unknown
                  }
                  Update: {
                    "content_id"?: string,"vector"?: unknown
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_search_content_id_fkey"
      columns: ["content_id"]
isOneToOne: true
      referencedRelation: "contents"
      referencedColumns: ["id"]
    }
                  ]
                },"content_topics": {
                  Row: {
                    "content_id": string,"topic_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_id": string,"topic_id": string
                  }
                  Update: {
                    "content_id"?: string,"topic_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_topics_content_id_fkey"
      columns: ["content_id"]
isOneToOne: false
      referencedRelation: "contents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_topics_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"contents": {
                  Row: {
                    "archived_at": string | null,"available_from": string | null,"category_id": string,"citation": string | null,"created_at": string,"description": string | null,"duration_seconds": number | null,"file_name": string | null,"file_path": string | null,"id": string,"kind": Database["public"]['Enums']["content_kind"],"published_at": string | null,"slug": string,"status": Database["public"]['Enums']["content_status"],"thumbnail_url": string | null,"title": string,"updated_at": string,"url": string | null,"video_id": string | null,"video_provider": string | null,"video_status": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"available_from"?: string | null,"category_id": string,"citation"?: string | null,"created_at"?: string,"description"?: string | null,"duration_seconds"?: number | null,"file_name"?: string | null,"file_path"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["content_kind"],"published_at"?: string | null,"slug": string,"status"?: Database["public"]['Enums']["content_status"],"thumbnail_url"?: string | null,"title": string,"updated_at"?: string,"url"?: string | null,"video_id"?: string | null,"video_provider"?: string | null,"video_status"?: string | null
                  }
                  Update: {
                    "archived_at"?: string | null,"available_from"?: string | null,"category_id"?: string,"citation"?: string | null,"created_at"?: string,"description"?: string | null,"duration_seconds"?: number | null,"file_name"?: string | null,"file_path"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["content_kind"],"published_at"?: string | null,"slug"?: string,"status"?: Database["public"]['Enums']["content_status"],"thumbnail_url"?: string | null,"title"?: string,"updated_at"?: string,"url"?: string | null,"video_id"?: string | null,"video_provider"?: string | null,"video_status"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contents_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"enrollments": {
                  Row: {
                    "cohort_id": string,"created_at": string,"role_in_cohort": Database["public"]['Enums']["cohort_role"],"status": Database["public"]['Enums']["enrollment_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cohort_id": string,"created_at"?: string,"role_in_cohort"?: Database["public"]['Enums']["cohort_role"],"status"?: Database["public"]['Enums']["enrollment_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "cohort_id"?: string,"created_at"?: string,"role_in_cohort"?: Database["public"]['Enums']["cohort_role"],"status"?: Database["public"]['Enums']["enrollment_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "enrollments_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enrollments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"faculty": {
                  Row: {
                    "active": boolean,"created_at": string,"display_name": string,"full_name": string,"honorific": string | null,"id": string,"kind": Database["public"]['Enums']["faculty_kind"],"short_bio": string | null,"specialty": string | null,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"display_name": string,"full_name": string,"honorific"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["faculty_kind"],"short_bio"?: string | null,"specialty"?: string | null,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"display_name"?: string,"full_name"?: string,"honorific"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["faculty_kind"],"short_bio"?: string | null,"specialty"?: string | null,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "faculty_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"material_checks": {
                  Row: {
                    "checked_at": string,"material_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "checked_at"?: string,"material_id": string,"user_id"?: string
                  }
                  Update: {
                    "checked_at"?: string,"material_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "material_checks_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "module_materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "material_checks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"module_contents": {
                  Row: {
                    "content_id": string,"module_id": string,"note": string | null,"phase": Database["public"]['Enums']["module_phase"],"position": number,"requirement": Database["public"]['Enums']["requirement_level"]
                  }
                  ComputedFields: never
                  Insert: {
                    "content_id": string,"module_id": string,"note"?: string | null,"phase"?: Database["public"]['Enums']["module_phase"],"position"?: number,"requirement"?: Database["public"]['Enums']["requirement_level"]
                  }
                  Update: {
                    "content_id"?: string,"module_id"?: string,"note"?: string | null,"phase"?: Database["public"]['Enums']["module_phase"],"position"?: number,"requirement"?: Database["public"]['Enums']["requirement_level"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "module_contents_content_id_fkey"
      columns: ["content_id"]
isOneToOne: false
      referencedRelation: "contents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "module_contents_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "module_contents_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "public_modules"
      referencedColumns: ["id"]
    }
                  ]
                },"module_days": {
                  Row: {
                    "created_at": string,"date": string,"id": string,"label": string | null,"module_id": string,"note": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"date": string,"id"?: string,"label"?: string | null,"module_id": string,"note"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"date"?: string,"id"?: string,"label"?: string | null,"module_id"?: string,"note"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "module_days_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "module_days_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "public_modules"
      referencedColumns: ["id"]
    }
                  ]
                },"module_deliverables": {
                  Row: {
                    "description": string | null,"due_date": string | null,"id": string,"module_id": string,"phase": Database["public"]['Enums']["module_phase"],"position": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"due_date"?: string | null,"id"?: string,"module_id": string,"phase"?: Database["public"]['Enums']["module_phase"],"position"?: number,"title": string
                  }
                  Update: {
                    "description"?: string | null,"due_date"?: string | null,"id"?: string,"module_id"?: string,"phase"?: Database["public"]['Enums']["module_phase"],"position"?: number,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "module_deliverables_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "module_deliverables_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "public_modules"
      referencedColumns: ["id"]
    }
                  ]
                },"module_internal_notes": {
                  Row: {
                    "module_id": string,"notes": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "module_id": string,"notes"?: string,"updated_at"?: string
                  }
                  Update: {
                    "module_id"?: string,"notes"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "module_internal_notes_module_id_fkey"
      columns: ["module_id"]
isOneToOne: true
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "module_internal_notes_module_id_fkey"
      columns: ["module_id"]
isOneToOne: true
      referencedRelation: "public_modules"
      referencedColumns: ["id"]
    }
                  ]
                },"module_materials": {
                  Row: {
                    "day_id": string | null,"group_label": string,"id": string,"item": string,"module_id": string,"note": string | null,"position": number,"required": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "day_id"?: string | null,"group_label"?: string,"id"?: string,"item": string,"module_id": string,"note"?: string | null,"position"?: number,"required"?: boolean
                  }
                  Update: {
                    "day_id"?: string | null,"group_label"?: string,"id"?: string,"item"?: string,"module_id"?: string,"note"?: string | null,"position"?: number,"required"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "module_materials_day_id_fkey"
      columns: ["day_id"]
isOneToOne: false
      referencedRelation: "module_days"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "module_materials_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "module_materials_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "public_modules"
      referencedColumns: ["id"]
    }
                  ]
                },"module_resources": {
                  Row: {
                    "available_from": string | null,"body": string | null,"created_at": string,"description": string | null,"file_path": string | null,"id": string,"kind": Database["public"]['Enums']["resource_kind"],"module_id": string,"phase": Database["public"]['Enums']["module_phase"],"position": number,"requirement": Database["public"]['Enums']["requirement_level"],"session_id": string | null,"status": Database["public"]['Enums']["content_status"],"title": string,"updated_at": string,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "available_from"?: string | null,"body"?: string | null,"created_at"?: string,"description"?: string | null,"file_path"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["resource_kind"],"module_id": string,"phase"?: Database["public"]['Enums']["module_phase"],"position"?: number,"requirement"?: Database["public"]['Enums']["requirement_level"],"session_id"?: string | null,"status"?: Database["public"]['Enums']["content_status"],"title": string,"updated_at"?: string,"url"?: string | null
                  }
                  Update: {
                    "available_from"?: string | null,"body"?: string | null,"created_at"?: string,"description"?: string | null,"file_path"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["resource_kind"],"module_id"?: string,"phase"?: Database["public"]['Enums']["module_phase"],"position"?: number,"requirement"?: Database["public"]['Enums']["requirement_level"],"session_id"?: string | null,"status"?: Database["public"]['Enums']["content_status"],"title"?: string,"updated_at"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "module_resources_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "module_resources_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "public_modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "module_resources_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "module_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "module_resources_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "public_schedule"
      referencedColumns: ["id"]
    }
                  ]
                },"module_sessions": {
                  Row: {
                    "activity_type": Database["public"]['Enums']["activity_type"],"created_at": string,"day_id": string,"description": string | null,"ends_at": string | null,"id": string,"module_id": string,"period": Database["public"]['Enums']["day_period"],"position": number,"starts_at": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_type"?: Database["public"]['Enums']["activity_type"],"created_at"?: string,"day_id": string,"description"?: string | null,"ends_at"?: string | null,"id"?: string,"module_id": string,"period": Database["public"]['Enums']["day_period"],"position"?: number,"starts_at"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "activity_type"?: Database["public"]['Enums']["activity_type"],"created_at"?: string,"day_id"?: string,"description"?: string | null,"ends_at"?: string | null,"id"?: string,"module_id"?: string,"period"?: Database["public"]['Enums']["day_period"],"position"?: number,"starts_at"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "module_sessions_day_id_module_id_fkey"
      columns: ["day_id","module_id"]
isOneToOne: false
      referencedRelation: "module_days"
      referencedColumns: ["id","module_id"]
    }
                  ]
                },"module_staff": {
                  Row: {
                    "faculty_id": string,"id": string,"module_id": string,"position": number,"role": Database["public"]['Enums']["staff_role"],"tentative": boolean,"visible_to_students": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "faculty_id": string,"id"?: string,"module_id": string,"position"?: number,"role"?: Database["public"]['Enums']["staff_role"],"tentative"?: boolean,"visible_to_students"?: boolean
                  }
                  Update: {
                    "faculty_id"?: string,"id"?: string,"module_id"?: string,"position"?: number,"role"?: Database["public"]['Enums']["staff_role"],"tentative"?: boolean,"visible_to_students"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "module_staff_faculty_id_fkey"
      columns: ["faculty_id"]
isOneToOne: false
      referencedRelation: "faculty"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "module_staff_faculty_id_fkey"
      columns: ["faculty_id"]
isOneToOne: false
      referencedRelation: "public_teachers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "module_staff_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "module_staff_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "public_modules"
      referencedColumns: ["id"]
    }
                  ]
                },"modules": {
                  Row: {
                    "archived_at": string | null,"cohort_id": string,"created_at": string,"dates_changed_at": string | null,"description": string | null,"id": string,"location": string | null,"materials_notes": string | null,"number": number | null,"position": number,"preparation": string | null,"published_at": string | null,"status": Database["public"]['Enums']["content_status"],"theme": string | null,"title": string,"updated_at": string,"workload_hours": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"cohort_id": string,"created_at"?: string,"dates_changed_at"?: string | null,"description"?: string | null,"id"?: string,"location"?: string | null,"materials_notes"?: string | null,"number"?: number | null,"position": number,"preparation"?: string | null,"published_at"?: string | null,"status"?: Database["public"]['Enums']["content_status"],"theme"?: string | null,"title": string,"updated_at"?: string,"workload_hours"?: number | null
                  }
                  Update: {
                    "archived_at"?: string | null,"cohort_id"?: string,"created_at"?: string,"dates_changed_at"?: string | null,"description"?: string | null,"id"?: string,"location"?: string | null,"materials_notes"?: string | null,"number"?: number | null,"position"?: number,"preparation"?: string | null,"published_at"?: string | null,"status"?: Database["public"]['Enums']["content_status"],"theme"?: string | null,"title"?: string,"updated_at"?: string,"workload_hours"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "modules_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    }
                  ]
                },"performed_procedures": {
                  Row: {
                    "arch": Database["public"]['Enums']["dental_arch"] | null,"case_id": string,"cohort_id": string,"created_at": string,"id": string,"module_auto": boolean,"module_id": string | null,"note": string | null,"other_description": string | null,"other_description_norm": string | null,"owner_id": string,"performed_on": string,"procedure_id": string,"quantity": number,"removed_at": string | null,"step_id": string,"teeth": (number)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "arch"?: Database["public"]['Enums']["dental_arch"] | null,"case_id": string,"cohort_id": string,"created_at"?: string,"id"?: string,"module_auto"?: boolean,"module_id"?: string | null,"note"?: string | null,"other_description"?: string | null,"other_description_norm"?: string | null,"owner_id": string,"performed_on": string,"procedure_id": string,"quantity": number,"removed_at"?: string | null,"step_id": string,"teeth"?: (number)[],"updated_at"?: string
                  }
                  Update: {
                    "arch"?: Database["public"]['Enums']["dental_arch"] | null,"case_id"?: string,"cohort_id"?: string,"created_at"?: string,"id"?: string,"module_auto"?: boolean,"module_id"?: string | null,"note"?: string | null,"other_description"?: string | null,"other_description_norm"?: string | null,"owner_id"?: string,"performed_on"?: string,"procedure_id"?: string,"quantity"?: number,"removed_at"?: string | null,"step_id"?: string,"teeth"?: (number)[],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "performed_procedures_case_id_fkey"
      columns: ["case_id"]
isOneToOne: false
      referencedRelation: "clinical_cases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "performed_procedures_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "performed_procedures_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "public_modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "performed_procedures_procedure_id_fkey"
      columns: ["procedure_id"]
isOneToOne: false
      referencedRelation: "procedures"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "performed_procedures_step_id_fkey"
      columns: ["step_id"]
isOneToOne: false
      referencedRelation: "procedure_steps"
      referencedColumns: ["id"]
    }
                  ]
                },"procedure_categories": {
                  Row: {
                    "archived_at": string | null,"created_at": string,"id": string,"name": string,"position": number,"slug": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"created_at"?: string,"id"?: string,"name": string,"position"?: number,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"position"?: number,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"procedure_steps": {
                  Row: {
                    "active": boolean,"completes": boolean,"created_at": string,"id": string,"location": Database["public"]['Enums']["step_location"],"name": string,"position": number,"procedure_id": string,"requires_description": boolean,"slug": string,"synonyms": (string)[],"unit": Database["public"]['Enums']["count_unit"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"completes"?: boolean,"created_at"?: string,"id"?: string,"location"?: Database["public"]['Enums']["step_location"],"name": string,"position"?: number,"procedure_id": string,"requires_description"?: boolean,"slug": string,"synonyms"?: (string)[],"unit": Database["public"]['Enums']["count_unit"],"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"completes"?: boolean,"created_at"?: string,"id"?: string,"location"?: Database["public"]['Enums']["step_location"],"name"?: string,"position"?: number,"procedure_id"?: string,"requires_description"?: boolean,"slug"?: string,"synonyms"?: (string)[],"unit"?: Database["public"]['Enums']["count_unit"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "procedure_steps_procedure_id_fkey"
      columns: ["procedure_id"]
isOneToOne: false
      referencedRelation: "procedures"
      referencedColumns: ["id"]
    }
                  ]
                },"procedure_topics": {
                  Row: {
                    "created_at": string,"procedure_id": string,"topic_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"procedure_id": string,"topic_id": string
                  }
                  Update: {
                    "created_at"?: string,"procedure_id"?: string,"topic_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "procedure_topics_procedure_id_fkey"
      columns: ["procedure_id"]
isOneToOne: false
      referencedRelation: "procedures"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "procedure_topics_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"procedures": {
                  Row: {
                    "active": boolean,"category_id": string,"created_at": string,"id": string,"kind": Database["public"]['Enums']["procedure_kind"],"name": string,"position": number,"slug": string,"synonyms": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"category_id": string,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["procedure_kind"],"name": string,"position"?: number,"slug": string,"synonyms"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"category_id"?: string,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["procedure_kind"],"name"?: string,"position"?: number,"slug"?: string,"synonyms"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "procedures_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "procedure_categories"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"deactivated_at": string | null,"display_name": string | null,"full_name": string,"id": string,"role": Database["public"]['Enums']["app_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deactivated_at"?: string | null,"display_name"?: string | null,"full_name"?: string,"id": string,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"deactivated_at"?: string | null,"display_name"?: string | null,"full_name"?: string,"id"?: string,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"schema_info": {
                  Row: {
                    "id": boolean,"updated_at": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: boolean,"updated_at"?: string,"version": string
                  }
                  Update: {
                    "id"?: boolean,"updated_at"?: string,"version"?: string
                  }
                  Relationships: [
                    
                  ]
                },"session_faculty": {
                  Row: {
                    "faculty_id": string,"module_id": string,"role": string,"session_id": string,"tentative": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "faculty_id": string,"module_id": string,"role"?: string,"session_id": string,"tentative"?: boolean
                  }
                  Update: {
                    "faculty_id"?: string,"module_id"?: string,"role"?: string,"session_id"?: string,"tentative"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_faculty_faculty_id_fkey"
      columns: ["faculty_id"]
isOneToOne: false
      referencedRelation: "faculty"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_faculty_faculty_id_fkey"
      columns: ["faculty_id"]
isOneToOne: false
      referencedRelation: "public_teachers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_faculty_session_id_module_id_fkey"
      columns: ["session_id","module_id"]
isOneToOne: false
      referencedRelation: "module_sessions"
      referencedColumns: ["id","module_id"]
    },{
      foreignKeyName: "session_faculty_session_id_module_id_fkey"
      columns: ["session_id","module_id"]
isOneToOne: false
      referencedRelation: "public_schedule"
      referencedColumns: ["id","module_id"]
    }
                  ]
                },"terms_acceptances": {
                  Row: {
                    "accepted_at": string,"terms_version_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string,"terms_version_id": string,"user_id": string
                  }
                  Update: {
                    "accepted_at"?: string,"terms_version_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "terms_acceptances_terms_version_id_fkey"
      columns: ["terms_version_id"]
isOneToOne: false
      referencedRelation: "terms_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "terms_acceptances_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"terms_versions": {
                  Row: {
                    "body": string,"created_at": string,"effective_from": string,"id": string,"is_provisional": boolean,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"effective_from"?: string,"id"?: string,"is_provisional"?: boolean,"version": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"effective_from"?: string,"id"?: string,"is_provisional"?: boolean,"version"?: string
                  }
                  Relationships: [
                    
                  ]
                },"topic_notes": {
                  Row: {
                    "origin": string,"topic_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "origin"?: string,"topic_id": string,"updated_at"?: string
                  }
                  Update: {
                    "origin"?: string,"topic_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "topic_notes_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: true
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"topics": {
                  Row: {
                    "archived_at": string | null,"category_id": string,"created_at": string,"description": string | null,"id": string,"merged_into": string | null,"name": string,"slug": string,"synonyms": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"category_id": string,"created_at"?: string,"description"?: string | null,"id"?: string,"merged_into"?: string | null,"name": string,"slug": string,"synonyms"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"category_id"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"merged_into"?: string | null,"name"?: string,"slug"?: string,"synonyms"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "topics_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "topics_merged_into_fkey"
      columns: ["merged_into"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "active_performed_procedures": {
                  Row: {
                    "arch": Database["public"]['Enums']["dental_arch"] | null,"case_id": string | null,"category_id": string | null,"cohort_id": string | null,"completes": boolean | null,"id": string | null,"kind": Database["public"]['Enums']["procedure_kind"] | null,"location": Database["public"]['Enums']["step_location"] | null,"module_id": string | null,"owner_id": string | null,"performed_on": string | null,"procedure_id": string | null,"quantity": number | null,"step_id": string | null,"teeth": (number)[] | null,"unit": Database["public"]['Enums']["count_unit"] | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "performed_procedures_case_id_fkey"
      columns: ["case_id"]
isOneToOne: false
      referencedRelation: "clinical_cases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "performed_procedures_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "performed_procedures_module_id_fkey"
      columns: ["module_id"]
isOneToOne: false
      referencedRelation: "public_modules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "performed_procedures_procedure_id_fkey"
      columns: ["procedure_id"]
isOneToOne: false
      referencedRelation: "procedures"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "performed_procedures_step_id_fkey"
      columns: ["step_id"]
isOneToOne: false
      referencedRelation: "procedure_steps"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "procedures_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "procedure_categories"
      referencedColumns: ["id"]
    }
                  ]
                },"public_modules": {
                  Row: {
                    "description": string | null,"ends_on": string | null,"id": string | null,"number": number | null,"position": number | null,"staff_ids": (string)[] | null,"starts_on": string | null,"theme": string | null,"title": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"public_schedule": {
                  Row: {
                    "activity_type": Database["public"]['Enums']["activity_type"] | null,"date": string | null,"day_number": number | null,"description": string | null,"ends_at": string | null,"faculty_ids": (string)[] | null,"id": string | null,"module_id": string | null,"period": Database["public"]['Enums']["day_period"] | null,"position": number | null,"starts_at": string | null,"tentative": boolean | null,"title": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"public_teachers": {
                  Row: {
                    "display_name": string | null,"honorific": string | null,"id": string | null,"short_bio": string | null,"specialty": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "display_name"?: string | null,"honorific"?: string | null,"id"?: string | null,"short_bio"?: string | null,"specialty"?: string | null
                         }
                        Update: {
                           "display_name"?: string | null,"honorific"?: string | null,"id"?: string | null,"short_bio"?: string | null,"specialty"?: string | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "admin_people":
{ Args: Record<PropertyKey, never>; Returns: {
              "cohort_id": string,"cohort_name": string,"created_at": string,"deactivated_at": string,"display_name": string,"email": string,"enrollment_status": Database["public"]['Enums']["enrollment_status"],"full_name": string,"id": string,"invited_at": string,"last_sign_in_at": string,"role": Database["public"]['Enums']["app_role"],"role_in_cohort": Database["public"]['Enums']["cohort_role"]
            }[]
                           },
"admin_person_footprint":
{ Args: { "p_user_id": string }; Returns: Json
                           },
"bootstrap_first_admin":
{ Args: { "p_email": string }; Returns: string
                           },
"can_register_cases":
{ Args: { "p_cohort_id": string }; Returns: boolean
                           },
"can_view_profile":
{ Args: { "p_user_id": string }; Returns: boolean
                           },
"case_file_case":
{ Args: { "p_path": string }; Returns: string
                           },
"case_plan_writable":
{ Args: { "p_case_id": string }; Returns: boolean
                           },
"case_readable":
{ Args: { "p_case_id": string }; Returns: boolean
                           },
"case_writable":
{ Args: { "p_case_id": string }; Returns: boolean
                           },
"content_cohort_access":
{ Args: { "p_content_id": string,"p_coord_only": boolean }; Returns: boolean
                           },
"content_readable":
{ Args: { "p_content_id": string }; Returns: boolean
                           },
"coordinates":
{ Args: { "p_cohort_id": string }; Returns: boolean
                           },
"copy_cohort_structure":
{ Args: { "p_shift_days": number,"p_source": string,"p_target": string }; Returns: number
                           },
"current_terms_version_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"has_personal_identifier":
{ Args: { "p_text": string }; Returns: boolean
                           },
"health":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_enrolled":
{ Args: { "p_cohort_id": string }; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"library_file_readable":
{ Args: { "p_path": string }; Returns: boolean
                           },
"library_tsquery":
{ Args: { "p_query": string }; Returns: unknown
                           },
"log_case_view":
{ Args: { "p_case_id": string }; Returns: boolean
                           },
"merge_topics":
{ Args: { "p_from": string,"p_into": string }; Returns: number
                           },
"module_file_readable":
{ Args: { "p_path": string }; Returns: boolean
                           },
"module_for_date":
{ Args: { "p_cohort_id": string,"p_date": string }; Returns: string
                           },
"module_full_access":
{ Args: { "p_module_id": string }; Returns: boolean
                           },
"module_readable":
{ Args: { "p_module_id": string }; Returns: boolean
                           },
"needs_terms_acceptance":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"progress_visible":
{ Args: { "p_user_id": string }; Returns: boolean
                           },
"purge_case":
{ Args: { "p_case_id": string,"p_reason": string }; Returns: string
                           },
"refresh_content_search":
{ Args: { "p_content_id": string }; Returns: undefined
                           },
"resource_readable":
{ Args: { "p_resource_id": string }; Returns: boolean
                           },
"search_library":
{ Args: { "p_query": string }; Returns: {
              "content_id": string,"rank": number
            }[]
                           },
"search_normalize":
{ Args: { "p_text": string }; Returns: string
                           },
"sp_today":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"suggest_topics":
{ Args: { "p_limit"?: number,"p_text": string }; Returns: {
              "name": string,"topic_id": string
            }[]
                           },
"valid_patient_label":
{ Args: { "p_label": string }; Returns: boolean
                           },
"valid_teeth":
{ Args: { "p_teeth": (number)[] }; Returns: boolean
                           }
          }
          Enums: {
            "activity_type": "teorica"|"pratica"|"hands_on"|"clinica"|"demonstracao"|"discussao_caso"|"online"|"outro","app_role": "admin"|"coordenacao"|"aluno","case_status": "em_andamento"|"concluido","cohort_role": "aluno"|"coordenacao","cohort_status": "ativa"|"encerrada","content_kind": "video"|"artigo"|"capitulo"|"livro"|"pdf"|"slides"|"link","content_status": "rascunho"|"publicado"|"arquivado","count_unit": "dente"|"peca"|"arcada"|"caso","day_period": "manha"|"tarde"|"noite"|"dia_todo","dental_arch": "superior"|"inferior"|"ambas","enrollment_status": "ativa"|"inativa","event_kind": "online"|"clinica"|"prazo"|"outro","faculty_kind": "docente"|"equipe_clinica"|"convidado"|"coordenacao"|"apoio","module_phase": "antes"|"durante"|"depois","procedure_kind": "tratamento"|"geral","progress_status": "iniciado"|"concluido","requirement_level": "obrigatorio"|"recomendado"|"complementar","resource_kind": "link"|"arquivo"|"texto","staff_role": "principal"|"docente"|"equipe_clinica"|"coordenacao"|"apoio","step_location": "dentes"|"arcada"|"nenhuma"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "activity_type": ["teorica", "pratica", "hands_on", "clinica", "demonstracao", "discussao_caso", "online", "outro"],"app_role": ["admin", "coordenacao", "aluno"],"case_status": ["em_andamento", "concluido"],"cohort_role": ["aluno", "coordenacao"],"cohort_status": ["ativa", "encerrada"],"content_kind": ["video", "artigo", "capitulo", "livro", "pdf", "slides", "link"],"content_status": ["rascunho", "publicado", "arquivado"],"count_unit": ["dente", "peca", "arcada", "caso"],"day_period": ["manha", "tarde", "noite", "dia_todo"],"dental_arch": ["superior", "inferior", "ambas"],"enrollment_status": ["ativa", "inativa"],"event_kind": ["online", "clinica", "prazo", "outro"],"faculty_kind": ["docente", "equipe_clinica", "convidado", "coordenacao", "apoio"],"module_phase": ["antes", "durante", "depois"],"procedure_kind": ["tratamento", "geral"],"progress_status": ["iniciado", "concluido"],"requirement_level": ["obrigatorio", "recomendado", "complementar"],"resource_kind": ["link", "arquivo", "texto"],"staff_role": ["principal", "docente", "equipe_clinica", "coordenacao", "apoio"],"step_location": ["dentes", "arcada", "nenhuma"]
          }
        }
} as const
